import * as vscode from "vscode";
import { CodexAccountRecord, CodexAdditionalQuotaLimit, CodexQuotaSummary } from "./types";

export class DashboardPanel {
  private panel: vscode.WebviewPanel | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {}

  show(accounts: CodexAccountRecord[], onMessage: (message: unknown) => Promise<void> | void): void {
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        "codexMultiLoginDashboard",
        "Codex Multi login",
        vscode.ViewColumn.One,
        { enableScripts: true }
      );
      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });
      this.panel.webview.onDidReceiveMessage((message) => onMessage(message));
    }

    this.panel.webview.html = this.render(accounts);
  }

  private render(accounts: CodexAccountRecord[]): string {
    const cards = accounts
      .map((account) => renderAccountCard(account))
      .join("");

    const activeCount = accounts.filter((account) => account.isActive).length;

    return `<!doctype html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          :root {
            --bg-base: #0d1117;
            --bg-surface: #161b22;
            --bg-elevated: #1c2333;
            --border-default: #30363d;
            --text-primary: #e6edf3;
            --text-secondary: #8b949e;
            --accent-blue: #388bfd;
            --green: #2a6e3f;
            --yellow: #eab308;
            --orange: #e18a3b;
            --red: #c12c1f;
            --gray: #6e7681;
          }

          * { box-sizing: border-box; }

          body {
            margin: 0;
            padding: 24px;
            background: var(--bg-base);
            color: var(--text-primary);
            font-family: -apple-system, "Segoe UI", sans-serif;
          }

          .shell {
            max-width: 920px;
            margin: 0 auto;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 16px;
            margin-bottom: 18px;
          }

          .brand-kicker {
            text-transform: uppercase;
            letter-spacing: 0.16em;
            font-size: 11px;
            color: var(--text-secondary);
            margin-bottom: 8px;
          }

          h1 {
            margin: 0;
            font-size: 26px;
            line-height: 1.1;
          }

          .subtitle {
            margin-top: 8px;
            color: var(--text-secondary);
            line-height: 1.5;
          }

          .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }

          button {
            border: 1px solid var(--border-default);
            background: linear-gradient(180deg, rgba(56, 139, 253, 0.16), rgba(56, 139, 253, 0.08));
            color: var(--text-primary);
            padding: 10px 14px;
            border-radius: 999px;
            font: inherit;
            font-weight: 600;
            cursor: pointer;
          }

          button.secondary {
            background: rgba(255, 255, 255, 0.04);
          }

          button.card-action {
            padding: 7px 11px;
            font-size: 12px;
            font-weight: 700;
            background: rgba(255, 255, 255, 0.03);
          }

          .summary {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
          }

          .summary-card {
            flex: 1;
            background: var(--bg-surface);
            border: 1px solid var(--border-default);
            border-radius: 14px;
            padding: 14px 16px;
          }

          .summary-label {
            color: var(--text-secondary);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .summary-value {
            margin-top: 8px;
            font-size: 22px;
            font-weight: 800;
          }

          .summary-detail {
            margin-top: 4px;
            color: var(--text-secondary);
            font-size: 13px;
          }

          .account-list {
            display: flex;
            flex-direction: column;
            gap: 14px;
          }

          .account-card {
            background: var(--bg-surface);
            border: 1px solid var(--border-default);
            border-radius: 14px;
            padding: 14px 16px;
          }

          .account-card.active {
            border-color: rgba(56, 139, 253, 0.5);
            box-shadow: 0 0 0 1px rgba(56, 139, 253, 0.15), 0 14px 34px rgba(56, 139, 253, 0.12);
            background: linear-gradient(180deg, #161b22, #1c2333);
          }

          .account-card.inactive {
            opacity: 0.78;
          }

          .card-head {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
            flex-wrap: wrap;
            justify-content: flex-start;
          }

          .card-actions {
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .email {
            font-weight: 700;
            font-size: 14px;
            flex: 0 1 auto;
            min-width: 220px;
          }

          .pill {
            display: inline-flex;
            align-items: center;
            padding: 3px 9px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
          }

          .pill.plan-free { background: rgba(110,118,129,0.2); color: var(--gray); }
          .pill.plan-plus { background: rgba(56,139,253,0.15); color: var(--accent-blue); }
          .pill.plan-pro  { background: rgba(163,113,247,0.15); color: #a371f7; }
          .pill.status-active   { background: rgba(42,110,63,0.2); color: #3fb950; }
          .pill.status-inactive { background: rgba(110,118,129,0.2); color: var(--gray); }
          .pill.credit-none { background: rgba(110,118,129,0.14); color: var(--text-secondary); }
          .pill.credit-available { background: rgba(56,139,253,0.15); color: var(--accent-blue); }
          .pill.credit-unlimited { background: rgba(42,110,63,0.2); color: #3fb950; }

          .metrics-row {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
          }

          .metric {
            background: var(--bg-elevated);
            border: 1px solid var(--border-default);
            border-radius: 10px;
            padding: 10px;
            min-height: 100px;
          }

          .metric-label {
            font-size: 11px;
            color: var(--text-secondary);
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }

          .metric-value {
            font-size: 16px;
            font-weight: 800;
            margin-bottom: 6px;
          }

          .metric-bar {
            height: 5px;
            border-radius: 999px;
            background: var(--border-default);
            overflow: hidden;
            margin-bottom: 8px;
          }

          .metric-bar > span {
            display: block;
            height: 100%;
            border-radius: 999px;
          }

          .metric-meta {
            color: var(--text-secondary);
            font-size: 11px;
            line-height: 1.4;
            min-height: 32px;
          }

          .color-green  { color: #3fb950; }
          .color-yellow { color: var(--yellow); }
          .color-orange { color: var(--orange); }
          .color-red    { color: var(--red); }
          .bar-green  { background: #3fb950; }
          .bar-yellow { background: var(--yellow); }
          .bar-orange { background: var(--orange); }
          .bar-red    { background: var(--red); }
          .bar-blue   { background: var(--accent-blue); }

          details.more {
            margin-top: 10px;
            border: 1px solid var(--border-default);
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.02);
            overflow: hidden;
          }

          details.more > summary {
            cursor: pointer;
            list-style: none;
            padding: 10px 12px;
            color: var(--text-secondary);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          details.more > summary::-webkit-details-marker {
            display: none;
          }

          .more-body {
            padding: 0 12px 12px;
          }

          .extra-list {
            display: grid;
            gap: 8px;
          }

          .extra-row {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 9px 10px;
            border-radius: 10px;
            border: 1px solid var(--border-default);
            background: rgba(255, 255, 255, 0.03);
            flex-wrap: wrap;
          }

          .extra-name {
            min-width: 160px;
            font-size: 12px;
            font-weight: 700;
            color: var(--text-primary);
          }

          .extra-value {
            color: var(--accent-blue);
            font-size: 12px;
            font-weight: 700;
          }

          .extra-meta {
            color: var(--text-secondary);
            font-size: 11px;
          }

          .muted {
            color: var(--text-secondary);
          }

          .empty {
            padding: 24px 0;
            text-align: center;
            color: var(--text-secondary);
          }

          @media (max-width: 860px) {
            .header {
              flex-direction: column;
              align-items: flex-start;
            }

            .summary {
              flex-direction: column;
            }

            .metrics-row {
              grid-template-columns: 1fr 1fr;
            }
          }
        </style>
      </head>
      <body>
        <div class="shell">
          <div class="header">
            <div>
              <div class="brand-kicker">Codex Multi login</div>
              <h1>Account dashboard</h1>
              <div class="subtitle">Card view for accounts, quota, limits, and credits. Active accounts are highlighted.</div>
            </div>
            <div class="actions">
              <button onclick="send('addAccount')">Add Account</button>
              <button class="secondary" onclick="send('importJson')">Import / Export JSON</button>
              <button class="secondary" onclick="send('refreshAll')">Refresh All</button>
            </div>
          </div>

          <div class="summary">
            <div class="summary-card">
              <div class="summary-label">Saved Accounts</div>
              <div class="summary-value">${accounts.length}</div>
              <div class="summary-detail">Accounts in this workspace.</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Active Accounts</div>
              <div class="summary-value">${activeCount}</div>
              <div class="summary-detail">Cards highlighted as active.</div>
            </div>
          </div>

          <div class="account-list">
            ${cards || '<div class="empty">No accounts yet. Use Add Account or Import JSON to get started.</div>'}
          </div>
        </div>
        <script>
          const vscode = acquireVsCodeApi();
          function send(command, accountId) { vscode.postMessage(accountId ? { command, accountId } : { command }); }
        </script>
      </body>
      </html>`;
  }
}

