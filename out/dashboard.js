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
exports.DashboardPanel = void 0;
const vscode = __importStar(require("vscode"));
class DashboardPanel {
    constructor(context) {
        this.context = context;
    }
    show(accounts, onMessage) {
        if (!this.panel) {
            this.panel = vscode.window.createWebviewPanel("codexMultiLoginDashboard", "Codex Multi login", vscode.ViewColumn.One, { enableScripts: true });
            this.panel.onDidDispose(() => {
                this.panel = undefined;
            });
            this.panel.webview.onDidReceiveMessage((message) => onMessage(message));
        }
        this.panel.webview.html = this.render(accounts);
    }
    render(accounts) {
        const rows = accounts
            .map((account) => `
          <tr>
            <td>${escapeHtml(account.email)}</td>
            <td>${escapeHtml(account.planType ?? "-")}</td>
            <td>${account.isActive ? "active" : ""}</td>
            <td>${account.quotaSummary ? `${account.quotaSummary.hourlyPercentage}% / ${account.quotaSummary.weeklyPercentage}%` : "-"}</td>
          </tr>`)
            .join("");
        return `<!doctype html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body { font-family: system-ui, sans-serif; padding: 16px; background: linear-gradient(180deg, #0f172a, #111827); color: #e5e7eb; }
          button { margin-right: 8px; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border-bottom: 1px solid #334155; padding: 8px; text-align: left; }
          .actions { margin-bottom: 12px; }
        </style>
      </head>
      <body>
        <h1>Codex Multi login</h1>
        <div class="actions">
          <button onclick="send('addAccount')">Add Account</button>
          <button onclick="send('importCurrentAuth')">Import auth.json</button>
          <button onclick="send('refreshAll')">Refresh All</button>
        </div>
        <table>
          <thead>
            <tr><th>Email</th><th>Plan</th><th>State</th><th>Quota</th></tr>
          </thead>
          <tbody>${rows || "<tr><td colspan='4'>No accounts yet.</td></tr>"}</tbody>
        </table>
        <script>
          const vscode = acquireVsCodeApi();
          function send(command) { vscode.postMessage({ command }); }
        </script>
      </body>
      </html>`;
    }
}
exports.DashboardPanel = DashboardPanel;
function escapeHtml(input) {
    return input.replace(/[&<>"']/g, (ch) => {
        switch (ch) {
            case "&": return "&amp;";
            case "<": return "&lt;";
            case ">": return "&gt;";
            case '"': return "&quot;";
            case "'": return "&#39;";
            default: return ch;
        }
    });
}
//# sourceMappingURL=dashboard.js.map