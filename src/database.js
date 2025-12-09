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

  // Enrollments table - demonstrates relations using foreign keys
  // student_id references students.id, course_id references courses.id
  db.enrollments = [
    { id: 1, student_id: 1, course_id: 1 },  // Ali enrolled in Discrete Structures
    { id: 2, student_id: 2, course_id: 1 },  // Jawad enrolled in Discrete Structures
    { id: 3, student_id: 1, course_id: 2 },  // Ali enrolled in Data Structures
    { id: 4, student_id: 3, course_id: 2 },  // Sarah enrolled in Data Structures
    { id: 5, student_id: 2, course_id: 3 },  // Jawad enrolled in Algorithms
  ];

  saveDB(db);
}
