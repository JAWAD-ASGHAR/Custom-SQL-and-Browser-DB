import { v4 as uuidv4 } from 'uuid';
const STORAGE_KEY = 'MiniDB';

function generateUUID() {
  return uuidv4();
}

export function loadDB() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {
        meta: {
          version: '1.0',
          createdAt: new Date().toISOString()
        },
        tables: {}
      };
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error loading database:', error);
    return {
      meta: {
        version: '1.0',
        createdAt: new Date().toISOString()
      },
      tables: {}
    };
  }
}

export function saveDB(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (error) {
    console.error('Error saving database:', error);
    throw new Error('Failed to save database. Storage may be full.');
  }
}

export function getTable(tableName) {
  const db = loadDB();
  return db.tables[tableName] || null;
}

export function getAllTables() {
  const db = loadDB();
  return db.tables;
}

export function createTable(name, schema) {
  const db = loadDB();
  
  if (db.tables[name]) {
    throw new Error(`Table "${name}" already exists`);
  }

  const columns = {
    id: { type: 'uuid', primary: true },
    ...schema.columns
  };

  validateSchema(columns, schema.foreignKeys || {});

  db.tables[name] = {
    name,
    schema: {
      columns,
      foreignKeys: schema.foreignKeys || {}
    },
    rows: {}
  };

  saveDB(db);
  return db.tables[name];
}

function validateSchema(columns, foreignKeys) {
  for (const fkColumn in foreignKeys) {
    if (!columns[fkColumn]) {
      throw new Error(`Foreign key column "${fkColumn}" does not exist in schema`);
    }
    const fk = foreignKeys[fkColumn];
    if (!fk.references) {
      throw new Error(`Foreign key "${fkColumn}" must specify references`);
    }
    const [refTable] = fk.references.split('.');
    if (!refTable) {
      throw new Error(`Invalid foreign key reference format: "${fk.references}"`);
    }
  }
}

export function insertRow(tableName, data) {
  const db = loadDB();
  const table = db.tables[tableName];
  
  if (!table) {
    throw new Error(`Table "${tableName}" does not exist`);
  }

  const id = generateUUID();
  const row = { id, ...data };

  for (const col in table.schema.columns) {
    const column = table.schema.columns[col];
    if (col === 'id') continue;
    
    if (column.type === 'date' && col === 'createdAt' && !row[col]) {
      row[col] = new Date().toISOString();
    } else if (row[col] === undefined) {
      row[col] = null;
    }
  }

  for (const fkColumn in table.schema.foreignKeys) {
    if (row[fkColumn] !== null && row[fkColumn] !== undefined) {
      const fk = table.schema.foreignKeys[fkColumn];
      const [refTable] = fk.references.split('.');
      const refTableData = db.tables[refTable];
      
      if (!refTableData) {
        throw new Error(`Referenced table "${refTable}" does not exist`);
      }
      
      if (!refTableData.rows[row[fkColumn]]) {
        throw new Error(`Foreign key violation: ${fkColumn} references non-existent row in ${refTable}`);
      }
    }
  }

  table.rows[id] = row;
  saveDB(db);
  return row;
}

export function updateRow(tableName, id, changes) {
  const db = loadDB();
  const table = db.tables[tableName];
  
  if (!table) {
    throw new Error(`Table "${tableName}" does not exist`);
  }
  
  if (!table.rows[id]) {
    throw new Error(`Row with id "${id}" does not exist in table "${tableName}"`);
  }

  const row = table.rows[id];
  
  if (changes.id !== undefined && changes.id !== id) {
    throw new Error('Cannot change row id');
  }

  for (const key in changes) {
    if (key === 'id') continue;
    
    if (!table.schema.columns[key]) {
      throw new Error(`Column "${key}" does not exist in table "${tableName}"`);
    }
    
    if (table.schema.foreignKeys[key]) {
      const fk = table.schema.foreignKeys[key];
      const [refTable] = fk.references.split('.');
      const refTableData = db.tables[refTable];
      
      if (changes[key] !== null && changes[key] !== undefined) {
        if (!refTableData) {
          throw new Error(`Referenced table "${refTable}" does not exist`);
        }
        
        if (!refTableData.rows[changes[key]]) {
          throw new Error(`Foreign key violation: ${key} references non-existent row in ${refTable}`);
        }
      }
    }
    
    row[key] = changes[key];
  }

  saveDB(db);
  return row;
}

