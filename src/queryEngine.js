// Simple query engine with custom syntax

// Helper: Check if two records are equal
function recordsEqual(a, b) {
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => a[key] === b[key]);
}

// Helper: Parse value (try number, boolean, or keep as string)
function parseValue(str) {
  const trimmed = str.trim();
  if (!isNaN(Number(trimmed)) && trimmed !== '') {
    return Number(trimmed);
  }
  if (trimmed.toLowerCase() === 'true') return true;
  if (trimmed.toLowerCase() === 'false') return false;
  return trimmed.replace(/^["']|["']$/g, '');
}

// Helper: Evaluate condition
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

// Helper: Parse WHERE clause
function parseWhere(whereStr) {
  const patterns = [
    /(\w+)\s*(>=|<=|!=)\s*(.+)/,
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

// Execute query with custom syntax
export function executeQuery(query, db) {
  const trimmed = query.trim();
  const upper = trimmed.toUpperCase();
  const parts = upper.split(/\s+/);
  
  try {
    // GET <table> [WHERE <field> <op> <value>]
    // Custom syntax: GET instead of SELECT
    if (parts[0] === 'GET') {
      if (parts.length < 2) {
        return { error: 'GET requires table name' };
      }
      
      const tableName = parts[1].toLowerCase();
      if (!db[tableName]) {
        return { error: `Table "${tableName}" does not exist` };
      }
      
      let result = [...db[tableName]];
      
      // Check for WHERE clause
      const whereIndex = upper.indexOf('WHERE');
      if (whereIndex !== -1) {
        const whereStr = trimmed.substring(whereIndex + 5).trim();
        const condition = parseWhere(whereStr);
        
        if (!condition) {
          return { error: 'Invalid WHERE clause' };
        }
        
        result = result.filter(record => 
          evaluateCondition(record, condition.field, condition.operator, condition.value)
        );
      }
      
      return { data: result, type: 'table' };
    }
    
    // ADD <table> { ... }
    // Custom syntax: ADD instead of INSERT
    if (parts[0] === 'ADD') {
      if (parts.length < 2) {
        return { error: 'ADD requires table name' };
      }
      
      const tableName = parts[1].toLowerCase();
      const jsonStart = trimmed.indexOf('{');
      
      if (jsonStart === -1) {
        return { error: 'ADD requires JSON object' };
      }
      
      try {
        const jsonStr = trimmed.substring(jsonStart);
        const newRecord = JSON.parse(jsonStr);
        
        // Auto-add id if not present
        if (!newRecord.id) {
          const table = db[tableName] || [];
          const maxId = table.length > 0 
            ? Math.max(...table.map(r => r.id || 0))
            : 0;
          newRecord.id = maxId + 1;
        }
        
        const updatedDb = { ...db };
        if (!updatedDb[tableName]) {
          updatedDb[tableName] = [];
        }
        updatedDb[tableName] = [...updatedDb[tableName], newRecord];
        
        return { 
          data: [newRecord], 
          type: 'table',
          updatedDb,
          affectedRows: 1
        };
      } catch (error) {
        return { error: `Invalid JSON: ${error.message}` };
      }
    }
    
    // REMOVE <table> [WHERE <field> <op> <value>]
    // Custom syntax: REMOVE instead of DELETE
    if (parts[0] === 'REMOVE') {
      if (parts.length < 2) {
        return { error: 'REMOVE requires table name' };
      }
      
      const tableName = parts[1].toLowerCase();
      if (!db[tableName]) {
        return { error: `Table "${tableName}" does not exist` };
      }
      
      const updatedDb = { ...db };
      updatedDb[tableName] = [...updatedDb[tableName]];
      
      let affectedRows = 0;
      const whereIndex = upper.indexOf('WHERE');
      
      if (whereIndex !== -1) {
        const whereStr = trimmed.substring(whereIndex + 5).trim();
        const condition = parseWhere(whereStr);
        
        if (!condition) {
          return { error: 'Invalid WHERE clause' };
        }
        
        updatedDb[tableName] = updatedDb[tableName].filter(record => {
          const matches = evaluateCondition(record, condition.field, condition.operator, condition.value);
          if (matches) affectedRows++;
          return !matches;
        });
      } else {
        affectedRows = updatedDb[tableName].length;
        updatedDb[tableName] = [];
      }
      
      return {
        data: [],
        type: 'table',
        updatedDb,
        affectedRows
      };
    }
    
    // UPDATE <table> SET <field> = <value> [WHERE <condition>]
    if (parts[0] === 'UPDATE') {
      if (parts.length < 2) {
        return { error: 'UPDATE requires table name' };
      }
      
      const tableName = parts[1].toLowerCase();
      if (!db[tableName]) {
        return { error: `Table "${tableName}" does not exist` };
      }
      
      const setIndex = upper.indexOf('SET');
      if (setIndex === -1) {
        return { error: 'UPDATE requires SET clause' };
      }
      
      const whereIndex = upper.indexOf('WHERE');
      const setEnd = whereIndex !== -1 ? whereIndex : trimmed.length;
      const setClause = trimmed.substring(setIndex + 3, setEnd).trim();
      const setMatch = setClause.match(/^(\w+)\s*=\s*(.+)$/);
      
      if (!setMatch) {
        return { error: 'Invalid SET clause. Use: SET field = value' };
      }
      
      const field = setMatch[1].trim();
      const value = parseValue(setMatch[2].trim());
      
      const updatedDb = { ...db };
      updatedDb[tableName] = [...updatedDb[tableName]];
      let affectedRows = 0;
      
      if (whereIndex !== -1) {
        const whereStr = trimmed.substring(whereIndex + 5).trim();
        const condition = parseWhere(whereStr);
        
        if (!condition) {
          return { error: 'Invalid WHERE clause' };
        }
        
        updatedDb[tableName] = updatedDb[tableName].map(record => {
          if (evaluateCondition(record, condition.field, condition.operator, condition.value)) {
            affectedRows++;
            return { ...record, [field]: value };
          }
          return record;
        });
      } else {
        updatedDb[tableName] = updatedDb[tableName].map(record => {
          affectedRows++;
          return { ...record, [field]: value };
        });
      }
      
      return {
        data: updatedDb[tableName],
        type: 'table',
        updatedDb,
        affectedRows
      };
    }
    
    // UNION <tableA> <tableB>
    if (parts[0] === 'UNION') {
      if (parts.length < 3) {
        return { error: 'UNION requires two table names' };
      }
      
      const tableA = parts[1].toLowerCase();
      const tableB = parts[2].toLowerCase();
      
      if (!db[tableA] || !db[tableB]) {
        return { error: `One or both tables do not exist: ${tableA}, ${tableB}` };
      }
      
      const union = [];
      
      // Add all from A
      for (const record of db[tableA]) {
        if (!union.some(r => recordsEqual(r, record))) {
          union.push(record);
        }
      }
      
      // Add from B if not already in union
      for (const record of db[tableB]) {
        if (!union.some(r => recordsEqual(r, record))) {
          union.push(record);
        }
      }
      
      return { data: union, type: 'set' };
    }
    
    // INTERSECT <tableA> <tableB>
    if (parts[0] === 'INTERSECT') {
      if (parts.length < 3) {
        return { error: 'INTERSECT requires two table names' };
      }
      
      const tableA = parts[1].toLowerCase();
      const tableB = parts[2].toLowerCase();
      
      if (!db[tableA] || !db[tableB]) {
        return { error: `One or both tables do not exist: ${tableA}, ${tableB}` };
      }
      
      const intersection = [];
      
      for (const record of db[tableA]) {
        if (db[tableB].some(r => recordsEqual(r, record))) {
          if (!intersection.some(r => recordsEqual(r, record))) {
            intersection.push(record);
          }
        }
      }
      
      return { data: intersection, type: 'set' };
    }
    
    // DIFF <tableA> <tableB>
    // Returns records in A that are not in B
    if (parts[0] === 'DIFF') {
      if (parts.length < 3) {
        return { error: 'DIFF requires two table names' };
      }
      
      const tableA = parts[1].toLowerCase();
      const tableB = parts[2].toLowerCase();
      
      if (!db[tableA] || !db[tableB]) {
        return { error: `One or both tables do not exist: ${tableA}, ${tableB}` };
      }
      
      const diff = [];
      
      for (const record of db[tableA]) {
        if (!db[tableB].some(r => recordsEqual(r, record))) {
          if (!diff.some(r => recordsEqual(r, record))) {
            diff.push(record);
          }
        }
      }
      
      return { data: diff, type: 'set' };
    }
    
    // JOIN <table1> <table2> ON <table1>.<field> = <table2>.<field>
    // Simple INNER JOIN implementation
    if (parts[0] === 'JOIN') {
      if (parts.length < 4) {
        return { error: 'JOIN requires: JOIN table1 table2 ON table1.field = table2.field' };
      }
      
      const table1Name = parts[1].toLowerCase();
      const table2Name = parts[2].toLowerCase();
      
      if (!db[table1Name] || !db[table2Name]) {
        return { error: `One or both tables do not exist: ${table1Name}, ${table2Name}` };
      }
      
      // Find ON clause
      const onIndex = upper.indexOf('ON');
      if (onIndex === -1) {
        return { error: 'JOIN requires ON clause: JOIN table1 table2 ON table1.field = table2.field' };
      }
      
      const onClause = trimmed.substring(onIndex + 2).trim();
      // Parse: table1.field = table2.field
      const onMatch = onClause.match(/(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/);
      
      if (!onMatch) {
        return { error: 'Invalid ON clause. Use: ON table1.field = table2.field' };
      }
      
      const [, table1Ref, field1, table2Ref, field2] = onMatch;
      
      // Verify table references match
      if (table1Ref.toLowerCase() !== table1Name && table1Ref.toLowerCase() !== table2Name) {
        return { error: `Table reference "${table1Ref}" does not match table names` };
      }
      if (table2Ref.toLowerCase() !== table1Name && table2Ref.toLowerCase() !== table2Name) {
        return { error: `Table reference "${table2Ref}" does not match table names` };
      }
      
      // Determine which field belongs to which table
      let table1Field, table2Field;
      if (table1Ref.toLowerCase() === table1Name) {
        table1Field = field1;
        table2Field = field2;
      } else {
        table1Field = field2;
        table2Field = field1;
      }
      
      // Perform INNER JOIN
      const joined = [];
      for (const record1 of db[table1Name]) {
        for (const record2 of db[table2Name]) {
          if (record1[table1Field] === record2[table2Field]) {
            // Merge records, prefixing fields with table names to avoid conflicts
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
    
    // SHOW TABLES
    if (upper === 'SHOW TABLES') {
      return {
        data: Object.keys(db).map(name => ({ 
          name, 
          rows: db[name].length 
        })),
        type: 'tables'
      };
    }
    
    return { error: 'Invalid query syntax' };
  } catch (error) {
    return { error: `Query error: ${error.message}` };
  }
}
