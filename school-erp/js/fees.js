
const REQUIRED_FEE_FIELDS = [
  { key: 'studentId', label: 'Student' },
  { key: 'amount', label: 'Amount' },
  { key: 'dueDate', label: 'Due Date' },
];

const PAID_STATUS = 'Paid';
const UNPAID_STATUS = 'Unpaid';

const DEFAULT_FEE_PAID_STATUS = UNPAID_STATUS;

let editingFeeId = null;

let payingFeeId = null;

let feeStatusFilter = 'all';

function initFeesPage() {

  if (!requireAuth()) {
    return;
  }

  showCurrentUser();

  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', logout);
  }

  setupFeeForm();
  setupPaymentForm();
  setupFeeListControls();
  renderFees();
}

function showCurrentUser() {
  const user = getCurrentUser();
  if (!user) {
    return;
  }
  setText('current-username', user.username);
  setText('current-role', user.role);
}

function setupFeeForm() {
  const addButton = document.getElementById('add-fee-btn');
  const form = document.getElementById('fee-form');
  const cancelButton = document.getElementById('fee-form-cancel');

  if (!addButton || !form) {
    return;
  }

  populateStudentOptions();

  addButton.addEventListener('click', function () {
    startCreateFee(form, addButton);
  });

  if (cancelButton) {
    cancelButton.addEventListener('click', function () {
      closeFeeForm(form, addButton);
    });
  }

  form.addEventListener('submit', function (event) {
    handleFeeFormSubmit(event, form, addButton);
  });
}

function populateStudentOptions() {
  const select = document.getElementById('fee-student');
  if (!select) {
    return;
  }
  select.textContent = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select a student…';
  select.appendChild(placeholder);

  getStudents().slice().sort(function (a, b) {
    return studentDisplayName(a).localeCompare(studentDisplayName(b), undefined, { sensitivity: 'base' });
  }).forEach(function (student) {
    const option = document.createElement('option');
    option.value = String(student.id);
    option.textContent = studentOptionText(student);
    select.appendChild(option);
  });
}

function studentOptionText(student) {
  const name = studentDisplayName(student);
  const roll = normalizeField(student.rollNo);
  return roll ? name + ' (' + roll + ')' : name;
}

function startCreateFee(form, addButton) {
  editingFeeId = null;
  form.reset();
  setFeeFormMode('create');
  openFeeForm(form, addButton);
}

function startEditFee(feeId, form, addButton) {
  const fee = getFees().find(function (f) { return f.id === feeId; });
  if (!fee) {

    renderFees();
    return;
  }

  editingFeeId = feeId;
  form.reset();
  populateFeeForm(fee);
  setFeeFormMode('edit');
  openFeeForm(form, addButton);
}

function openFeeForm(form, addButton) {
  clearFeeFormError();
  hidePaymentForm();
  form.hidden = false;
  addButton.hidden = true;

  const firstField = document.getElementById('fee-student');
  if (firstField) {
    firstField.focus();
  }
}

function closeFeeForm(form, addButton) {
  clearFeeFormError();
  editingFeeId = null;
  form.reset();
  setFeeFormMode('create');
  form.hidden = true;
  addButton.hidden = false;
  addButton.focus();
}

function setFeeFormMode(mode) {
  const legend = document.getElementById('fee-form-legend');
  const saveButton = document.getElementById('fee-form-save');
  const form = document.getElementById('fee-form');
  const editing = mode === 'edit';

  if (legend) {
    legend.textContent = editing ? 'Edit fee' : 'New fee';
  }
  if (saveButton) {
    saveButton.textContent = editing ? 'Update Fee' : 'Save Fee';
  }
  if (form) {
    form.setAttribute('aria-label', editing ? 'Edit fee' : 'Add fee');
  }
}

function populateFeeForm(fee) {
  setValue('fee-student', String(fee.studentId));
  setValue('fee-amount', fee.amount);
  setValue('fee-dueDate', isoDateOrEmpty(fee.dueDate));
}

