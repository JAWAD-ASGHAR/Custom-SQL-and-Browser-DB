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

    // SELECT [fields] FROM <file> [WHERE <condition>] [ORDERBY <field> [DESC|ASC]] [LIMIT <n>]
    if (parts[0] === 'SELECT') {
      const fromIndex = trimmedQuery.indexOf('FROM');
      if (fromIndex === -1) {
        return { error: 'Invalid query: Missing FROM clause' };
      }

      // Extract file name from original query (case-sensitive)
      const originalParts = query.trim().split(/\s+/);
      const originalFromIndex = originalParts.findIndex(p => p.toUpperCase() === 'FROM');
      const fileName = originalParts[originalFromIndex + 1]?.toLowerCase();
      
      if (!fileName) {
        return { error: 'Invalid query: Missing file name after FROM' };
      }
      
      if (!db[fileName]) {
        return { error: `File "${fileName}" does not exist` };
      }

      let result = [...db[fileName]];

      // Parse projection (fields to select)
      const selectPart = query.substring(0, originalFromIndex).trim();
      const fieldsPart = selectPart.substring(6).trim(); // Remove "SELECT"
      let selectedFields: string[] | null = null;
      
      if (fieldsPart && fieldsPart !== '*') {
        selectedFields = fieldsPart.split(',').map(f => f.trim());
      }

      // Check for WHERE clause
      const whereIndex = trimmedQuery.indexOf('WHERE');
      if (whereIndex !== -1) {
        // Find the end of WHERE clause (before ORDERBY or LIMIT)
        let whereEnd = query.length;
        const orderByIndex = trimmedQuery.indexOf('ORDERBY', whereIndex);
        const limitIndex = trimmedQuery.indexOf('LIMIT', whereIndex);
        
        if (orderByIndex !== -1 && orderByIndex < whereEnd) whereEnd = orderByIndex;
        if (limitIndex !== -1 && limitIndex < whereEnd) whereEnd = limitIndex;
        
        const wherePart = query.substring(whereIndex + 5, whereEnd).trim();
        const condition = parseWhereClause(wherePart);
        
        if (!condition) {
          return { error: 'Invalid WHERE clause syntax' };
        }

        result = result.filter(record => evaluateCondition(record, condition));
      }

      // Check for ORDERBY (replaces SORTBY for consistency)
      let orderByIndex = trimmedQuery.indexOf('ORDERBY');
      if (orderByIndex === -1) {
        orderByIndex = trimmedQuery.indexOf('SORTBY'); // Support legacy SORTBY
      }
      
      if (orderByIndex !== -1) {
        // Find the end of ORDERBY clause (before LIMIT)
        let orderByEnd = query.length;
        const limitIndex = trimmedQuery.indexOf('LIMIT', orderByIndex);
        if (limitIndex !== -1) orderByEnd = limitIndex;
        
        const orderByPart = query.substring(orderByIndex + (trimmedQuery.indexOf('ORDERBY') !== -1 ? 7 : 6), orderByEnd).trim();
        const orderByParts = orderByPart.split(/\s+/);
        const sortField = orderByParts[0];
        const direction = orderByParts[1]?.toUpperCase() || 'ASC';
        
        result.sort((a, b) => {
          const aVal = a[sortField];
          const bVal = b[sortField];
          let comparison = 0;
          
          if (aVal < bVal) comparison = -1;
          else if (aVal > bVal) comparison = 1;
          
          return direction === 'DESC' ? -comparison : comparison;
        });
      }

      // Check for LIMIT
      const limitIndex = trimmedQuery.indexOf('LIMIT');
      if (limitIndex !== -1) {
        const limitPart = query.substring(limitIndex + 5).trim();
        const limitValue = parseInt(limitPart.split(/\s+/)[0], 10);
        
        if (isNaN(limitValue) || limitValue < 0) {
          return { error: 'Invalid LIMIT value' };
        }
        
        result = result.slice(0, limitValue);
      }

      // Apply projection if specified
      if (selectedFields) {
        result = result.map(record => {
          const projected: Record<string, any> = {};
          for (const field of selectedFields!) {
            if (field in record) {
              projected[field] = record[field];
            }
          }
          return projected;
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

    // JOIN <tableA> <tableB> ON <tableA.fieldA> = <tableB.fieldB>
    if (parts[0] === 'JOIN') {
      // Find ON clause position
      const onIndex = trimmedQuery.indexOf('ON');
      if (onIndex === -1) {
        return { error: 'Invalid query: JOIN requires ON clause' };
      }

      // Extract table names (case-sensitive from original query)
      const originalParts = query.trim().split(/\s+/);
      const tableA = originalParts[1]?.toLowerCase();
      const tableB = originalParts[2]?.toLowerCase();

      if (!tableA || !tableB) {
        return { error: 'Invalid query: JOIN requires two table names' };
      }

      if (!db[tableA] || !db[tableB]) {
        return { error: `One or both tables do not exist: ${tableA}, ${tableB}` };
      }

      // Extract ON clause
      const onClause = query.substring(onIndex + 2).trim();
      
      // Parse: tableA.fieldA = tableB.fieldB
      const onMatch = onClause.match(/^(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)$/);
      if (!onMatch) {
        return { error: 'Invalid ON clause syntax. Expected: tableA.fieldA = tableB.fieldB' };
      }

      const [, tableAInClause, fieldA, tableBInClause, fieldB] = onMatch;
      
      // Verify table names in ON clause match the table names in JOIN
      if (tableAInClause.toLowerCase() !== tableA || tableBInClause.toLowerCase() !== tableB) {
        return { error: 'Table names in ON clause must match table names in JOIN' };
      }

      const tableAData = db[tableA];
      const tableBData = db[tableB];
      const joinedResults: Record<string, any>[] = [];

      // Perform Cartesian product and filter
      for (const recordA of tableAData) {
        for (const recordB of tableBData) {
          // Check if fieldA from tableA equals fieldB from tableB
          if (recordA[fieldA] === recordB[fieldB]) {
            // Merge the two objects into one combined record
            // Prefix fields with table name to avoid conflicts
            const mergedRecord: Record<string, any> = {};
            
            // Add all fields from tableA with prefix
            for (const key in recordA) {
              mergedRecord[`${tableA}.${key}`] = recordA[key];
            }
            
            // Add all fields from tableB with prefix
            for (const key in recordB) {
              mergedRecord[`${tableB}.${key}`] = recordB[key];
            }
            
            joinedResults.push(mergedRecord);
          }
        }
      }

      return { data: joinedResults, type: 'table' };
    }

    // INSERT INTO <table> { ... }
    if (parts[0] === 'INSERT' && parts[1] === 'INTO') {
      const originalParts = query.trim().split(/\s+/);
      const intoIndex = originalParts.findIndex(p => p.toUpperCase() === 'INTO');
      const tableName = originalParts[intoIndex + 1]?.toLowerCase();
      
      if (!tableName) {
        return { error: 'Invalid query: Missing table name after INTO' };
      }

      // Find the JSON object in the query
      const jsonStart = query.indexOf('{');
      if (jsonStart === -1) {
        return { error: 'Invalid query: Missing JSON object' };
      }

      const jsonEnd = query.lastIndexOf('}');
      if (jsonEnd === -1 || jsonEnd <= jsonStart) {
        return { error: 'Invalid query: Invalid JSON object' };
      }

      try {
        const jsonStr = query.substring(jsonStart, jsonEnd + 1);
        const newRecord = JSON.parse(jsonStr);
        
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
        return { error: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}` };
      }
    }

    // UPDATE <table> SET <field> = <value> [WHERE <condition>]
    if (parts[0] === 'UPDATE') {
      const originalParts = query.trim().split(/\s+/);
      const tableName = originalParts[1]?.toLowerCase();
      
      if (!tableName) {
        return { error: 'Invalid query: Missing table name after UPDATE' };
      }

      if (!db[tableName]) {
        return { error: `Table "${tableName}" does not exist` };
      }

      const setIndex = trimmedQuery.indexOf('SET');
      if (setIndex === -1) {
        return { error: 'Invalid query: Missing SET clause' };
      }

      // Find WHERE clause if present
      const whereIndex = trimmedQuery.indexOf('WHERE');
      const setEnd = whereIndex !== -1 ? whereIndex : query.length;
      
      // Parse SET clause: field = value
      const setClause = query.substring(setIndex + 3, setEnd).trim();
      const setMatch = setClause.match(/^(\w+)\s*=\s*(.+)$/);
      
      if (!setMatch) {
        return { error: 'Invalid SET clause syntax. Expected: field = value' };
      }

      const field = setMatch[1].trim();
      const value = parseValue(setMatch[2].trim());

      const updatedDb = { ...db };
      updatedDb[tableName] = [...updatedDb[tableName]];
      
      let affectedRows = 0;

      // Apply WHERE filter if present
      if (whereIndex !== -1) {
        const wherePart = query.substring(whereIndex + 5).trim();
        const condition = parseWhereClause(wherePart);
        
        if (!condition) {
          return { error: 'Invalid WHERE clause syntax' };
        }

        // Update records that match the condition
        for (let i = 0; i < updatedDb[tableName].length; i++) {
          if (evaluateCondition(updatedDb[tableName][i], condition)) {
            updatedDb[tableName][i] = { ...updatedDb[tableName][i], [field]: value };
            affectedRows++;
          }
        }
      } else {
        // Update all records if no WHERE clause
        for (let i = 0; i < updatedDb[tableName].length; i++) {
          updatedDb[tableName][i] = { ...updatedDb[tableName][i], [field]: value };
        }
        affectedRows = updatedDb[tableName].length;
      }

      return { 
        data: updatedDb[tableName], 
        type: 'table',
        updatedDb,
        affectedRows
      };
    }

    // DELETE FROM <table> [WHERE <condition>]
    if (parts[0] === 'DELETE' && parts[1] === 'FROM') {
      const originalParts = query.trim().split(/\s+/);
      const fromIndex = originalParts.findIndex(p => p.toUpperCase() === 'FROM');
      const tableName = originalParts[fromIndex + 1]?.toLowerCase();
      
      if (!tableName) {
        return { error: 'Invalid query: Missing table name after FROM' };
      }

      if (!db[tableName]) {
        return { error: `Table "${tableName}" does not exist` };
      }

      const updatedDb = { ...db };
      updatedDb[tableName] = [...updatedDb[tableName]];
      
      let affectedRows = 0;

      // Check for WHERE clause
      const whereIndex = trimmedQuery.indexOf('WHERE');
      if (whereIndex !== -1) {
        const wherePart = query.substring(whereIndex + 5).trim();
        const condition = parseWhereClause(wherePart);
        
        if (!condition) {
          return { error: 'Invalid WHERE clause syntax' };
        }

        // Filter out records that match the condition
        updatedDb[tableName] = updatedDb[tableName].filter(record => {
          const matches = evaluateCondition(record, condition);
          if (matches) affectedRows++;
          return !matches;
        });
      } else {
        // Delete all records if no WHERE clause
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

    return { error: 'Invalid query syntax' };
  } catch (error) {
    return { error: `Query execution error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

