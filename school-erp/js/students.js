
const REQUIRED_STUDENT_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'rollNo', label: 'Roll Number' },
  { key: 'class', label: 'Class' },
  { key: 'section', label: 'Section' },
];

let editingStudentId = null;

let searchQuery = '';
let statusFilter = 'all';

function initStudentsPage() {

  if (!requireAuth()) {
    return;
  }

  showCurrentUser();

  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', logout);
  }

  setupStudentForm();
  setupListControls();
  renderStudents();
}

function setupListControls() {
  const searchInput = document.getElementById('student-search');
  const statusSelect = document.getElementById('student-status-filter');

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      searchQuery = searchInput.value;
      renderStudents();
    });
  }

  if (statusSelect) {
    statusSelect.addEventListener('change', function () {
      statusFilter = statusSelect.value;
      renderStudents();
    });
  }
}

function filterStudents(students) {
  const query = searchQuery.trim().toLowerCase();
  const status = statusFilter;

  return students.filter(function (student) {
    if (status !== 'all' && student.status !== status) {
      return false;
    }
    if (query === '') {
      return true;
    }
    const name = String(student.name || '').toLowerCase();
    const rollNo = String(student.rollNo || '').toLowerCase();
    return name.indexOf(query) !== -1 || rollNo.indexOf(query) !== -1;
  });
}

function showCurrentUser() {
  const user = getCurrentUser();
  if (!user) {
    return;
  }
  setText('current-username', user.username);
  setText('current-role', user.role);
}

function setupStudentForm() {
  const addButton = document.getElementById('add-student-btn');
  const form = document.getElementById('student-form');
  const cancelButton = document.getElementById('student-form-cancel');

  if (!addButton || !form) {
    return;
  }

  addButton.addEventListener('click', function () {
    startCreateStudent(form, addButton);
  });

  if (cancelButton) {
    cancelButton.addEventListener('click', function () {
      closeStudentForm(form, addButton);
    });
  }

  form.addEventListener('submit', function (event) {
    handleStudentFormSubmit(event, form, addButton);
  });
}

function startCreateStudent(form, addButton) {
  editingStudentId = null;
  form.reset();
  setFormMode('create');
  openStudentForm(form, addButton);
}

function startEditStudent(studentId, form, addButton) {
  const student = getStudents().find(function (s) { return s.id === studentId; });
  if (!student) {

    renderStudents();
    return;
  }

  editingStudentId = studentId;
  form.reset();
  populateForm(student);
  setFormMode('edit');
  openStudentForm(form, addButton);
}

function openStudentForm(form, addButton) {
  clearFormError();
  form.hidden = false;
  addButton.hidden = true;

  const firstField = document.getElementById('student-name');
  if (firstField) {
    firstField.focus();
  }
}

function closeStudentForm(form, addButton) {
  clearFormError();
  editingStudentId = null;
  form.reset();
  setFormMode('create');
  form.hidden = true;
  addButton.hidden = false;
  addButton.focus();
}

function setFormMode(mode) {
  const legend = document.getElementById('student-form-legend');
  const saveButton = document.getElementById('student-form-save');
  const form = document.getElementById('student-form');
  const editing = mode === 'edit';

  if (legend) {
    legend.textContent = editing ? 'Edit student' : 'New student';
  }
  if (saveButton) {
    saveButton.textContent = editing ? 'Update Student' : 'Save Student';
  }
  if (form) {
    form.setAttribute('aria-label', editing ? 'Edit student' : 'Add student');
  }
}

function populateForm(student) {
  setValue('student-name', student.name);
  setValue('student-rollNo', student.rollNo);
  setValue('student-class', student.class);
  setValue('student-section', student.section);
  setValue('student-contact', student.contact);
  setValue('student-admissionDate', isoDateOrEmpty(student.admissionDate));
  setValue('student-status', student.status);
}

function handleStudentFormSubmit(event, form, addButton) {
  event.preventDefault();

  const data = readStudentForm();
  const missing = findMissingRequiredFields(data);

  if (missing.length > 0) {
    showFormError(
      'Please fill in the required field' + (missing.length > 1 ? 's' : '') +
      ': ' + missing.join(', ') + '.'
    );
    return;
  }

  clearFormError();

  if (editingStudentId) {
    const existing = getStudents().find(function (s) { return s.id === editingStudentId; });
    if (!existing) {

      closeStudentForm(form, addButton);
      renderStudents();
      return;
    }

    updateStudent(Object.assign({}, data, { id: editingStudentId }));
  } else {
    saveStudent(data);
  }

  closeStudentForm(form, addButton);
  renderStudents();
}

