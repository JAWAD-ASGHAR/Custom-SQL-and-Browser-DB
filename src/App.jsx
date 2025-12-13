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
  const [sidebarOpen, setSidebarOpen] = useState(false); // For mobile sidebar
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

  // Handle clear database
  const handleClearDatabase = () => {
    const confirmMessage = 'Are you sure you want to clear the entire database?\n\n' +
      'This will delete ALL tables and data. This action cannot be undone!\n\n' +
      'Consider exporting your data first if you want to keep a backup.';
    
    if (confirm(confirmMessage)) {
      try {
        localStorage.removeItem('MiniDB');
        refreshDb();
        setSelectedTable(null);
        alert('Database cleared successfully!');
      } catch (error) {
        alert(`Error clearing database: ${error.message}`);
      }
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

  // Suggested queries for the query console
  const suggestedQueries = [
    { name: 'Select all customers', query: 'SELECT * FROM customers' },
    { name: 'Select customers with names', query: 'SELECT name, email FROM customers' },
    { name: 'Filter customers', query: 'SELECT * FROM customers WHERE name = "John Doe"' },
    { name: 'Join carts and customers', query: 'JOIN carts customers ON carts.customerId = customers.id' },
    { name: 'Join cart items and products', query: 'JOIN cart_items products ON cart_items.productId = products.id' },
    { name: 'Join orders and customers', query: 'JOIN orders customers ON orders.customerId = customers.id' },
    { name: 'Union customers and admins', query: 'UNION customers admins' },
    { name: 'Intersect tables', query: 'INTERSECT customers admins' },
    { name: 'Difference between tables', query: 'DIFF customers admins' },
    { name: 'Show all tables', query: 'SHOW TABLES' },
  ];

  return (
    <div className="flex h-screen bg-[#1e1e1e] overflow-hidden text-[#e0e0e0] w-full max-w-full">
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImport}
        accept=".json"
        style={{ display: 'none' }}
      />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Supabase Style */}
      <div className={`w-64 bg-[#1a1a1a] border-r border-[#2a2a2a] text-white flex flex-col fixed left-0 top-0 bottom-0 overflow-y-auto z-50 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        <div className="p-4 border-b border-[#2a2a2a] flex items-center gap-3">
          <img 
            src="/favicon.png" 
            alt="MiniDB Logo" 
            className="w-8 h-8 rounded"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-white">MiniDB</h1>
            <p className="text-xs text-[#8b8b8b]">Browser Database</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-[#8b8b8b] hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-3 flex-1 overflow-y-auto">
          <button
            onClick={() => {
              setShowCreateTable(true);
              setSidebarOpen(false);
            }}
            className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white px-3 py-2 rounded-md mb-3 text-sm font-medium transition-colors"
          >
            + Create Table
          </button>
          <button
            onClick={() => {
              setShowRelationsView(true);
              setSidebarOpen(false);
            }}
            className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-3 py-2 rounded-md mb-4 text-sm font-medium transition-colors"
          >
            🔗 View Relations
          </button>

          <div className="mb-2">
            <p className="text-xs font-semibold text-[#8b8b8b] uppercase tracking-wider px-3 py-2">Tables</p>
          </div>
          <div className="space-y-1">
            {tableNames.length === 0 ? (
              <p className="text-[#8b8b8b] text-sm p-3">No tables yet</p>
            ) : (
              tableNames.map(tableName => {
                const table = getTable(tableName);
                const rowCount = table ? Object.keys(table.rows).length : 0;
                return (
                  <div
                    key={tableName}
                    className={`px-3 py-2 rounded-md cursor-pointer flex justify-between items-center group transition-colors ${
                      selectedTable === tableName 
                        ? 'bg-[#3b82f6] text-white' 
                        : 'hover:bg-[#2a2a2a] text-[#e0e0e0]'
                    }`}
                    onClick={() => {
                      setSelectedTable(tableName);
                      setSidebarOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm truncate">{tableName}</span>
                      <span className={`text-xs ${selectedTable === tableName ? 'text-blue-200' : 'text-[#8b8b8b]'}`}>
                        ({rowCount})
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTable(tableName);
                      }}
                      className="text-[#8b8b8b] hover:text-red-400 flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete table"
                    >
                      ×
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Supabase Style */}
      <div className="flex-1 flex flex-col lg:ml-64 bg-[#1e1e1e] min-w-0 overflow-hidden">
        {/* Header - Supabase Style */}
        <div className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-4 lg:px-6 py-3 flex justify-between items-center gap-3 flex-shrink-0 overflow-hidden">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-[#8b8b8b] hover:text-white transition-colors flex-shrink-0"
              title="Open menu"
            >
              ☰
            </button>
            
            <div className="flex gap-1 flex-shrink-0">
              <button
                className={`px-4 py-2 font-medium text-sm rounded-md transition-colors whitespace-nowrap ${
                  selectedTable 
                    ? 'bg-[#2a2a2a] text-white' 
                    : 'text-[#8b8b8b] hover:text-white hover:bg-[#2a2a2a]'
                }`}
                onClick={() => {
                  const firstTable = tableNames[0];
                  setSelectedTable(firstTable || null);
                }}
              >
                Tables
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm rounded-md transition-colors whitespace-nowrap ${
                  !selectedTable 
                    ? 'bg-[#2a2a2a] text-white' 
                    : 'text-[#8b8b8b] hover:text-white hover:bg-[#2a2a2a]'
                }`}
                onClick={() => setSelectedTable(null)}
              >
                SQL Editor
              </button>
            </div>
          </div>
          
          {/* Action buttons - Supabase Style */}
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleDownloadSample}
              className="px-3 py-1.5 bg-[#10b981] hover:bg-[#059669] text-white rounded-md text-xs font-medium transition-colors whitespace-nowrap"
              title="Download sample dataset"
            >
              Sample
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-md text-xs font-medium transition-colors whitespace-nowrap"
              title="Import database from file"
            >
              Import
            </button>
            <button
              onClick={handleClearDatabase}
              className="px-3 py-1.5 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-md text-xs font-medium transition-colors whitespace-nowrap"
              title="Clear entire database"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Content */}
        {selectedTable ? (
          <div className="flex-1 overflow-hidden p-4 lg:p-6 min-w-0">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 lg:p-6 h-full flex flex-col min-w-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 flex-shrink-0">
                <h2 className="text-xl lg:text-2xl font-semibold text-white">{selectedTable}</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setRelationFromTable(selectedTable);
                      setShowCreateRelation(true);
                    }}
                    className="px-3 py-1.5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-md text-sm font-medium transition-colors"
                    title="Create a relation to another table"
                  >
                    Relation
                  </button>
                  <button
                    onClick={() => handleAddColumn(selectedTable)}
                    className="px-3 py-1.5 bg-[#10b981] hover:bg-[#059669] text-white rounded-md text-sm font-medium transition-colors"
                  >
                    + Column
                  </button>
                  <button
                    onClick={() => setShowAddRow(true)}
                    className="px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-md text-sm font-medium transition-colors"
                  >
                    + Row
                  </button>
                </div>
              </div>

              {currentTable.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[#8b8b8b] mb-2">No rows in this table. Add a row to get started!</p>
                  <p className="text-sm text-[#6b6b6b]">Note: The 'id' column is automatically added as the primary key (UUID).</p>
                </div>
              ) : (
                <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
                  <div className="table-scroll-container h-full w-full">
                    <table className="border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-[#1e1e1e] border-b border-[#2a2a2a]">
                        {tableColumns.map(col => (
                          <th key={col} className="border-b border-[#2a2a2a] px-3 py-3 text-left whitespace-nowrap">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="truncate text-xs lg:text-sm font-medium text-white">{col}</span>
                                {isForeignKey(col) && (
                                  <span 
                                    className="text-[#8b5cf6] text-xs flex-shrink-0" 
                                    title={`Foreign key → ${getReferencedTable(col)}`}
                                  >
                                    🔗
                                  </span>
                                )}
                                {col === 'id' && (
                                  <span 
                                    className="text-[#10b981] text-xs flex-shrink-0" 
                                    title="Primary key"
                                  >
                                    🔑
                                  </span>
                                )}
                              </div>
                              {col !== 'id' && (
                                <button
                                  onClick={() => handleDeleteColumn(selectedTable, col)}
                                  className="text-[#8b8b8b] hover:text-red-400 ml-1 flex-shrink-0 transition-colors"
                                  title="Delete column"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </th>
                        ))}
                        <th className="border-b border-[#2a2a2a] px-3 py-3 whitespace-nowrap sticky right-0 bg-[#1e1e1e] text-white text-xs lg:text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentTable.map((row, idx) => (
                        <tr key={row.id || idx} className="border-b border-[#2a2a2a] hover:bg-[#1e1e1e] transition-colors">
                          {tableColumns.map(col => {
                            const isEditing = editingCell?.rowId === row.id && editingCell?.column === col;
                            const isFK = isForeignKey(col);
                            const refTable = getReferencedTable(col);
                            const refTableData = refTable ? getTableRows(refTable) : [];
                            
                            return (
                              <td 
                                key={col} 
                                className={`px-3 py-3 relative max-w-xs lg:max-w-none ${
                                  col === 'id' 
                                    ? 'text-[#8b8b8b]' 
                                    : 'text-[#e0e0e0] hover:bg-[#252525] transition-colors'
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
                                      className="w-full p-2 bg-[#1e1e1e] border border-[#3b82f6] rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                                    >
                                      <option value="" className="bg-[#1e1e1e]">Select {refTable}...</option>
                                      {refTableData.map(refRow => (
                                        <option key={refRow.id} value={refRow.id} className="bg-[#1e1e1e]">
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
                                      className="w-full p-2 bg-[#1e1e1e] border border-[#3b82f6] rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                                    />
                                  )
                                ) : (
                                  isFK ? (
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-[#8b5cf6] font-medium truncate">
                                        {getForeignKeyDisplay(col, row[col])}
                                      </span>
                                      {row[col] && (
                                        <span className="text-xs text-[#6b6b6b] flex-shrink-0">({row[col].substring(0, 8)}...)</span>
                                      )}
                                    </div>
                                  ) : (
                                    <div>
                                      <div className="break-words text-xs lg:text-sm truncate lg:whitespace-normal" title={String(row[col] || '')}>
                                        {col === 'id' ? row[col].substring(0, 8) + '...' : String(row[col] || '')}
                                      </div>
                                    </div>
                                  )
                                )}
                              </td>
                            );
                          })}
                          <td className="px-3 py-3 sticky right-0 bg-[#1a1a1a]">
                            <button
                              onClick={() => handleDeleteRow(selectedTable, row.id)}
                              className="text-[#ef4444] hover:text-[#dc2626] text-xs lg:text-sm transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Query Editor - Supabase Style Split Layout - Fixed Height */}
            <div className="flex flex-col lg:flex-row h-64 lg:h-72 gap-0 border-b border-[#2a2a2a] flex-shrink-0">
              {/* Query Editor - Left Side */}
              <div className="flex-1 flex flex-col overflow-hidden border-r border-[#2a2a2a] min-w-0">
                <div className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-4 py-2 flex items-center justify-between flex-shrink-0">
                  <h3 className="text-sm font-semibold text-white">SQL Editor</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRunQuery}
                      className="px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-md text-xs font-medium transition-colors flex items-center gap-2"
                    >
                      <span>▶</span> Run
                    </button>
                    <button
                      onClick={() => {
                        setQuery('');
                        setResult(null);
                      }}
                      className="px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] rounded-md text-xs font-medium transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-4 min-h-0">
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="-- Enter your SQL query here\n-- Press Ctrl+Enter (Cmd+Enter on Mac) to run\n\nSELECT * FROM customers;"
                    className="w-full h-full min-h-[150px] bg-[#1e1e1e] text-[#e0e0e0] font-mono text-sm p-4 rounded-md border border-[#2a2a2a] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] resize-none"
                    style={{ fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace" }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleRunQuery();
                      }
                    }}
                  />
                </div>
                <div className="bg-[#1a1a1a] border-t border-[#2a2a2a] px-4 py-1.5 text-xs text-[#8b8b8b] flex-shrink-0">
                  <span className="font-mono">Ctrl+Enter</span> to run query
                </div>
              </div>

              {/* Suggested Queries - Right Side (Scrollable) */}
              <div className="w-full lg:w-80 bg-[#1a1a1a] flex flex-col overflow-hidden flex-shrink-0">
                <div className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-4 py-2 flex-shrink-0">
                  <h3 className="text-sm font-semibold text-white">Suggested Queries</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 min-h-0">
                  <div className="space-y-2">
                    {suggestedQueries.map((suggested, idx) => (
                      <button
                        key={idx}
                        onClick={() => setQuery(suggested.query)}
                        className="w-full text-left p-3 bg-[#1e1e1e] hover:bg-[#252525] border border-[#2a2a2a] rounded-md transition-colors group"
                      >
                        <div className="text-xs font-medium text-[#8b8b8b] mb-1">{suggested.name}</div>
                        <div className="text-xs font-mono text-[#e0e0e0] break-all">{suggested.query}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Results - Bottom Section - Takes Remaining Space */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#1a1a1a] min-h-0">
              <div className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-4 py-3">
                <h3 className="text-sm font-semibold text-white">
                  {result ? (result.error ? 'Error' : 'Results') : 'Results'}
                </h3>
              </div>
              <div className="flex-1 overflow-auto p-4 min-h-0">
                {!result ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-[#8b8b8b] text-sm">No query executed yet. Write a query and press Ctrl+Enter to run.</p>
                  </div>
                ) : result.error ? (
                  <div className="bg-[#7f1d1d] border border-[#991b1b] rounded-md p-4">
                    <p className="text-red-300 text-sm font-medium">Error: {result.error}</p>
                  </div>
                ) : result.data && result.data.length > 0 ? (
                  <div className="h-full flex flex-col">
                    <p className="text-[#8b8b8b] text-sm mb-4 flex-shrink-0">Found {result.data.length} row(s)</p>
                    <div className="flex-1 overflow-auto min-h-0">
                      <div className="table-scroll-container w-full h-full">
                        <table className="border-collapse">
                        <thead>
                          <tr className="bg-[#1e1e1e] border-b border-[#2a2a2a]">
                            {Object.keys(result.data[0]).map(col => (
                              <th key={col} className="border-b border-[#2a2a2a] px-3 py-2 text-left text-xs font-medium text-white whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.data.map((row, idx) => (
                            <tr key={idx} className="border-b border-[#2a2a2a] hover:bg-[#1e1e1e] transition-colors">
                              {Object.keys(result.data[0]).map(col => (
                                <td key={col} className="px-3 py-2 text-xs text-[#e0e0e0]">
                                  <div className="max-w-xs lg:max-w-none truncate lg:whitespace-normal" title={String(row[col] || '')}>
                                    {String(row[col] || '')}
                                  </div>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-[#8b8b8b] text-sm">No results</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Table Modal - Supabase Style */}
      {showCreateTable && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 lg:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-white mb-4">Create Table</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#e0e0e0]">Table Name</label>
                <input
                  type="text"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full p-2.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md text-white placeholder-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  placeholder="e.g., products"
                />
              </div>
              
              {/* Link to Other Tables Section */}
              {tableNames.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#e0e0e0]">
                    Link to Other Tables (Optional)
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-[#2a2a2a] p-2 rounded-md bg-[#1e1e1e]">
                    {tableNames.map(tableName => (
                      <label key={tableName} className="flex items-center space-x-2 cursor-pointer hover:bg-[#252525] p-1.5 rounded-md transition-colors">
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
                          className="w-4 h-4 text-[#3b82f6] bg-[#1e1e1e] border-[#2a2a2a] rounded focus:ring-[#3b82f6]"
                        />
                        <span className="text-sm flex-1 text-[#e0e0e0]">{tableName}</span>
                        <span className="text-xs text-[#8b8b8b]">({tableName}_id)</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-[#8b8b8b] mt-1">
                    Selected tables will create foreign key columns that link to them
                  </p>
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleCreateTable}
                className="flex-1 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-md font-medium transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreateTable(false);
                  setNewTableName('');
                  setTablesToLink([]);
                }}
                className="flex-1 px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Row Modal - Supabase Style */}
      {showAddRow && selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 lg:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-white mb-4">Add Row</h2>
            <div className="space-y-4">
              {tableColumns.length === 1 && tableColumns[0] === 'id' ? (
                <p className="text-[#8b8b8b] text-sm">
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
                      <label className="block text-sm font-medium mb-2 text-[#e0e0e0]">
                        {col}
                        {isFK && (
                          <span className="text-[#8b5cf6] text-xs ml-2" title={`Foreign key → ${refTable}`}>
                            🔗
                          </span>
                        )}
                        {isCreatedAt && (
                          <span className="text-[#10b981] text-xs ml-2" title="Auto-set to current date/time">
                            ⏰ (auto)
                          </span>
                        )}
                      </label>
                      {isCreatedAt && (
                        <p className="text-xs text-[#8b8b8b] mb-1">
                          Leave empty to auto-set to current date/time
                        </p>
                      )}
                      {isFK && refTableData.length > 0 ? (
                        <select
                          value={newRow[col] || ''}
                          onChange={(e) => {
                            setNewRow({ ...newRow, [col]: e.target.value || null });
                          }}
                          className="w-full p-2.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                        >
                          <option value="" className="bg-[#1e1e1e]">Select {refTable}...</option>
                          {refTableData.map(row => (
                            <option key={row.id} value={row.id} className="bg-[#1e1e1e]">
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
                          className="w-full p-2.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md text-white placeholder-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
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
                className="flex-1 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-md font-medium transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddRow(false);
                  setNewRow({});
                }}
                className="flex-1 px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Column Modal - Supabase Style */}
      {showAddColumn && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 lg:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-white mb-4">Add Column to {relationFromTable}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#e0e0e0]">Column Name</label>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  className="w-full p-2.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md text-white placeholder-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
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
                <label className="block text-sm font-medium mb-2 text-[#e0e0e0]">Column Type</label>
                <select
                  value={columnType}
                  onChange={(e) => setColumnType(e.target.value)}
                  className="w-full p-2.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md text-white placeholder-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
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
                  <label className="block text-sm font-medium mb-2 text-[#e0e0e0]">References Table</label>
                  <select
                    value={referencedTable}
                    onChange={(e) => setReferencedTable(e.target.value)}
                    className="w-full p-2.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md text-white placeholder-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
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
                className="flex-1 px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Relation Modal - Supabase Style */}
      {showCreateRelation && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 lg:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-white mb-4">Create Relation (Foreign Key)</h2>
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#e0e0e0]">From Table (has foreign key)</label>
                <select
                  value={relationFromTable}
                  onChange={(e) => {
                    setRelationFromTable(e.target.value);
                    setRelationFromColumn('');
                  }}
                  className="w-full p-2.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md text-white placeholder-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
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
                  <label className="block text-sm font-medium mb-2 text-[#e0e0e0]">Column Name (or leave empty for auto)</label>
                  <input
                    type="text"
                    value={relationFromColumn}
                    onChange={(e) => setRelationFromColumn(e.target.value)}
                    placeholder={`Will be: ${relationToTable || 'tablename'}_id`}
                    className="w-full p-2.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md text-white placeholder-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                  />
                </div>
              )}

              {relationFromTable && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#e0e0e0]">To Table (referenced table)</label>
                  <select
                    value={relationToTable}
                    onChange={(e) => setRelationToTable(e.target.value)}
                    className="w-full p-2.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md text-white placeholder-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
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
                  <label className="block text-sm font-medium mb-2 text-[#e0e0e0]">On Delete Action</label>
                  <select
                    value={onDeleteAction}
                    onChange={(e) => setOnDeleteAction(e.target.value)}
                    className="w-full p-2.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md text-white placeholder-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
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
                className="flex-1 px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Relations Modal - Supabase Style */}
      {showRelationsView && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 lg:p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Database Relations</h2>
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
                className="w-full px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] rounded-md font-medium transition-colors"
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
