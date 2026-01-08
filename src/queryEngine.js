import { loadDB, getTableRows, deleteRow, dropTable, dropColumn, dropDatabase } from './database';

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
    default: return false;
  }
}

function parseWhere(whereStr) {
  const patterns = [
    /(\w+)\s*(>=|<=|!=)\s*(.+)/i,
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

function executeUnion(query, db) {
  const upper = query.toUpperCase();
  const onIndex = upper.indexOf('ON');
  
  if (onIndex === -1) {
    return { error: 'UNION requires: UNION tableA tableB ON columnName' };
  }

  const beforeOn = query.substring(0, onIndex).trim();
  const parts = beforeOn.split(/\s+/);
  
  if (parts.length < 3) {
    return { error: 'UNION requires: UNION tableA tableB ON columnName' };
  }

  const tableA = parts[1].toLowerCase();
  const tableB = parts[2].toLowerCase();
  const columnName = query.substring(onIndex + 2).trim();
  
  if (!db.tables[tableA] || !db.tables[tableB]) {
    return { error: `One or both tables do not exist: ${tableA}, ${tableB}` };
  }

  const tableASchema = db.tables[tableA].schema.columns;
  const tableBSchema = db.tables[tableB].schema.columns;
  
  if (!tableASchema[columnName]) {
    return { error: `Column "${columnName}" does not exist in table "${tableA}"` };
  }
  
  if (!tableBSchema[columnName]) {
    return { error: `Column "${columnName}" does not exist in table "${tableB}"` };
  }

  const rowsA = getTableRows(tableA);
  const rowsB = getTableRows(tableB);

  const values = new Set();
  
  // Extract column values from tableA, ignoring null/undefined
  for (const record of rowsA) {
    const value = record[columnName];
    if (value !== null && value !== undefined) {
      values.add(value);
    }
  }
  
  // Extract column values from tableB, ignoring null/undefined
  for (const record of rowsB) {
    const value = record[columnName];
    if (value !== null && value !== undefined) {
      values.add(value);
    }
  }

  return { data: Array.from(values), type: 'set' };
}

function executeIntersect(query, db) {
  const upper = query.toUpperCase();
  const onIndex = upper.indexOf('ON');
  
  if (onIndex === -1) {
    return { error: 'INTERSECT requires: INTERSECT tableA tableB ON columnName' };
  }

  const beforeOn = query.substring(0, onIndex).trim();
  const parts = beforeOn.split(/\s+/);
  
  if (parts.length < 3) {
    return { error: 'INTERSECT requires: INTERSECT tableA tableB ON columnName' };
  }

  const tableA = parts[1].toLowerCase();
  const tableB = parts[2].toLowerCase();
  const columnName = query.substring(onIndex + 2).trim();
  
  if (!db.tables[tableA] || !db.tables[tableB]) {
    return { error: `One or both tables do not exist: ${tableA}, ${tableB}` };
  }

  const tableASchema = db.tables[tableA].schema.columns;
  const tableBSchema = db.tables[tableB].schema.columns;
  
  if (!tableASchema[columnName]) {
    return { error: `Column "${columnName}" does not exist in table "${tableA}"` };
  }
  
  if (!tableBSchema[columnName]) {
    return { error: `Column "${columnName}" does not exist in table "${tableB}"` };
  }

  const rowsA = getTableRows(tableA);
  const rowsB = getTableRows(tableB);

  const valuesA = new Set();
  const valuesB = new Set();
  
  // Extract column values from tableA, ignoring null/undefined
  for (const record of rowsA) {
    const value = record[columnName];
    if (value !== null && value !== undefined) {
      valuesA.add(value);
    }
  }
  
  // Extract column values from tableB, ignoring null/undefined
  for (const record of rowsB) {
    const value = record[columnName];
    if (value !== null && value !== undefined) {
      valuesB.add(value);
    }
  }

  // Find intersection: values that exist in both sets
  const intersection = [];
  for (const value of valuesA) {
    if (valuesB.has(value)) {
      intersection.push(value);
    }
  }

  return { data: intersection, type: 'set' };
}

function executeDiff(query, db) {
  const upper = query.toUpperCase();
  const onIndex = upper.indexOf('ON');
  
  if (onIndex === -1) {
    return { error: 'DIFF requires: DIFF tableA tableB ON columnName' };
  }

  const beforeOn = query.substring(0, onIndex).trim();
  const parts = beforeOn.split(/\s+/);
  
  if (parts.length < 3) {
    return { error: 'DIFF requires: DIFF tableA tableB ON columnName' };
  }

  const tableA = parts[1].toLowerCase();
  const tableB = parts[2].toLowerCase();
  const columnName = query.substring(onIndex + 2).trim();
  
  if (!db.tables[tableA] || !db.tables[tableB]) {
    return { error: `One or both tables do not exist: ${tableA}, ${tableB}` };
  }

  const tableASchema = db.tables[tableA].schema.columns;
  const tableBSchema = db.tables[tableB].schema.columns;
  
  if (!tableASchema[columnName]) {
    return { error: `Column "${columnName}" does not exist in table "${tableA}"` };
  }
  
  if (!tableBSchema[columnName]) {
    return { error: `Column "${columnName}" does not exist in table "${tableB}"` };
  }

  const rowsA = getTableRows(tableA);
  const rowsB = getTableRows(tableB);

  const valuesA = new Set();
  const valuesB = new Set();
  
  // Extract column values from tableA, ignoring null/undefined
  for (const record of rowsA) {
    const value = record[columnName];
    if (value !== null && value !== undefined) {
      valuesA.add(value);
    }
  }
  
  // Extract column values from tableB, ignoring null/undefined
  for (const record of rowsB) {
    const value = record[columnName];
    if (value !== null && value !== undefined) {
      valuesB.add(value);
    }
  }

  // Find difference: values in A but not in B
  const diff = [];
  for (const value of valuesA) {
    if (!valuesB.has(value)) {
      diff.push(value);
    }
  }

  return { data: diff, type: 'set' };
}

function executeDelete(query, db) {
  const upper = query.toUpperCase();
  
  // Parse: DELETE FROM tableName [WHERE condition]
  const fromMatch = query.match(/DELETE\s+FROM\s+(\w+)/i);
  if (!fromMatch) {
    return { error: 'Invalid DELETE syntax. Use: DELETE FROM tableName [WHERE condition]' };
  }

  const tableName = fromMatch[1].toLowerCase();
  
  if (!db.tables[tableName]) {
    return { error: `Table "${tableName}" does not exist` };
  }

  let rowsToDelete = getTableRows(tableName);
  let deletedCount = 0;

  // Check for WHERE clause
  const whereIndex = upper.indexOf('WHERE');
  if (whereIndex !== -1) {
    const whereStr = query.substring(whereIndex + 5).trim();
    const condition = parseWhere(whereStr);
    
    if (!condition) {
      return { error: 'Invalid WHERE clause' };
    }
    
    // Filter rows that match the condition
    rowsToDelete = rowsToDelete.filter(record => 
      evaluateCondition(record, condition.field, condition.operator, condition.value)
    );
  }

  // Delete each matching row using the existing deleteRow function
  // This ensures FK constraints and onDelete rules are respected
  // Collect row IDs first to avoid issues with cascading deletes
  const rowIdsToDelete = rowsToDelete.map(row => row.id);
  
  for (const rowId of rowIdsToDelete) {
    try {
      deleteRow(tableName, rowId);
      deletedCount++;
    } catch (error) {
      // If row doesn't exist (might have been deleted by cascade), skip it
      if (error.message.includes('does not exist')) {
        continue;
      }
      // If deletion fails due to FK constraints, return error
      return { error: error.message };
    }
  }

  return { message: `${deletedCount} row(s) deleted`, type: 'action' };
}

function executeDrop(query, db) {
  const upper = query.toUpperCase().trim();
  
  // DROP DATABASE
  if (upper === 'DROP DATABASE') {
    try {
      dropDatabase();
      return { message: 'Database dropped successfully', type: 'action' };
    } catch (error) {
      return { error: error.message };
    }
  }

  // DROP TABLE tableName
  const dropTableMatch = query.match(/DROP\s+TABLE\s+(\w+)/i);
  if (dropTableMatch) {
    const tableName = dropTableMatch[1].toLowerCase();
    try {
      dropTable(tableName);
      return { message: `Table "${tableName}" dropped successfully`, type: 'action' };
    } catch (error) {
      return { error: error.message };
    }
  }

  // DROP COLUMN columnName FROM tableName
  const dropColumnMatch = query.match(/DROP\s+COLUMN\s+(\w+)\s+FROM\s+(\w+)/i);
  if (dropColumnMatch) {
    const columnName = dropColumnMatch[1];
    const tableName = dropColumnMatch[2].toLowerCase();
    try {
      dropColumn(tableName, columnName);
      return { message: `Column "${columnName}" dropped from table "${tableName}" successfully`, type: 'action' };
    } catch (error) {
      return { error: error.message };
    }
  }

  return { error: 'Invalid DROP syntax. Use: DROP TABLE tableName, DROP COLUMN columnName FROM tableName, or DROP DATABASE' };
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

    if (upper.startsWith('UNION')) {
      return executeUnion(trimmed, db);
    }

    if (upper.startsWith('INTERSECT')) {
      return executeIntersect(trimmed, db);
    }

    if (upper.startsWith('DIFF')) {
      return executeDiff(trimmed, db);
    }

    if (upper.startsWith('DELETE')) {
      return executeDelete(trimmed, db);
    }

    if (upper.startsWith('DROP')) {
      return executeDrop(trimmed, db);
    }

    if (upper === 'SHOW TABLES') {
      const tables = Object.keys(db.tables).map(name => {
        const table = db.tables[name];
        const rowCount = Object.keys(table.rows).length;
        return { name, rows: rowCount };
      });
      return { data: tables, type: 'tables' };
    }

    return { error: 'Invalid query syntax. Supported: SELECT, UNION, INTERSECT, DIFF, DELETE, DROP, SHOW TABLES' };
  } catch (error) {
    return { error: `Query error: ${error.message}` };
  }
}
