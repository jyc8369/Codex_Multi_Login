"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAUTH_CALLBACK_PATH = exports.OAUTH_CALLBACK_PORT = exports.OAUTH_ORIGINATOR = exports.OAUTH_SCOPES = exports.OAUTH_CLIENT_ID = exports.TOKEN_ENDPOINT = exports.AUTH_ENDPOINT = exports.QUOTA_USAGE_URL = exports.CODEX_API_BASE = void 0;
exports.getOAuthRedirectUri = getOAuthRedirectUri;
exports.CODEX_API_BASE = "https://chatgpt.com";
exports.QUOTA_USAGE_URL = `${exports.CODEX_API_BASE}/backend-api/wham/usage`;
exports.AUTH_ENDPOINT = "https://auth.openai.com/oauth/authorize";
exports.TOKEN_ENDPOINT = "https://auth.openai.com/oauth/token";
exports.OAUTH_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
exports.OAUTH_SCOPES = "openid profile email offline_access";
exports.OAUTH_ORIGINATOR = "codex_vscode";
exports.OAUTH_CALLBACK_PORT = 1455;
exports.OAUTH_CALLBACK_PATH = "/auth/callback";
function getOAuthRedirectUri(port = exports.OAUTH_CALLBACK_PORT) {
    return `http://localhost:${port}${exports.OAUTH_CALLBACK_PATH}`;
}
//# sourceMappingURL=apiEndpoints.js.map