
const COUNTED_ATTENDANCE_STATUSES = ['present', 'absent', 'late'];

const CHART_FILL_ACCENT = '#0f766e';
const CHART_FILL_MUTED = '#6b6860';
const CHART_FILL_NEUTRAL = '#d8d4cb';

const SVG_NS = 'http://www.w3.org/2000/svg';

function initReportsPage() {

  if (!requireAuth()) {
    return;
  }

  showCurrentUser();

  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', logout);
  }

  renderStudentStats();
  renderAttendanceReport();
  renderFeesReport();
}

function showCurrentUser() {
  const user = getCurrentUser();
  if (!user) {
    return;
  }
  setText('current-username', user.username);
  setText('current-role', user.role);
}

function renderStudentStats() {
  const emptyState = document.getElementById('report-students-empty');
  const statList = document.getElementById('report-students-stats');
  if (!emptyState || !statList) {
    return;
  }

  const students = getStudents();
  statList.textContent = '';

  if (students.length === 0) {
    emptyState.hidden = false;
    statList.hidden = true;
    return;
  }

  let active = 0;
  let inactive = 0;
  students.forEach(function (student) {
    const status = normalizeField(student.status).toLowerCase();
    if (status === 'active') {
      active += 1;
    } else if (status === 'inactive') {
      inactive += 1;
    }
  });

  emptyState.hidden = true;
  appendStats(statList, [
    { label: 'Total students', value: String(students.length) },
    { label: 'Active', value: String(active) },
    { label: 'Inactive', value: String(inactive) },
    { label: 'Classes', value: String(distinctCount(students, 'class')) },
  ]);
  statList.hidden = false;
}

function tallyAttendance(records) {
  let present = 0;
  let absent = 0;
  let late = 0;

  records.forEach(function (record) {
    const status = normalizeField(record.status).toLowerCase();
    if (status === 'present') {
      present += 1;
    } else if (status === 'absent') {
      absent += 1;
    } else if (status === 'late') {
      late += 1;
    }
  });

  const counted = present + absent + late;
  return {
    total: records.length,
    counted: counted,
    present: present,
    absent: absent,
    late: late,
    percentage: counted === 0 ? null : Math.round((present / counted) * 1000) / 10,
  };
}

function renderAttendanceReport() {
  const emptyState = document.getElementById('report-attendance-empty');
  const content = document.getElementById('report-attendance-content');
  const statList = document.getElementById('report-attendance-stats');
  const breakdown = document.getElementById('report-attendance-breakdown');
  const chart = document.getElementById('report-attendance-chart');
  if (!emptyState || !content || !statList || !breakdown || !chart) {
    return;
  }

  const records = getAttendance();
  statList.textContent = '';
  breakdown.textContent = '';
  chart.textContent = '';

  if (records.length === 0) {
    emptyState.hidden = false;
    content.hidden = true;
    return;
  }

  emptyState.hidden = true;
  content.hidden = false;

  const tally = tallyAttendance(records);

  appendStats(statList, [
    { label: 'Attendance', value: tally.percentage === null ? '—' : tally.percentage + '%' },
    { label: 'Records counted', value: String(tally.counted) },
    { label: 'Total records', value: String(tally.total) },
  ]);

  [
    { label: 'Present', count: tally.present },
    { label: 'Absent', count: tally.absent },
    { label: 'Late', count: tally.late },
  ].forEach(function (entry) {
    const row = document.createElement('tr');
    appendCell(row, entry.label);
    appendCell(row, String(entry.count));
    appendCell(row, tally.counted === 0 ? '—' : share(entry.count, tally.counted) + '%');
    breakdown.appendChild(row);
  });

  if (tally.counted === 0) {
    chart.setAttribute('aria-label', 'No Present, Absent, or Late records to chart yet.');
    chart.appendChild(mutedNote('No Present / Absent / Late records to chart yet.'));
    return;
  }

  chart.setAttribute('aria-label',
    'Attendance breakdown — Present ' + share(tally.present, tally.counted) + '%, ' +
    'Absent ' + share(tally.absent, tally.counted) + '%, ' +
    'Late ' + share(tally.late, tally.counted) + '%.');
  chart.appendChild(buildStackedBar([
    { label: 'Present', value: tally.present, fill: CHART_FILL_ACCENT },
    { label: 'Absent', value: tally.absent, fill: CHART_FILL_MUTED },
    { label: 'Late', value: tally.late, fill: CHART_FILL_NEUTRAL },
  ]));
}

