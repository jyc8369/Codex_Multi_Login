import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { CodexTokens, StorageMode, StoredAccountRecord } from "../types";

export interface AccountIndex {
  currentAccountId?: string;
  accounts: StoredAccountRecord[];
}

interface StoredTokenRecord {
  tokens: CodexTokens;
  email?: string;
}

const ACCOUNT_FILE = "account.json";
const TOKENS_FILE = "tokens.json";
const STORAGE_MODE_KEY = "codexMultiLogin.storageMode";
const TOKEN_SECRET_PREFIX = "codexMultiLogin.tokens.";

export class AccountFileStore {
  private readonly accountPath: string;
  private readonly tokensPath: string;

  constructor(private readonly context: vscode.ExtensionContext, private readonly logger?: { appendLine(message: string): void }) {
    this.accountPath = path.join(context.globalStorageUri.fsPath, ACCOUNT_FILE);
    this.tokensPath = path.join(context.globalStorageUri.fsPath, TOKENS_FILE);
  }

  getAccountPath(): string {
    return this.accountPath;
  }

  async ensureStorageRoot(): Promise<void> {
    await fs.mkdir(this.context.globalStorageUri.fsPath, { recursive: true });
  }

  async readIndexMeta(): Promise<AccountIndex> {
    const primary = await this.readIndexFile(this.accountPath);
    if (primary) {
      return primary;
    }
    const legacy = await this.readIndexFile(path.join(this.context.globalStorageUri.fsPath, "accounts.json"));
    if (legacy) {
      return legacy;
    }
    return { currentAccountId: undefined, accounts: [] };
  }

  async ensureAccountFiles(): Promise<void> {
    const primary = await this.readIndexFile(this.accountPath);
    const legacyPath = path.join(this.context.globalStorageUri.fsPath, "accounts.json");
    const legacy = await this.readIndexFile(legacyPath);
    const resolved = primary ?? legacy ?? { currentAccountId: undefined, accounts: [] };

    if (!primary) {
      await this.writeIndexFile(this.accountPath, resolved);
      this.log("info", `ensureAccountFiles created account.json accounts=${resolved.accounts.length}`);
    }

    if (legacy) {
      await fs.rm(legacyPath, { force: true });
      this.log("info", "ensureAccountFiles removed legacy accounts.json");
    }
  }

  async readPlaintextTokens(): Promise<Record<string, StoredTokenRecord>> {
    try {
      const raw = await fs.readFile(this.tokensPath, "utf8");
      return JSON.parse(raw) as Record<string, StoredTokenRecord>;
    } catch {
      return {};
    }
  }

  async writeIndex(accounts: StoredAccountRecord[], currentAccountId?: string): Promise<void> {
    await this.writeIndexFile(this.accountPath, { currentAccountId, accounts });
  }

  async writePlaintextTokens(tokens: Record<string, StoredTokenRecord>): Promise<void> {
    await fs.writeFile(this.tokensPath, JSON.stringify(tokens, null, 2), "utf8");
  }

  async removePlaintextTokens(): Promise<void> {
    await fs.rm(this.tokensPath, { force: true });
  }

  async hasPlaintextTokens(): Promise<boolean> {
    try {
      const raw = await fs.readFile(this.tokensPath, "utf8");
      return raw.trim().length > 0;
    } catch {
      return false;
    }
  }

  secretKey(accountId: string): string {
    return `${TOKEN_SECRET_PREFIX}${accountId}`;
  }

  getConfiguredStorageMode(): StorageMode {
    return this.context.globalState.get(STORAGE_MODE_KEY) === "plaintext" ? "plaintext" : "keychain";
  }

  async writeIndexFile(filePath: string, payload: AccountIndex): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
  }

  async readStoredIndexFile(filePath: string): Promise<AccountIndex | undefined> {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as AccountIndex;
      return {
        currentAccountId: parsed.currentAccountId,
        accounts: Array.isArray(parsed.accounts)
          ? parsed.accounts.map((account) => ({
              ...account,
              storageKey: account.storageKey ?? this.secretKey(account.id)
            }))
          : []
      };
    } catch {
      return undefined;
    }
  }

  private async readIndexFile(filePath: string): Promise<AccountIndex | undefined> {
    return this.readStoredIndexFile(filePath);
  }

  private log(level: "info" | "warn" | "error", message: string): void {
    this.logger?.appendLine(`[${level}] [accounts] ${message}`);
  }
}
