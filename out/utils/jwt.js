"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeJwtPayload = decodeJwtPayload;
exports.extractClaims = extractClaims;
exports.isTokenExpired = isTokenExpired;
const cache = new Map();
function decodeBase64Url(input) {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return Buffer.from(padded, "base64").toString("utf8");
}
function decodeJwtPayload(token) {
    const cached = cache.get(token);
    if (cached !== undefined || cache.has(token)) {
        return cached;
    }
    try {
        const [, payload] = token.split(".");
        if (!payload) {
            return undefined;
        }
        const parsed = JSON.parse(decodeBase64Url(payload));
        cache.set(token, parsed);
        return parsed;
    }
    catch {
        cache.set(token, undefined);
        return undefined;
    }
}
function extractClaims(idToken, accessToken) {
    const payload = decodeJwtPayload(idToken) ?? decodeJwtPayload(accessToken) ?? {};
    const auth = payload["https://api.openai.com/auth"] ?? {};
    return {
        email: typeof payload["email"] === "string" ? payload["email"] : undefined,
        accountId: typeof auth["chatgpt_account_id"] === "string" ? auth["chatgpt_account_id"] : undefined,
        planType: typeof auth["chatgpt_plan_type"] === "string" ? auth["chatgpt_plan_type"] : undefined
    };
}
function isTokenExpired(token, skewSeconds = 60) {
    const payload = decodeJwtPayload(token);
    if (!payload || typeof payload["exp"] !== "number") {
        return false;
    }
    return Date.now() >= payload["exp"] * 1000 - skewSeconds * 1000;
}
//# sourceMappingURL=jwt.js.map