function handleFeeFormSubmit(event, form, addButton) {
  event.preventDefault();

  const data = readFeeForm();
  const missing = findMissingRequiredFeeFields(data);

  if (missing.length > 0) {
    showFeeFormError(
      'Please fill in the required field' + (missing.length > 1 ? 's' : '') +
      ': ' + missing.join(', ') + '.'
    );
    return;
  }

  if (!isValidAmount(data.amount)) {
    showFeeFormError('Amount must be a number that is zero or greater.');
    return;
  }

  clearFeeFormError();

  if (editingFeeId) {
    const existing = getFees().find(function (f) { return f.id === editingFeeId; });
    if (!existing) {

      closeFeeForm(form, addButton);
      renderFees();
      return;
    }

    updateFee({
      id: existing.id,
      studentId: data.studentId,
      amount: Number(data.amount),
      dueDate: data.dueDate,
      paidStatus: existing.paidStatus,
      paymentDate: existing.paymentDate,
    });
  } else {
    saveFee({
      studentId: data.studentId,
      amount: Number(data.amount),
      dueDate: data.dueDate,
      paidStatus: DEFAULT_FEE_PAID_STATUS,
      paymentDate: '',
    });
  }

  closeFeeForm(form, addButton);
  renderFees();
}

function readFeeForm() {
  return {
    studentId: fieldValue('fee-student').trim(),
    amount: fieldValue('fee-amount').trim(),
    dueDate: fieldValue('fee-dueDate'),
  };
}

function findMissingRequiredFeeFields(fee) {
  return REQUIRED_FEE_FIELDS
    .filter(function (field) { return normalizeField(fee[field.key]) === ''; })
    .map(function (field) { return field.label; });
}

function isValidAmount(value) {
  if (normalizeField(value) === '') {
    return false;
  }
  const n = Number(value);
  return Number.isFinite(n) && n >= 0;
}

function setupFeeListControls() {
  const filterSelect = document.getElementById('fee-status-filter');
  if (!filterSelect) {
    return;
  }
  feeStatusFilter = filterSelect.value || 'all';
  filterSelect.addEventListener('change', function () {
    feeStatusFilter = filterSelect.value || 'all';
    renderFees();
  });
}

function filterFees(fees) {
  if (feeStatusFilter !== PAID_STATUS && feeStatusFilter !== UNPAID_STATUS) {
    return fees.slice();
  }
  const wantPaid = feeStatusFilter === PAID_STATUS;
  return fees.filter(function (fee) {
    return isFeePaid(fee) === wantPaid;
  });
}

function filteredEmptyMessage() {
  if (feeStatusFilter === PAID_STATUS) {
    return 'No paid fees match this filter.';
  }
  if (feeStatusFilter === UNPAID_STATUS) {
    return 'No unpaid fees match this filter.';
  }
  return 'No fees match this filter.';
}

function computeFeeTotals(fees) {
  let billed = 0;
  let collected = 0;

  fees.forEach(function (fee) {
    const amount = Number(fee.amount);
    const value = Number.isFinite(amount) ? amount : 0;
    billed += value;
    if (isFeePaid(fee)) {
      collected += value;
    }
  });

  return { billed: billed, collected: collected, outstanding: billed - collected };
}

function renderFeeSummary(allFees) {
  const el = document.getElementById('fee-summary');
  if (!el) {
    return;
  }

  if (allFees.length === 0) {
    el.textContent = '';
    el.hidden = true;
    return;
  }

  const totals = computeFeeTotals(allFees);
  el.textContent =
    'Billed: ' + formatAmount(totals.billed) +
    '  ·  Collected: ' + formatAmount(totals.collected) +
    '  ·  Outstanding: ' + formatAmount(totals.outstanding);
  el.hidden = false;
}

