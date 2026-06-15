"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountsStore = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const authFile_1 = require("../codex/authFile");
const oauth_1 = require("../auth/oauth");
const quota_1 = require("../services/quota");
const jwt_1 = require("../utils/jwt");
const INDEX_FILE = "accounts.json";
const TOKENS_FILE = "tokens.json";
class AccountsStore {
    constructor(context, logger) {
        this.context = context;
        this.logger = logger;
        this.indexPath = path.join(context.globalStorageUri.fsPath, INDEX_FILE);
        this.tokensPath = path.join(context.globalStorageUri.fsPath, TOKENS_FILE);
    }
    async init() {
        await fs.mkdir(this.context.globalStorageUri.fsPath, { recursive: true });
        await this.syncActiveAccountFromAuthFile();
        this.log("info", `init storage=${this.context.globalStorageUri.fsPath}`);
    }
    async list() {
        return (await this.readIndex()).accounts;
    }
    async addTokens(tokens, markActive = true) {
        const claims = (0, jwt_1.extractClaims)(tokens.idToken, tokens.accessToken);
        const index = await this.readIndex();
        const email = claims.email ?? tokens.accountId ?? "unknown";
        const id = `${email}:${claims.accountId ?? tokens.accountId ?? "account"}`;
        const now = Date.now();
        const record = {
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
            await (0, authFile_1.writeAuthFile)(tokens, record.email);
            this.activeAccountIdFromAuthFile = tokens.accountId;
            this.activeEmailFromAuthFile = record.email;
            this.log("info", `addTokens active email=${record.email} accountId=${tokens.accountId ?? "unknown"}`);
        }
        this.log("info", `addTokens saved id=${id} email=${record.email} active=${markActive}`);
        return record;
    }
    async importCurrentAuth() {
        const auth = await (0, authFile_1.readAuthFile)();
        if (!auth) {
            this.log("warn", "importCurrentAuth skipped reason=no_auth_file");
            return undefined;
        }
        return this.addTokens({
            idToken: auth.tokens.id_token,
            accessToken: auth.tokens.access_token,
            refreshToken: auth.tokens.refresh_token,
            accountId: auth.tokens.account_id
        }, true);
    }
    async importFromJsonFile(filePath) {
        const raw = await fs.readFile(filePath, "utf8");
        const parsed = JSON.parse(raw);
        const entries = Array.isArray(parsed) ? parsed : [parsed];
        const imported = [];
        for (const entry of entries) {
            const shared = this.normalizeSharedJson(entry);
            if (!shared?.tokens) {
                continue;
            }
            imported.push(await this.addTokens(shared.tokens, false));
        }
        return imported;
    }
    async exportToJsonFile(filePath) {
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
    async switchAccount(accountId) {
        const index = await this.readIndex();
        const record = index.accounts.find((item) => item.id === accountId);
        if (!record || !record.tokens) {
            this.log("warn", `switchAccount skipped id=${accountId} reason=missing_record`);
            return undefined;
        }
        await (0, authFile_1.writeAuthFile)(record.tokens, record.email);
        this.log("info", `switchAccount wrote auth.json email=${record.email} accountId=${record.accountId ?? "unknown"}`);
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
    async deleteAccount(accountId) {
        const index = await this.readIndex();
        const record = index.accounts.find((item) => item.id === accountId);
        if (!record) {
            return undefined;
        }
        const remaining = index.accounts.filter((item) => item.id !== accountId);
        const tokens = await this.readTokens();
        delete tokens[accountId];
        const nextCurrentAccountId = index.currentAccountId === accountId ? remaining.find((item) => item.id !== accountId)?.id : index.currentAccountId;
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
                await (0, authFile_1.writeAuthFile)(nextActive.tokens, nextActive.email);
                this.activeAccountIdFromAuthFile = nextActive.tokens.accountId;
                this.activeEmailFromAuthFile = nextActive.email;
                this.log("info", `deleteAccount rotated auth.json email=${nextActive.email} accountId=${nextActive.accountId ?? "unknown"}`);
            }
        }
        return record;
    }
    async refreshAccount(accountId, logger) {
        const index = await this.readIndex();
        const record = index.accounts.find((item) => item.id === accountId);
        if (!record?.tokens) {
            this.log("warn", `refreshAccount skipped id=${accountId} reason=missing_tokens`);
            return undefined;
        }
        this.log("info", `refreshAccount start id=${record.id} email=${record.email} active=${record.isActive}`);
        let tokens = record.tokens;
        if (tokens.refreshToken && (0, jwt_1.isTokenExpired)(tokens.accessToken)) {
            this.log("info", `refreshAccount refreshToken id=${record.id}`);
            tokens = await (0, oauth_1.refreshTokens)(tokens.refreshToken);
        }
        const quotaSummary = await (0, quota_1.refreshQuota)(tokens, logger);
        const updated = {
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
            await (0, authFile_1.writeAuthFile)(tokens, record.email);
        }
        this.log("info", `refreshAccount done id=${record.id} email=${record.email}`);
        return updated;
    }
    async refreshAll(logger) {
        const index = await this.readIndex();
        const updated = [];
        for (const account of index.accounts) {
            this.log("info", `refreshAll queue id=${account.id} email=${account.email}`);
            const refreshed = await this.refreshAccount(account.id, logger);
            if (refreshed) {
                updated.push(refreshed);
            }
        }
        this.log("info", `refreshAll done count=${updated.length}`);
        return updated;
    }
    async readIndex() {
        try {
            const raw = await fs.readFile(this.indexPath, "utf8");
            const parsed = JSON.parse(raw);
            const activeAccountId = this.activeAccountIdFromAuthFile;
            const activeEmail = this.activeEmailFromAuthFile;
            const accounts = Array.isArray(parsed.accounts) ? parsed.accounts : [];
            this.log("info", `readIndex accounts=${accounts.length} activeAccountId=${activeAccountId ?? "none"} activeEmail=${activeEmail ?? "none"}`);
            return {
                currentAccountId: parsed.currentAccountId,
                accounts: accounts.map((account) => ({
                    ...account,
                    isActive: this.matchesActiveIdentity(account, activeAccountId, activeEmail)
                }))
            };
        }
        catch {
            return { accounts: [] };
        }
    }
    async writeIndex(index) {
        await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2), "utf8");
    }
    async writeTokens(accountId, tokens) {
        const current = await this.readTokens();
        current[accountId] = tokens;
        await fs.writeFile(this.tokensPath, JSON.stringify(current, null, 2), "utf8");
    }
    async readTokens() {
        try {
            const raw = await fs.readFile(this.tokensPath, "utf8");
            return JSON.parse(raw);
        }
        catch {
            return {};
        }
    }
    async syncActiveAccountFromAuthFile() {
        const auth = await (0, authFile_1.readAuthFile)();
        this.activeAccountIdFromAuthFile = auth?.tokens.account_id;
        this.activeEmailFromAuthFile = auth?.email;
        this.log("info", `syncActiveAccountFromAuthFile accountId=${this.activeAccountIdFromAuthFile ?? "none"} email=${this.activeEmailFromAuthFile ?? "none"}`);
    }
    log(level, message) {
        this.logger?.appendLine(`[${level}] [accounts] ${message}`);
    }
    matchesActiveIdentity(account, activeAccountId, activeEmail) {
        if (activeAccountId && account.accountId === activeAccountId) {
            return true;
        }
        if (activeEmail && account.email.toLowerCase() === activeEmail.toLowerCase()) {
            return true;
        }
        return false;
    }
    normalizeSharedJson(value) {
        if (!value || typeof value !== "object") {
            return undefined;
        }
        const candidate = value;
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
exports.AccountsStore = AccountsStore;
//# sourceMappingURL=accounts.js.map