function readStudentForm() {
  return {
    name: fieldValue('student-name').trim(),
    rollNo: fieldValue('student-rollNo').trim(),
    class: fieldValue('student-class').trim(),
    section: fieldValue('student-section').trim(),
    contact: fieldValue('student-contact').trim(),
    admissionDate: fieldValue('student-admissionDate'),
    status: fieldValue('student-status'),
  };
}

function findMissingRequiredFields(student) {
  return REQUIRED_STUDENT_FIELDS
    .filter(function (field) { return student[field.key] === ''; })
    .map(function (field) { return field.label; });
}

function handleDeleteStudent(studentId, form, addButton) {
  const student = getStudents().find(function (s) { return s.id === studentId; });
  if (!student) {
    renderStudents();
    return;
  }

  const label = student.name + (student.rollNo ? ' (Roll No ' + student.rollNo + ')' : '');
  const confirmed = window.confirm('Delete student ' + label + '? This cannot be undone.');
  if (!confirmed) {
    return;
  }

  if (editingStudentId === studentId && form && addButton) {
    closeStudentForm(form, addButton);
  }

  deleteStudent(studentId);
  renderStudents();
}

function renderStudents() {
  const tbody = document.getElementById('student-table-body');
  const emptyState = document.getElementById('student-empty');
  const noMatches = document.getElementById('student-no-matches');
  const list = document.getElementById('student-list');
  const form = document.getElementById('student-form');
  const addButton = document.getElementById('add-student-btn');

  if (!tbody || !emptyState || !list) {
    return;
  }

  const allStudents = getStudents();
  const visibleStudents = filterStudents(allStudents);
  tbody.textContent = '';

  if (allStudents.length === 0) {
    emptyState.hidden = false;
    if (noMatches) { noMatches.hidden = true; }
    list.hidden = true;
    return;
  }

  if (visibleStudents.length === 0) {
    emptyState.hidden = true;
    if (noMatches) { noMatches.hidden = false; }
    list.hidden = true;
    return;
  }

  emptyState.hidden = true;
  if (noMatches) { noMatches.hidden = true; }
  list.hidden = false;

  visibleStudents.forEach(function (student) {
    tbody.appendChild(buildStudentRow(student, form, addButton));
  });
}

function buildStudentRow(student, form, addButton) {
  const row = document.createElement('tr');
  row.setAttribute('data-id', student.id);

  appendCell(row, student.name);
  appendCell(row, student.rollNo);
  appendCell(row, student.class);
  appendCell(row, student.section);
  appendCell(row, student.contact);
  appendCell(row, formatDate(student.admissionDate));
  appendCell(row, student.status);
  row.appendChild(buildActionsCell(student.id, form, addButton));

  return row;
}

function buildActionsCell(studentId, form, addButton) {
  const cell = document.createElement('td');
  const wrap = document.createElement('div');
  wrap.className = 'row-actions';

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'btn-link';
  editButton.textContent = 'Edit';
  editButton.addEventListener('click', function () {
    startEditStudent(studentId, form, addButton);
  });

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'btn-link btn-link-danger';
  deleteButton.textContent = 'Delete';
  deleteButton.addEventListener('click', function () {
    handleDeleteStudent(studentId, form, addButton);
  });

  wrap.appendChild(editButton);
  wrap.appendChild(deleteButton);
  cell.appendChild(wrap);
  return cell;
}

function appendCell(row, value) {
  const cell = document.createElement('td');
  const text = (value === undefined || value === null || String(value).trim() === '')
    ? '—'
    : String(value);
  cell.textContent = text;
  row.appendChild(cell);
}

function formatDate(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return '—';
  }

  const trimmed = value.trim();
  const parts = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (parts) {
    const year = Number(parts[1]);
    const month = Number(parts[2]);
    const day = Number(parts[3]);
    const date = new Date(year, month - 1, day);

    const valid = !isNaN(date.getTime()) &&
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day;

    return valid ? readableDate(date) : '—';
  }

  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? '—' : readableDate(parsed);
}

function readableDate(date) {
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function isoDateOrEmpty(value) {
  return (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim()))
    ? value.trim()
    : '';
}

function showFormError(message) {
  const el = document.getElementById('student-form-error');
  if (!el) {
    return;
  }
  el.textContent = message;
  el.hidden = false;
}

function clearFormError() {
  const el = document.getElementById('student-form-error');
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

document.addEventListener('DOMContentLoaded', initStudentsPage);
