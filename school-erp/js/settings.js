
const REQUIRED_SETTINGS_FIELDS = [
  { key: 'institutionName', label: 'Institution name' },
  { key: 'academicYear', label: 'Academic year' },
];

const LIST_EDITORS = [
  {
    field: 'classes',
    sectionId: 'settings-classes',
    formId: 'class-form',
    inputId: 'class-name',
    errorId: 'class-error',
    listId: 'class-list',
    bodyId: 'class-table-body',
    emptyId: 'class-empty',
    emptyError: 'Please enter a class name.',
    duplicateError: 'That class already exists.',
  },
  {
    field: 'sections',
    sectionId: 'settings-sections',
    formId: 'section-form',
    inputId: 'section-name',
    errorId: 'section-error',
    listId: 'section-list',
    bodyId: 'section-table-body',
    emptyId: 'section-empty',
    emptyError: 'Please enter a section name.',
    duplicateError: 'That section already exists.',
  },
];

function initSettingsPage() {

  if (!requireAuth()) {
    return;
  }

  showCurrentUser();

  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', logout);
  }

  if (getCurrentUserRole() !== 'Admin') {
    showAccessDenied();
    return;
  }

  setupSettingsForm();
  loadSettingsIntoForm();
  setupListEditors();
}

function showCurrentUser() {
  const user = getCurrentUser();
  if (!user) {
    return;
  }
  setText('current-username', user.username);
  setText('current-role', user.role);
}

function showAccessDenied() {
  ['settings-config', 'settings-classes', 'settings-sections'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) {
      el.hidden = true;
    }
  });
  const denied = document.getElementById('settings-denied');
  if (denied) {
    denied.hidden = false;
  }
}

function setupSettingsForm() {
  const form = document.getElementById('settings-form');
  const cancelButton = document.getElementById('settings-form-cancel');
  const config = document.getElementById('settings-config');

  if (!form || !config) {
    return;
  }

  config.hidden = false;

  form.addEventListener('submit', handleSettingsSubmit);

  if (cancelButton) {
    cancelButton.addEventListener('click', function () {
      loadSettingsIntoForm();
      clearSettingsError();
      clearSettingsStatus();
    });
  }
}

function loadSettingsIntoForm() {
  const settings = getSettings();
  setValue('institution-name', settings.institutionName);
  setValue('academic-year', settings.academicYear);
}

function handleSettingsSubmit(event) {
  event.preventDefault();

  const data = readSettingsForm();
  const missing = findMissingRequiredSettings(data);

  if (missing.length > 0) {
    clearSettingsStatus();
    showSettingsError(
      'Please fill in the required field' + (missing.length > 1 ? 's' : '') +
      ': ' + missing.join(', ') + '.'
    );
    return;
  }

  clearSettingsError();

  const existing = getSettings();
  const saved = saveSettings({
    institutionName: data.institutionName,
    academicYear: data.academicYear,
    classes: existing.classes,
    sections: existing.sections,
  });

  setValue('institution-name', saved.institutionName);
  setValue('academic-year', saved.academicYear);

  showSettingsStatus('Settings saved.');
}

function readSettingsForm() {
  return {
    institutionName: fieldValue('institution-name').trim(),
    academicYear: fieldValue('academic-year').trim(),
  };
}

function findMissingRequiredSettings(data) {
  return REQUIRED_SETTINGS_FIELDS
    .filter(function (field) { return data[field.key] === ''; })
    .map(function (field) { return field.label; });
}

function setupListEditors() {
  LIST_EDITORS.forEach(function (cfg) {
    const section = document.getElementById(cfg.sectionId);
    if (section) {
      section.hidden = false;
    }

    const form = document.getElementById(cfg.formId);
    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        handleListAdd(cfg);
      });
    }

    renderList(cfg);
  });
}

function handleListAdd(cfg) {
  const value = fieldValue(cfg.inputId).trim();

  if (value === '') {
    showListError(cfg, cfg.emptyError);
    return;
  }

  const settings = getSettings();
  const current = settings[cfg.field];
  const needle = value.toLowerCase();
  const isDuplicate = current.some(function (item) {
    return item.toLowerCase() === needle;
  });

  if (isDuplicate) {
    showListError(cfg, cfg.duplicateError);
    return;
  }

  persistListField(settings, cfg.field, current.concat([value]));

  clearListError(cfg);
  setValue(cfg.inputId, '');
  renderList(cfg);
}

function handleListRemove(cfg, value) {
  const settings = getSettings();
  const current = settings[cfg.field];

  let removed = false;
  const updated = current.filter(function (item) {
    if (!removed && item === value) {
      removed = true;
      return false;
    }
    return true;
  });

  if (!removed) {

    renderList(cfg);
    return;
  }

  persistListField(settings, cfg.field, updated);
  renderList(cfg);
}

function persistListField(existing, field, updatedArray) {
  saveSettings({
    institutionName: existing.institutionName,
    academicYear: existing.academicYear,
    classes: field === 'classes' ? updatedArray : existing.classes,
    sections: field === 'sections' ? updatedArray : existing.sections,
  });
}

function renderList(cfg) {
  const body = document.getElementById(cfg.bodyId);
  const listWrap = document.getElementById(cfg.listId);
  const empty = document.getElementById(cfg.emptyId);
  if (!body || !listWrap || !empty) {
    return;
  }

  const items = getSettings()[cfg.field];
  body.textContent = '';

  if (items.length === 0) {
    empty.hidden = false;
    listWrap.hidden = true;
    return;
  }

  empty.hidden = true;
  items.forEach(function (value) {
    body.appendChild(buildListRow(cfg, value));
  });
  listWrap.hidden = false;
}

function buildListRow(cfg, value) {
  const row = document.createElement('tr');

  const nameCell = document.createElement('td');
  nameCell.textContent = value;
  row.appendChild(nameCell);

  const actionCell = document.createElement('td');
  const wrap = document.createElement('div');
  wrap.className = 'row-actions';

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'btn-link btn-link-danger';
  removeButton.textContent = 'Remove';
  removeButton.addEventListener('click', function () {
    handleListRemove(cfg, value);
  });

  wrap.appendChild(removeButton);
  actionCell.appendChild(wrap);
  row.appendChild(actionCell);

  return row;
}

function showListError(cfg, message) {
  const el = document.getElementById(cfg.errorId);
  if (!el) {
    return;
  }
  el.textContent = message;
  el.hidden = false;
}

function clearListError(cfg) {
  const el = document.getElementById(cfg.errorId);
  if (!el) {
    return;
  }
  el.textContent = '';
  el.hidden = true;
}

function showSettingsError(message) {
  const el = document.getElementById('settings-form-error');
  if (!el) {
    return;
  }
  el.textContent = message;
  el.hidden = false;
}

function clearSettingsError() {
  const el = document.getElementById('settings-form-error');
  if (!el) {
    return;
  }
  el.textContent = '';
  el.hidden = true;
}

function showSettingsStatus(message) {
  const el = document.getElementById('settings-form-status');
  if (!el) {
    return;
  }
  el.textContent = message;
  el.hidden = false;
}

function clearSettingsStatus() {
  const el = document.getElementById('settings-form-status');
  if (!el) {
    return;
  }
  el.textContent = '';
  el.hidden = true;
}

function fieldValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.value = (value === undefined || value === null) ? '' : String(value);
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value;
  }
}

document.addEventListener('DOMContentLoaded', initSettingsPage);
