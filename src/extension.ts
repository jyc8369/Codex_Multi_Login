import * as vscode from "vscode";
import { prepareOAuthLoginSession, runPreparedOAuthLoginSession } from "./auth/oauth";
import { DashboardPanel } from "./dashboard";
import { AccountsStore } from "./storage/accounts";
import { ThemeMode, normalizeLocale } from "./localization";

let store: AccountsStore | undefined;
let dashboard: DashboardPanel | undefined;
let outputChannel: vscode.OutputChannel | undefined;

const LOCALE_KEY = "codexMultiLogin.locale";
const THEME_KEY = "codexMultiLogin.theme";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  outputChannel = vscode.window.createOutputChannel("Codex Multi login");
  const log = (level: "info" | "warn" | "error", message: string): void => {
    outputChannel?.appendLine(`[${level}] [extension] ${message}`);
  };
  store = new AccountsStore(context, outputChannel);
  dashboard = new DashboardPanel(context);
  await store.init();
  log("info", "activate");

  const openDashboard = async (): Promise<void> => {
    const accounts = await store!.list();
    log("info", `openDashboard accounts=${accounts.length} active=${accounts.filter((account) => account.isActive).length}`);
    const settings = {
      locale: normalizeLocale(context.globalState.get(LOCALE_KEY)),
      theme: (context.globalState.get(THEME_KEY) as ThemeMode | undefined) ?? "auto"
    };
    dashboard!.show(accounts, settings, async (message) => {
      const command = (message as { command?: string }).command;
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
        const accountId = (message as { accountId?: string }).accountId;
        if (accountId) {
          await vscode.commands.executeCommand("codexMultiLogin.switchAccount", accountId);
        }
      }
      if (command === "deleteAccount") {
        const accountId = (message as { accountId?: string }).accountId;
        if (accountId) {
          await vscode.commands.executeCommand("codexMultiLogin.deleteAccount", accountId);
        }
      }
      if (command === "refreshAccount") {
        const accountId = (message as { accountId?: string }).accountId;
        if (accountId) {
          await vscode.commands.executeCommand("codexMultiLogin.refreshAccount", accountId);
        }
      }
      if (command === "setLocale") {
        const value = (message as { value?: string }).value;
        await context.globalState.update(LOCALE_KEY, normalizeLocale(value));
        await openDashboard();
      }
      if (command === "setTheme") {
        const value = (message as { value?: string }).value;
        if (value === "auto" || value === "vscode" || value === "dark" || value === "light") {
          await context.globalState.update(THEME_KEY, value);
          await openDashboard();
        }
      }
    });
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("codexMultiLogin.openDashboard", openDashboard),
    vscode.commands.registerCommand("codexMultiLogin.addAccount", async () => {
      log("info", "addAccount start");
      const session = prepareOAuthLoginSession();
      const tokens = await runPreparedOAuthLoginSession(session);
      await store!.addTokens(tokens, true);
      log("info", `addAccount done accountId=${tokens.accountId ?? "unknown"}`);
      await openDashboard();
    }),
    vscode.commands.registerCommand("codexMultiLogin.importJson", async () => {
      log("info", "importJson start");
      const action = await vscode.window.showQuickPick(
        [
          { label: "Import JSON", description: "Load accounts from a JSON file." , id: "import" },
          { label: "Export JSON", description: "Save the current accounts to a JSON file.", id: "export" }
        ],
        { placeHolder: "Choose a JSON action" }
      );
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
        const imported = await store!.importFromJsonFile(picked[0].fsPath);
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
      await store!.exportToJsonFile(picked.fsPath);
      log("info", `exportJson path=${picked.fsPath}`);
      void vscode.window.showInformationMessage("Accounts exported to JSON.");
      await openDashboard();
    }),
    vscode.commands.registerCommand("codexMultiLogin.switchAccount", async (argAccountId?: string) => {
      if (typeof argAccountId === "string" && argAccountId) {
        log("info", `switchAccount direct id=${argAccountId}`);
        const switched = await store!.switchAccount(argAccountId);
        if (switched) {
          const choice = await vscode.window.showInformationMessage(
            `Switched to ${switched.email}. ` + "Reload VS Code to refresh the workspace state.",
            "Reload VS Code",
            "Dismiss"
          );
          if (choice === "Reload VS Code") {
            await vscode.commands.executeCommand("workbench.action.reloadWindow");
          } else {
            log("info", `switchAccount dismissed email=${switched.email}`);
          }
        }
        await openDashboard();
        return;
      }
      const accounts = await store!.list();
      const picked = await vscode.window.showQuickPick(
        accounts.map((account) => ({ label: account.email, description: account.isActive ? "active" : "", id: account.id })),
        { placeHolder: "Choose account" }
      );
      if (picked) {
        log("info", `switchAccount picked id=${picked.id}`);
        const switched = await store!.switchAccount(picked.id);
        if (switched) {
          const choice = await vscode.window.showInformationMessage(
            `Switched to ${switched.email}. ` + "Reload VS Code to refresh the workspace state.",
            "Reload VS Code",
            "Dismiss"
          );
          if (choice === "Reload VS Code") {
            await vscode.commands.executeCommand("workbench.action.reloadWindow");
          } else {
            log("info", `switchAccount dismissed email=${switched.email}`);
          }
        }
        await openDashboard();
      }
    }),
    vscode.commands.registerCommand("codexMultiLogin.deleteAccount", async (argAccountId?: string) => {
      if (!argAccountId) {
        return;
      }
      log("info", `deleteAccount start id=${argAccountId}`);
      const account = (await store!.list()).find((item) => item.id === argAccountId);
      if (!account) {
        return;
      }
      const choice = await vscode.window.showWarningMessage(
        `Delete ${account.email}? This will remove the saved account and token.`,
        { modal: true },
        "Delete",
        "Cancel"
      );
      if (choice !== "Delete") {
        return;
      }
      await store!.deleteAccount(argAccountId);
      log("info", `deleteAccount done id=${argAccountId}`);
      void vscode.window.showInformationMessage(`Deleted ${account.email}.`);
      await openDashboard();
    }),
    vscode.commands.registerCommand("codexMultiLogin.refreshAccount", async (argAccountId?: string) => {
      if (!argAccountId) {
        return;
      }
      log("info", `refreshAccount command id=${argAccountId}`);
      await store!.refreshAccount(argAccountId, outputChannel);
      await openDashboard();
    }),
    vscode.commands.registerCommand("codexMultiLogin.refreshQuota", async () => {
      const accounts = await store!.list();
      const active = accounts.find((account) => account.isActive) ?? accounts[0];
      if (active) {
        log("info", `refreshQuota command activeId=${active.id}`);
        await store!.refreshAccount(active.id, outputChannel);
        await openDashboard();
      } else {
        log("warn", "refreshQuota skipped no accounts available");
      }
    }),
    vscode.commands.registerCommand("codexMultiLogin.refreshAllQuotas", async () => {
      log("info", "refreshAllQuotas command");
      await store!.refreshAll(outputChannel);
      await openDashboard();
    })
  );
}

export function deactivate(): void {
  store = undefined;
  dashboard = undefined;
  outputChannel?.dispose();
  outputChannel = undefined;
}
