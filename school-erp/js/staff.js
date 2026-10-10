
const REQUIRED_STAFF_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role' },
  { key: 'department', label: 'Department' },
];

let editingStaffId = null;

let staffSearchQuery = '';

function initStaffPage() {

  if (!requireAuth()) {
    return;
  }

  showCurrentUser();

  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', logout);
  }

  setupStaffForm();
  setupStaffListControls();
  renderStaff();
}

function showCurrentUser() {
  const user = getCurrentUser();
  if (!user) {
    return;
  }
  setText('current-username', user.username);
  setText('current-role', user.role);
}

function setupStaffForm() {
  const addButton = document.getElementById('add-staff-btn');
  const form = document.getElementById('staff-form');
  const cancelButton = document.getElementById('staff-form-cancel');

  if (!addButton || !form) {
    return;
  }

  addButton.addEventListener('click', function () {
    startCreateStaff(form, addButton);
  });

  if (cancelButton) {
    cancelButton.addEventListener('click', function () {
      closeStaffForm(form, addButton);
    });
  }

  form.addEventListener('submit', function (event) {
    handleStaffFormSubmit(event, form, addButton);
  });
}

function startCreateStaff(form, addButton) {
  editingStaffId = null;
  form.reset();
  setStaffFormMode('create');
  openStaffForm(form, addButton);
}

function startEditStaff(staffId, form, addButton) {
  const member = getStaff().find(function (s) { return s.id === staffId; });
  if (!member) {

    renderStaff();
    return;
  }

  editingStaffId = staffId;
  form.reset();
  populateStaffForm(member);
  setStaffFormMode('edit');
  openStaffForm(form, addButton);
}

function openStaffForm(form, addButton) {
  clearStaffFormError();
  form.hidden = false;
  addButton.hidden = true;

  const firstField = document.getElementById('staff-name');
  if (firstField) {
    firstField.focus();
  }
}

function closeStaffForm(form, addButton) {
  clearStaffFormError();
  editingStaffId = null;
  form.reset();
  setStaffFormMode('create');
  form.hidden = true;
  addButton.hidden = false;
  addButton.focus();
}

function setStaffFormMode(mode) {
  const legend = document.getElementById('staff-form-legend');
  const saveButton = document.getElementById('staff-form-save');
  const form = document.getElementById('staff-form');
  const editing = mode === 'edit';

  if (legend) {
    legend.textContent = editing ? 'Edit staff' : 'New staff member';
  }
  if (saveButton) {
    saveButton.textContent = editing ? 'Update Staff' : 'Save Staff';
  }
  if (form) {
    form.setAttribute('aria-label', editing ? 'Edit staff' : 'Add staff');
  }
}

function populateStaffForm(member) {
  setValue('staff-name', member.name);
  setValue('staff-role', member.role);
  setValue('staff-department', member.department);
  setValue('staff-contact', member.contact);
  setValue('staff-joiningDate', isoDateOrEmpty(member.joiningDate));
}

function handleStaffFormSubmit(event, form, addButton) {
  event.preventDefault();

  const data = readStaffForm();
  const missing = findMissingRequiredStaffFields(data);

  if (missing.length > 0) {
    showStaffFormError(
      'Please fill in the required field' + (missing.length > 1 ? 's' : '') +
      ': ' + missing.join(', ') + '.'
    );
    return;
  }

  clearStaffFormError();

  if (editingStaffId) {
    const existing = getStaff().find(function (s) { return s.id === editingStaffId; });
    if (!existing) {

      closeStaffForm(form, addButton);
      renderStaff();
      return;
    }

    updateStaff({
      id: existing.id,
      name: data.name,
      role: data.role,
      department: data.department,
      contact: data.contact,
      joiningDate: data.joiningDate,
    });
  } else {
    saveStaff({
      name: data.name,
      role: data.role,
      department: data.department,
      contact: data.contact,
      joiningDate: data.joiningDate,
    });
  }

  closeStaffForm(form, addButton);
  renderStaff();
}

function readStaffForm() {
  return {
    name: fieldValue('staff-name').trim(),
    role: fieldValue('staff-role').trim(),
    department: fieldValue('staff-department').trim(),
    contact: fieldValue('staff-contact').trim(),
    joiningDate: fieldValue('staff-joiningDate'),
  };
}

