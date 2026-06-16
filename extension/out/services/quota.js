"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshQuota = refreshQuota;
const apiEndpoints_1 = require("../infrastructure/apiEndpoints");
function asRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : undefined;
}
function readNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
function readNumberField(record, ...keys) {
    if (!record) {
        return undefined;
    }
    for (const key of keys) {
        const value = readNumber(record[key]);
        if (value !== undefined) {
            return value;
        }
    }
    return undefined;
}
function clampPercent(value) {
    if (typeof value !== "number") {
        return 0;
    }
    if (value <= 1) {
        return Math.round(value * 100);
    }
    return Math.max(0, Math.min(100, Math.round(value)));
}
function readWindow(raw) {
    const record = asRecord(raw);
    if (!record) {
        return { present: false };
    }
    const usedPercent = readNumberField(record, "used_percent", "usedPercent");
    const remainingPercent = readNumberField(record, "remaining_percent", "remainingPercent");
    const directPercentage = readNumberField(record, "percentage", "percent");
    const remaining = readNumberField(record, "remaining", "requests_left", "requestsLeft");
    const limit = readNumberField(record, "limit", "requests_limit", "requestsLimit");
    const resetAt = readNumberField(record, "reset_at", "resetAt", "reset_time", "resetTime");
    const resetAfter = readNumberField(record, "reset_after_seconds", "resetAfterSeconds", "reset_after", "resetAfter");
    const windowMinutes = readNumberField(record, "window_minutes", "windowMinutes", "duration_minutes", "durationMinutes");
    const windowSeconds = readNumberField(record, "limit_window_seconds", "limitWindowSeconds", "window_seconds", "windowSeconds", "duration_seconds", "durationSeconds");
    const effectiveWindowMinutes = typeof windowMinutes === "number"
        ? windowMinutes
        : typeof windowSeconds === "number"
            ? windowSeconds / 60
            : undefined;
    let percentage;
    if (typeof remainingPercent === "number") {
        percentage = clampPercent(remainingPercent);
    }
    else if (typeof directPercentage === "number") {
        percentage = clampPercent(directPercentage);
    }
    else if (typeof usedPercent === "number") {
        percentage = clampPercent(100 - usedPercent);
    }
    else if (typeof remaining === "number" && typeof limit === "number" && limit > 0) {
        percentage = clampPercent((remaining / limit) * 100);
    }
    return {
        present: percentage !== undefined ||
            resetAt !== undefined ||
            resetAfter !== undefined ||
            remaining !== undefined ||
            limit !== undefined ||
            windowSeconds !== undefined,
        percentage,
        resetTime: typeof resetAt === "number"
            ? resetAt > 1000000000000
                ? Math.floor(resetAt / 1000)
                : Math.floor(resetAt)
            : typeof resetAfter === "number"
                ? Math.floor(Date.now() / 1000 + resetAfter)
                : undefined,
        requestsLeft: remaining,
        requestsLimit: limit,
        windowMinutes: effectiveWindowMinutes,
        windowSeconds
    };
}
function resolveRateLimitWindows(rateLimit, planType) {
    if (!rateLimit) {
        return {};
    }
    const plan = (planType ?? "").toLowerCase();
    const primary = readWindow(asRecord(rateLimit["primary_window"]) ?? asRecord(rateLimit["primaryWindow"]));
    const secondary = readWindow(asRecord(rateLimit["secondary_window"]) ?? asRecord(rateLimit["secondaryWindow"]));
    const windows = [primary, secondary].filter((window) => window.present);
    if (!windows.length) {
        return {};
    }
    if (plan.includes("free")) {
        return {
            monthly: primary.present ? primary : secondary.present ? secondary : undefined
        };
    }
    const sorted = windows.slice().sort((a, b) => (a.windowMinutes ?? 0) - (b.windowMinutes ?? 0));
    const hourly = sorted.find((window) => typeof window.windowMinutes === "number" && window.windowMinutes > 0 && window.windowMinutes <= 360);
    const weekly = sorted.find((window) => typeof window.windowMinutes === "number" && window.windowMinutes >= 10080 && window.windowMinutes < 43200);
    const monthly = sorted.find((window) => typeof window.windowMinutes === "number" && window.windowMinutes >= 43200);
    return {
        hourly,
        weekly,
        monthly: monthly ?? (!hourly && !weekly ? sorted[0] : undefined)
    };
}
function parseRateLimitObject(rateLimit) {
    return resolveRateLimitWindows(rateLimit);
}
function parseAdditionalRateLimits(raw) {
    if (!Array.isArray(raw)) {
        return undefined;
    }
    const limits = raw.flatMap((item) => {
        const record = asRecord(item);
        const rateLimit = asRecord(record?.["rate_limit"]) ?? asRecord(record?.["rateLimit"]);
        if (!record || !rateLimit) {
            return [];
        }
        const windows = resolveRateLimitWindows(rateLimit);
        return [
            {
                limitName: String(record["limit_name"] ?? record["limitName"] ?? record["name"] ?? "additional quota").trim() ||
                    "additional quota",
                meteredFeature: typeof record["metered_feature"] === "string" ? record["metered_feature"] : undefined,
                hourlyPercentage: windows.hourly?.percentage,
                hourlyWindowPresent: windows.hourly?.present,
                hourlyResetTime: windows.hourly?.resetTime,
                hourlyRequestsLeft: windows.hourly?.requestsLeft,
                hourlyRequestsLimit: windows.hourly?.requestsLimit,
                hourlyWindowMinutes: windows.hourly?.windowMinutes,
                weeklyPercentage: windows.weekly?.percentage,
                weeklyWindowPresent: windows.weekly?.present,
                weeklyResetTime: windows.weekly?.resetTime,
                weeklyRequestsLeft: windows.weekly?.requestsLeft,
                weeklyRequestsLimit: windows.weekly?.requestsLimit,
                weeklyWindowMinutes: windows.weekly?.windowMinutes
            }
        ];
    });
    return limits.length ? limits : undefined;
}
function parseCredits(raw) {
    const record = asRecord(raw);
    if (!record) {
        return undefined;
    }
    return {
        hasCredits: record["has_credits"] === true || record["hasCredits"] === true,
        unlimited: record["unlimited"] === true,
        overageLimitReached: record["overage_limit_reached"] === true || record["overageLimitReached"] === true,
        balance: String(record["balance"] ?? "").trim(),
        approxLocalMessages: Array.isArray(record["approx_local_messages"])
            ? record["approx_local_messages"]
            : Array.isArray(record["approxLocalMessages"])
                ? record["approxLocalMessages"]
                : [],
        approxCloudMessages: Array.isArray(record["approx_cloud_messages"])
            ? record["approx_cloud_messages"]
            : Array.isArray(record["approxCloudMessages"])
                ? record["approxCloudMessages"]
                : []
    };
}
async function refreshQuota(tokens, logger) {
    const headers = {
        Authorization: `Bearer ${tokens.accessToken}`,
        Accept: "application/json"
    };
    if (tokens.accountId) {
        headers["ChatGPT-Account-Id"] = tokens.accountId;
    }
    const response = await fetch(apiEndpoints_1.QUOTA_USAGE_URL, { method: "GET", headers });
    if (!response.ok) {
        throw new Error(`Quota request failed: ${response.status} ${response.statusText}`);
    }
    const raw = (await response.json());
    const planType = String(raw["plan_type"] ?? raw["planType"] ?? "").toLowerCase();
    const rateLimit = asRecord(raw["rate_limit"]) ?? asRecord(raw["rateLimit"]);
    const windows = resolveRateLimitWindows(rateLimit, planType);
    const primaryWindow = windows.hourly;
    const secondaryWindow = windows.weekly;
    const monthlyWindow = windows.monthly;
    const codeReviewRateLimit = asRecord(raw["code_review_rate_limit"]) ??
        asRecord(raw["codeReviewRateLimit"]) ??
        asRecord(raw["code_review"]) ??
        asRecord(raw["codeReview"]);
    const codeReviewWindows = parseRateLimitObject(codeReviewRateLimit);
    const codeReview = codeReviewWindows.hourly ?? codeReviewWindows.weekly ?? readWindow(codeReviewRateLimit);
    const monthlyRateLimit = asRecord(raw["monthly_rate_limit"]) ?? asRecord(raw["monthlyRateLimit"]);
    const monthlyWindows = parseRateLimitObject(monthlyRateLimit);
    const monthly = planType.includes("free")
        ? monthlyWindow ?? monthlyWindows.hourly ?? monthlyWindows.weekly ?? readWindow(monthlyRateLimit)
        : monthlyWindows.hourly ?? monthlyWindows.weekly ?? readWindow(monthlyRateLimit);
    if (logger) {
        logger.appendLine(`[quota] account=${tokens.accountId ?? "unknown"} plan=${String(raw["plan_type"] ?? raw["planType"] ?? "unknown")} ` +
            `primary=${JSON.stringify({
                usedPercent: rateLimit?.primary_window && asRecord(rateLimit["primary_window"]) ? (asRecord(rateLimit["primary_window"])?.used_percent ?? asRecord(rateLimit["primary_window"])?.usedPercent) : undefined,
                windowMinutes: primaryWindow?.windowMinutes,
                windowSeconds: primaryWindow?.windowSeconds,
                percentage: primaryWindow?.percentage,
                resetTime: primaryWindow?.resetTime
            })} ` +
            `secondary=${JSON.stringify({
                usedPercent: rateLimit?.secondary_window && asRecord(rateLimit["secondary_window"]) ? (asRecord(rateLimit["secondary_window"])?.used_percent ?? asRecord(rateLimit["secondary_window"])?.usedPercent) : undefined,
                windowMinutes: secondaryWindow?.windowMinutes,
                windowSeconds: secondaryWindow?.windowSeconds,
                percentage: secondaryWindow?.percentage,
                resetTime: secondaryWindow?.resetTime
            })} ` +
            `monthly=${JSON.stringify({
                windowMinutes: monthlyWindow?.windowMinutes,
                windowSeconds: monthlyWindow?.windowSeconds,
                percentage: monthlyWindow?.percentage,
                resetTime: monthlyWindow?.resetTime
            })} ` +
            `codeReview=${JSON.stringify({
                windowMinutes: codeReview.windowMinutes,
                windowSeconds: codeReview.windowSeconds,
                percentage: codeReview.percentage,
                resetTime: codeReview.resetTime
            })}`);
    }
    return {
        hourlyPercentage: primaryWindow?.percentage ?? 0,
        hourlyWindowPresent: primaryWindow?.present,
        hourlyRequestsLeft: primaryWindow?.requestsLeft,
        hourlyRequestsLimit: primaryWindow?.requestsLimit,
        hourlyWindowMinutes: primaryWindow?.windowMinutes,
        hourlyResetTime: primaryWindow?.resetTime,
        weeklyPercentage: secondaryWindow?.percentage ?? 0,
        weeklyWindowPresent: secondaryWindow?.present,
        weeklyRequestsLeft: secondaryWindow?.requestsLeft,
        weeklyRequestsLimit: secondaryWindow?.requestsLimit,
        weeklyWindowMinutes: secondaryWindow?.windowMinutes,
        weeklyResetTime: secondaryWindow?.resetTime,
        monthlyPercentage: monthlyWindow?.percentage,
        monthlyWindowPresent: monthlyWindow?.present,
        monthlyRequestsLeft: monthlyWindow?.requestsLeft,
        monthlyRequestsLimit: monthlyWindow?.requestsLimit,
        monthlyWindowMinutes: monthlyWindow?.windowMinutes,
        monthlyResetTime: monthlyWindow?.resetTime,
        codeReviewPercentage: codeReview.percentage ?? 0,
        codeReviewWindowPresent: codeReview.present,
        codeReviewRequestsLeft: codeReview.requestsLeft,
        codeReviewRequestsLimit: codeReview.requestsLimit,
        codeReviewWindowMinutes: codeReview.windowMinutes,
        codeReviewResetTime: codeReview.resetTime,
        additionalRateLimits: parseAdditionalRateLimits(raw["additional_rate_limits"] ?? raw["additionalRateLimits"]),
        credits: parseCredits(raw["credits"]),
        rawData: raw
    };
}
//# sourceMappingURL=quota.js.map