function renderAccountCard(account: CodexAccountRecord): string {
  const quota = account.quotaSummary;
  const planClass = planClassName(account.planType);
  const stateClass = account.isActive ? "status-active" : "status-inactive";
  const cardClass = account.isActive ? "account-card active" : "account-card inactive";
  const planContext = planQuotaContext(account.planType);

  return `
    <div class="${cardClass}">
      <div class="card-head">
        <span class="email">${escapeHtml(account.email)}</span>
        <span class="pill ${planClass}">${escapeHtml((account.planType ?? "unknown").toUpperCase())}</span>
        <span class="pill ${stateClass}">${account.isActive ? "ACTIVE" : "INACTIVE"}</span>
        ${renderCreditBadge(quota?.credits)}
        <span class="card-actions">
          <button class="card-action secondary" onclick="send('switchAccount', '${escapeJs(account.id)}')">Switch Account</button>
          <button class="card-action secondary" onclick="send('deleteAccount', '${escapeJs(account.id)}')">Delete</button>
        </span>
      </div>
      <div class="metrics-row">
        ${renderMetricCard(
          "5-hour limit",
          quota?.hourlyWindowPresent ? quota.hourlyPercentage : undefined,
          "bar-green",
          renderQuotaCardMeta(
            quota?.hourlyWindowPresent,
            quota?.hourlyWindowMinutes,
            quota?.hourlyResetTime,
            quota?.hourlyRequestsLeft,
            quota?.hourlyRequestsLimit,
            planContext.hourly
          )
        )}
        ${renderMetricCard(
          "Weekly limit",
          quota?.weeklyWindowPresent ? quota.weeklyPercentage : undefined,
          "bar-yellow",
          renderQuotaCardMeta(
            quota?.weeklyWindowPresent,
            quota?.weeklyWindowMinutes,
            quota?.weeklyResetTime,
            quota?.weeklyRequestsLeft,
            quota?.weeklyRequestsLimit,
            planContext.weekly
          )
        )}
        ${renderMetricCard(
          "Months limit",
          quota?.monthlyWindowPresent ? quota.monthlyPercentage : undefined,
          "bar-blue",
          renderQuotaCardMeta(
            quota?.monthlyWindowPresent,
            quota?.monthlyWindowMinutes,
            quota?.monthlyResetTime,
            quota?.monthlyRequestsLeft,
            quota?.monthlyRequestsLimit,
            planContext.monthly
          )
        )}
        ${renderMetricCard(
          "Code review",
          quota?.codeReviewWindowPresent ? quota.codeReviewPercentage : undefined,
          "bar-orange",
          renderQuotaCardMeta(
            quota?.codeReviewWindowPresent,
            quota?.codeReviewWindowMinutes,
            quota?.codeReviewResetTime,
            quota?.codeReviewRequestsLeft,
            quota?.codeReviewRequestsLimit,
            "Code review usage is not available for this account."
          )
        )}
      </div>
      ${quota?.additionalRateLimits?.length ? renderMoreDetails(quota.additionalRateLimits) : ""}
    </div>`;
}

