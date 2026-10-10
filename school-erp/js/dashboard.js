
function initDashboard() {

  if (!requireAuth()) {
    return;
  }

  const user = getCurrentUser();
  if (user) {
    setText('current-username', user.username);
    setText('current-role', user.role);
    setText('dashboard-greeting', 'Signed in as ' + user.username + ' · ' + user.role);
  }

  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', logout);
  }

  applyRoleNavigation();
  renderSummary(user);
}

const NAV_BY_ROLE = {
  'Admin': ['dashboard', 'students', 'attendance', 'fees', 'staff', 'reports', 'settings'],
  'Accountant': ['dashboard', 'fees', 'reports'],
  'Teacher/Staff': ['dashboard', 'students', 'attendance'],
  'Student': ['dashboard', 'attendance', 'fees'],
};

function applyRoleNavigation() {
  const allowed = NAV_BY_ROLE[getCurrentUserRole()] || ['dashboard'];
  const links = document.querySelectorAll('.app-nav-link[data-nav]');

  links.forEach((link) => {
    link.hidden = allowed.indexOf(link.getAttribute('data-nav')) === -1;
  });
}

function renderSummary(user) {
  const container = document.getElementById('dashboard-summary');
  if (!container) {
    return;
  }
  container.textContent = '';

  const role = getCurrentUserRole();

  if (role === 'Admin' || role === 'Accountant') {
    renderAdminSummary(container);
  } else if (role === 'Teacher/Staff') {
    renderTeacherSummary(container);
  } else if (role === 'Student') {
    renderStudentSummary(container, user);
  } else {
    container.appendChild(makeMessage('No summary is available for this role.'));
  }
}

function renderAdminSummary(container) {
  const fees = getFees();
  const totalFees = sumAmounts(fees);
  const outstandingFees = sumAmounts(fees.filter((fee) => !isFeePaid(fee)));

  container.appendChild(makeStatList([
    { label: 'Total students', value: formatCount(getStudents().length) },
    { label: 'Total staff', value: formatCount(getStaff().length) },
    { label: 'Total fee amount', value: formatAmount(totalFees) },
    { label: 'Outstanding fee amount', value: formatAmount(outstandingFees) },
  ]));
}

function renderTeacherSummary(container) {
  const tally = tallyAttendance(getAttendance());

  const stats = [{ label: 'Total students', value: formatCount(getStudents().length) }];
  if (tally.total > 0) {
    stats.push({ label: 'Attendance records', value: formatCount(tally.total) });
    stats.push({ label: 'Overall present', value: formatPercent(tally.percentage) });
  }
  container.appendChild(makeStatList(stats));

  if (tally.total === 0) {
    container.appendChild(makeMessage('No attendance records yet.'));
  }
}

function renderStudentSummary(container, user) {
  const student = findStudentForUser(user);

  if (!student) {
    container.appendChild(makeMessage(
      'No student record is linked to your account yet. ' +
      'Once your student profile is added, your attendance and fee summary will appear here.'
    ));
    return;
  }

  const myAttendance = getAttendance().filter((record) => record.studentId === student.id);
  const tally = tallyAttendance(myAttendance);
  const myOutstanding = sumAmounts(
    getFees().filter((fee) => fee.studentId === student.id && !isFeePaid(fee))
  );

  const stats = [];
  if (tally.total > 0) {
    stats.push({ label: 'My attendance', value: formatPercent(tally.percentage) });
  }
  stats.push({ label: 'My outstanding fees', value: formatAmount(myOutstanding) });
  container.appendChild(makeStatList(stats));

  if (tally.total === 0) {
    container.appendChild(makeMessage('No attendance records yet.'));
  }
}

function isFeePaid(fee) {
  return String(fee.paidStatus).trim().toLowerCase() === 'paid';
}

function sumAmounts(fees) {
  return fees.reduce((total, fee) => total + toNumber(fee.amount), 0);
}

const ATTENDANCE_COUNTED = ['present', 'absent', 'late'];

function tallyAttendance(records) {
  let present = 0;
  let counted = 0;

  records.forEach((record) => {
    const status = String(record.status).trim().toLowerCase();
    if (ATTENDANCE_COUNTED.indexOf(status) === -1) {
      return;
    }
    counted += 1;
    if (status === 'present') {
      present += 1;
    }
  });

  return {
    total: counted,
    present: present,
    percentage: counted === 0 ? null : Math.round((present / counted) * 1000) / 10,
  };
}

function findStudentForUser(user) {
  if (!user || !user.username) {
    return null;
  }
  const key = String(user.username).trim().toLowerCase();
  const students = getStudents();

  return (
    students.find((student) => String(student.rollNo).trim().toLowerCase() === key) ||
    students.find((student) => String(student.id).trim().toLowerCase() === key) ||
    null
  );
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatCount(n) {
  return String(n);
}

function formatAmount(n) {
  return toNumber(n).toLocaleString('en-US');
}

function formatPercent(p) {
  return p === null ? '—' : p + '%';
}

function makeStatList(stats) {
  const list = document.createElement('dl');
  list.className = 'stat-list';

  stats.forEach((stat) => {
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
    list.appendChild(group);
  });

  return list;
}

function makeMessage(text) {
  const p = document.createElement('p');
  p.className = 'dashboard-empty';
  p.textContent = text;
  return p;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value;
  }
}

document.addEventListener('DOMContentLoaded', initDashboard);
