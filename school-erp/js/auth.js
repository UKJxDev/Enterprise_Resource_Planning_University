
const SESSION_KEY = 'school_erp_session';

const DEMO_USERS = [
  { username: 'admin', password: 'admin123', role: 'Admin' },
  { username: 'teacher', password: 'teacher123', role: 'Teacher/Staff' },
  { username: 'student', password: 'student123', role: 'Student' },
  { username: 'accountant', password: 'accountant123', role: 'Accountant' },
];

function initializeAuth() {
  initializeStorage();
  ensureDemoUsers();
}

function ensureDemoUsers() {
  const existing = getUsers();
  DEMO_USERS.forEach((demoUser) => {
    const alreadyThere = existing.some((u) => u.username === demoUser.username);
    if (!alreadyThere) {
      saveUser(demoUser);
    }
  });
}

function setSession(user) {
  const session = {
    username: user.username,
    role: user.role,
    loginAt: Date.now(),
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function getCurrentUser() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (raw === null) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function getCurrentUserRole() {
  const user = getCurrentUser();
  return user ? user.role : null;
}

function isAuthenticated() {
  return getCurrentUser() !== null;
}

function findMatchingUser(username, password, role) {
  return getUsers().find(
    (u) => u.username === username && u.password === password && u.role === role
  ) || null;
}

function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;
  const errorEl = document.getElementById('login-error');

  const user = findMatchingUser(username, password, role);

  if (user) {
    setSession(user);
    window.location.href = 'dashboard.html';
    return;
  }

  errorEl.textContent = 'Invalid username, password, or role. Please try again.';
  errorEl.hidden = false;
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = 'index.html';
}

function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

function initLoginPage() {
  const form = document.getElementById('login-form');
  if (!form) {
    return;
  }

  initializeAuth();

  if (isAuthenticated()) {
    window.location.href = 'dashboard.html';
    return;
  }

  form.addEventListener('submit', handleLogin);
}

document.addEventListener('DOMContentLoaded', initLoginPage);
