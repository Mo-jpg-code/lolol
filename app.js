const state = {
  drives: [],
  activeDriveId: null,
  logs: {},
  notes: localStorage.getItem('aurora-notes') ?? ''
};

const storageKey = 'aurora-drives';

function loadState() {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        state.drives = parsed;
      }
    }
  } catch (error) {
    console.error('Failed to load drives', error);
  }
}

function persistState() {
  localStorage.setItem(storageKey, JSON.stringify(state.drives));
}

function formatGB(value) {
  return `${value.toFixed(2)} GB`;
}

function createDriveElement(drive) {
  const card = document.createElement('div');
  card.className = 'drive-card';
  card.innerHTML = `
    <div class="drive-info">
      <h3>${drive.name}</h3>
      <div class="drive-meta">
        <span>${formatGB(drive.used)} / ${formatGB(drive.capacity)}</span>
        <span>${drive.files.length} files</span>
      </div>
      <div class="progress"><div class="progress-fill" style="width: ${Math.min(100, (drive.used / drive.capacity) * 100)}%"></div></div>
    </div>
    <div class="drive-actions">
      <button class="primary" data-action="inspect">Inspect</button>
      <button class="ghost" data-action="duplicate">Clone</button>
      <button class="danger" data-action="delete">Delete</button>
    </div>
  `;

  card.querySelector('[data-action="inspect"]').addEventListener('click', () => openDriveModal(drive.id));
  card.querySelector('[data-action="duplicate"]').addEventListener('click', () => duplicateDrive(drive.id));
  card.querySelector('[data-action="delete"]').addEventListener('click', () => deleteDrive(drive.id));

  return card;
}

function renderDrives() {
  const container = document.getElementById('drive-container');
  const emptyState = document.getElementById('drive-empty');
  container.innerHTML = '';

  if (state.drives.length === 0) {
    emptyState.style.display = 'block';
  } else {
    emptyState.style.display = 'none';
    state.drives.forEach((drive) => container.appendChild(createDriveElement(drive)));
  }

  renderStats();
}

function renderStats() {
  const totalCapacity = state.drives.reduce((sum, drive) => sum + drive.capacity, 0);
  const totalUsed = state.drives.reduce((sum, drive) => sum + drive.used, 0);
  const totalFree = totalCapacity - totalUsed;

  document.getElementById('total-drives').textContent = state.drives.length;
  document.getElementById('total-capacity').textContent = totalCapacity ? formatGB(totalCapacity) : '0 GB';
  document.getElementById('total-used').textContent = totalUsed ? formatGB(totalUsed) : '0 GB';
  document.getElementById('total-free').textContent = totalCapacity ? formatGB(totalFree) : '0 GB';
}

function createDrive({ name, capacity }) {
  const id = crypto.randomUUID();
  const drive = {
    id,
    name,
    capacity,
    used: 0,
    files: []
  };

  state.drives.push(drive);
  state.logs[id] = [];
  persistState();
  renderDrives();
  appendLog(id, `Created drive “${name}” with capacity ${formatGB(capacity)}.`);
}

function duplicateDrive(id) {
  const drive = state.drives.find((d) => d.id === id);
  if (!drive) return;

  const name = `${drive.name} Copy`;
  createDrive({ name, capacity: drive.capacity });

  const newDrive = state.drives[state.drives.length - 1];
  newDrive.files = drive.files.map((file) => ({ ...file, id: crypto.randomUUID() }));
  newDrive.used = drive.used;
  state.logs[newDrive.id] = [...(state.logs[id] ?? []), `Cloned from ${drive.name}.`];
  persistState();
  renderDrives();
}

function deleteDrive(id) {
  const drive = state.drives.find((d) => d.id === id);
  if (!drive) return;

  if (!confirm(`Delete drive “${drive.name}”? This will erase all simulated data.`)) {
    return;
  }

  state.drives = state.drives.filter((d) => d.id !== id);
  delete state.logs[id];
  persistState();
  renderDrives();
}

