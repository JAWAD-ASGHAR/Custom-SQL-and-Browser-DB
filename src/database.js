// Simple database storage using localStorage
const DB_KEY = 'simpledb_data';

// Load database from localStorage
export function loadDB() {
  try {
    const stored = localStorage.getItem(DB_KEY);
    if (!stored) {
      return {};
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error loading database:', error);
    return {};
  }
}

// Save database to localStorage
export function saveDB(db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (error) {
    console.error('Error saving database:', error);
    throw new Error('Failed to save database. Storage may be full.');
  }
}

// Initialize with sample data if empty
export function initSampleData() {
  const db = loadDB();
  
  if (Object.keys(db).length > 0) {
    return; // Already has data
  }

  // Create sample tables
  db.students = [
    { id: 1, name: 'Ali', age: 20, major: 'Computer Science' },
    { id: 2, name: 'Jawad', age: 21, major: 'Mathematics' },
    { id: 3, name: 'Sarah', age: 19, major: 'Physics' },
  ];

  db.courses = [
    { id: 1, name: 'Discrete Structures', code: 'CS201', credits: 3 },
    { id: 2, name: 'Data Structures', code: 'CS202', credits: 4 },
    { id: 3, name: 'Algorithms', code: 'CS301', credits: 4 },
  ];

  saveDB(db);
}
