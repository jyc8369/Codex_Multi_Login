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
    constructor(context) {
        this.context = context;
        this.indexPath = path.join(context.globalStorageUri.fsPath, INDEX_FILE);
        this.tokensPath = path.join(context.globalStorageUri.fsPath, TOKENS_FILE);
    }
    async init() {
        await fs.mkdir(this.context.globalStorageUri.fsPath, { recursive: true });
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
            await (0, authFile_1.writeAuthFile)(tokens);
        }
        return record;
    }
    async importCurrentAuth() {
        const auth = await (0, authFile_1.readAuthFile)();
        if (!auth) {
            return undefined;
        }
        return this.addTokens({
            idToken: auth.tokens.id_token,
            accessToken: auth.tokens.access_token,
            refreshToken: auth.tokens.refresh_token,
            accountId: auth.tokens.account_id
        }, true);
    }
    async switchAccount(accountId) {
        const index = await this.readIndex();
        const record = index.accounts.find((item) => item.id === accountId);
        if (!record || !record.tokens) {
            return undefined;
        }
        await (0, authFile_1.writeAuthFile)(record.tokens);
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
    async refreshAccount(accountId) {
        const index = await this.readIndex();
        const record = index.accounts.find((item) => item.id === accountId);
        if (!record?.tokens) {
            return undefined;
        }
        let tokens = record.tokens;
        if (tokens.refreshToken && (0, jwt_1.isTokenExpired)(tokens.accessToken)) {
            tokens = await (0, oauth_1.refreshTokens)(tokens.refreshToken);
        }
        const quotaSummary = await (0, quota_1.refreshQuota)(tokens);
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
            await (0, authFile_1.writeAuthFile)(tokens);
        }
        return updated;
    }
    async refreshAll() {
        const index = await this.readIndex();
        const updated = [];
        for (const account of index.accounts) {
            const refreshed = await this.refreshAccount(account.id);
            if (refreshed) {
                updated.push(refreshed);
            }
        }
        return updated;
    }
    async readIndex() {
        try {
            const raw = await fs.readFile(this.indexPath, "utf8");
            const parsed = JSON.parse(raw);
            return {
                currentAccountId: parsed.currentAccountId,
                accounts: Array.isArray(parsed.accounts) ? parsed.accounts : []
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
}
exports.AccountsStore = AccountsStore;
//# sourceMappingURL=accounts.js.map