
const STORAGE_KEYS = {
  students: 'school_erp_students',
  staff: 'school_erp_staff',
  attendance: 'school_erp_attendance',
  fees: 'school_erp_fees',
  users: 'school_erp_users',
  settings: 'school_erp_settings',
};

const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late'];

const USER_ROLES = ['Admin', 'Teacher/Staff', 'Student', 'Accountant'];

function readCollection(key) {
  const raw = localStorage.getItem(key);
  if (raw === null) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('storage.js: invalid JSON for "' + key + '", treating as empty.', e);
    return [];
  }
}

function writeCollection(key, collection) {
  localStorage.setItem(key, JSON.stringify(collection));
}

function readValue(key) {
  const raw = localStorage.getItem(key);
  if (raw === null) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn('storage.js: invalid JSON for "' + key + '", treating as absent.', e);
    return null;
  }
}

function writeValue(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function generateId(collection) {
  let id = Date.now().toString();
  while (collection.some((record) => record.id === id)) {
    id = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
  }
  return id;
}

function addRecord(key, record) {
  const collection = readCollection(key);
  const stored = Object.assign({}, record, { id: generateId(collection) });
  collection.push(stored);
  writeCollection(key, collection);
  return stored;
}

function replaceRecord(key, idField, record) {
  const collection = readCollection(key);
  const index = collection.findIndex((item) => item[idField] === record[idField]);
  if (index === -1) {
    return false;
  }
  collection[index] = record;
  writeCollection(key, collection);
  return true;
}

function removeRecord(key, idField, idValue) {
  const collection = readCollection(key);
  const filtered = collection.filter((item) => item[idField] !== idValue);
  if (filtered.length === collection.length) {
    return false;
  }
  writeCollection(key, filtered);
  return true;
}

function getStudents() {
  return readCollection(STORAGE_KEYS.students);
}

function saveStudent(student) {
  return addRecord(STORAGE_KEYS.students, student);
}

function updateStudent(student) {
  return replaceRecord(STORAGE_KEYS.students, 'id', student);
}

function deleteStudent(studentId) {
  return removeRecord(STORAGE_KEYS.students, 'id', studentId);
}

function getStaff() {
  return readCollection(STORAGE_KEYS.staff);
}

function saveStaff(staff) {
  return addRecord(STORAGE_KEYS.staff, staff);
}

function updateStaff(staff) {
  return replaceRecord(STORAGE_KEYS.staff, 'id', staff);
}

function deleteStaff(staffId) {
  return removeRecord(STORAGE_KEYS.staff, 'id', staffId);
}

function getAttendance() {
  return readCollection(STORAGE_KEYS.attendance);
}

function saveAttendance(attendanceRecord) {
  return addRecord(STORAGE_KEYS.attendance, attendanceRecord);
}

function updateAttendance(attendanceRecord) {
  return replaceRecord(STORAGE_KEYS.attendance, 'id', attendanceRecord);
}

function deleteAttendance(attendanceId) {
  return removeRecord(STORAGE_KEYS.attendance, 'id', attendanceId);
}

function getFees() {
  return readCollection(STORAGE_KEYS.fees);
}

function saveFee(fee) {
  return addRecord(STORAGE_KEYS.fees, fee);
}

function updateFee(fee) {
  return replaceRecord(STORAGE_KEYS.fees, 'id', fee);
}

function deleteFee(feeId) {
  return removeRecord(STORAGE_KEYS.fees, 'id', feeId);
}

function getUsers() {
  return readCollection(STORAGE_KEYS.users);
}

function saveUser(user) {
  const users = getUsers();
  users.push(user);
  writeCollection(STORAGE_KEYS.users, users);
  return user;
}

function updateUser(user) {
  return replaceRecord(STORAGE_KEYS.users, 'username', user);
}

function deleteUser(username) {
  return removeRecord(STORAGE_KEYS.users, 'username', username);
}

function defaultSettings() {
  return {
    institutionName: 'School ERP',
    academicYear: '',
    classes: [],
    sections: [],
  };
}

function toStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item) => typeof item === 'string');
}

function getSettings() {
  const stored = readValue(STORAGE_KEYS.settings);
  const defaults = defaultSettings();

  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    return defaults;
  }

  return {
    institutionName: typeof stored.institutionName === 'string'
      ? stored.institutionName
      : defaults.institutionName,
    academicYear: typeof stored.academicYear === 'string'
      ? stored.academicYear
      : defaults.academicYear,
    classes: toStringArray(stored.classes),
    sections: toStringArray(stored.sections),
  };
}

function saveSettings(settings) {
  const input = (settings && typeof settings === 'object' && !Array.isArray(settings))
    ? settings
    : {};
  const defaults = defaultSettings();

  const normalised = {
    institutionName: typeof input.institutionName === 'string'
      ? input.institutionName
      : defaults.institutionName,
    academicYear: typeof input.academicYear === 'string'
      ? input.academicYear
      : defaults.academicYear,
    classes: toStringArray(input.classes),
    sections: toStringArray(input.sections),
  };

  writeValue(STORAGE_KEYS.settings, normalised);
  return normalised;
}

function initializeStorage() {
  Object.values(STORAGE_KEYS).forEach((key) => {
    if (localStorage.getItem(key) !== null) {
      return;
    }
    if (key === STORAGE_KEYS.settings) {
      writeValue(key, defaultSettings());
    } else {
      writeCollection(key, []);
    }
  });
}
