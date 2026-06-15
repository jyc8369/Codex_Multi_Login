"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshQuota = refreshQuota;
const apiEndpoints_1 = require("../infrastructure/apiEndpoints");
function clampPercent(value) {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return 0;
    }
    if (value <= 1) {
        return Math.round(value * 100);
    }
    return Math.max(0, Math.min(100, Math.round(value)));
}
async function refreshQuota(tokens) {
    const headers = {
        authorization: `Bearer ${tokens.accessToken}`,
        accept: "application/json"
    };
    if (tokens.accountId) {
        headers["ChatGPT-Account-Id"] = tokens.accountId;
    }
    const response = await fetch(apiEndpoints_1.QUOTA_USAGE_URL, { headers });
    if (!response.ok) {
        throw new Error(`Quota request failed: ${response.status} ${response.statusText}`);
    }
    const raw = (await response.json());
    const primary = raw["rate_limit"] ?? {};
    return {
        hourlyPercentage: clampPercent(primary["used_percent"]),
        weeklyPercentage: clampPercent(primary["secondary_window"]?.["used_percent"]),
        codeReviewPercentage: clampPercent(raw["code_review"]?.["used_percent"]),
        rawData: raw
    };
}
//# sourceMappingURL=quota.js.map