function renderMetricCard(label: string, percentage?: number, barClass = "bar-blue", meta = "No data"): string {
  const value = typeof percentage === "number" ? `${Math.max(0, Math.min(100, Math.round(percentage)))}%` : "-";
  const width = typeof percentage === "number" ? Math.max(0, Math.min(100, Math.round(percentage))) : 0;
  const effectiveBarClass = typeof percentage === "number" ? colorBarClassFromPercentage(width) : barClass;
  return `
    <div class="metric">
      <div class="metric-label">${escapeHtml(label)}</div>
      <div class="metric-value ${value === "-" ? "muted" : colorClassFromPercentage(width)}">${escapeHtml(value)}</div>
      <div class="metric-bar"><span class="${effectiveBarClass}" style="width:${width}%"></span></div>
      <div class="metric-meta">${escapeHtml(meta)}</div>
    </div>`;
}

function renderMoreDetails(limits: CodexAdditionalQuotaLimit[]): string {
  return `
    <details class="more">
      <summary>Show additional limits</summary>
      <div class="more-body">
        <div class="extra-list">
          ${limits.map(renderLimitCard).join("")}
        </div>
      </div>
    </details>`;
}

function renderLimitCard(limit: CodexAdditionalQuotaLimit): string {
  return `
    <div class="extra-row">
      <span class="extra-name">${escapeHtml(limit.limitName)}${limit.meteredFeature ? ` · ${escapeHtml(limit.meteredFeature)}` : ""}</span>
      <span class="extra-value">5h ${formatLimitValue(limit.hourlyPercentage)} · Week ${formatLimitValue(limit.weeklyPercentage)}</span>
      <span class="extra-meta">${escapeHtml(renderWindowMeta(limit.hourlyWindowMinutes, limit.hourlyResetTime, limit.hourlyRequestsLeft, limit.hourlyRequestsLimit))}</span>
    </div>`;
}

