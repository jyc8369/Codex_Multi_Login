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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const oauth_1 = require("./auth/oauth");
const dashboard_1 = require("./dashboard");
const accounts_1 = require("./storage/accounts");
const localization_1 = require("./localization");
let store;
let dashboard;
let outputChannel;
const LOCALE_KEY = "codexMultiLogin.locale";
const THEME_KEY = "codexMultiLogin.theme";
async function activate(context) {
    outputChannel = vscode.window.createOutputChannel("Codex Multi login");
    const log = (level, message) => {
        outputChannel?.appendLine(`[${level}] [extension] ${message}`);
    };
    store = new accounts_1.AccountsStore(context, outputChannel);
    dashboard = new dashboard_1.DashboardPanel(context);
    await store.init();
    log("info", "activate");
    const openDashboard = async () => {
        const accounts = await store.list();
        log("info", `openDashboard accounts=${accounts.length} active=${accounts.filter((account) => account.isActive).length}`);
        const settings = {
            locale: (0, localization_1.normalizeLocale)(context.globalState.get(LOCALE_KEY)),
            theme: context.globalState.get(THEME_KEY) ?? "auto"
        };
        dashboard.show(accounts, settings, async (message) => {
            const command = message.command;
            if (command === "addAccount") {
                await vscode.commands.executeCommand("codexMultiLogin.addAccount");
            }
            if (command === "importJson") {
                await vscode.commands.executeCommand("codexMultiLogin.importJson");
            }
            if (command === "refreshAll") {
                await vscode.commands.executeCommand("codexMultiLogin.refreshAllQuotas");
            }
            if (command === "switchAccount") {
                const accountId = message.accountId;
                if (accountId) {
                    await vscode.commands.executeCommand("codexMultiLogin.switchAccount", accountId);
                }
            }
            if (command === "deleteAccount") {
                const accountId = message.accountId;
                if (accountId) {
                    await vscode.commands.executeCommand("codexMultiLogin.deleteAccount", accountId);
                }
            }
            if (command === "refreshAccount") {
                const accountId = message.accountId;
                if (accountId) {
                    await vscode.commands.executeCommand("codexMultiLogin.refreshAccount", accountId);
                }
            }
            if (command === "setLocale") {
                const value = message.value;
                await context.globalState.update(LOCALE_KEY, (0, localization_1.normalizeLocale)(value));
                await openDashboard();
            }
            if (command === "setTheme") {
                const value = message.value;
                if (value === "auto" || value === "vscode" || value === "dark" || value === "light") {
                    await context.globalState.update(THEME_KEY, value);
                    await openDashboard();
                }
            }
        });
    };
    context.subscriptions.push(vscode.commands.registerCommand("codexMultiLogin.openDashboard", openDashboard), vscode.commands.registerCommand("codexMultiLogin.addAccount", async () => {
        log("info", "addAccount start");
        const session = (0, oauth_1.prepareOAuthLoginSession)();
        const tokens = await (0, oauth_1.runPreparedOAuthLoginSession)(session);
        await store.addTokens(tokens, true);
        log("info", `addAccount done accountId=${tokens.accountId ?? "unknown"}`);
        await openDashboard();
    }), vscode.commands.registerCommand("codexMultiLogin.importJson", async () => {
        log("info", "importJson start");
        const action = await vscode.window.showQuickPick([
            { label: "Import JSON", description: "Load accounts from a JSON file.", id: "import" },
            { label: "Export JSON", description: "Save the current accounts to a JSON file.", id: "export" }
        ], { placeHolder: "Choose a JSON action" });
        if (!action) {
            return;
        }
        if (action.id === "import") {
            const picked = await vscode.window.showOpenDialog({
                canSelectMany: false,
                canSelectFiles: true,
                canSelectFolders: false,
                filters: { JSON: ["json"] },
                openLabel: "Import JSON"
            });
            if (!picked?.[0]) {
                return;
            }
            const imported = await store.importFromJsonFile(picked[0].fsPath);
            log("info", `importJson imported count=${imported.length}`);
            if (!imported.length) {
                log("warn", "importJson no valid account tokens found");
                void vscode.window.showInformationMessage("No valid account tokens were found in the JSON file.");
            }
            await openDashboard();
            return;
        }
        const picked = await vscode.window.showSaveDialog({
            saveLabel: "Export JSON",
            filters: { JSON: ["json"] },
            defaultUri: vscode.Uri.file("codex-accounts.json")
        });
        if (!picked) {
            return;
        }
        await store.exportToJsonFile(picked.fsPath);
        log("info", `exportJson path=${picked.fsPath}`);
        void vscode.window.showInformationMessage("Accounts exported to JSON.");
        await openDashboard();
    }), vscode.commands.registerCommand("codexMultiLogin.switchAccount", async (argAccountId) => {
        if (typeof argAccountId === "string" && argAccountId) {
            log("info", `switchAccount direct id=${argAccountId}`);
            const switched = await store.switchAccount(argAccountId);
            if (switched) {
                const choice = await vscode.window.showInformationMessage(`Switched to ${switched.email}. ` + "Reload VS Code to refresh the workspace state.", "Reload VS Code", "Dismiss");
                if (choice === "Reload VS Code") {
                    await vscode.commands.executeCommand("workbench.action.reloadWindow");
                }
                else {
                    log("info", `switchAccount dismissed email=${switched.email}`);
                }
            }
            await openDashboard();
            return;
        }
        const accounts = await store.list();
        const picked = await vscode.window.showQuickPick(accounts.map((account) => ({ label: account.email, description: account.isActive ? "active" : "", id: account.id })), { placeHolder: "Choose account" });
        if (picked) {
            log("info", `switchAccount picked id=${picked.id}`);
            const switched = await store.switchAccount(picked.id);
            if (switched) {
                const choice = await vscode.window.showInformationMessage(`Switched to ${switched.email}. ` + "Reload VS Code to refresh the workspace state.", "Reload VS Code", "Dismiss");
                if (choice === "Reload VS Code") {
                    await vscode.commands.executeCommand("workbench.action.reloadWindow");
                }
                else {
                    log("info", `switchAccount dismissed email=${switched.email}`);
                }
            }
            await openDashboard();
        }
    }), vscode.commands.registerCommand("codexMultiLogin.deleteAccount", async (argAccountId) => {
        if (!argAccountId) {
            return;
        }
        log("info", `deleteAccount start id=${argAccountId}`);
        const account = (await store.list()).find((item) => item.id === argAccountId);
        if (!account) {
            return;
        }
        const choice = await vscode.window.showWarningMessage(`Delete ${account.email}? This will remove the saved account and token.`, { modal: true }, "Delete", "Cancel");
        if (choice !== "Delete") {
            return;
        }
        await store.deleteAccount(argAccountId);
        log("info", `deleteAccount done id=${argAccountId}`);
        void vscode.window.showInformationMessage(`Deleted ${account.email}.`);
        await openDashboard();
    }), vscode.commands.registerCommand("codexMultiLogin.refreshAccount", async (argAccountId) => {
        if (!argAccountId) {
            return;
        }
        log("info", `refreshAccount command id=${argAccountId}`);
        await store.refreshAccount(argAccountId, outputChannel);
        await openDashboard();
    }), vscode.commands.registerCommand("codexMultiLogin.refreshQuota", async () => {
        const accounts = await store.list();
        const active = accounts.find((account) => account.isActive) ?? accounts[0];
        if (active) {
            log("info", `refreshQuota command activeId=${active.id}`);
            await store.refreshAccount(active.id, outputChannel);
            await openDashboard();
        }
        else {
            log("warn", "refreshQuota skipped no accounts available");
        }
    }), vscode.commands.registerCommand("codexMultiLogin.refreshAllQuotas", async () => {
        log("info", "refreshAllQuotas command");
        await store.refreshAll(outputChannel);
        await openDashboard();
    }));
}
function deactivate() {
    store = undefined;
    dashboard = undefined;
    outputChannel?.dispose();
    outputChannel = undefined;
}
//# sourceMappingURL=extension.js.map