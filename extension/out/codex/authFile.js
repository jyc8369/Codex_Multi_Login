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
exports.getCodexHome = getCodexHome;
exports.getAuthJsonPath = getAuthJsonPath;
exports.readAuthFile = readAuthFile;
exports.buildAuthFileFromTokens = buildAuthFileFromTokens;
exports.writeRawAuthFile = writeRawAuthFile;
exports.writeAuthFileFromTokens = writeAuthFileFromTokens;
const fs = __importStar(require("fs/promises"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
function getCodexHome() {
    const env = process.env.CODEX_HOME?.trim();
    return env ? env.replace(/^['"]|['"]$/g, "") : path.join(os.homedir(), ".codex");
}
function getAuthJsonPath() {
    return path.join(getCodexHome(), "auth.json");
}
async function readAuthFile() {
    try {
        const raw = await fs.readFile(getAuthJsonPath(), "utf8");
        return JSON.parse(raw);
    }
    catch {
        return undefined;
    }
}
function buildAuthFileFromTokens(tokens, email) {
    return {
        OPENAI_API_KEY: null,
        email,
        tokens: {
            id_token: tokens.idToken,
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
            account_id: tokens.accountId
        },
        last_refresh: new Date().toISOString()
    };
}
async function writeRawAuthFile(authJson) {
    await fs.mkdir(getCodexHome(), { recursive: true });
    await fs.writeFile(getAuthJsonPath(), JSON.stringify(authJson, null, 2), "utf8");
}
async function writeAuthFileFromTokens(tokens, email) {
    await writeRawAuthFile(buildAuthFileFromTokens(tokens, email));
}
//# sourceMappingURL=authFile.js.map