
let selectedClass = '';
let selectedSection = '';
let selectedDate = '';

function initAttendancePage() {

  if (!requireAuth()) {
    return;
  }

  showCurrentUser();

  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', logout);
  }

  setupRosterControls();
  setupSaveAction();
  renderRoster();
  renderHistory();
}

function showCurrentUser() {
  const user = getCurrentUser();
  if (!user) {
    return;
  }
  setText('current-username', user.username);
  setText('current-role', user.role);
}

function setupRosterControls() {
  const classSelect = document.getElementById('attendance-class');
  const sectionSelect = document.getElementById('attendance-section');
  const dateInput = document.getElementById('attendance-date');

  populateOptions(classSelect, distinctStudentValues('class'));
  populateOptions(sectionSelect, distinctStudentValues('section'));

  if (classSelect) {
    classSelect.addEventListener('change', function () {
      selectedClass = classSelect.value;
      renderRoster();
      renderHistory();
    });
  }

  if (sectionSelect) {
    sectionSelect.addEventListener('change', function () {
      selectedSection = sectionSelect.value;
      renderRoster();
      renderHistory();
    });
  }

  if (dateInput) {
    if (!dateInput.value) {
      dateInput.value = todayIso();
    }
    selectedDate = dateInput.value;
    dateInput.addEventListener('change', function () {
      selectedDate = dateInput.value;
      renderRoster();
    });
  }
}

function setupSaveAction() {
  const saveButton = document.getElementById('attendance-save-btn');
  if (saveButton) {
    saveButton.addEventListener('click', handleSaveAttendance);
  }
}

function distinctStudentValues(field) {
  const seen = [];
  getStudents().forEach(function (student) {
    const value = normalizeField(student[field]);
    if (value !== '' && seen.indexOf(value) === -1) {
      seen.push(value);
    }
  });
  return seen.sort(function (a, b) {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });
}

