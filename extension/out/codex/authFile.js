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
exports.sanitizeAuthFileEmail = sanitizeAuthFileEmail;
exports.getPerAccountAuthJsonPath = getPerAccountAuthJsonPath;
exports.readRawAuthFile = readRawAuthFile;
exports.readAuthFile = readAuthFile;
exports.buildAuthFilePayload = buildAuthFilePayload;
exports.writeRawAuthFile = writeRawAuthFile;
<<<<<<< HEAD
exports.deleteRawAuthFile = deleteRawAuthFile;
=======
>>>>>>> origin/main
exports.writePerAccountRawAuthFile = writePerAccountRawAuthFile;
exports.readPerAccountRawAuthFile = readPerAccountRawAuthFile;
exports.writeAuthFile = writeAuthFile;
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
function sanitizeAuthFileEmail(email) {
    const sanitized = email.trim().replace(/[\/\\:\s<>"|?*]+/g, "_").replace(/^\.+|\.+$/g, "");
    return sanitized || "unknown";
}
function getPerAccountAuthJsonPath(email) {
    return path.join(getCodexHome(), `auth.json_${sanitizeAuthFileEmail(email)}.json`);
}
async function readRawAuthFile() {
    try {
        return await fs.readFile(getAuthJsonPath(), "utf8");
    }
    catch {
        return undefined;
    }
}
async function readAuthFile() {
    try {
        const raw = await readRawAuthFile();
        return raw ? JSON.parse(raw) : undefined;
    }
    catch {
        return undefined;
    }
}
function buildAuthFilePayload(tokens, email) {
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
async function writeRawAuthFile(raw) {
    await fs.mkdir(getCodexHome(), { recursive: true });
    await fs.writeFile(getAuthJsonPath(), raw, "utf8");
}
<<<<<<< HEAD
async function deleteRawAuthFile() {
    await fs.rm(getAuthJsonPath(), { force: true });
}
=======
>>>>>>> origin/main
async function writePerAccountRawAuthFile(email, raw) {
    await fs.mkdir(getCodexHome(), { recursive: true });
    await fs.writeFile(getPerAccountAuthJsonPath(email), raw, "utf8");
}
async function readPerAccountRawAuthFile(email) {
    try {
        return await fs.readFile(getPerAccountAuthJsonPath(email), "utf8");
    }
    catch {
        return undefined;
    }
}
async function writeAuthFile(tokens, email) {
    const payload = buildAuthFilePayload(tokens, email);
    await writeRawAuthFile(JSON.stringify(payload, null, 2));
}
//# sourceMappingURL=authFile.js.map