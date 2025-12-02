import { MiniDB, MiniDBSchema } from '../types';

const DB_KEY = 'minidb_database';
const SCHEMA_KEY = 'minidb_schema';

export function loadDB(): MiniDB {
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

export function saveDB(db: MiniDB): void {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (error) {
    console.error('Error saving database:', error);
    throw new Error('Failed to save database. Storage may be full.');
  }
}

export function seedSampleData(): void {
  const db = loadDB();
  
  // Only seed if database is empty
  if (Object.keys(db).length > 0) {
    return;
  }

  db.students = [
    { id: 1, name: 'Ali', age: 20, major: 'Computer Science', gpa: 3.8 },
    { id: 2, name: 'Jawad', age: 21, major: 'Mathematics', gpa: 3.9 },
    { id: 3, name: 'Sarah', age: 19, major: 'Physics', gpa: 3.7 },
    { id: 4, name: 'Ahmed', age: 22, major: 'Computer Science', gpa: 3.6 },
    { id: 5, name: 'Fatima', age: 20, major: 'Mathematics', gpa: 4.0 },
    { id: 6, name: 'Hassan', age: 21, major: 'Physics', gpa: 3.5 },
    { id: 7, name: 'Zainab', age: 19, major: 'Computer Science', gpa: 3.9 },
  ];

  db.courses = [
    { id: 1, name: 'Discrete Structures', code: 'CS201', credits: 3, instructor: 'Dr. Smith' },
    { id: 2, name: 'Data Structures', code: 'CS202', credits: 4, instructor: 'Dr. Johnson' },
    { id: 3, name: 'Algorithms', code: 'CS301', credits: 4, instructor: 'Dr. Williams' },
    { id: 4, name: 'Database Systems', code: 'CS302', credits: 3, instructor: 'Dr. Brown' },
    { id: 5, name: 'Linear Algebra', code: 'MATH201', credits: 3, instructor: 'Dr. Davis' },
    { id: 6, name: 'Calculus III', code: 'MATH301', credits: 4, instructor: 'Dr. Miller' },
    { id: 7, name: 'Quantum Physics', code: 'PHYS301', credits: 4, instructor: 'Dr. Wilson' },
  ];

  db.teachers = [
    { id: 1, name: 'Dr. Smith', department: 'Computer Science', experience: 15 },
    { id: 2, name: 'Dr. Johnson', department: 'Computer Science', experience: 12 },
    { id: 3, name: 'Dr. Williams', department: 'Computer Science', experience: 20 },
    { id: 4, name: 'Dr. Brown', department: 'Computer Science', experience: 10 },
    { id: 5, name: 'Dr. Davis', department: 'Mathematics', experience: 18 },
    { id: 6, name: 'Dr. Miller', department: 'Mathematics', experience: 14 },
    { id: 7, name: 'Dr. Wilson', department: 'Physics', experience: 16 },
    { id: 8, name: 'Dr. Anderson', department: 'Physics', experience: 11 },
  ];

  saveDB(db);

  // Create and save schemas for sample data
  const schema: MiniDBSchema = {
    students: {
      fields: [
        { name: 'id', type: 'number' },
        { name: 'name', type: 'string' },
        { name: 'age', type: 'number' },
        { name: 'major', type: 'string' },
        { name: 'gpa', type: 'number' },
      ],
      primaryKey: 'id',
    },
    courses: {
      fields: [
        { name: 'id', type: 'number' },
        { name: 'name', type: 'string' },
        { name: 'code', type: 'string' },
        { name: 'credits', type: 'number' },
        { name: 'instructor', type: 'string' },
      ],
      primaryKey: 'id',
    },
    teachers: {
      fields: [
        { name: 'id', type: 'number' },
        { name: 'name', type: 'string' },
        { name: 'department', type: 'string' },
        { name: 'experience', type: 'number' },
      ],
      primaryKey: 'id',
    },
  };

  saveSchema(schema);
}

export function loadSchema(): MiniDBSchema {
  try {
    const stored = localStorage.getItem(SCHEMA_KEY);
    if (!stored) {
      return {};
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error loading schema:', error);
    return {};
  }
}

export function saveSchema(schema: MiniDBSchema): void {
  try {
    localStorage.setItem(SCHEMA_KEY, JSON.stringify(schema));
  } catch (error) {
    console.error('Error saving schema:', error);
    throw new Error('Failed to save schema. Storage may be full.');
  }
}

