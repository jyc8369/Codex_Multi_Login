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

export function sanitizeAuthFileEmail(email: string): string {
  const sanitized = email.trim().replace(/[\/\\:\s<>"|?*]+/g, "_").replace(/^\.+|\.+$/g, "");
  return sanitized || "unknown";
}

export function getPerAccountAuthJsonPath(email: string): string {
  return path.join(getCodexHome(), `auth.json_${sanitizeAuthFileEmail(email)}.json`);
}

export async function readRawAuthFile(): Promise<string | undefined> {
  try {
    return await fs.readFile(getAuthJsonPath(), "utf8");
  } catch {
    return undefined;
  }
}

export async function readAuthFile(): Promise<CodexAuthFile | undefined> {
  try {
    const raw = await readRawAuthFile();
    return raw ? (JSON.parse(raw) as CodexAuthFile) : undefined;
  } catch {
    return undefined;
  }
}

export function buildAuthFilePayload(tokens: CodexTokens, email?: string): CodexAuthFile {
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

export async function writeRawAuthFile(raw: string): Promise<void> {
  await fs.mkdir(getCodexHome(), { recursive: true });
  await fs.writeFile(getAuthJsonPath(), raw, "utf8");
}

<<<<<<< HEAD
export async function deleteRawAuthFile(): Promise<void> {
  await fs.rm(getAuthJsonPath(), { force: true });
}

=======
>>>>>>> origin/main
export async function writePerAccountRawAuthFile(email: string, raw: string): Promise<void> {
  await fs.mkdir(getCodexHome(), { recursive: true });
  await fs.writeFile(getPerAccountAuthJsonPath(email), raw, "utf8");
}

export async function readPerAccountRawAuthFile(email: string): Promise<string | undefined> {
  try {
    return await fs.readFile(getPerAccountAuthJsonPath(email), "utf8");
  } catch {
    return undefined;
  }
}

export async function writeAuthFile(tokens: CodexTokens, email?: string): Promise<void> {
  const payload = buildAuthFilePayload(tokens, email);
  await writeRawAuthFile(JSON.stringify(payload, null, 2));
}