export function deleteRow(tableName, id) {
  const db = loadDB();
  const table = db.tables[tableName];
  
  if (!table) {
    throw new Error(`Table "${tableName}" does not exist`);
  }
  
  if (!table.rows[id]) {
    throw new Error(`Row with id "${id}" does not exist in table "${tableName}"`);
  }

  for (const otherTableName in db.tables) {
    const otherTable = db.tables[otherTableName];
    for (const fkColumn in otherTable.schema.foreignKeys) {
      const fk = otherTable.schema.foreignKeys[fkColumn];
      const [refTable] = fk.references.split('.');
      
      if (refTable === tableName) {
        const onDelete = fk.onDelete || 'restrict';
        
        if (onDelete === 'restrict') {
          for (const rowId in otherTable.rows) {
            if (otherTable.rows[rowId][fkColumn] === id) {
              throw new Error(`Cannot delete row: referenced by ${otherTableName}.${fkColumn} (restrict)`);
            }
          }
        } else if (onDelete === 'cascade') {
          const rowsToDelete = [];
          for (const rowId in otherTable.rows) {
            if (otherTable.rows[rowId][fkColumn] === id) {
              rowsToDelete.push(rowId);
            }
          }
          for (const rowId of rowsToDelete) {
            delete otherTable.rows[rowId];
          }
        } else if (onDelete === 'set-null') {
          for (const rowId in otherTable.rows) {
            if (otherTable.rows[rowId][fkColumn] === id) {
              otherTable.rows[rowId][fkColumn] = null;
            }
          }
        }
      }
    }
  }

  delete table.rows[id];
  saveDB(db);
}

export function getTableRows(tableName) {
  const table = getTable(tableName);
  if (!table) {
    return [];
  }
  return Object.values(table.rows);
}

export function exportDatabase() {
  const db = loadDB();
  return JSON.stringify(db, null, 2);
}

export function importDatabase(jsonString, overwrite = false) {
  try {
    const importedDb = JSON.parse(jsonString);
    
    if (!importedDb.meta || !importedDb.tables) {
      throw new Error('Invalid database format. Expected { meta: {}, tables: {} }');
    }

    if (overwrite) {
      saveDB(importedDb);
    } else {
      const currentDb = loadDB();
      for (const tableName in importedDb.tables) {
        currentDb.tables[tableName] = importedDb.tables[tableName];
      }
      currentDb.meta = { ...currentDb.meta, ...importedDb.meta };
      saveDB(currentDb);
    }
    
    return true;
  } catch (error) {
    console.error('Error importing database:', error);
    throw new Error(`Failed to import database: ${error.message}`);
  }
}

export function dropTable(tableName) {
  const db = loadDB();
  
  if (!db.tables[tableName]) {
    throw new Error(`Table "${tableName}" does not exist`);
  }

  // Check if any other table references this table via foreign keys
  for (const otherTableName in db.tables) {
    if (otherTableName === tableName) continue;
    
    const otherTable = db.tables[otherTableName];
    for (const fkColumn in otherTable.schema.foreignKeys) {
      const fk = otherTable.schema.foreignKeys[fkColumn];
      const [refTable] = fk.references.split('.');
      
      if (refTable === tableName) {
        throw new Error(`Cannot drop table "${tableName}": referenced by ${otherTableName}.${fkColumn}`);
      }
    }
  }

  delete db.tables[tableName];
  saveDB(db);
}

export function dropColumn(tableName, columnName) {
  const db = loadDB();
  const table = db.tables[tableName];
  
  if (!table) {
    throw new Error(`Table "${tableName}" does not exist`);
  }

  if (!table.schema.columns[columnName]) {
    throw new Error(`Column "${columnName}" does not exist in table "${tableName}"`);
  }

  // Prevent dropping primary key
  if (columnName === 'id') {
    throw new Error('Cannot drop primary key column "id"');
  }

  // Prevent dropping columns used as foreign keys
  if (table.schema.foreignKeys[columnName]) {
    throw new Error(`Cannot drop column "${columnName}": used as foreign key`);
  }

  // Remove column from schema
  delete table.schema.columns[columnName];

  // Remove column from all existing rows
  for (const rowId in table.rows) {
    delete table.rows[rowId][columnName];
  }

  saveDB(db);
}

export function dropDatabase() {
  const db = {
    meta: {
      version: '1.0',
      createdAt: new Date().toISOString()
    },
    tables: {}
  };
  saveDB(db);
}
