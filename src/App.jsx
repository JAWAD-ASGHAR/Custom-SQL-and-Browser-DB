import React, { useState, useEffect, useRef } from 'react';
import { 
  loadDB, 
  saveDB, 
  initSampleData, 
  getAllTables, 
  getTable, 
  getTableRows,
  createTable,
  insertRow,
  updateRow,
  deleteRow,
  exportDatabase,
  importDatabase
} from './database';
import { executeQuery } from './queryEngine';

function App() {
  const [db, setDb] = useState({ meta: {}, tables: {} });
  const [selectedTable, setSelectedTable] = useState(null);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [showCreateTable, setShowCreateTable] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [showAddRow, setShowAddRow] = useState(false);
  const [newRow, setNewRow] = useState({});
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [columnType, setColumnType] = useState('string');
  const [columnIsForeignKey, setColumnIsForeignKey] = useState(false);
  const [referencedTable, setReferencedTable] = useState('');
  const [showCreateRelation, setShowCreateRelation] = useState(false);
  const [relationFromTable, setRelationFromTable] = useState('');
  const [relationFromColumn, setRelationFromColumn] = useState('');
  const [relationToTable, setRelationToTable] = useState('');
  const [onDeleteAction, setOnDeleteAction] = useState('restrict');
  const [showRelationsView, setShowRelationsView] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // { rowId, column }
  const [editValue, setEditValue] = useState('');
  const [tablesToLink, setTablesToLink] = useState([]); // Tables to link when creating new table
  const fileInputRef = useRef(null);

  useEffect(() => {
    initSampleData();
    const loadedDb = loadDB();
    setDb(loadedDb);
    const firstTable = Object.keys(loadedDb.tables)[0];
    if (firstTable) {
      setSelectedTable(firstTable);
    }
  }, []);

  const refreshDb = () => {
    const loadedDb = loadDB();
    setDb(loadedDb);
  };

  const handleRunQuery = () => {
    if (!query.trim()) {
      setResult({ error: 'Please enter a query' });
      return;
    }

    const queryResult = executeQuery(query);
    setResult(queryResult);
    
    // Refresh database after query (in case data changed)
    refreshDb();
  };

  const handleCreateTable = () => {
    if (!newTableName.trim()) {
      alert('Please enter a table name');
      return;
    }

    const tableName = newTableName.trim().toLowerCase();
    if (db.tables[tableName]) {
      alert('Table already exists');
      return;
    }

    try {
      // Build schema with foreign keys if any
      const foreignKeys = {};
      if (tablesToLink.length > 0) {
        tablesToLink.forEach(refTable => {
          const fkColumnName = `${refTable}_id`;
          foreignKeys[fkColumnName] = {
            references: `${refTable}.id`,
            onDelete: 'restrict'
          };
        });
      }

      createTable(tableName, {
        columns: {},
        foreignKeys
      });

      refreshDb();
      setSelectedTable(tableName);
      setShowCreateTable(false);
      setNewTableName('');
      setTablesToLink([]);
    } catch (error) {
      alert(`Error creating table: ${error.message}`);
    }
  };

  const handleDeleteTable = (tableName) => {
    if (confirm(`Delete table "${tableName}"?`)) {
      try {
        const updatedDb = loadDB();
        delete updatedDb.tables[tableName];
        saveDB(updatedDb);
        refreshDb();
        if (selectedTable === tableName) {
          const remaining = Object.keys(updatedDb.tables);
          setSelectedTable(remaining.length > 0 ? remaining[0] : null);
        }
      } catch (error) {
        alert(`Error deleting table: ${error.message}`);
      }
    }
  };

  const handleAddColumn = (tableName) => {
    setRelationFromTable(tableName);
    setShowAddColumn(true);
  };

  const handleConfirmAddColumn = () => {
    if (!newColumnName.trim() && !columnIsForeignKey) {
      alert('Please enter a column name');
      return;
    }

    try {
      const table = getTable(relationFromTable);
      if (!table) {
        alert('Table not found');
        return;
      }

      const colName = columnIsForeignKey && referencedTable 
        ? `${referencedTable}_id` 
        : newColumnName.trim();

      if (columnIsForeignKey && !referencedTable) {
        alert('Please select a table to reference');
        return;
      }

      // Add column to schema
      const updatedDb = loadDB();
      const tableObj = updatedDb.tables[relationFromTable];
      
      // Add column to schema
      tableObj.schema.columns[colName] = { type: columnType };
      
      // If it's a foreign key, add to foreignKeys
      if (columnIsForeignKey) {
        tableObj.schema.foreignKeys[colName] = {
          references: `${referencedTable}.id`,
          onDelete: 'restrict'
        };
      }

      // Update existing rows to have the new column (set to null)
      for (const rowId in tableObj.rows) {
        if (!(colName in tableObj.rows[rowId])) {
          tableObj.rows[rowId][colName] = null;
        }
      }

      saveDB(updatedDb);
      refreshDb();
      
      // Reset form
      setNewColumnName('');
      setColumnType('string');
      setColumnIsForeignKey(false);
      setReferencedTable('');
      setShowAddColumn(false);
    } catch (error) {
      alert(`Error adding column: ${error.message}`);
    }
  };

  const handleCreateRelation = () => {
    if (!relationFromTable || !relationToTable) {
      alert('Please select both tables');
      return;
    }

    try {
      const updatedDb = loadDB();
      const tableObj = updatedDb.tables[relationFromTable];
      
      const fkColumnName = relationFromColumn || `${relationToTable}_id`;
      
      // Check if column already exists
      if (tableObj.schema.columns[fkColumnName]) {
        alert(`Column "${fkColumnName}" already exists`);
        return;
      }

      // Add column to schema
      tableObj.schema.columns[fkColumnName] = { type: 'uuid' };
      
      // Add foreign key
      tableObj.schema.foreignKeys[fkColumnName] = {
        references: `${relationToTable}.id`,
        onDelete: onDeleteAction
      };

      // Update existing rows
      for (const rowId in tableObj.rows) {
        tableObj.rows[rowId][fkColumnName] = null;
      }

      saveDB(updatedDb);
      refreshDb();

      // Reset form
      setRelationFromTable('');
      setRelationFromColumn('');
      setRelationToTable('');
      setOnDeleteAction('restrict');
      setShowCreateRelation(false);
    } catch (error) {
      alert(`Error creating relation: ${error.message}`);
    }
  };

  const handleDeleteColumn = (tableName, colName) => {
    if (colName === 'id') {
      alert('Cannot delete id column (primary key)');
      return;
    }
    if (confirm(`Delete column "${colName}"?`)) {
      try {
        const updatedDb = loadDB();
        const tableObj = updatedDb.tables[tableName];
        
        // Remove from schema
        delete tableObj.schema.columns[colName];
        delete tableObj.schema.foreignKeys[colName];
        
        // Remove from all rows
        for (const rowId in tableObj.rows) {
          delete tableObj.rows[rowId][colName];
        }

        saveDB(updatedDb);
        refreshDb();
      } catch (error) {
        alert(`Error deleting column: ${error.message}`);
      }
    }
  };

  const handleAddRow = () => {
    if (!selectedTable) return;

    try {
      // Prepare data (exclude id, it will be auto-generated)
      const data = { ...newRow };
      delete data.id;

      insertRow(selectedTable, data);
      refreshDb();
      setNewRow({});
      setShowAddRow(false);
    } catch (error) {
      alert(`Error adding row: ${error.message}`);
    }
  };

  const handleDeleteRow = (tableName, rowId) => {
    if (confirm('Delete this row?')) {
      try {
        deleteRow(tableName, rowId);
        refreshDb();
      } catch (error) {
        alert(`Error deleting row: ${error.message}`);
      }
    }
  };

  const handleCellDoubleClick = (rowId, column) => {
    if (column === 'id') return; // Don't allow editing ID column
    const rows = getTableRows(selectedTable);
    const row = rows.find(r => r.id === rowId);
    if (row) {
      setEditingCell({ rowId, column });
      setEditValue(String(row[column] || ''));
    }
  };

  const handleCellSave = (tableName, rowId, column) => {
    try {
      let value = editValue.trim();
      
      // Try to parse as number if it looks like a number
      const numValue = value !== '' && !isNaN(value) && !isNaN(parseFloat(value)) 
        ? Number(value) 
        : value;
      
      // For foreign keys, keep as string (UUID)
      const isFK = isForeignKey(column);
      const finalValue = isFK && value !== '' ? value : (value === '' ? null : numValue);
      
      updateRow(tableName, rowId, { [column]: finalValue });
      refreshDb();
      setEditingCell(null);
      setEditValue('');
    } catch (error) {
      alert(`Error updating cell: ${error.message}`);
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Helper: Check if a column is a foreign key
  const isForeignKey = (columnName) => {
    if (columnName === 'id') return false;
    if (!selectedTable) return false;
    const table = getTable(selectedTable);
    if (!table) return false;
    return columnName in table.schema.foreignKeys;
  };

  // Helper: Get the referenced table name for a foreign key
  const getReferencedTable = (columnName) => {
    if (!selectedTable) return null;
    const table = getTable(selectedTable);
    if (!table) return null;
    const fk = table.schema.foreignKeys[columnName];
    if (!fk) return null;
    const [refTable] = fk.references.split('.');
    return refTable;
  };

  // Helper: Get display text for foreign key (shows name instead of just ID)
  const getForeignKeyDisplay = (columnName, rowValue) => {
    if (!isForeignKey(columnName) || !rowValue) return String(rowValue || '');
    
    const refTable = getReferencedTable(columnName);
    if (!refTable) return String(rowValue);
    
    const refRows = getTableRows(refTable);
    const refRow = refRows.find(r => r.id === rowValue);
    if (!refRow) return String(rowValue);
    
    // Try to find a "name" field, or use first meaningful string field
    const name = refRow.name || refRow.title || Object.values(refRow).find(v => 
      typeof v === 'string' && v.length < 50 && v !== String(rowValue) && v !== refRow.id
    ) || `ID ${rowValue}`;
    
    return name;
  };

  // Helper: Get all relations in the database
  const getAllRelations = () => {
    const relations = [];
    const tables = getAllTables();
    
    for (const tableName in tables) {
      const table = tables[tableName];
      for (const fkColumn in table.schema.foreignKeys) {
        const fk = table.schema.foreignKeys[fkColumn];
        const [refTable] = fk.references.split('.');
        relations.push({
          fromTable: tableName,
          fromColumn: fkColumn,
          toTable: refTable,
          onDelete: fk.onDelete
        });
      }
    }
    return relations;
  };

  // Get current table rows as array
  const currentTable = selectedTable ? getTableRows(selectedTable) : [];
  
  // Get columns from schema
  const tableColumns = selectedTable && getTable(selectedTable)
    ? Object.keys(getTable(selectedTable).schema.columns)
    : [];

  // Get all table names for UI
  const tableNames = Object.keys(db.tables || {});

  // Handle export/download
  const handleExport = () => {
    try {
      const jsonData = exportDatabase();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `minidb-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('Database exported successfully!');
    } catch (error) {
      alert(`Error exporting database: ${error.message}`);
    }
  };

  // Handle import
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonString = e.target.result;
        const overwrite = confirm(
          'Import database?\n\n' +
          'OK = Replace all existing data\n' +
          'Cancel = Merge with existing data'
        );
        
        importDatabase(jsonString, overwrite);
        refreshDb();
        alert('Database imported successfully!');
      } catch (error) {
        alert(`Error importing database: ${error.message}`);
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  };

  // Handle download sample dataset
  const handleDownloadSample = async () => {
    try {
      // Create a fresh database with sample data
      // Save current database temporarily
      const currentDb = loadDB();
      const currentDbString = JSON.stringify(currentDb);
      
      // Clear and initialize sample data
      localStorage.removeItem('MiniDB');
      initSampleData();
      const sampleDb = loadDB();
      
      // Export the sample
      const jsonData = JSON.stringify(sampleDb, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'minidb-sample-dataset.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Restore original database
      localStorage.setItem('MiniDB', currentDbString);
      refreshDb();
      
      alert('Sample dataset downloaded! You can import it to restore the demo database.');
    } catch (error) {
      alert(`Error generating sample dataset: ${error.message}`);
      // Try to restore on error
      try {
        const currentDb = loadDB();
        if (Object.keys(currentDb.tables).length === 0) {
          // Database was cleared, try to restore from backup if available
          refreshDb();
        }
      } catch (e) {
        console.error('Error restoring database:', e);
      }
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImport}
        accept=".json"
        style={{ display: 'none' }}
      />

      {/* Sidebar - Fixed */}
      <div className="w-64 bg-gray-800 text-white flex flex-col fixed left-0 top-0 bottom-0 overflow-y-auto">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">MiniDB</h1>
          <p className="text-sm text-gray-400">Browser Database</p>
        </div>

        <div className="p-4">
          <button
            onClick={() => setShowCreateTable(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded mb-2"
          >
            + Create Table
          </button>
          <button
            onClick={() => setShowRelationsView(true)}
            className="w-full bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded mb-4"
          >
            🔗 View Relations
          </button>

          <div className="space-y-1">
            {tableNames.map(tableName => {
              const table = getTable(tableName);
              const rowCount = table ? Object.keys(table.rows).length : 0;
              return (
                <div
                  key={tableName}
                  className={`p-2 rounded cursor-pointer flex justify-between items-center ${
                    selectedTable === tableName ? 'bg-blue-600' : 'hover:bg-gray-700'
                  }`}
                  onClick={() => setSelectedTable(tableName)}
                >
                  <span>{tableName} ({rowCount})</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTable(tableName);
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col ml-64">
        {/* Header with Import/Export buttons */}
        <div className="bg-white border-b px-6 py-3 flex justify-between items-center">
          <div className="flex">
            <button
              className={`px-6 py-3 font-semibold ${
                selectedTable 
                  ? 'border-b-2 border-blue-600 text-blue-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => {
                const firstTable = tableNames[0];
                setSelectedTable(firstTable || null);
              }}
            >
              Tables
            </button>
            <button
              className={`px-6 py-3 font-semibold ${
                !selectedTable 
                  ? 'border-b-2 border-blue-600 text-blue-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setSelectedTable(null)}
            >
              Query Console
            </button>
          </div>
          
          {/* Import/Export buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleDownloadSample}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              title="Download sample dataset"
            >
              📥 Download Sample
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              title="Export current database"
            >
              💾 Export
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
              title="Import database from file"
            >
              📤 Import
            </button>
          </div>
        </div>

        {/* Content */}
        {selectedTable ? (
          <div className="flex-1 overflow-auto p-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{selectedTable}</h2>
                <div className="space-x-2">
                  <button
                    onClick={() => {
                      setRelationFromTable(selectedTable);
                      setShowCreateRelation(true);
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                    title="Create a relation to another table"
                  >
                    🔗 Create Relation
                  </button>
                  <button
                    onClick={() => handleAddColumn(selectedTable)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    + Column
                  </button>
                  <button
                    onClick={() => setShowAddRow(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    + Row
                  </button>
                </div>
              </div>

              {currentTable.length === 0 ? (
                <div>
                  <p className="text-gray-500 mb-4">No rows in this table. Add a row to get started!</p>
                  <p className="text-sm text-gray-400">Note: The 'id' column is automatically added as the primary key (UUID).</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        {tableColumns.map(col => (
                          <th key={col} className="border border-gray-300 px-4 py-2 text-left">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <span>{col}</span>
                                {isForeignKey(col) && (
                                  <span 
                                    className="text-blue-600 text-xs" 
                                    title={`Foreign key → ${getReferencedTable(col)}`}
                                  >
                                    🔗
                                  </span>
                                )}
                                {col === 'id' && (
                                  <span 
                                    className="text-green-600 text-xs" 
                                    title="Primary key"
                                  >
                                    🔑
                                  </span>
                                )}
                              </div>
                              {col !== 'id' && (
                                <button
                                  onClick={() => handleDeleteColumn(selectedTable, col)}
                                  className="text-red-600 hover:text-red-800 ml-2"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </th>
                        ))}
                        <th className="border border-gray-300 px-4 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentTable.map((row, idx) => (
                        <tr key={row.id || idx} className="hover:bg-gray-50">
                          {tableColumns.map(col => {
                            const isEditing = editingCell?.rowId === row.id && editingCell?.column === col;
                            const isFK = isForeignKey(col);
                            const refTable = getReferencedTable(col);
                            const refTableData = refTable ? getTableRows(refTable) : [];
                            
                            return (
                              <td 
                                key={col} 
                                className={`border border-gray-300 px-4 py-2 relative ${
                                  col === 'id' 
                                    ? '' 
                                    : 'hover:bg-blue-50 transition-colors'
                                }`}
                                onDoubleClick={() => handleCellDoubleClick(row.id, col)}
                                style={{ cursor: col === 'id' ? 'default' : 'pointer' }}
                                title={col === 'id' ? 'ID cannot be edited' : 'Double-click to edit'}
                              >
                                {isEditing ? (
                                  isFK && refTableData.length > 0 ? (
                                    <select
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={() => handleCellSave(selectedTable, row.id, col)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleCellSave(selectedTable, row.id, col);
                                        } else if (e.key === 'Escape') {
                                          handleCellCancel();
                                        }
                                      }}
                                      autoFocus
                                      className="w-full p-1 border-2 border-blue-500 rounded"
                                    >
                                      <option value="">Select {refTable}...</option>
                                      {refTableData.map(refRow => (
                                        <option key={refRow.id} value={refRow.id}>
                                          {refRow.id.substring(0, 8)}... - {getForeignKeyDisplay(col, refRow.id)}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type="text"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={() => handleCellSave(selectedTable, row.id, col)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleCellSave(selectedTable, row.id, col);
                                        } else if (e.key === 'Escape') {
                                          handleCellCancel();
                                        }
                                      }}
                                      autoFocus
                                      className="w-full p-1 border-2 border-blue-500 rounded"
                                    />
                                  )
                                ) : (
                                  isFK ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-blue-600 font-medium">
                                        {getForeignKeyDisplay(col, row[col])}
                                      </span>
                                      {row[col] && (
                                        <span className="text-xs text-gray-400">({row[col].substring(0, 8)}...)</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className={col === 'id' ? 'font-semibold text-gray-700' : ''}>
                                      {col === 'id' ? row[col].substring(0, 8) + '...' : String(row[col] || '')}
                                    </span>
                                  )
                                )}
                              </td>
                            );
                          })}
                          <td className="border border-gray-300 px-4 py-2">
                            <button
                              onClick={() => handleDeleteRow(selectedTable, row.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Query Console and Examples - Side by Side */}
            <div className="flex flex-1 gap-6 p-6 overflow-hidden">
              {/* Query Console - Left */}
              <div className="flex-1 bg-white rounded-lg shadow p-6 flex flex-col overflow-hidden">
                <h2 className="text-2xl font-bold mb-4">Query Console</h2>
                <div className="flex-1 flex flex-col space-y-4 min-h-0">
                  <div className="flex-1">
                    <textarea
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Enter query... (e.g., SELECT * FROM customers WHERE name = 'John')"
                      className="w-full h-full p-3 border rounded font-mono resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          handleRunQuery();
                        }
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRunQuery}
                      className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Run Query (Ctrl+Enter)
                    </button>
                    <button
                      onClick={() => {
                        setQuery('');
                        setResult(null);
                      }}
                      className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {/* Query Examples - Right */}
              <div className="w-80 bg-white rounded-lg shadow p-6 overflow-y-auto">
                <h3 className="font-semibold mb-4 text-lg">Query Examples:</h3>
                <div className="space-y-2 text-sm font-mono">
                  <div className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer" onClick={() => setQuery('SELECT * FROM customers')}>
                    SELECT * FROM customers
                  </div>
                  <div className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer" onClick={() => setQuery('SELECT name, email FROM customers')}>
                    SELECT name, email FROM customers
                  </div>
                  <div className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer" onClick={() => setQuery('SELECT * FROM customers WHERE name = "John Doe"')}>
                    SELECT * FROM customers WHERE name = "John Doe"
                  </div>
                  <div className="p-2 bg-blue-50 rounded hover:bg-blue-100 cursor-pointer border border-blue-200" onClick={() => setQuery('JOIN carts customers ON carts.customerId = customers.id')}>
                    JOIN carts customers ON carts.customerId = customers.id
                  </div>
                  <div className="p-2 bg-blue-50 rounded hover:bg-blue-100 cursor-pointer border border-blue-200" onClick={() => setQuery('JOIN cart_items products ON cart_items.productId = products.id')}>
                    JOIN cart_items products ON cart_items.productId = products.id
                  </div>
                  <div className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer" onClick={() => setQuery('UNION customers admins')}>
                    UNION customers admins
                  </div>
                  <div className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer" onClick={() => setQuery('INTERSECT customers admins')}>
                    INTERSECT customers admins
                  </div>
                  <div className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer" onClick={() => setQuery('DIFF customers admins')}>
                    DIFF customers admins
                  </div>
                  <div className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer" onClick={() => setQuery('SHOW TABLES')}>
                    SHOW TABLES
                  </div>
                </div>
              </div>
            </div>

            {/* Results - Bottom */}
            <div className="bg-white rounded-lg shadow p-6 mx-6 mb-6 overflow-auto max-h-96">
              <h3 className="text-xl font-bold mb-4">Results</h3>
              {!result ? (
                <p className="text-gray-500">No query executed yet</p>
              ) : result.error ? (
                <div className="bg-red-50 border border-red-200 rounded p-4">
                  <p className="text-red-800">Error: {result.error}</p>
                </div>
              ) : result.data && result.data.length > 0 ? (
                <div>
                  <p className="mb-2">Found {result.data.length} row(s)</p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          {Object.keys(result.data[0]).map(col => (
                            <th key={col} className="border border-gray-300 px-4 py-2 text-left">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.data.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            {Object.keys(result.data[0]).map(col => (
                              <td key={col} className="border border-gray-300 px-4 py-2">
                                {String(row[col] || '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No results</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Table Modal */}
      {showCreateTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Create Table</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Table Name</label>
                <input
                  type="text"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="e.g., products"
                />
              </div>
              
              {/* Link to Other Tables Section */}
              {tableNames.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Link to Other Tables (Optional)
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border p-2 rounded bg-gray-50">
                    {tableNames.map(tableName => (
                      <label key={tableName} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={tablesToLink.includes(tableName)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTablesToLink([...tablesToLink, tableName]);
                            } else {
                              setTablesToLink(tablesToLink.filter(t => t !== tableName));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm flex-1">{tableName}</span>
                        <span className="text-xs text-gray-500">({tableName}_id)</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Selected tables will create foreign key columns that link to them
                  </p>
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleCreateTable}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreateTable(false);
                  setNewTableName('');
                  setTablesToLink([]);
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Row Modal */}
      {showAddRow && selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add Row</h2>
            <div className="space-y-4">
              {tableColumns.length === 1 && tableColumns[0] === 'id' ? (
                <p className="text-gray-500 text-sm">
                  Table has no columns. Add a column first.
                </p>
              ) : (
                tableColumns.filter(col => col !== 'id').map(col => {
                  const isFK = isForeignKey(col);
                  const refTable = getReferencedTable(col);
                  const refTableData = refTable ? getTableRows(refTable) : [];
                  const table = getTable(selectedTable);
                  const column = table?.schema.columns[col];
                  const isDateColumn = column?.type === 'date';
                  const isCreatedAt = col === 'createdAt' && isDateColumn;
                  
                  return (
                    <div key={col}>
                      <label className="block text-sm font-medium mb-1">
                        {col}
                        {isFK && (
                          <span className="text-blue-600 text-xs ml-2" title={`Foreign key → ${refTable}`}>
                            🔗
                          </span>
                        )}
                        {isCreatedAt && (
                          <span className="text-green-600 text-xs ml-2" title="Auto-set to current date/time">
                            ⏰ (auto)
                          </span>
                        )}
                      </label>
                      {isCreatedAt && (
                        <p className="text-xs text-gray-500 mb-1">
                          Leave empty to auto-set to current date/time
                        </p>
                      )}
                      {isFK && refTableData.length > 0 ? (
                        <select
                          value={newRow[col] || ''}
                          onChange={(e) => {
                            setNewRow({ ...newRow, [col]: e.target.value || null });
                          }}
                          className="w-full p-2 border rounded"
                        >
                          <option value="">Select {refTable}...</option>
                          {refTableData.map(row => (
                            <option key={row.id} value={row.id}>
                              {row.id.substring(0, 8)}... - {getForeignKeyDisplay(col, row.id)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={newRow[col] || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Try to parse as number if it looks like a number
                            const numValue = value.trim() !== '' && !isNaN(value) ? Number(value) : value;
                            setNewRow({ ...newRow, [col]: numValue || null });
                          }}
                          className="w-full p-2 border rounded"
                          placeholder={isFK ? `Enter ${refTable} ID` : `Enter ${col}`}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleAddRow}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddRow(false);
                  setNewRow({});
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Column Modal */}
      {showAddColumn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Add Column to {relationFromTable}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Column Name</label>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="e.g., email, age, etc."
                  disabled={columnIsForeignKey}
                />
                {columnIsForeignKey && (
                  <p className="text-xs text-gray-500 mt-1">
                    Column will be named: <strong>{referencedTable}_id</strong>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Column Type</label>
                <select
                  value={columnType}
                  onChange={(e) => setColumnType(e.target.value)}
                  className="w-full p-2 border rounded"
                  disabled={columnIsForeignKey}
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="boolean">Boolean</option>
                </select>
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={columnIsForeignKey}
                    onChange={(e) => {
                      setColumnIsForeignKey(e.target.checked);
                      if (!e.target.checked) {
                        setReferencedTable('');
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">This is a Foreign Key (Relation)</span>
                </label>
              </div>
              {columnIsForeignKey && (
                <div>
                  <label className="block text-sm font-medium mb-1">References Table</label>
                  <select
                    value={referencedTable}
                    onChange={(e) => setReferencedTable(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Select a table...</option>
                    {tableNames
                      .filter(t => t !== relationFromTable)
                      .map(tableName => (
                        <option key={tableName} value={tableName}>
                          {tableName}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    This column will reference the <strong>id</strong> column of the selected table
                  </p>
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleConfirmAddColumn}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add Column
              </button>
              <button
                onClick={() => {
                  setShowAddColumn(false);
                  setNewColumnName('');
                  setColumnType('string');
                  setColumnIsForeignKey(false);
                  setReferencedTable('');
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Relation Modal */}
      {showCreateRelation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create Relation (Foreign Key)</h2>
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">From Table (has foreign key)</label>
                <select
                  value={relationFromTable}
                  onChange={(e) => {
                    setRelationFromTable(e.target.value);
                    setRelationFromColumn('');
                  }}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select table...</option>
                  {tableNames.map(tableName => (
                    <option key={tableName} value={tableName}>
                      {tableName}
                    </option>
                  ))}
                </select>
              </div>

              {relationFromTable && (
                <div>
                  <label className="block text-sm font-medium mb-1">Column Name (or leave empty for auto)</label>
                  <input
                    type="text"
                    value={relationFromColumn}
                    onChange={(e) => setRelationFromColumn(e.target.value)}
                    placeholder={`Will be: ${relationToTable || 'tablename'}_id`}
                    className="w-full p-2 border rounded"
                  />
                </div>
              )}

              {relationFromTable && (
                <div>
                  <label className="block text-sm font-medium mb-1">To Table (referenced table)</label>
                  <select
                    value={relationToTable}
                    onChange={(e) => setRelationToTable(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Select table to reference...</option>
                    {tableNames
                      .filter(t => t !== relationFromTable)
                      .map(tableName => (
                        <option key={tableName} value={tableName}>
                          {tableName}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {relationFromTable && relationToTable && (
                <div>
                  <label className="block text-sm font-medium mb-1">On Delete Action</label>
                  <select
                    value={onDeleteAction}
                    onChange={(e) => setOnDeleteAction(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="restrict">Restrict (prevent deletion)</option>
                    <option value="cascade">Cascade (delete related rows)</option>
                    <option value="set-null">Set Null (set FK to null)</option>
                  </select>
                </div>
              )}

              {relationFromTable && relationToTable && (
                <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                  <p className="font-semibold text-green-800">Relation Summary:</p>
                  <p className="text-green-700 mt-1">
                    <strong>{relationFromTable}</strong> will have a column <strong>{relationFromColumn || `${relationToTable}_id`}</strong> that references <strong>{relationToTable}.id</strong>
                  </p>
                  <p className="text-green-700 mt-1 text-xs">
                    On delete: <strong>{onDeleteAction}</strong>
                  </p>
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleCreateRelation}
                disabled={!relationFromTable || !relationToTable}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Create Relation
              </button>
              <button
                onClick={() => {
                  setShowCreateRelation(false);
                  setRelationFromTable('');
                  setRelationFromColumn('');
                  setRelationToTable('');
                  setOnDeleteAction('restrict');
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Relations Modal */}
      {showRelationsView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Database Relations</h2>
              <button
                onClick={() => setShowRelationsView(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {getAllRelations().length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No relations created yet.</p>
                <p className="text-sm text-gray-400">
                  Use the "🔗 Create Relation" button on any table to create a foreign key relationship.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm mb-4">
                  <p className="font-semibold text-blue-800">How Relations Work:</p>
                  <p className="text-blue-700 mt-1">
                    A foreign key column stores the <strong>id</strong> (UUID) of a row from another table, creating a link between tables.
                  </p>
                </div>
                
                <div className="space-y-3">
                  {getAllRelations().map((rel, idx) => (
                    <div key={idx} className="border border-gray-300 rounded p-4 bg-gray-50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🔗</span>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800">
                            {rel.fromTable}.{rel.fromColumn}
                          </div>
                          <div className="text-sm text-gray-600">
                            → references → <strong>{rel.toTable}.id</strong>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            On delete: <strong>{rel.onDelete}</strong>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedTable(rel.fromTable);
                            setShowRelationsView(false);
                          }}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          View Table
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-6">
              <button
                onClick={() => setShowRelationsView(false)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