function isFeePaid(fee) {
  return normalizeField(fee && fee.paidStatus).toLowerCase() === 'paid';
}

function computeFeeTotals(fees) {
  let billed = 0;
  let collected = 0;

  fees.forEach(function (fee) {
    const value = toNumber(fee.amount);
    billed += value;
    if (isFeePaid(fee)) {
      collected += value;
    }
  });

  return { billed: billed, collected: collected, outstanding: billed - collected };
}

function renderFeesReport() {
  const emptyState = document.getElementById('report-fees-empty');
  const content = document.getElementById('report-fees-content');
  const statList = document.getElementById('report-fees-stats');
  const chart = document.getElementById('report-fees-chart');
  const chartNote = document.getElementById('report-fees-chart-note');
  if (!emptyState || !content || !statList || !chart) {
    return;
  }

  const fees = getFees();
  statList.textContent = '';
  chart.textContent = '';

  if (fees.length === 0) {
    emptyState.hidden = false;
    content.hidden = true;
    return;
  }

  emptyState.hidden = true;
  content.hidden = false;

  const totals = computeFeeTotals(fees);

  appendStats(statList, [
    { label: 'Total billed', value: formatAmount(totals.billed) },
    { label: 'Total collected', value: formatAmount(totals.collected) },
    { label: 'Total outstanding', value: formatAmount(totals.outstanding) },
  ]);

  chart.setAttribute('aria-label',
    'Fees — billed ' + formatAmount(totals.billed) + ', collected ' + formatAmount(totals.collected) +
    ', outstanding ' + formatAmount(totals.outstanding) + '.');

  const collected = Math.max(0, totals.collected);
  const outstanding = Math.max(0, totals.outstanding);
  if (collected + outstanding <= 0) {
    if (chartNote) { chartNote.hidden = true; }
    chart.appendChild(mutedNote('No positive billed amount to chart.'));
    return;
  }

  if (chartNote) { chartNote.hidden = false; }
  chart.appendChild(buildStackedBar([
    { label: 'Collected', value: collected, fill: CHART_FILL_ACCENT },
    { label: 'Outstanding', value: outstanding, fill: CHART_FILL_NEUTRAL },
  ]));
}

function buildStackedBar(segments) {
  const total = segments.reduce(function (sum, seg) {
    return sum + Math.max(0, toNumber(seg.value));
  }, 0);

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 12');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '18');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  if (total <= 0) {
    return svg;
  }

  let x = 0;
  segments.forEach(function (seg) {
    const value = Math.max(0, toNumber(seg.value));
    const width = (value / total) * 100;
    if (width <= 0) {
      return;
    }
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', '0');
    rect.setAttribute('width', String(width));
    rect.setAttribute('height', '12');
    rect.setAttribute('fill', seg.fill);

    const title = document.createElementNS(SVG_NS, 'title');
    title.textContent = seg.label + ': ' + (Math.round(width * 10) / 10) + '%';
    rect.appendChild(title);

    svg.appendChild(rect);
    x += width;
  });

  return svg;
}

function mutedNote(text) {
  const p = document.createElement('p');
  p.className = 'text-muted';
  p.textContent = text;
  return p;
}

function appendStats(dl, stats) {
  stats.forEach(function (stat) {
    const group = document.createElement('div');
    group.className = 'stat';

    const label = document.createElement('dt');
    label.className = 'stat-label';
    label.textContent = stat.label;

    const value = document.createElement('dd');
    value.className = 'stat-value';
    value.textContent = stat.value;

    group.appendChild(label);
    group.appendChild(value);
    dl.appendChild(group);
  });
}

function distinctCount(list, field) {
  const seen = [];
  list.forEach(function (item) {
    const value = normalizeField(item[field]);
    if (value !== '' && seen.indexOf(value) === -1) {
      seen.push(value);
    }
  });
  return seen.length;
}

function share(part, whole) {
  return whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10;
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatAmount(value) {
  return toNumber(value).toLocaleString('en-US');
}

function normalizeField(value) {
  return String(value === undefined || value === null ? '' : value).trim();
}

function appendCell(row, value) {
  const cell = document.createElement('td');
  const text = (value === undefined || value === null || String(value).trim() === '')
    ? '—'
    : String(value);
  cell.textContent = text;
  row.appendChild(cell);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value;
  }
}

document.addEventListener('DOMContentLoaded', initReportsPage);