function renderFees() {
  const tbody = document.getElementById('fee-table-body');
  const emptyState = document.getElementById('fee-empty');
  const noMatches = document.getElementById('fee-no-matches');
  const noStudents = document.getElementById('fee-no-students');
  const list = document.getElementById('fee-list');
  const summary = document.getElementById('fee-summary');
  const addButton = document.getElementById('add-fee-btn');
  const form = document.getElementById('fee-form');
  const paymentForm = document.getElementById('payment-form');

  if (!tbody || !emptyState || !list) {
    return;
  }

  tbody.textContent = '';
  emptyState.hidden = true;
  if (noMatches) { noMatches.hidden = true; }
  if (noStudents) { noStudents.hidden = true; }
  list.hidden = true;

  if (getStudents().length === 0) {
    if (noStudents) { noStudents.hidden = false; }
    if (addButton) { addButton.hidden = true; }
    if (form) { form.hidden = true; }
    if (paymentForm) { paymentForm.hidden = true; }
    if (summary) { summary.hidden = true; summary.textContent = ''; }
    return;
  }

  if (addButton && (!form || form.hidden) && (!paymentForm || paymentForm.hidden)) {
    addButton.hidden = false;
  }

  const allFees = getFees();

  renderFeeSummary(allFees);

  if (allFees.length === 0) {
    emptyState.hidden = false;
    return;
  }

  const visibleFees = filterFees(allFees);
  if (visibleFees.length === 0) {
    if (noMatches) {
      noMatches.textContent = filteredEmptyMessage();
      noMatches.hidden = false;
    }
    return;
  }

  const studentById = indexStudentsById();
  visibleFees.forEach(function (fee) {
    tbody.appendChild(buildFeeRow(fee, studentById[String(fee.studentId)], form, addButton));
  });
  list.hidden = false;
}

function buildFeeRow(fee, student, form, addButton) {
  const row = document.createElement('tr');
  row.setAttribute('data-id', fee.id);

  appendCell(row, studentDisplayName(student));
  appendCell(row, student ? student.rollNo : '');
  appendCell(row, formatAmount(fee.amount));
  appendCell(row, fee.dueDate);
  appendCell(row, normalizeField(fee.paidStatus) || DEFAULT_FEE_PAID_STATUS);
  appendCell(row, fee.paymentDate);
  row.appendChild(buildFeeActionsCell(fee, form, addButton));

  return row;
}

function buildFeeActionsCell(fee, form, addButton) {
  const cell = document.createElement('td');
  const wrap = document.createElement('div');
  wrap.className = 'row-actions';

  const paid = isFeePaid(fee);

  const paymentButton = document.createElement('button');
  paymentButton.type = 'button';
  paymentButton.className = 'btn-link';
  paymentButton.textContent = paid ? 'Mark Unpaid' : 'Record Payment';
  paymentButton.addEventListener('click', function () {
    if (paid) {
      handleMarkUnpaid(fee.id);
    } else {
      startRecordPayment(fee.id);
    }
  });

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'btn-link';
  editButton.textContent = 'Edit';
  editButton.addEventListener('click', function () {
    startEditFee(fee.id, form, addButton);
  });

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'btn-link btn-link-danger';
  deleteButton.textContent = 'Delete';
  deleteButton.addEventListener('click', function () {
    handleDeleteFee(fee.id, form, addButton);
  });

  wrap.appendChild(paymentButton);
  wrap.appendChild(editButton);
  wrap.appendChild(deleteButton);
  cell.appendChild(wrap);
  return cell;
}

function handleDeleteFee(feeId, form, addButton) {
  const fee = getFees().find(function (f) { return f.id === feeId; });
  if (!fee) {
    renderFees();
    return;
  }

  const student = indexStudentsById()[String(fee.studentId)];
  const label = formatAmount(fee.amount) + ' fee for ' + studentDisplayName(student) +
    (normalizeField(fee.dueDate) ? ' due ' + fee.dueDate : '');
  const confirmed = window.confirm('Delete the ' + label + '? This cannot be undone.');
  if (!confirmed) {
    return;
  }

  if (editingFeeId === feeId && form && addButton) {
    closeFeeForm(form, addButton);
  }
  if (payingFeeId === feeId) {
    closePaymentForm();
  }

  deleteFee(feeId);
  renderFees();
}

function setupPaymentForm() {
  const form = document.getElementById('payment-form');
  const cancelButton = document.getElementById('payment-form-cancel');

  if (!form) {
    return;
  }

  if (cancelButton) {
    cancelButton.addEventListener('click', closePaymentForm);
  }

  form.addEventListener('submit', handlePaymentFormSubmit);
}

