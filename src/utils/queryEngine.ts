import { MiniDB, QueryResult } from '../types';

type Operator = '=' | '!=' | '>' | '<' | '>=' | '<=';

interface Condition {
  field: string;
  operator: Operator;
  value: any;
}

function parseValue(value: string): any {
  const trimmed = value.trim();
  // Try to parse as number
  if (!isNaN(Number(trimmed)) && trimmed !== '') {
    return Number(trimmed);
  }
  // Try to parse as boolean
  if (trimmed.toLowerCase() === 'true') return true;
  if (trimmed.toLowerCase() === 'false') return false;
  // Return as string (remove quotes if present)
  return trimmed.replace(/^["']|["']$/g, '');
}

function evaluateCondition(record: Record<string, any>, condition: Condition): boolean {
  const { field, operator, value } = condition;
  const recordValue = record[field];

  switch (operator) {
    case '=':
      return recordValue === value;
    case '!=':
      return recordValue !== value;
    case '>':
      return Number(recordValue) > Number(value);
    case '<':
      return Number(recordValue) < Number(value);
    case '>=':
      return Number(recordValue) >= Number(value);
    case '<=':
      return Number(recordValue) <= Number(value);
    default:
      return false;
  }
}

function parseWhereClause(wherePart: string): Condition | null {
  // Match: field operator value
  // Handle operators in order of length (longest first) to avoid matching issues
  const patterns = [
    /(\w+)\s*(>=|<=|!=)\s*(.+)/,  // Two-character operators first
    /(\w+)\s*(>|<|=)\s*(.+)/,     // Single-character operators
  ];

  for (const pattern of patterns) {
    const match = wherePart.match(pattern);
    if (match) {
      return {
        field: match[1].trim(),
        operator: match[2].trim() as Operator,
        value: parseValue(match[3].trim()),
      };
    }
  }

  return null;
}

function areRecordsEqual(a: Record<string, any>, b: Record<string, any>): boolean {
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => {
    return a[key] === b[key];
  });
}

export function executeQuery(query: string, db: MiniDB): QueryResult {
  const trimmedQuery = query.trim().toUpperCase();
  const parts = trimmedQuery.split(/\s+/);

  try {
    // SHOW FILES
    if (trimmedQuery === 'SHOW FILES') {
      return {
        data: Object.keys(db).map(name => ({ name, recordCount: db[name].length })),
        type: 'files',
      };
    }

    // SELECT FROM <file> WHERE <condition>
    if (parts[0] === 'SELECT' && parts[1] === 'FROM') {
      if (parts.length < 3) {
        return { error: 'Invalid query: Missing file name after FROM' };
      }

      // Extract file name from original query (case-sensitive)
      const originalParts = query.trim().split(/\s+/);
      const fileName = originalParts[2]?.toLowerCase();
      
      if (!fileName) {
        return { error: 'Invalid query: Missing file name after FROM' };
      }
      
      if (!db[fileName]) {
        return { error: `File "${fileName}" does not exist` };
      }

      let result = [...db[fileName]];

      // Check for WHERE clause
      const whereIndex = trimmedQuery.indexOf('WHERE');
      if (whereIndex !== -1) {
        const wherePart = query.substring(whereIndex + 5).trim();
        const condition = parseWhereClause(wherePart);
        
        if (!condition) {
          return { error: 'Invalid WHERE clause syntax' };
        }

        result = result.filter(record => evaluateCondition(record, condition));
      }

      // Check for SORTBY
      const sortByIndex = trimmedQuery.indexOf('SORTBY');
      if (sortByIndex !== -1) {
        const sortField = query.substring(sortByIndex + 6).trim().split(/\s+/)[0];
        result.sort((a, b) => {
          const aVal = a[sortField];
          const bVal = b[sortField];
          if (aVal < bVal) return -1;
          if (aVal > bVal) return 1;
          return 0;
        });
      }

      return { data: result, type: 'table' };
    }

    // UNION <fileA> <fileB>
    if (parts[0] === 'UNION') {
      if (parts.length < 3) {
        return { error: 'Invalid query: UNION requires two file names' };
      }

      const fileA = parts[1].toLowerCase();
      const fileB = parts[2].toLowerCase();

      if (!db[fileA] || !db[fileB]) {
        return { error: `One or both files do not exist: ${fileA}, ${fileB}` };
      }

      const setA = db[fileA];
      const setB = db[fileB];
      const union: Record<string, any>[] = [];

      // Add all from A
      for (const record of setA) {
        if (!union.some(r => areRecordsEqual(r, record))) {
          union.push(record);
        }
      }

      // Add from B if not already in union
      for (const record of setB) {
        if (!union.some(r => areRecordsEqual(r, record))) {
          union.push(record);
        }
      }

      return { data: union, type: 'set' };
    }

    // INTERSECT <fileA> <fileB>
    if (parts[0] === 'INTERSECT') {
      if (parts.length < 3) {
        return { error: 'Invalid query: INTERSECT requires two file names' };
      }

      const fileA = parts[1].toLowerCase();
      const fileB = parts[2].toLowerCase();

      if (!db[fileA] || !db[fileB]) {
        return { error: `One or both files do not exist: ${fileA}, ${fileB}` };
      }

      const setA = db[fileA];
      const setB = db[fileB];
      const intersection: Record<string, any>[] = [];

      for (const record of setA) {
        if (setB.some(r => areRecordsEqual(r, record))) {
          if (!intersection.some(r => areRecordsEqual(r, record))) {
            intersection.push(record);
          }
        }
      }

      return { data: intersection, type: 'set' };
    }

    // DIFF or DIFFERENCE <fileA> <fileB>
    if (parts[0] === 'DIFF' || parts[0] === 'DIFFERENCE') {
      if (parts.length < 3) {
        return { error: 'Invalid query: DIFF requires two file names' };
      }

      const fileA = parts[1].toLowerCase();
      const fileB = parts[2].toLowerCase();

      if (!db[fileA] || !db[fileB]) {
        return { error: `One or both files do not exist: ${fileA}, ${fileB}` };
      }

      const setA = db[fileA];
      const setB = db[fileB];
      const difference: Record<string, any>[] = [];

      for (const record of setA) {
        if (!setB.some(r => areRecordsEqual(r, record))) {
          if (!difference.some(r => areRecordsEqual(r, record))) {
            difference.push(record);
          }
        }
      }

      return { data: difference, type: 'set' };
    }

    return { error: 'Invalid query syntax' };
  } catch (error) {
    return { error: `Query execution error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

