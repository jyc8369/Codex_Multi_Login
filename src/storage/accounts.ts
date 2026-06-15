import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { readAuthFile, writeAuthFile } from "../codex/authFile";
import { refreshTokens } from "../auth/oauth";
import { refreshQuota } from "../services/quota";
import { extractClaims, isTokenExpired } from "../utils/jwt";
import { CodexAccountRecord, CodexTokens, SharedCodexAccountJson } from "../types";

interface AccountIndex {
  currentAccountId?: string;
  accounts: CodexAccountRecord[];
}

const INDEX_FILE = "accounts.json";
const TOKENS_FILE = "tokens.json";

export class AccountsStore {
  private readonly indexPath: string;
  private readonly tokensPath: string;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.indexPath = path.join(context.globalStorageUri.fsPath, INDEX_FILE);
    this.tokensPath = path.join(context.globalStorageUri.fsPath, TOKENS_FILE);
  }

  async init(): Promise<void> {
    await fs.mkdir(this.context.globalStorageUri.fsPath, { recursive: true });
  }

  async list(): Promise<CodexAccountRecord[]> {
    return (await this.readIndex()).accounts;
  }

  async addTokens(tokens: CodexTokens, markActive = true): Promise<CodexAccountRecord> {
    const claims = extractClaims(tokens.idToken, tokens.accessToken);
    const index = await this.readIndex();
    const email = claims.email ?? tokens.accountId ?? "unknown";
    const id = `${email}:${claims.accountId ?? tokens.accountId ?? "account"}`;
    const now = Date.now();
    const record: CodexAccountRecord = {
      id,
      email,
      accountId: claims.accountId ?? tokens.accountId,
      planType: claims.planType,
      isActive: markActive,
      tokens,
      createdAt: index.accounts.find((item) => item.id === id)?.createdAt ?? now,
      updatedAt: now
    };

    const accounts = index.accounts.filter((item) => item.id !== id);
    accounts.push(record);
    await this.writeIndex({
      accounts,
      currentAccountId: markActive ? id : index.currentAccountId
    });
    await this.writeTokens(id, tokens);
    if (markActive) {
      await writeAuthFile(tokens);
    }
    return record;
  }

  async importCurrentAuth(): Promise<CodexAccountRecord | undefined> {
    const auth = await readAuthFile();
    if (!auth) {
      return undefined;
    }
    return this.addTokens(
      {
        idToken: auth.tokens.id_token,
        accessToken: auth.tokens.access_token,
        refreshToken: auth.tokens.refresh_token,
        accountId: auth.tokens.account_id
      },
      true
    );
  }

  async importFromJsonFile(filePath: string): Promise<CodexAccountRecord[]> {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const entries = Array.isArray(parsed) ? parsed : [parsed];
    const imported: CodexAccountRecord[] = [];

    for (const entry of entries) {
      const shared = this.normalizeSharedJson(entry);
      if (!shared?.tokens) {
        continue;
      }
      imported.push(await this.addTokens(shared.tokens, false));
    }

    return imported;
  }

  async exportToJsonFile(filePath: string): Promise<void> {
    const index = await this.readIndex();
    const tokens = await this.readTokens();
    const payload = index.accounts
      .map((account) => ({
        email: account.email,
        id: account.id,
        tokens: tokens[account.id] ?? account.tokens
      }))
      .filter((entry) => entry.tokens?.idToken && entry.tokens?.accessToken);

    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
  }

  async switchAccount(accountId: string): Promise<CodexAccountRecord | undefined> {
    const index = await this.readIndex();
    const record = index.accounts.find((item) => item.id === accountId);
    if (!record || !record.tokens) {
      return undefined;
    }
    await writeAuthFile(record.tokens);
    await this.writeIndex({
      currentAccountId: accountId,
      accounts: index.accounts.map((item) => ({
        ...item,
        isActive: item.id === accountId,
        updatedAt: item.id === accountId ? Date.now() : item.updatedAt
      }))
    });
    return record;
  }

  async deleteAccount(accountId: string): Promise<CodexAccountRecord | undefined> {
    const index = await this.readIndex();
    const record = index.accounts.find((item) => item.id === accountId);
    if (!record) {
      return undefined;
    }

    const remaining = index.accounts.filter((item) => item.id !== accountId);
    const tokens = await this.readTokens();
    delete tokens[accountId];

    const nextCurrentAccountId =
      index.currentAccountId === accountId ? remaining.find((item) => item.id !== accountId)?.id : index.currentAccountId;

    await this.writeIndex({
      currentAccountId: nextCurrentAccountId,
      accounts: remaining.map((item) => ({
        ...item,
        isActive: item.id === nextCurrentAccountId
      }))
    });
    await fs.writeFile(this.tokensPath, JSON.stringify(tokens, null, 2), "utf8");

    if (index.currentAccountId === accountId) {
      const nextActive = remaining.find((item) => item.id === nextCurrentAccountId);
      if (nextActive?.tokens) {
        await writeAuthFile(nextActive.tokens);
      }
    }

    return record;
  }

  async refreshAccount(
    accountId: string,
    logger?: { appendLine(message: string): void }
  ): Promise<CodexAccountRecord | undefined> {
    const index = await this.readIndex();
    const record = index.accounts.find((item) => item.id === accountId);
    if (!record?.tokens) {
      return undefined;
    }

    let tokens = record.tokens;
    if (tokens.refreshToken && isTokenExpired(tokens.accessToken)) {
      tokens = await refreshTokens(tokens.refreshToken);
    }
    const quotaSummary = await refreshQuota(tokens, logger);
    const updated: CodexAccountRecord = {
      ...record,
      tokens,
      quotaSummary,
      lastQuotaAt: Date.now(),
      updatedAt: Date.now()
    };

    await this.writeTokens(accountId, tokens);
    await this.writeIndex({
      currentAccountId: index.currentAccountId,
      accounts: index.accounts.map((item) => (item.id === accountId ? updated : item))
    });

    if (index.currentAccountId === accountId) {
      await writeAuthFile(tokens);
    }
    return updated;
  }

  async refreshAll(logger?: { appendLine(message: string): void }): Promise<CodexAccountRecord[]> {
    const index = await this.readIndex();
    const updated: CodexAccountRecord[] = [];
    for (const account of index.accounts) {
      const refreshed = await this.refreshAccount(account.id, logger);
      if (refreshed) {
        updated.push(refreshed);
      }
    }
    return updated;
  }

  private async readIndex(): Promise<AccountIndex> {
    try {
      const raw = await fs.readFile(this.indexPath, "utf8");
      const parsed = JSON.parse(raw) as AccountIndex;
      return {
        currentAccountId: parsed.currentAccountId,
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : []
      };
    } catch {
      return { accounts: [] };
    }
  }

  private async writeIndex(index: AccountIndex): Promise<void> {
    await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2), "utf8");
  }

  private async writeTokens(accountId: string, tokens: CodexTokens): Promise<void> {
    const current = await this.readTokens();
    current[accountId] = tokens;
    await fs.writeFile(this.tokensPath, JSON.stringify(current, null, 2), "utf8");
  }

  private async readTokens(): Promise<Record<string, CodexTokens>> {
    try {
      const raw = await fs.readFile(this.tokensPath, "utf8");
      return JSON.parse(raw) as Record<string, CodexTokens>;
    } catch {
      return {};
    }
  }

  private normalizeSharedJson(value: unknown): SharedCodexAccountJson | undefined {
    if (!value || typeof value !== "object") {
      return undefined;
    }

    const candidate = value as SharedCodexAccountJson & {
      id_token?: string;
      access_token?: string;
      refresh_token?: string;
      account_id?: string;
    };
    if (candidate.tokens?.idToken && candidate.tokens?.accessToken) {
      return candidate;
    }
    if (candidate.id_token && candidate.access_token) {
      return {
        email: candidate.email,
        id: candidate.id,
        tokens: {
          idToken: candidate.id_token,
          accessToken: candidate.access_token,
          refreshToken: candidate.refresh_token,
          accountId: candidate.account_id
        }
      };
    }
    return undefined;
  }
}
