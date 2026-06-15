const vscode = acquireVsCodeApi();
const modal = document.getElementById('settingsModal');
const themeSelect = document.getElementById('themeSelect');
const localeSelect = document.getElementById('localeSelect');

function send(command, accountId, value) {
  vscode.postMessage(accountId ? { command, accountId } : value ? { command, value } : { command });
}

function openSettings() {
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeSettings() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

function applySettings() {
  send('setTheme', null, themeSelect.value);
  send('setLocale', null, localeSelect.value);
  closeSettings();
}

modal.addEventListener('click', (event) => {
  if (event.target === modal) closeSettings();
});
