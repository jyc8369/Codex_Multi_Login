import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { CodexTokens } from "../types";

export interface CodexAuthFile {
  OPENAI_API_KEY: string | null;
  email?: string;
  tokens: {
    id_token: string;
    access_token: string;
    refresh_token?: string;
    account_id?: string;
  };
  last_refresh?: string;
}

export function getCodexHome(): string {
  const env = process.env.CODEX_HOME?.trim();
  return env ? env.replace(/^['"]|['"]$/g, "") : path.join(os.homedir(), ".codex");
}

export function getAuthJsonPath(): string {
  return path.join(getCodexHome(), "auth.json");
}

export async function readAuthFile(): Promise<CodexAuthFile | undefined> {
  try {
    const raw = await fs.readFile(getAuthJsonPath(), "utf8");
    return JSON.parse(raw) as CodexAuthFile;
  } catch {
    return undefined;
  }
}

export async function writeAuthFile(tokens: CodexTokens, email?: string): Promise<void> {
  await fs.mkdir(getCodexHome(), { recursive: true });
  const payload: CodexAuthFile = {
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
  await fs.writeFile(getAuthJsonPath(), JSON.stringify(payload, null, 2), "utf8");
}
