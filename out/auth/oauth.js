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
exports.prepareOAuthLoginSession = prepareOAuthLoginSession;
exports.runPreparedOAuthLoginSession = runPreparedOAuthLoginSession;
exports.refreshTokens = refreshTokens;
const crypto = __importStar(require("crypto"));
const http = __importStar(require("http"));
const vscode = __importStar(require("vscode"));
const apiEndpoints_1 = require("../infrastructure/apiEndpoints");
function base64Url(input) {
    return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function sha256(input) {
    return base64Url(crypto.createHash("sha256").update(input).digest());
}
function randomString(bytes = 32) {
    return base64Url(crypto.randomBytes(bytes));
}
function prepareOAuthLoginSession() {
    const verifier = randomString(64);
    return {
        verifier,
        challenge: sha256(verifier),
        state: randomString(32)
    };
}
async function runPreparedOAuthLoginSession(session) {
    const redirectUri = (0, apiEndpoints_1.getOAuthRedirectUri)(apiEndpoints_1.OAUTH_CALLBACK_PORT);
    const authorizeUrl = new URL(apiEndpoints_1.AUTH_ENDPOINT);
    authorizeUrl.search = new URLSearchParams({
        client_id: apiEndpoints_1.OAUTH_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: apiEndpoints_1.OAUTH_SCOPES,
        code_challenge: session.challenge,
        code_challenge_method: "S256",
        state: session.state,
        originator: apiEndpoints_1.OAUTH_ORIGINATOR
    }).toString();
    const code = await waitForOAuthCode(authorizeUrl.toString(), session.state);
    return exchangeCodeForTokens(code, session.verifier, redirectUri);
}
async function waitForOAuthCode(loginUrl, expectedState) {
    void vscode.env.openExternal(vscode.Uri.parse(loginUrl));
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            if (!req.url) {
                return;
            }
            const url = new URL(req.url, (0, apiEndpoints_1.getOAuthRedirectUri)());
            if (url.pathname !== "/auth/callback") {
                res.writeHead(404);
                res.end();
                return;
            }
            const code = url.searchParams.get("code");
            const state = url.searchParams.get("state");
            if (!code || state !== expectedState) {
                res.writeHead(400, { "Content-Type": "text/plain" });
                res.end("Invalid OAuth callback.");
                return;
            }
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end("Login complete. You can close this window.");
            server.close();
            resolve(code);
        });
        server.listen(apiEndpoints_1.OAUTH_CALLBACK_PORT, "127.0.0.1");
        server.on("error", reject);
    });
}
async function exchangeCodeForTokens(code, verifier, redirectUri) {
    const body = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: apiEndpoints_1.OAUTH_CLIENT_ID,
        code,
        code_verifier: verifier,
        redirect_uri: redirectUri
    });
    const response = await fetch(apiEndpoints_1.TOKEN_ENDPOINT, {
        method: "POST",
        headers: {
            "content-type": "application/x-www-form-urlencoded"
        },
        body
    });
    if (!response.ok) {
        throw new Error(`OAuth token exchange failed: ${response.status} ${response.statusText}`);
    }
    const json = (await response.json());
    return {
        idToken: String(json["id_token"] ?? ""),
        accessToken: String(json["access_token"] ?? ""),
        refreshToken: typeof json["refresh_token"] === "string" ? json["refresh_token"] : undefined,
        accountId: typeof json["account_id"] === "string" ? json["account_id"] : undefined
    };
}
async function refreshTokens(refreshToken) {
    const body = new URLSearchParams({
        grant_type: "refresh_token",
        client_id: apiEndpoints_1.OAUTH_CLIENT_ID,
        refresh_token: refreshToken
    });
    const response = await fetch(apiEndpoints_1.TOKEN_ENDPOINT, {
        method: "POST",
        headers: {
            "content-type": "application/x-www-form-urlencoded"
        },
        body
    });
    if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
    }
    const json = (await response.json());
    return {
        idToken: String(json["id_token"] ?? ""),
        accessToken: String(json["access_token"] ?? ""),
        refreshToken: typeof json["refresh_token"] === "string" ? json["refresh_token"] : refreshToken,
        accountId: typeof json["account_id"] === "string" ? json["account_id"] : undefined
    };
}
//# sourceMappingURL=oauth.js.map