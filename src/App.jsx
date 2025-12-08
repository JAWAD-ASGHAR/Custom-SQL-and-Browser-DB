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
    const colName = prompt('Enter column name:');
    if (!colName || !colName.trim()) return;

    const updatedDb = { ...db };
    updatedDb[tableName] = updatedDb[tableName].map(row => ({
      ...row,
      [colName.trim()]: ''
    }));
    handleUpdateDb(updatedDb);
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
            className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded mb-4"
          >
            + Create Table
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
                              <span>{col}</span>
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
                          {tableColumns.map(col => (
                            <td key={col} className="border border-gray-300 px-4 py-2">
                              {String(row[col] || '')}
                            </td>
                          ))}
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
                tableColumns.filter(col => col !== 'id').map(col => (
                  <div key={col}>
                    <label className="block text-sm font-medium mb-1">{col}</label>
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
                      placeholder={`Enter ${col}`}
                    />
                  </div>
                ))
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
    </div>
  );
}

export default App;
