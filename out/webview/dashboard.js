const vscode = acquireVsCodeApi();
const modal = document.getElementById('settingsModal');
const themeSelect = document.getElementById('themeSelect');
const localeSelect = document.getElementById('localeSelect');
const storageSelect = document.getElementById('storageSelect');
const editModeButton = document.getElementById('editModeButton');
const editModal = document.getElementById('editModal');
const accountList = document.querySelector('.account-list');
const editList = document.querySelector('.edit-list');
const persistedState = vscode.getState() || {};
let editModeEnabled = Boolean(persistedState.editMode);
let draggingEditAccountId = null;

function persistState() {
  vscode.setState({ editMode: editModeEnabled });
}

function syncEditModeUi() {
  if (editModeButton) {
    editModeButton.textContent = editModeEnabled
      ? editModeButton.dataset.labelExit
      : editModeButton.dataset.labelEnter;
  }
}

function openEditMode() {
  editModeEnabled = true;
  persistState();
  syncEditModeUi();
  closeSettings();
  if (editModal) {
    editModal.classList.add('open');
    editModal.setAttribute('aria-hidden', 'false');
  }
}

function closeEditMode() {
  editModeEnabled = false;
  persistState();
  syncEditModeUi();
  if (editModal) {
    editModal.classList.remove('open');
    editModal.setAttribute('aria-hidden', 'true');
  }
}

function send(command, accountId, value) {
  const message = { command };
  if (accountId) {
    message.accountId = accountId;
  }
  if (value) {
    if (command === 'moveAccount') {
      message.direction = value;
    } else {
      message.value = value;
    }
  }
  vscode.postMessage(message);
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
  send('setStorageMode', null, storageSelect.value);
  closeSettings();
}

function findCard(accountId) {
  return Array.from(document.querySelectorAll('.account-card')).find((card) => card.dataset.accountId === accountId) || null;
}

function findEditCard(accountId) {
  return Array.from(document.querySelectorAll('.edit-account-card')).find((card) => card.dataset.accountId === accountId) || null;
}

function setCardLoading(accountId, loading) {
  const card = findCard(accountId);
  if (!card) {
    return;
  }
  card.classList.toggle('refreshing', loading);
  card.dataset.refreshState = loading ? 'loading' : 'idle';
  card.querySelectorAll('button.card-action').forEach((button) => {
    if (button.dataset.allowWhileLoading === 'true') {
      return;
    }
    button.disabled = loading;
  });
}

function syncCardInteractiveState(card) {
  if (!card) {
    return;
  }
  card.removeAttribute('draggable');
}

function bindEditDragAndDrop() {
  if (!editList || editList.dataset.dragBound === 'true') {
    return;
  }
  editList.dataset.dragBound = 'true';

  editList.addEventListener('dragstart', (event) => {
    const card = event.target.closest('.edit-account-card');
    if (!card) {
      return;
    }
    draggingEditAccountId = card.dataset.accountId;
    card.classList.add('dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', card.dataset.accountId);
    }
  });

  editList.addEventListener('dragend', (event) => {
    const card = event.target.closest('.edit-account-card');
    draggingEditAccountId = null;
    if (card) {
      card.classList.remove('dragging');
    }
    editList.querySelectorAll('.drop-before, .drop-after').forEach((zone) => zone.classList.remove('drop-before', 'drop-after'));
  });

  editList.addEventListener('dragenter', (event) => {
    const card = event.target.closest('.edit-account-card');
    if (!card) {
      return;
    }
    event.preventDefault();
    if (!draggingEditAccountId || draggingEditAccountId === card.dataset.accountId) {
      return;
    }
    const rect = card.getBoundingClientRect();
    const isBefore = event.clientY < rect.top + rect.height / 2;
    card.classList.toggle('drop-before', isBefore);
    card.classList.toggle('drop-after', !isBefore);
  });

  editList.addEventListener('dragover', (event) => {
    const card = event.target.closest('.edit-account-card');
    if (card) {
      event.preventDefault();
    }
  });

  editList.addEventListener('dragleave', (event) => {
    const card = event.target.closest('.edit-account-card');
    if (card) {
      card.classList.remove('drop-before', 'drop-after');
    }
  });

  editList.addEventListener('drop', (event) => {
    const card = event.target.closest('.edit-account-card');
    if (!card) {
      return;
    }
    event.preventDefault();
    if (!draggingEditAccountId || draggingEditAccountId === card.dataset.accountId) {
      return;
    }
    const rect = card.getBoundingClientRect();
    const isBefore = event.clientY < rect.top + rect.height / 2;
    vscode.postMessage({
      command: 'moveAccount',
      accountId: draggingEditAccountId,
      targetAccountId: card.dataset.accountId,
      placement: isBefore ? 'before' : 'after'
    });
  });
}

function replaceCardHtml(accountId, html) {
  const card = findCard(accountId);
  if (!card) {
    return;
  }
  const fragment = document.createRange().createContextualFragment(html.trim());
  const nextCard = fragment.firstElementChild;
  if (!nextCard) {
    return;
  }
  syncCardInteractiveState(nextCard);
  card.replaceWith(nextCard);
}

modal.addEventListener('click', (event) => {
  if (event.target === modal) closeSettings();
});

window.addEventListener('message', (event) => {
  const message = event.data || {};
  if (message.command === 'refresh-start' && message.accountId) {
    setCardLoading(message.accountId, true);
  }
  if (message.command === 'refresh-success' && message.accountId && message.html) {
    replaceCardHtml(message.accountId, message.html);
  }
  if (message.command === 'refresh-error' && message.accountId && message.html) {
    replaceCardHtml(message.accountId, message.html);
  }
  if (message.command === 'refresh-batch-start') {
    document.body.classList.add('refresh-all-running');
  }
  if (message.command === 'refresh-batch-end') {
    document.body.classList.remove('refresh-all-running');
  }
});

syncEditModeUi();
if (editModal) {
  editModal.addEventListener('click', (event) => {
    if (event.target === editModal) {
      closeEditMode();
    }
  });
}
bindEditDragAndDrop();
