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
let store;
let dashboard;
let outputChannel;
async function activate(context) {
    store = new accounts_1.AccountsStore(context);
    dashboard = new dashboard_1.DashboardPanel(context);
    outputChannel = vscode.window.createOutputChannel("Codex Multi login");
    await store.init();
    const openDashboard = async () => {
        const accounts = await store.list();
        dashboard.show(accounts, async (message) => {
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
        });
    };
    context.subscriptions.push(vscode.commands.registerCommand("codexMultiLogin.openDashboard", openDashboard), vscode.commands.registerCommand("codexMultiLogin.addAccount", async () => {
        const session = (0, oauth_1.prepareOAuthLoginSession)();
        const tokens = await (0, oauth_1.runPreparedOAuthLoginSession)(session);
        await store.addTokens(tokens, true);
        await openDashboard();
    }), vscode.commands.registerCommand("codexMultiLogin.importJson", async () => {
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
            if (!imported.length) {
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
        void vscode.window.showInformationMessage("Accounts exported to JSON.");
        await openDashboard();
    }), vscode.commands.registerCommand("codexMultiLogin.switchAccount", async (argAccountId) => {
        if (typeof argAccountId === "string" && argAccountId) {
            const switched = await store.switchAccount(argAccountId);
            if (switched) {
                const choice = await vscode.window.showInformationMessage(`Switched to ${switched.email}. ` + "Reload VS Code to refresh the workspace state.", "Reload VS Code", "Dismiss");
                if (choice === "Reload VS Code") {
                    await vscode.commands.executeCommand("workbench.action.reloadWindow");
                }
            }
            await openDashboard();
            return;
        }
        const accounts = await store.list();
        const picked = await vscode.window.showQuickPick(accounts.map((account) => ({ label: account.email, description: account.isActive ? "active" : "", id: account.id })), { placeHolder: "Choose account" });
        if (picked) {
            const switched = await store.switchAccount(picked.id);
            if (switched) {
                const choice = await vscode.window.showInformationMessage(`Switched to ${switched.email}. ` + "Reload VS Code to refresh the workspace state.", "Reload VS Code", "Dismiss");
                if (choice === "Reload VS Code") {
                    await vscode.commands.executeCommand("workbench.action.reloadWindow");
                }
            }
            await openDashboard();
        }
    }), vscode.commands.registerCommand("codexMultiLogin.deleteAccount", async (argAccountId) => {
        if (!argAccountId) {
            return;
        }
        const account = (await store.list()).find((item) => item.id === argAccountId);
        if (!account) {
            return;
        }
        const choice = await vscode.window.showWarningMessage(`Delete ${account.email}? This will remove the saved account and token.`, { modal: true }, "Delete", "Cancel");
        if (choice !== "Delete") {
            return;
        }
        await store.deleteAccount(argAccountId);
        void vscode.window.showInformationMessage(`Deleted ${account.email}.`);
        await openDashboard();
    }), vscode.commands.registerCommand("codexMultiLogin.refreshQuota", async () => {
        const accounts = await store.list();
        const active = accounts.find((account) => account.isActive) ?? accounts[0];
        if (active) {
            await store.refreshAccount(active.id, outputChannel);
            await openDashboard();
        }
    }), vscode.commands.registerCommand("codexMultiLogin.refreshAllQuotas", async () => {
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