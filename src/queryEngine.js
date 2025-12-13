import { loadDB, getTableRows } from './database';

function recordsEqual(a, b) {
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => a[key] === b[key]);
}

function parseValue(str) {
  const trimmed = str.trim();
  if (!isNaN(Number(trimmed)) && trimmed !== '') {
    return Number(trimmed);
  }
  if (trimmed.toLowerCase() === 'true') return true;
  if (trimmed.toLowerCase() === 'false') return false;
  return trimmed.replace(/^["']|["']$/g, '');
}

function evaluateCondition(record, field, operator, value) {
  const recordValue = record[field];
  
  switch (operator) {
    case '=': return recordValue === value;
    case '!=': return recordValue !== value;
    case '>': return Number(recordValue) > Number(value);
    case '<': return Number(recordValue) < Number(value);
    case '>=': return Number(recordValue) >= Number(value);
    case '<=': return Number(recordValue) <= Number(value);
    case 'LIKE': {
      const pattern = value.toString().replace(/%/g, '.*').replace(/_/g, '.');
      const regex = new RegExp(`^${pattern}$`, 'i');
      return regex.test(recordValue?.toString() || '');
    }
    default: return false;
  }
}

function parseWhere(whereStr) {
  const patterns = [
    /(\w+)\s*(>=|<=|!=|LIKE)\s*(.+)/i,
    /(\w+)\s*(>|<|=)\s*(.+)/,
  ];
  
  for (const pattern of patterns) {
    const match = whereStr.match(pattern);
    if (match) {
      return {
        field: match[1].trim(),
        operator: match[2].trim(),
        value: parseValue(match[3].trim())
      };
    }
  }
  return null;
}

function executeSelect(query, db) {
  const upper = query.toUpperCase();
  
  const fromMatch = query.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)/i);
  if (!fromMatch) {
    return { error: 'Invalid SELECT syntax. Use: SELECT columns FROM table' };
  }

  const columnsStr = fromMatch[1].trim();
  const tableName = fromMatch[2].toLowerCase();
  
  if (!db.tables[tableName]) {
    return { error: `Table "${tableName}" does not exist` };
  }

  let result = getTableRows(tableName);
  
  const selectAll = columnsStr === '*';
  let selectedColumns = null;
  
  if (!selectAll) {
    selectedColumns = columnsStr.split(',').map(c => c.trim());
    const table = db.tables[tableName];
    const validColumns = Object.keys(table.schema.columns);
    for (const col of selectedColumns) {
      if (!validColumns.includes(col)) {
        return { error: `Column "${col}" does not exist in table "${tableName}"` };
      }
    }
  }

  const whereIndex = upper.indexOf('WHERE');
  if (whereIndex !== -1) {
    const whereStr = query.substring(whereIndex + 5).trim();
    const condition = parseWhere(whereStr);
    
    if (!condition) {
      return { error: 'Invalid WHERE clause' };
    }
    
    result = result.filter(record => 
      evaluateCondition(record, condition.field, condition.operator, condition.value)
    );
  }

  if (!selectAll && selectedColumns) {
    result = result.map(record => {
      const projected = {};
      for (const col of selectedColumns) {
        projected[col] = record[col];
      }
      return projected;
    });
  }

  return { data: result, type: 'table' };
}

