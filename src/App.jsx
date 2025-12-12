import React, { useState, useEffect } from 'react';
import { loadDB, saveDB, initSampleData } from './database';
import { executeQuery } from './queryEngine';

function App() {
  const [db, setDb] = useState({});
  const [selectedTable, setSelectedTable] = useState(null);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [showCreateTable, setShowCreateTable] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [showAddRow, setShowAddRow] = useState(false);
  const [newRow, setNewRow] = useState({});
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [columnIsForeignKey, setColumnIsForeignKey] = useState(false);
  const [referencedTable, setReferencedTable] = useState('');
  const [showCreateRelation, setShowCreateRelation] = useState(false);
  const [relationFromTable, setRelationFromTable] = useState('');
  const [relationFromColumn, setRelationFromColumn] = useState('');
  const [relationToTable, setRelationToTable] = useState('');
  const [showRelationsView, setShowRelationsView] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // { rowId, column }
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    initSampleData();
    const loadedDb = loadDB();
    setDb(loadedDb);
    const firstTable = Object.keys(loadedDb)[0];
    if (firstTable) {
      setSelectedTable(firstTable);
    }
  }, []);

  const handleUpdateDb = (updatedDb) => {
    setDb(updatedDb);
    saveDB(updatedDb);
  };

  const handleRunQuery = () => {
    if (!query.trim()) {
      setResult({ error: 'Please enter a query' });
      return;
    }

    const queryResult = executeQuery(query, db);
    setResult(queryResult);

    if (queryResult.updatedDb) {
      handleUpdateDb(queryResult.updatedDb);
    }
  };

  const handleCreateTable = () => {
    if (!newTableName.trim()) {
      alert('Please enter a table name');
      return;
    }

    const tableName = newTableName.trim().toLowerCase();
    if (db[tableName]) {
      alert('Table already exists');
      return;
    }

    const updatedDb = { ...db, [tableName]: [] };
    handleUpdateDb(updatedDb);
    setSelectedTable(tableName);
    setShowCreateTable(false);
    setNewTableName('');
  };

  const handleDeleteTable = (tableName) => {
    if (confirm(`Delete table "${tableName}"?`)) {
      const updatedDb = { ...db };
      delete updatedDb[tableName];
      handleUpdateDb(updatedDb);
      if (selectedTable === tableName) {
        const remaining = Object.keys(updatedDb);
        setSelectedTable(remaining.length > 0 ? remaining[0] : null);
      }
    }
  };

  const handleAddColumn = (tableName) => {
    setRelationFromTable(tableName);
    setShowAddColumn(true);
  };

  const handleConfirmAddColumn = () => {
    if (!newColumnName.trim()) {
      alert('Please enter a column name');
      return;
    }

    const colName = columnIsForeignKey && referencedTable 
      ? `${referencedTable}_id` 
      : newColumnName.trim();

    if (columnIsForeignKey && !referencedTable) {
      alert('Please select a table to reference');
      return;
    }

    const updatedDb = { ...db };
    updatedDb[relationFromTable] = updatedDb[relationFromTable].map(row => ({
      ...row,
      [colName]: ''
    }));
    handleUpdateDb(updatedDb);
    
    // Reset form
    setNewColumnName('');
    setColumnIsForeignKey(false);
    setReferencedTable('');
    setShowAddColumn(false);
  };

  const handleCreateRelation = () => {
    if (!relationFromTable || !relationToTable) {
      alert('Please select both tables');
      return;
    }

    // Check if column already exists
    const fromTableData = db[relationFromTable] || [];
    const existingColumns = fromTableData.length > 0 
      ? Object.keys(fromTableData[0]) 
      : ['id'];
    
    const fkColumnName = `${relationToTable}_id`;
    
    if (!existingColumns.includes(fkColumnName)) {
      // Add the foreign key column
      const updatedDb = { ...db };
      if (updatedDb[relationFromTable].length > 0) {
        updatedDb[relationFromTable] = updatedDb[relationFromTable].map(row => ({
          ...row,
          [fkColumnName]: ''
        }));
      } else {
        // Table is empty, just ensure it exists
        updatedDb[relationFromTable] = [];
      }
      handleUpdateDb(updatedDb);
    }

    // Reset form
    setRelationFromTable('');
    setRelationFromColumn('');
    setRelationToTable('');
    setShowCreateRelation(false);
  };

  const handleDeleteColumn = (tableName, colName) => {
    if (colName === 'id') {
      alert('Cannot delete id column (primary key)');
      return;
    }
    if (confirm(`Delete column "${colName}"?`)) {
      const updatedDb = { ...db };
      updatedDb[tableName] = updatedDb[tableName].map(row => {
        const newRow = { ...row };
        delete newRow[colName];
        return newRow;
      });
      handleUpdateDb(updatedDb);
    }
  };

  const handleAddRow = () => {
    if (!selectedTable) return;

    const table = db[selectedTable] || [];
    const maxId = table.length > 0 ? Math.max(...table.map(r => r.id || 0)) : 0;
    
    // Ensure id is set
    const rowToAdd = { ...newRow, id: maxId + 1 };
    
    // If table is empty, use the columns from newRow, otherwise ensure all columns exist
    const updatedDb = { ...db };
    if (!updatedDb[selectedTable]) {
      updatedDb[selectedTable] = [];
    }
    
    updatedDb[selectedTable] = [...updatedDb[selectedTable], rowToAdd];
    handleUpdateDb(updatedDb);
    setNewRow({});
    setShowAddRow(false);
  };

  const handleDeleteRow = (tableName, rowId) => {
    if (confirm('Delete this row?')) {
      const updatedDb = { ...db };
      updatedDb[tableName] = updatedDb[tableName].filter(row => row.id !== rowId);
      handleUpdateDb(updatedDb);
    }
  };

  const handleCellDoubleClick = (rowId, column) => {
    if (column === 'id') return; // Don't allow editing ID column
    const row = currentTable.find(r => r.id === rowId);
    if (row) {
      setEditingCell({ rowId, column });
      setEditValue(String(row[column] || ''));
    }
  };

  const handleCellSave = (tableName, rowId, column) => {
    const updatedDb = { ...db };
    const rowIndex = updatedDb[tableName].findIndex(r => r.id === rowId);
    
    if (rowIndex !== -1) {
      // Try to parse as number if it looks like a number
      let value = editValue.trim();
      const numValue = value !== '' && !isNaN(value) && !isNaN(parseFloat(value)) 
        ? Number(value) 
        : value;
      
      // If it's a foreign key column, ensure it's a number
      if (isForeignKey(column) && value !== '') {
        updatedDb[tableName][rowIndex][column] = Number(value) || '';
      } else {
        updatedDb[tableName][rowIndex][column] = numValue;
      }
      
      handleUpdateDb(updatedDb);
    }
    
    setEditingCell(null);
    setEditValue('');
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Helper: Check if a column is a foreign key (ends with _id and references another table)
  const isForeignKey = (columnName) => {
    if (columnName === 'id') return false; // Primary key, not foreign key
    if (columnName.endsWith('_id')) {
      const referencedTable = columnName.replace('_id', '');
      return db[referencedTable] !== undefined;
    }
    return false;
  };

  // Helper: Get the referenced table name for a foreign key
  const getReferencedTable = (columnName) => {
    if (columnName.endsWith('_id')) {
      return columnName.replace('_id', '');
    }
    return null;
  };

  // Helper: Get all relations in the database
  const getAllRelations = () => {
    const relations = [];
    Object.keys(db).forEach(tableName => {
      const tableData = db[tableName] || [];
      if (tableData.length > 0) {
        const columns = Object.keys(tableData[0]);
        columns.forEach(col => {
          if (isForeignKey(col)) {
            relations.push({
              fromTable: tableName,
              fromColumn: col,
              toTable: getReferencedTable(col)
            });
          }
        });
      }
    });
    return relations;
  };

  const currentTable = selectedTable ? db[selectedTable] : [];
  // Get columns from first row, or default to ['id'] if table is empty
  const tableColumns = currentTable.length > 0 
    ? Object.keys(currentTable[0]) 
    : (selectedTable ? ['id'] : []);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar - Fixed */}
      <div className="w-64 bg-gray-800 text-white flex flex-col fixed left-0 top-0 bottom-0 overflow-y-auto">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">SimpleDB</h1>
          <p className="text-sm text-gray-400">Custom Database</p>
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
            {Object.keys(db).map(tableName => (
              <div
                key={tableName}
                className={`p-2 rounded cursor-pointer flex justify-between items-center ${
                  selectedTable === tableName ? 'bg-blue-600' : 'hover:bg-gray-700'
                }`}
                onClick={() => setSelectedTable(tableName)}
              >
                <span>{tableName} ({db[tableName].length})</span>
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
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col ml-64">
        {/* Tabs */}
        <div className="bg-white border-b">
          <div className="flex">
            <button
              className={`px-6 py-3 font-semibold ${
                selectedTable 
                  ? 'border-b-2 border-blue-600 text-blue-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => {
                const firstTable = Object.keys(db)[0];
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
                  <p className="text-sm text-gray-400">Note: The 'id' column is automatically added as the primary key.</p>
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
                        <tr key={idx} className="hover:bg-gray-50">
                          {tableColumns.map(col => {
                            const isEditing = editingCell?.rowId === row.id && editingCell?.column === col;
                            const isFK = isForeignKey(col);
                            const refTable = getReferencedTable(col);
                            const refTableData = refTable ? (db[refTable] || []) : [];
                            
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
                                          {refRow.id} - {refRow.name || JSON.stringify(refRow).substring(0, 30)}
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
                                  <span className={col === 'id' ? 'font-semibold text-gray-700' : ''}>
                                    {String(row[col] || '')}
                                  </span>
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
                      placeholder="Enter query... (e.g., GET students WHERE age > 20)"
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
                  <div className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer" onClick={() => setQuery('GET students')}>
                    GET students
                  </div>
                  <div className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer" onClick={() => setQuery('GET students WHERE age > 20')}>
                    GET students WHERE age &gt; 20
                  </div>
                  <div className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer" onClick={() => setQuery('ADD students { "name": "John", "age": 22 }')}>
                    ADD students {'{'} "name": "John", "age": 22 {'}'}
                  </div>
                  <div className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer" onClick={() => setQuery('REMOVE students WHERE id = 1')}>
                    REMOVE students WHERE id = 1
                  </div>
                  <div className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer" onClick={() => setQuery('UPDATE students SET age = 25 WHERE id = 2')}>
                    UPDATE students SET age = 25 WHERE id = 2
                  </div>
                  <div className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer" onClick={() => setQuery('UNION students courses')}>
                    UNION students courses
                  </div>
                  <div className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer" onClick={() => setQuery('INTERSECT students courses')}>
                    INTERSECT students courses
                  </div>
                  <div className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer" onClick={() => setQuery('DIFF students courses')}>
                    DIFF students courses
                  </div>
                  <div className="p-2 bg-blue-50 rounded hover:bg-blue-100 cursor-pointer border border-blue-200" onClick={() => setQuery('JOIN enrollments students ON enrollments.student_id = students.id')}>
                    JOIN enrollments students ON enrollments.student_id = students.id
                  </div>
                  <div className="p-2 bg-blue-50 rounded hover:bg-blue-100 cursor-pointer border border-blue-200" onClick={() => setQuery('JOIN enrollments courses ON enrollments.course_id = courses.id')}>
                    JOIN enrollments courses ON enrollments.course_id = courses.id
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
              ) : result.affectedRows !== undefined ? (
                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <p className="text-green-800">
                    Success! {result.affectedRows} row(s) affected
                  </p>
                  {result.data && result.data.length > 0 && (
                    <div className="mt-4">
                      <pre className="bg-white p-4 rounded overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  )}
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
                  placeholder="e.g., students"
                />
              </div>
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
                  Table is empty. Add a column first, or add a row with JSON format in Query Console.
                </p>
              ) : (
                tableColumns.filter(col => col !== 'id').map(col => {
                  const isFK = isForeignKey(col);
                  const refTable = getReferencedTable(col);
                  const refTableData = refTable ? (db[refTable] || []) : [];
                  
                  return (
                    <div key={col}>
                      <label className="block text-sm font-medium mb-1">
                        {col}
                        {isFK && (
                          <span className="text-blue-600 text-xs ml-2" title={`Foreign key → ${refTable}`}>
                            🔗
                          </span>
                        )}
                      </label>
                      {isFK && refTableData.length > 0 ? (
                        <select
                          value={newRow[col] || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            const numValue = value !== '' ? Number(value) : '';
                            setNewRow({ ...newRow, [col]: numValue });
                          }}
                          className="w-full p-2 border rounded"
                        >
                          <option value="">Select {refTable}...</option>
                          {refTableData.map(row => (
                            <option key={row.id} value={row.id}>
                              {row.id} - {row.name || JSON.stringify(row).substring(0, 30)}
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
                            setNewRow({ ...newRow, [col]: numValue });
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
                    {Object.keys(db)
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
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                <p className="font-semibold mb-2">Step-by-step guide:</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-700">
                  <li>Select the table that will have the foreign key</li>
                  <li>Select which column to use (or create new)</li>
                  <li>Select the table to reference</li>
                </ol>
              </div>
              
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
                  {Object.keys(db).map(tableName => (
                    <option key={tableName} value={tableName}>
                      {tableName}
                    </option>
                  ))}
                </select>
              </div>

              {relationFromTable && (
                <div>
                  <label className="block text-sm font-medium mb-1">Column (or create new)</label>
                  <select
                    value={relationFromColumn}
                    onChange={(e) => setRelationFromColumn(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Create new column...</option>
                    {(() => {
                      const tableData = db[relationFromTable] || [];
                      const columns = tableData.length > 0 ? Object.keys(tableData[0]) : ['id'];
                      return columns
                        .filter(col => col !== 'id' && !col.endsWith('_id'))
                        .map(col => (
                          <option key={col} value={col}>{col}</option>
                        ));
                    })()}
                  </select>
                  {relationFromColumn === '' && (
                    <input
                      type="text"
                      value={relationFromColumn}
                      onChange={(e) => setRelationFromColumn(e.target.value)}
                      placeholder="New column name (will become: tablename_id)"
                      className="w-full p-2 border rounded mt-2"
                    />
                  )}
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
                    {Object.keys(db)
                      .filter(t => t !== relationFromTable)
                      .map(tableName => (
                        <option key={tableName} value={tableName}>
                          {tableName}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    This will create a foreign key that references the <strong>id</strong> column
                  </p>
                </div>
              )}

              {relationFromTable && relationToTable && (
                <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                  <p className="font-semibold text-green-800">Relation Summary:</p>
                  <p className="text-green-700 mt-1">
                    <strong>{relationFromTable}</strong> will have a column <strong>{relationToTable}_id</strong> that references <strong>{relationToTable}.id</strong>
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
                    A foreign key column stores the <strong>id</strong> of a row from another table, creating a link between tables.
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
                      <div className="text-xs text-gray-500 mt-2">
                        This means: Each row in <strong>{rel.fromTable}</strong> can reference one row in <strong>{rel.toTable}</strong> by storing its ID.
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-300">
                  <h3 className="font-semibold mb-2">Quick Tips:</h3>
                  <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                    <li>Use JOIN queries to combine related data from multiple tables</li>
                    <li>When adding rows, foreign key columns show dropdowns with available IDs</li>
                    <li>Foreign keys are automatically detected (columns ending with "_id")</li>
                  </ul>
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