function updateDriveUsage(drive) {
  drive.used = drive.files.reduce((sum, file) => sum + file.size, 0);
  drive.used = Math.min(drive.used, drive.capacity);
}

function appendLog(id, message) {
  if (!state.logs[id]) state.logs[id] = [];
  const timestamp = new Date().toLocaleTimeString();
  const entry = `[${timestamp}] ${message}`;
  state.logs[id].unshift(entry);
  if (state.logs[id].length > 40) state.logs[id].pop();
  if (state.activeDriveId === id) {
    renderLog();
  }
}

function openDriveModal(id) {
  const modal = document.getElementById('drive-modal');
  state.activeDriveId = id;
  renderDriveModal();
  modal.classList.remove('hidden');
}

function closeDriveModal() {
  document.getElementById('drive-modal').classList.add('hidden');
  state.activeDriveId = null;
}

function renderDriveModal() {
  const drive = state.drives.find((d) => d.id === state.activeDriveId);
  if (!drive) return;

  document.getElementById('modal-title').textContent = `${drive.name} — Drive Inspector`;
  document.getElementById('modal-used').textContent = `${formatGB(drive.used)} used`;
  document.getElementById('modal-free').textContent = `${formatGB(drive.capacity - drive.used)} free`;
  document.getElementById('modal-progress').style.width = `${Math.min(100, (drive.used / drive.capacity) * 100)}%`;

  const rows = document.getElementById('file-rows');
  const empty = document.getElementById('file-empty');
  rows.innerHTML = '';

  if (drive.files.length === 0) {
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    drive.files.forEach((file) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${file.name}</td>
        <td>${file.size.toFixed(2)}</td>
        <td>${file.type}</td>
        <td><button class="ghost" data-file="${file.id}">Remove</button></td>
      `;
      row.querySelector('button').addEventListener('click', () => removeFile(file.id));
      rows.appendChild(row);
    });
  }

  renderLog();
}

function renderLog() {
  const drive = state.drives.find((d) => d.id === state.activeDriveId);
  if (!drive) return;
  const log = state.logs[drive.id] ?? [];
  const container = document.getElementById('log-entries');
  container.innerHTML = '';
  if (!log.length) {
    const empty = document.createElement('li');
    empty.textContent = 'No activity logged yet.';
    container.appendChild(empty);
    return;
  }
  log.forEach((entry) => {
    const li = document.createElement('li');
    li.textContent = entry;
    container.appendChild(li);
  });
}

function removeFile(fileId) {
  const drive = state.drives.find((d) => d.id === state.activeDriveId);
  if (!drive) return;

  drive.files = drive.files.filter((file) => file.id !== fileId);
  updateDriveUsage(drive);
  persistState();
  renderDriveModal();
  renderDrives();
  appendLog(drive.id, `Removed file (${fileId.slice(0, 6)}…).`);
}

function addFileToDrive({ name, size, type }) {
  const drive = state.drives.find((d) => d.id === state.activeDriveId);
  if (!drive) return;

  if (drive.used + size > drive.capacity) {
    alert('Not enough capacity. Try reducing the file size or expanding the drive.');
    return;
  }

  const file = {
    id: crypto.randomUUID(),
    name,
    size,
    type
  };

  drive.files.push(file);
  updateDriveUsage(drive);
  persistState();
  renderDriveModal();
  renderDrives();
  appendLog(drive.id, `Added file “${name}” (${size.toFixed(2)} GB, ${type}).`);
}

function promptNewFile() {
  const name = prompt('File name');
  if (!name) return;
  const size = Number(prompt('Size in GB (decimal)'));
  if (!Number.isFinite(size) || size <= 0) {
    alert('Please provide a valid numeric size.');
    return;
  }
  const type = prompt('Type (e.g. Benchmark, Snapshot, Dataset)') || 'Benchmark';
  addFileToDrive({ name, size, type });
}

function runStressTest() {
  const drive = state.drives.find((d) => d.id === state.activeDriveId);
  if (!drive) return;

  let available = drive.capacity - drive.used;
  if (available <= 0) {
    alert('Drive is already full. Free some space before stress testing.');
    return;
  }

  let writes = 0;
  while (available > 0) {
    const block = Math.max(0.5, Number((Math.random() * 3).toFixed(2)));
    if (block > available) break;
    drive.files.push({
      id: crypto.randomUUID(),
      name: `Stress Block ${writes + 1}`,
      size: block,
      type: 'Stress'
    });
    available -= block;
    writes += 1;
  }
  updateDriveUsage(drive);
  persistState();
  renderDriveModal();
  renderDrives();
  appendLog(drive.id, `Stress test simulated ${writes} sequential writes.`);
}

function wipeDrive() {
  const drive = state.drives.find((d) => d.id === state.activeDriveId);
  if (!drive) return;
  if (!confirm(`Wipe all simulated data from “${drive.name}”?`)) return;
  drive.files = [];
  updateDriveUsage(drive);
  persistState();
  renderDriveModal();
  renderDrives();
  appendLog(drive.id, 'Drive wiped clean.');
}

function resetLab() {
  if (!confirm('Reset all drives and test logs?')) return;
  state.drives = [];
  state.logs = {};
  persistState();
  renderDrives();
}

function updateClock() {
  const now = new Date();
  const time = new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(now);
  document.getElementById('status-time').textContent = time;
}

function setupNotes() {
  const modal = document.getElementById('notes-modal');
  const editor = document.getElementById('notes-editor');
  editor.value = state.notes;

  document.getElementById('open-notes').addEventListener('click', () => {
    modal.classList.remove('hidden');
  });

  document.getElementById('close-notes').addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  document.getElementById('save-notes').addEventListener('click', () => {
    state.notes = editor.value;
    localStorage.setItem('aurora-notes', state.notes);
  });

  document.getElementById('clear-notes').addEventListener('click', () => {
    if (!confirm('Clear all notes?')) return;
    editor.value = '';
    state.notes = '';
    localStorage.removeItem('aurora-notes');
  });
}

function setupDockShortcuts() {
  document.getElementById('new-drive').addEventListener('click', () => {
    document.getElementById('drive-name').focus();
  });

  document.getElementById('new-stress-test').addEventListener('click', () => {
    if (!state.drives.length) {
      alert('Create a drive before running a stress test.');
      return;
    }
    const latest = state.drives[state.drives.length - 1];
    openDriveModal(latest.id);
    runStressTest();
  });
}

function setupDriveModalActions() {
  document.getElementById('close-modal').addEventListener('click', closeDriveModal);
  document.getElementById('add-file').addEventListener('click', promptNewFile);
  document.getElementById('run-test').addEventListener('click', runStressTest);
  document.getElementById('wipe-drive').addEventListener('click', wipeDrive);
  document.getElementById('clear-log').addEventListener('click', () => {
    const drive = state.drives.find((d) => d.id === state.activeDriveId);
    if (!drive) return;
    state.logs[drive.id] = [];
    renderLog();
  });
}

function setupForm() {
  const form = document.getElementById('drive-form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = document.getElementById('drive-name').value.trim();
    const capacity = Number(document.getElementById('drive-capacity').value);

    if (!name) {
      alert('Drive name is required.');
      return;
    }

    if (!Number.isFinite(capacity) || capacity <= 0) {
      alert('Capacity must be a positive number.');
      return;
    }

    createDrive({ name, capacity });
    form.reset();
    document.getElementById('drive-name').focus();
  });

  document.getElementById('reset-drives').addEventListener('click', resetLab);
}

function init() {
  loadState();
  state.drives.forEach((drive) => {
    if (!state.logs[drive.id]) state.logs[drive.id] = [];
  });
  renderDrives();
  setupForm();
  setupDriveModalActions();
  setupDockShortcuts();
  setupNotes();
  updateClock();
  setInterval(updateClock, 10_000);
}

document.addEventListener('DOMContentLoaded', init);