function executeJoin(query, db) {
  const upper = query.toUpperCase();
  const parts = query.trim().split(/\s+/);
  
  if (parts.length < 4) {
    return { error: 'JOIN requires: JOIN table1 table2 ON table1.field = table2.field' };
  }

  const table1Name = parts[1].toLowerCase();
  const table2Name = parts[2].toLowerCase();
  
  if (!db.tables[table1Name] || !db.tables[table2Name]) {
    return { error: `One or both tables do not exist: ${table1Name}, ${table2Name}` };
  }

  const onIndex = upper.indexOf('ON');
  if (onIndex === -1) {
    return { error: 'JOIN requires ON clause: JOIN table1 table2 ON table1.field = table2.field' };
  }

  const onClause = query.substring(onIndex + 2).trim();
  const onMatch = onClause.match(/(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/);
  
  if (!onMatch) {
    return { error: 'Invalid ON clause. Use: ON table1.field = table2.field' };
  }

  const [, table1Ref, field1, table2Ref, field2] = onMatch;
  
  let table1Field, table2Field;
  if (table1Ref.toLowerCase() === table1Name) {
    table1Field = field1;
    table2Field = field2;
  } else if (table1Ref.toLowerCase() === table2Name) {
    table1Field = field2;
    table2Field = field1;
  } else {
    return { error: `Table reference "${table1Ref}" does not match table names` };
  }

  const rows1 = getTableRows(table1Name);
  const rows2 = getTableRows(table2Name);

  const joined = [];
  for (const record1 of rows1) {
    for (const record2 of rows2) {
      if (record1[table1Field] === record2[table2Field]) {
        const merged = {
          ...Object.fromEntries(
            Object.entries(record1).map(([k, v]) => [`${table1Name}_${k}`, v])
          ),
          ...Object.fromEntries(
            Object.entries(record2).map(([k, v]) => [`${table2Name}_${k}`, v])
          )
        };
        joined.push(merged);
      }
    }
  }

  return { data: joined, type: 'join' };
}

function executeUnion(query, db) {
  const parts = query.trim().split(/\s+/);
  
  if (parts.length < 3) {
    return { error: 'UNION requires two table names' };
  }

  const tableA = parts[1].toLowerCase();
  const tableB = parts[2].toLowerCase();
  
  if (!db.tables[tableA] || !db.tables[tableB]) {
    return { error: `One or both tables do not exist: ${tableA}, ${tableB}` };
  }

  const rowsA = getTableRows(tableA);
  const rowsB = getTableRows(tableB);

  const union = [];
  const seen = new Set();

  for (const record of rowsA) {
    const key = JSON.stringify(record);
    if (!seen.has(key)) {
      seen.add(key);
      union.push(record);
    }
  }

  for (const record of rowsB) {
    const key = JSON.stringify(record);
    if (!seen.has(key)) {
      seen.add(key);
      union.push(record);
    }
  }

  return { data: union, type: 'set' };
}

function executeIntersect(query, db) {
  const parts = query.trim().split(/\s+/);
  
  if (parts.length < 3) {
    return { error: 'INTERSECT requires two table names' };
  }

  const tableA = parts[1].toLowerCase();
  const tableB = parts[2].toLowerCase();
  
  if (!db.tables[tableA] || !db.tables[tableB]) {
    return { error: `One or both tables do not exist: ${tableA}, ${tableB}` };
  }

  const rowsA = getTableRows(tableA);
  const rowsB = getTableRows(tableB);

  const intersection = [];
  const seen = new Set();

  const setB = new Set(rowsB.map(r => JSON.stringify(r)));

  for (const record of rowsA) {
    const key = JSON.stringify(record);
    if (setB.has(key) && !seen.has(key)) {
      seen.add(key);
      intersection.push(record);
    }
  }

  return { data: intersection, type: 'set' };
}

function executeDiff(query, db) {
  const parts = query.trim().split(/\s+/);
  
  if (parts.length < 3) {
    return { error: 'DIFF requires two table names' };
  }

  const tableA = parts[1].toLowerCase();
  const tableB = parts[2].toLowerCase();
  
  if (!db.tables[tableA] || !db.tables[tableB]) {
    return { error: `One or both tables do not exist: ${tableA}, ${tableB}` };
  }

  const rowsA = getTableRows(tableA);
  const rowsB = getTableRows(tableB);

  const diff = [];
  const seen = new Set();
  const setB = new Set(rowsB.map(r => JSON.stringify(r)));

  for (const record of rowsA) {
    const key = JSON.stringify(record);
    if (!setB.has(key) && !seen.has(key)) {
      seen.add(key);
      diff.push(record);
    }
  }

  return { data: diff, type: 'set' };
}

export function executeQuery(query) {
  const trimmed = query.trim();
  if (!trimmed) {
    return { error: 'Please enter a query' };
  }

  const upper = trimmed.toUpperCase();
  const db = loadDB();

  try {
    if (upper.startsWith('SELECT')) {
      return executeSelect(trimmed, db);
    }

    if (upper.startsWith('JOIN')) {
      return executeJoin(trimmed, db);
    }

    if (upper.startsWith('UNION')) {
      return executeUnion(trimmed, db);
    }

    if (upper.startsWith('INTERSECT')) {
      return executeIntersect(trimmed, db);
    }

    if (upper.startsWith('DIFF')) {
      return executeDiff(trimmed, db);
    }

    if (upper === 'SHOW TABLES') {
      const tables = Object.keys(db.tables).map(name => {
        const table = db.tables[name];
        const rowCount = Object.keys(table.rows).length;
        return { name, rows: rowCount };
      });
      return { data: tables, type: 'tables' };
    }

    return { error: 'Invalid query syntax. Supported: SELECT, JOIN, UNION, INTERSECT, DIFF, SHOW TABLES' };
  } catch (error) {
    return { error: `Query error: ${error.message}` };
  }
}