function findMissingRequiredStaffFields(staff) {
  return REQUIRED_STAFF_FIELDS
    .filter(function (field) { return normalizeField(staff[field.key]) === ''; })
    .map(function (field) { return field.label; });
}

function setupStaffListControls() {
  const searchInput = document.getElementById('staff-search');
  if (!searchInput) {
    return;
  }

  staffSearchQuery = searchInput.value;

  searchInput.addEventListener('input', function () {
    staffSearchQuery = searchInput.value;
    renderStaff();
  });
}

function filterStaff(staff) {
  const query = staffSearchQuery.trim().toLowerCase();
  if (query === '') {
    return staff.slice();
  }

  return staff.filter(function (member) {
    return normalizeField(member.name).toLowerCase().indexOf(query) !== -1 ||
      normalizeField(member.role).toLowerCase().indexOf(query) !== -1 ||
      normalizeField(member.department).toLowerCase().indexOf(query) !== -1;
  });
}

function renderStaff() {
  const tbody = document.getElementById('staff-table-body');
  const emptyState = document.getElementById('staff-empty');
  const noMatches = document.getElementById('staff-no-matches');
  const list = document.getElementById('staff-list');
  const form = document.getElementById('staff-form');
  const addButton = document.getElementById('add-staff-btn');

  if (!tbody || !emptyState || !list) {
    return;
  }

  tbody.textContent = '';
  emptyState.hidden = true;
  if (noMatches) { noMatches.hidden = true; }
  list.hidden = true;

  const staff = getStaff();

  if (staff.length === 0) {
    emptyState.hidden = false;
    return;
  }

  const visibleStaff = filterStaff(staff);
  if (visibleStaff.length === 0) {
    if (noMatches) { noMatches.hidden = false; }
    return;
  }

  visibleStaff.forEach(function (member) {
    tbody.appendChild(buildStaffRow(member, form, addButton));
  });
  list.hidden = false;
}

function buildStaffRow(member, form, addButton) {
  const row = document.createElement('tr');
  row.setAttribute('data-id', member.id);

  appendCell(row, member.name);
  appendCell(row, member.role);
  appendCell(row, member.department);
  appendCell(row, member.contact);
  appendCell(row, member.joiningDate);
  row.appendChild(buildStaffActionsCell(member.id, form, addButton));

  return row;
}

function buildStaffActionsCell(staffId, form, addButton) {
  const cell = document.createElement('td');
  const wrap = document.createElement('div');
  wrap.className = 'row-actions';

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'btn-link';
  editButton.textContent = 'Edit';
  editButton.addEventListener('click', function () {
    startEditStaff(staffId, form, addButton);
  });

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'btn-link btn-link-danger';
  deleteButton.textContent = 'Delete';
  deleteButton.addEventListener('click', function () {
    handleDeleteStaff(staffId, form, addButton);
  });

  wrap.appendChild(editButton);
  wrap.appendChild(deleteButton);
  cell.appendChild(wrap);
  return cell;
}

function handleDeleteStaff(staffId, form, addButton) {
  const member = getStaff().find(function (s) { return s.id === staffId; });
  if (!member) {
    renderStaff();
    return;
  }

  const label = (normalizeField(member.name) || 'this staff member') +
    (normalizeField(member.role) ? ' (' + member.role + ')' : '');
  const confirmed = window.confirm('Delete ' + label + '? This cannot be undone.');
  if (!confirmed) {
    return;
  }

  if (editingStaffId === staffId && form && addButton) {
    closeStaffForm(form, addButton);
  }

  deleteStaff(staffId);
  renderStaff();
}

function showStaffFormError(message) {
  const el = document.getElementById('staff-form-error');
  if (!el) {
    return;
  }
  el.textContent = message;
  el.hidden = false;
}

function clearStaffFormError() {
  const el = document.getElementById('staff-form-error');
  if (!el) {
    return;
  }
  el.textContent = '';
  el.hidden = true;
}

function appendCell(row, value) {
  const cell = document.createElement('td');
  const text = (value === undefined || value === null || String(value).trim() === '')
    ? '—'
    : String(value);
  cell.textContent = text;
  row.appendChild(cell);
}

function normalizeField(value) {
  return String(value === undefined || value === null ? '' : value).trim();
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

function isoDateOrEmpty(value) {
  return (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim()))
    ? value.trim()
    : '';
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value;
  }
}

document.addEventListener('DOMContentLoaded', initStaffPage);
