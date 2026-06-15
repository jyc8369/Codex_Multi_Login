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
function renderOAuthCallbackPage(title, message, variant) {
    const accent = variant === "success" ? "#3fb950" : "#f85149";
    const glow = variant === "success" ? "rgba(63, 185, 80, 0.18)" : "rgba(248, 81, 73, 0.18)";
    return `<!doctype html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
      <style>
        :root {
          color-scheme: dark;
          --bg: #0d1117;
          --panel: #161b22;
          --border: #30363d;
          --text: #e6edf3;
          --muted: #8b949e;
          --accent: ${accent};
          --glow: ${glow};
        }
        * { box-sizing: border-box; }
        html, body {
          margin: 0;
          min-height: 100%;
          background:
            radial-gradient(circle at top, var(--glow), transparent 40%),
            var(--bg);
          color: var(--text);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        body {
          display: grid;
          place-items: center;
          padding: 24px;
        }
        .card {
          width: min(520px, 100%);
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 24px;
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
          background: color-mix(in srgb, var(--accent) 14%, transparent);
          color: var(--text);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        h1 {
          margin: 16px 0 8px;
          font-size: 24px;
          line-height: 1.2;
        }
        p {
          margin: 0 0 12px;
          color: var(--muted);
          line-height: 1.6;
        }
        .hint {
          margin-top: 18px;
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          color: var(--muted);
          font-size: 13px;
        }
        .dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: var(--accent);
          box-shadow: 0 0 0 6px color-mix(in srgb, var(--accent) 18%, transparent);
        }
      </style>
    </head>
    <body>
      <main class="card">
        <div class="badge"><span class="dot"></span>${variant === "success" ? "Login complete" : "Login failed"}</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <div class="hint">You can close this tab now and return to VS Code.</div>
      </main>
    </body>
    </html>`;
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
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            if (!req.url) {
                return;
            }
            const url = new URL(req.url, (0, apiEndpoints_1.getOAuthRedirectUri)());
            const pathname = url.pathname.replace(/\/+$/, "");
            if (pathname !== "/auth/callback") {
                res.writeHead(404);
                res.end();
                return;
            }
            const error = url.searchParams.get("error");
            const errorDescription = url.searchParams.get("error_description");
            const code = url.searchParams.get("code");
            const state = url.searchParams.get("state");
            if (error) {
                res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
                res.end(renderOAuthCallbackPage("OAuth callback error", `OAuth callback error: ${error}${errorDescription ? ` - ${errorDescription}` : ""}`, "error"));
                server.close();
                reject(new Error(`OAuth callback error: ${error}${errorDescription ? ` - ${errorDescription}` : ""}`));
                return;
            }
            if (!code) {
                res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
                res.end(renderOAuthCallbackPage("OAuth callback invalid", `Missing code or state. code=${code ?? ""} state=${state ?? ""}`, "error"));
                server.close();
                reject(new Error(`Invalid OAuth callback: code=${code ?? ""} state=${state ?? ""}`));
                return;
            }
            if (state !== expectedState) {
                res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
                res.end(renderOAuthCallbackPage("OAuth state mismatch", `State mismatch. expected=${expectedState} received=${state ?? ""}`, "error"));
                server.close();
                reject(new Error(`OAuth state mismatch: expected=${expectedState} received=${state ?? ""}`));
                return;
            }
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(renderOAuthCallbackPage("Login complete", "Authorization succeeded. You can return to VS Code now.", "success"));
            server.close();
            resolve(code);
        });
        server.listen(apiEndpoints_1.OAUTH_CALLBACK_PORT, "127.0.0.1");
        server.on("error", reject);
        void vscode.env.openExternal(vscode.Uri.parse(loginUrl));
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