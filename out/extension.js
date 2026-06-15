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
async function activate(context) {
    store = new accounts_1.AccountsStore(context);
    dashboard = new dashboard_1.DashboardPanel(context);
    await store.init();
    const openDashboard = async () => {
        const accounts = await store.list();
        dashboard.show(accounts, async (message) => {
            const command = message.command;
            if (command === "addAccount") {
                await vscode.commands.executeCommand("codexMultiLogin.addAccount");
            }
            if (command === "importCurrentAuth") {
                await vscode.commands.executeCommand("codexMultiLogin.importCurrentAuth");
            }
            if (command === "refreshAll") {
                await vscode.commands.executeCommand("codexMultiLogin.refreshAllQuotas");
            }
        });
    };
    context.subscriptions.push(vscode.commands.registerCommand("codexMultiLogin.openDashboard", openDashboard), vscode.commands.registerCommand("codexMultiLogin.addAccount", async () => {
        const session = (0, oauth_1.prepareOAuthLoginSession)();
        const tokens = await (0, oauth_1.runPreparedOAuthLoginSession)(session);
        await store.addTokens(tokens, true);
        await openDashboard();
    }), vscode.commands.registerCommand("codexMultiLogin.importCurrentAuth", async () => {
        const imported = await store.importCurrentAuth();
        if (!imported) {
            void vscode.window.showInformationMessage("No auth.json was found.");
        }
        await openDashboard();
    }), vscode.commands.registerCommand("codexMultiLogin.switchAccount", async () => {
        const accounts = await store.list();
        const picked = await vscode.window.showQuickPick(accounts.map((account) => ({ label: account.email, description: account.isActive ? "active" : "", id: account.id })), { placeHolder: "Choose account" });
        if (picked) {
            await store.switchAccount(picked.id);
            await openDashboard();
        }
    }), vscode.commands.registerCommand("codexMultiLogin.refreshQuota", async () => {
        const accounts = await store.list();
        const active = accounts.find((account) => account.isActive) ?? accounts[0];
        if (active) {
            await store.refreshAccount(active.id);
            await openDashboard();
        }
    }), vscode.commands.registerCommand("codexMultiLogin.refreshAllQuotas", async () => {
        await store.refreshAll();
        await openDashboard();
    }));
}
function deactivate() {
    store = undefined;
    dashboard = undefined;
}
//# sourceMappingURL=extension.js.map