function startRecordPayment(feeId) {
  const fee = getFees().find(function (f) { return f.id === feeId; });
  if (!fee) {
    renderFees();
    return;
  }

  const form = document.getElementById('payment-form');
  const feeForm = document.getElementById('fee-form');
  const addButton = document.getElementById('add-fee-btn');
  if (!form) {
    return;
  }

  if (feeForm && !feeForm.hidden && addButton) {
    closeFeeForm(feeForm, addButton);
  }

  payingFeeId = feeId;
  form.reset();
  clearPaymentFormError();
  setPaymentFormContext(fee);
  setValue('payment-date', todayIso());
  form.hidden = false;
  if (addButton) {
    addButton.hidden = true;
  }

  const dateField = document.getElementById('payment-date');
  if (dateField) {
    dateField.focus();
  }
}

function handlePaymentFormSubmit(event) {
  event.preventDefault();

  if (!payingFeeId) {
    closePaymentForm();
    return;
  }

  const existing = getFees().find(function (f) { return f.id === payingFeeId; });
  if (!existing) {

    closePaymentForm();
    renderFees();
    return;
  }

  const paymentDate = isoDateOrEmpty(fieldValue('payment-date'));
  if (paymentDate === '') {
    showPaymentFormError('Enter a valid payment date.');
    return;
  }

  clearPaymentFormError();

  updateFee({
    id: existing.id,
    studentId: existing.studentId,
    amount: existing.amount,
    dueDate: existing.dueDate,
    paidStatus: PAID_STATUS,
    paymentDate: paymentDate,
  });

  closePaymentForm();
  renderFees();
}

function handleMarkUnpaid(feeId) {
  const existing = getFees().find(function (f) { return f.id === feeId; });
  if (!existing) {
    renderFees();
    return;
  }

  updateFee({
    id: existing.id,
    studentId: existing.studentId,
    amount: existing.amount,
    dueDate: existing.dueDate,
    paidStatus: UNPAID_STATUS,
    paymentDate: '',
  });

  renderFees();
}

function hidePaymentForm() {
  const form = document.getElementById('payment-form');
  payingFeeId = null;
  if (form) {
    form.reset();
    form.hidden = true;
  }
  clearPaymentFormError();
}

function closePaymentForm() {
  hidePaymentForm();
  const addButton = document.getElementById('add-fee-btn');
  if (addButton) {
    addButton.hidden = false;
    addButton.focus();
  }
}

function setPaymentFormContext(fee) {
  const el = document.getElementById('payment-form-context');
  if (!el) {
    return;
  }
  const student = indexStudentsById()[String(fee.studentId)];
  let who = studentDisplayName(student);
  const roll = student ? normalizeField(student.rollNo) : '';
  if (roll) {
    who = who + ' (' + roll + ')';
  }
  el.textContent = who + ' — ' + formatAmount(fee.amount) +
    (normalizeField(fee.dueDate) ? ' due ' + fee.dueDate : '');
}

function showPaymentFormError(message) {
  const el = document.getElementById('payment-form-error');
  if (!el) {
    return;
  }
  el.textContent = message;
  el.hidden = false;
}

function clearPaymentFormError() {
  const el = document.getElementById('payment-form-error');
  if (!el) {
    return;
  }
  el.textContent = '';
  el.hidden = true;
}

function showFeeFormError(message) {
  const el = document.getElementById('fee-form-error');
  if (!el) {
    return;
  }
  el.textContent = message;
  el.hidden = false;
}

function clearFeeFormError() {
  const el = document.getElementById('fee-form-error');
  if (!el) {
    return;
  }
  el.textContent = '';
  el.hidden = true;
}

function indexStudentsById() {
  const byId = {};
  getStudents().forEach(function (student) {
    byId[String(student.id)] = student;
  });
  return byId;
}

function studentDisplayName(student) {
  if (!student) {
    return 'Unknown student';
  }
  return normalizeField(student.name) || 'Unnamed student';
}

function isFeePaid(fee) {
  return normalizeField(fee && fee.paidStatus).toLowerCase() === 'paid';
}

function todayIso() {
  const d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function pad2(n) {
  return (n < 10 ? '0' : '') + n;
}

function formatAmount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
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

document.addEventListener('DOMContentLoaded', initFeesPage);
