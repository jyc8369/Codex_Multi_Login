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
exports.AccountFileStore = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const ACCOUNT_FILE = "account.json";
const TOKENS_FILE = "tokens.json";
const STORAGE_MODE_KEY = "codexMultiLogin.storageMode";
const TOKEN_SECRET_PREFIX = "codexMultiLogin.tokens.";
class AccountFileStore {
    constructor(context, logger) {
        this.context = context;
        this.logger = logger;
        this.accountPath = path.join(context.globalStorageUri.fsPath, ACCOUNT_FILE);
        this.tokensPath = path.join(context.globalStorageUri.fsPath, TOKENS_FILE);
    }
    getAccountPath() {
        return this.accountPath;
    }
    async ensureStorageRoot() {
        await fs.mkdir(this.context.globalStorageUri.fsPath, { recursive: true });
    }
    async readIndexMeta() {
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
    async ensureAccountFiles() {
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
    async readPlaintextTokens() {
        try {
            const raw = await fs.readFile(this.tokensPath, "utf8");
            return JSON.parse(raw);
        }
        catch {
            return {};
        }
    }
    async writeIndex(accounts, currentAccountId) {
        await this.writeIndexFile(this.accountPath, { currentAccountId, accounts });
    }
    async writePlaintextTokens(tokens) {
        await fs.writeFile(this.tokensPath, JSON.stringify(tokens, null, 2), "utf8");
    }
    async removePlaintextTokens() {
        await fs.rm(this.tokensPath, { force: true });
    }
    async hasPlaintextTokens() {
        try {
            const raw = await fs.readFile(this.tokensPath, "utf8");
            return raw.trim().length > 0;
        }
        catch {
            return false;
        }
    }
    secretKey(accountId) {
        return `${TOKEN_SECRET_PREFIX}${accountId}`;
    }
    getConfiguredStorageMode() {
        return this.context.globalState.get(STORAGE_MODE_KEY) === "plaintext" ? "plaintext" : "keychain";
    }
    async writeIndexFile(filePath, payload) {
        await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
    }
    async readStoredIndexFile(filePath) {
        try {
            const raw = await fs.readFile(filePath, "utf8");
            const parsed = JSON.parse(raw);
            return {
                currentAccountId: parsed.currentAccountId,
                accounts: Array.isArray(parsed.accounts)
                    ? parsed.accounts.map((account) => ({
                        ...account,
                        storageKey: account.storageKey ?? this.secretKey(account.id)
                    }))
                    : []
            };
        }
        catch {
            return undefined;
        }
    }
    async readIndexFile(filePath) {
        return this.readStoredIndexFile(filePath);
    }
    log(level, message) {
        this.logger?.appendLine(`[${level}] [accounts] ${message}`);
    }
}
exports.AccountFileStore = AccountFileStore;
//# sourceMappingURL=accountFiles.js.map