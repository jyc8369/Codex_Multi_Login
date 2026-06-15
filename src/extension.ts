import * as vscode from "vscode";
import { prepareOAuthLoginSession, runPreparedOAuthLoginSession } from "./auth/oauth";
import { DashboardPanel } from "./dashboard";
import { AccountsStore } from "./storage/accounts";

let store: AccountsStore | undefined;
let dashboard: DashboardPanel | undefined;
let outputChannel: vscode.OutputChannel | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  store = new AccountsStore(context);
  dashboard = new DashboardPanel(context);
  outputChannel = vscode.window.createOutputChannel("Codex Multi login");
  await store.init();

  const openDashboard = async (): Promise<void> => {
    const accounts = await store!.list();
    dashboard!.show(accounts, async (message) => {
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
    });
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("codexMultiLogin.openDashboard", openDashboard),
    vscode.commands.registerCommand("codexMultiLogin.addAccount", async () => {
      const session = prepareOAuthLoginSession();
      const tokens = await runPreparedOAuthLoginSession(session);
      await store!.addTokens(tokens, true);
      await openDashboard();
    }),
    vscode.commands.registerCommand("codexMultiLogin.importJson", async () => {
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
      await store!.exportToJsonFile(picked.fsPath);
      void vscode.window.showInformationMessage("Accounts exported to JSON.");
      await openDashboard();
    }),
    vscode.commands.registerCommand("codexMultiLogin.switchAccount", async (argAccountId?: string) => {
      if (typeof argAccountId === "string" && argAccountId) {
        const switched = await store!.switchAccount(argAccountId);
        if (switched) {
          const choice = await vscode.window.showInformationMessage(
            `Switched to ${switched.email}. ` + "Reload VS Code to refresh the workspace state.",
            "Reload VS Code",
            "Dismiss"
          );
          if (choice === "Reload VS Code") {
            await vscode.commands.executeCommand("workbench.action.reloadWindow");
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
        const switched = await store!.switchAccount(picked.id);
        if (switched) {
          const choice = await vscode.window.showInformationMessage(
            `Switched to ${switched.email}. ` + "Reload VS Code to refresh the workspace state.",
            "Reload VS Code",
            "Dismiss"
          );
          if (choice === "Reload VS Code") {
            await vscode.commands.executeCommand("workbench.action.reloadWindow");
          }
        }
        await openDashboard();
      }
    }),
    vscode.commands.registerCommand("codexMultiLogin.deleteAccount", async (argAccountId?: string) => {
      if (!argAccountId) {
        return;
      }
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
      void vscode.window.showInformationMessage(`Deleted ${account.email}.`);
      await openDashboard();
    }),
    vscode.commands.registerCommand("codexMultiLogin.refreshQuota", async () => {
      const accounts = await store!.list();
      const active = accounts.find((account) => account.isActive) ?? accounts[0];
      if (active) {
        await store!.refreshAccount(active.id, outputChannel);
        await openDashboard();
      }
    }),
    vscode.commands.registerCommand("codexMultiLogin.refreshAllQuotas", async () => {
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