function populateOptions(select, values) {
  if (!select) {
    return;
  }
  select.textContent = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select…';
  select.appendChild(placeholder);

  values.forEach(function (value) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function rosterForSelection() {
  if (selectedClass === '' || selectedSection === '') {
    return [];
  }
  return getStudents().filter(function (student) {
    return normalizeField(student.class) === selectedClass &&
      normalizeField(student.section) === selectedSection;
  });
}

function renderRoster() {
  const tbody = document.getElementById('attendance-roster-body');
  const roster = document.getElementById('attendance-roster');
  const actions = document.getElementById('attendance-actions');
  const noStudents = document.getElementById('attendance-no-students');
  const choosePrompt = document.getElementById('attendance-choose');
  const noMatches = document.getElementById('attendance-no-matches');

  if (!tbody || !roster) {
    return;
  }

  tbody.textContent = '';
  if (noStudents) { noStudents.hidden = true; }
  if (choosePrompt) { choosePrompt.hidden = true; }
  if (noMatches) { noMatches.hidden = true; }
  roster.hidden = true;
  if (actions) { actions.hidden = true; }
  clearSaveStatus();

  if (getStudents().length === 0) {
    if (noStudents) { noStudents.hidden = false; }
    return;
  }

  if (selectedClass === '' || selectedSection === '' || selectedDate === '') {
    if (choosePrompt) { choosePrompt.hidden = false; }
    return;
  }

  const students = rosterForSelection();
  if (students.length === 0) {
    if (noMatches) { noMatches.hidden = false; }
    return;
  }

  students.forEach(function (student) {
    tbody.appendChild(buildRosterRow(student));
  });
  roster.hidden = false;
  if (actions) { actions.hidden = false; }
}

function buildRosterRow(student) {
  const row = document.createElement('tr');
  row.setAttribute('data-id', student.id);

  appendCell(row, student.name);
  appendCell(row, student.rollNo);
  appendCell(row, student.class);
  appendCell(row, student.section);
  row.appendChild(buildStatusCell(student));

  return row;
}

function buildStatusCell(student) {
  const cell = document.createElement('td');

  const select = document.createElement('select');
  select.className = 'attendance-status';
  select.setAttribute('aria-label', 'Attendance status for ' + (normalizeField(student.name) || 'student'));

  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = 'Not marked';
  select.appendChild(blank);

  ATTENDANCE_STATUSES.forEach(function (status) {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    select.appendChild(option);
  });

  const existing = findAttendanceRecord(student.id, selectedDate);
  select.value = existing ? existing.status : '';

  cell.appendChild(select);
  return cell;
}

function findAttendanceRecord(studentId, date) {
  const id = String(studentId);
  return getAttendance().find(function (record) {
    return String(record.studentId) === id && record.date === date;
  }) || null;
}

function handleSaveAttendance() {

  if (selectedClass === '' || selectedSection === '' || selectedDate === '') {
    return;
  }
  if (rosterForSelection().length === 0) {
    return;
  }

  const tbody = document.getElementById('attendance-roster-body');
  if (!tbody) {
    return;
  }

  let created = 0;
  let updated = 0;
  let unchanged = 0;

  tbody.querySelectorAll('tr[data-id]').forEach(function (row) {
    const studentId = row.getAttribute('data-id');
    const select = row.querySelector('select.attendance-status');
    if (!studentId || !select) {
      return;
    }

    const status = select.value;
    if (status === '') {
      return;
    }

    const existing = findAttendanceRecord(studentId, selectedDate);
    if (existing) {
      if (existing.status === status) {
        unchanged += 1;
        return;
      }
      updateAttendance({
        id: existing.id,
        studentId: existing.studentId,
        date: existing.date,
        status: status,
      });
      updated += 1;
    } else {
      saveAttendance({
        studentId: String(studentId),
        date: selectedDate,
        status: status,
      });
      created += 1;
    }
  });

  renderRoster();
  renderHistory();
  announceSaveResult(created, updated, unchanged);
}

function announceSaveResult(created, updated, unchanged) {
  const el = document.getElementById('attendance-save-status');
  if (!el) {
    return;
  }

  if (created === 0 && updated === 0 && unchanged === 0) {
    el.textContent = 'No students marked yet — choose a status to save.';
    el.hidden = false;
    return;
  }

  const parts = [];
  if (created > 0) { parts.push(created + ' added'); }
  if (updated > 0) { parts.push(updated + ' updated'); }
  if (unchanged > 0) { parts.push(unchanged + ' unchanged'); }

  el.textContent = 'Attendance saved: ' + parts.join(', ') + '.';
  el.hidden = false;
}

function clearSaveStatus() {
  const el = document.getElementById('attendance-save-status');
  if (el) {
    el.textContent = '';
    el.hidden = true;
  }
}

function renderHistory() {
  const wrap = document.getElementById('attendance-history');
  const tbody = document.getElementById('attendance-history-body');
  const emptyNone = document.getElementById('attendance-history-empty');
  const emptyFiltered = document.getElementById('attendance-history-none');
  const summary = document.getElementById('attendance-history-summary');

  if (!wrap || !tbody) {
    return;
  }

  tbody.textContent = '';
  wrap.hidden = true;
  if (emptyNone) { emptyNone.hidden = true; }
  if (emptyFiltered) { emptyFiltered.hidden = true; }
  if (summary) { summary.hidden = true; summary.textContent = ''; }

  const allRecords = getAttendance();
  if (allRecords.length === 0) {
    if (emptyNone) { emptyNone.hidden = false; }
    return;
  }

  const studentById = indexStudentsById();
  const scoped = selectedClass !== '' && selectedSection !== '';

  const records = allRecords.filter(function (record) {
    if (!scoped) {
      return true;
    }
    const student = studentById[String(record.studentId)];
    if (!student) {
      return false;
    }
    return normalizeField(student.class) === selectedClass &&
      normalizeField(student.section) === selectedSection;
  });

  if (records.length === 0) {
    if (emptyFiltered) { emptyFiltered.hidden = false; }
    return;
  }

  records.slice().sort(function (a, b) {
    const dateA = normalizeField(a.date);
    const dateB = normalizeField(b.date);
    if (dateA !== dateB) {
      return dateA < dateB ? 1 : -1;
    }
    return studentLabel(studentById[String(a.studentId)])
      .localeCompare(studentLabel(studentById[String(b.studentId)]), undefined, { sensitivity: 'base' });
  }).forEach(function (record) {
    tbody.appendChild(buildHistoryRow(record, studentById[String(record.studentId)]));
  });

  wrap.hidden = false;
  if (summary) {
    summary.textContent = historySummaryText(records);
    summary.hidden = false;
  }
}

function indexStudentsById() {
  const byId = {};
  getStudents().forEach(function (student) {
    byId[String(student.id)] = student;
  });
  return byId;
}

function studentLabel(student) {
  if (!student) {
    return 'Unknown student';
  }
  return normalizeField(student.name) || 'Unnamed student';
}

function buildHistoryRow(record, student) {
  const row = document.createElement('tr');
  if (record.id !== undefined && record.id !== null) {
    row.setAttribute('data-id', record.id);
  }

  appendCell(row, studentLabel(student));
  appendCell(row, student ? student.rollNo : '');
  appendCell(row, student ? student.class : '');
  appendCell(row, student ? student.section : '');
  appendCell(row, record.date);
  appendCell(row, record.status);

  return row;
}

function presentPercentage(records) {
  let counted = 0;
  let present = 0;

  records.forEach(function (record) {
    const status = normalizeField(record.status).toLowerCase();
    if (status !== 'present' && status !== 'absent' && status !== 'late') {
      return;
    }
    counted += 1;
    if (status === 'present') {
      present += 1;
    }
  });

  return counted === 0 ? null : Math.round((present / counted) * 1000) / 10;
}

function historySummaryText(records) {
  const count = records.length + (records.length === 1 ? ' record' : ' records');
  const pct = presentPercentage(records);
  if (pct === null) {
    return count;
  }
  return count + ' · ' + pct + '% present (Late counts as not present)';
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

function todayIso() {
  const d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function pad2(n) {
  return (n < 10 ? '0' : '') + n;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value;
  }
}

document.addEventListener('DOMContentLoaded', initAttendancePage);
