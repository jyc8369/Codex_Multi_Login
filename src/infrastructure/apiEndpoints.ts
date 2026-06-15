export const CODEX_API_BASE = "https://chatgpt.com";
export const QUOTA_USAGE_URL = `${CODEX_API_BASE}/backend-api/wham/usage`;
export const AUTH_ENDPOINT = "https://auth.openai.com/oauth/authorize";
export const TOKEN_ENDPOINT = "https://auth.openai.com/oauth/token";
export const OAUTH_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
export const OAUTH_SCOPES = "openid profile email offline_access";
export const OAUTH_ORIGINATOR = "codex_vscode";
export const OAUTH_CALLBACK_PORT = 1455;
export const OAUTH_CALLBACK_PATH = "/auth/callback";

export function getOAuthRedirectUri(port = OAUTH_CALLBACK_PORT): string {
  return `http://localhost:${port}${OAUTH_CALLBACK_PATH}`;
}
