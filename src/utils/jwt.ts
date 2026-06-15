type JwtPayload = Record<string, unknown>;

const cache = new Map<string, JwtPayload | undefined>();

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

export function decodeJwtPayload(token: string): JwtPayload | undefined {
  const cached = cache.get(token);
  if (cached !== undefined || cache.has(token)) {
    return cached;
  }
  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return undefined;
    }
    const parsed = JSON.parse(decodeBase64Url(payload)) as JwtPayload;
    cache.set(token, parsed);
    return parsed;
  } catch {
    cache.set(token, undefined);
    return undefined;
  }
}

export function extractClaims(idToken: string, accessToken: string): {
  email?: string;
  accountId?: string;
  planType?: string;
} {
  const payload = decodeJwtPayload(idToken) ?? decodeJwtPayload(accessToken) ?? {};
  const auth = (payload["https://api.openai.com/auth"] as Record<string, unknown> | undefined) ?? {};
  return {
    email: typeof payload["email"] === "string" ? payload["email"] : undefined,
    accountId: typeof auth["chatgpt_account_id"] === "string" ? auth["chatgpt_account_id"] : undefined,
    planType: typeof auth["chatgpt_plan_type"] === "string" ? auth["chatgpt_plan_type"] : undefined
  };
}

export function isTokenExpired(token: string, skewSeconds = 60): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload["exp"] !== "number") {
    return false;
  }
  return Date.now() >= payload["exp"] * 1000 - skewSeconds * 1000;
}