function formatLimitValue(value?: number): string {
  return typeof value === "number" ? `${Math.max(0, Math.min(100, Math.round(value)))}%` : "-";
}

function renderWindowMeta(
  windowMinutes?: number,
  resetTime?: number,
  requestsLeft?: number,
  requestsLimit?: number
): string {
  const parts: string[] = [];
  if (typeof requestsLeft === "number" && typeof requestsLimit === "number") {
    parts.push(`${requestsLeft}/${requestsLimit} remaining`);
  }
  if (typeof windowMinutes === "number") {
    parts.push(`${windowMinutes}m`);
  }
  if (typeof resetTime === "number") {
    parts.push(`reset ${new Date(resetTime * 1000).toLocaleString()}`);
  }
  return parts.length ? parts.join(" · ") : "No window data";
}

function renderQuotaMeta(
  windowMinutes?: number,
  resetTime?: number,
  requestsLeft?: number,
  requestsLimit?: number
): string {
  return renderWindowMeta(windowMinutes, resetTime, requestsLeft, requestsLimit);
}

function renderQuotaCardMeta(
  present: boolean | undefined,
  windowMinutes?: number,
  resetTime?: number,
  requestsLeft?: number,
  requestsLimit?: number,
  missingMessage?: string
): string {
  if (present) {
    return renderQuotaMeta(windowMinutes, resetTime, requestsLeft, requestsLimit);
  }
  return missingMessage ?? "No data returned.";
}

function planQuotaContext(planType?: string): { hourly: string; weekly: string; monthly: string } {
  const plan = (planType ?? "unknown").toLowerCase();
  if (plan.includes("free")) {
    return {
      hourly: "Not provided on the Free plan.",
      weekly: "Not provided on the Free plan.",
      monthly: "Monthly quota is the primary limit on the Free plan."
    };
  }

  if (plan.includes("plus")) {
    return {
      hourly: "No data returned.",
      weekly: "No data returned.",
      monthly: "Not provided on the Plus plan."
    };
  }

  return {
    hourly: "No data returned.",
    weekly: "No data returned.",
    monthly: "No data returned."
  };
}

function renderCreditBadge(credits?: CodexQuotaSummary["credits"]): string {
  if (!credits) {
    return `<span class="pill credit-none">- Credits</span>`;
  }
  if (credits.unlimited) {
    return `<span class="pill credit-unlimited">Unlimited Credits</span>`;
  }
  if (credits.hasCredits) {
    return `<span class="pill credit-available">${escapeHtml(credits.balance || "Credits available")}</span>`;
  }
  return `<span class="pill credit-none">- Credits</span>`;
}

function planClassName(planType?: string): string {
  const plan = (planType ?? "unknown").toLowerCase();
  if (plan.includes("pro")) return "plan-pro";
  if (plan.includes("plus")) return "plan-plus";
  return "plan-free";
}

function colorClassFromPercentage(value: number): string {
  if (value >= 80) return "color-green";
  if (value >= 50) return "color-yellow";
  if (value >= 20) return "color-orange";
  return "color-red";
}

function colorBarClassFromPercentage(value: number): string {
  if (value >= 80) return "bar-green";
  if (value >= 50) return "bar-yellow";
  if (value >= 20) return "bar-orange";
  return "bar-red";
}

function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return ch;
    }
  });
}

function escapeJs(input: string): string {
  return input.replace(/[\\'"]/g, (ch) => `\\${ch}`);
}
