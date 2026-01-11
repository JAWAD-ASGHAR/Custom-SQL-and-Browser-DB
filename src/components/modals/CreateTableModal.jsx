import React, { useState } from "react";

export default function CreateTableModal({
  showCreateTable,
  setShowCreateTable,
  newTableName,
  setNewTableName,
  tablesToLink,
  setTablesToLink,
  tableNames,
  handleCreateTable,
  initialColumns,
  setInitialColumns,
  showAlert,
}) {
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState("string");

  if (!showCreateTable) return null;

  const handleAddInitialColumn = async () => {
    if (!newColumnName.trim()) {
      await showAlert("Please enter a column name");
      return;
    }
    
    if (newColumnName.includes(' ')) {
      await showAlert("Column names cannot contain spaces");
      return;
    }
    
    const normalizedNewName = newColumnName.trim().toLowerCase();
    
    if (normalizedNewName === "id") {
      await showAlert("Column name 'id' is reserved for the primary key");
      return;
    }
    
    if (initialColumns.some(col => col.name.trim().toLowerCase() === normalizedNewName)) {
      await showAlert("Column name already exists");
      return;
    }

    setInitialColumns([
      ...initialColumns,
      { name: newColumnName.trim(), type: newColumnType },
    ]);
    setNewColumnName("");
    setNewColumnType("string");
  };

  const handleRemoveInitialColumn = (index) => {
    setInitialColumns(initialColumns.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    setShowCreateTable(false);
    setNewTableName("");
    setTablesToLink([]);
    setInitialColumns([]);
    setNewColumnName("");
    setNewColumnType("string");
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 lg:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-white mb-4">Create Table</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-[#e0e0e0]">
              Table Name
            </label>
            <input
              type="text"
              value={newTableName}
              onChange={(e) => {
                const value = e.target.value.replace(/\s/g, '');
                setNewTableName(value);
              }}
              className="w-full p-2.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md text-white placeholder-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
              placeholder="e.g., products"
            />
            <p className="text-xs text-[#8b8b8b] mt-1">
              Spaces are not allowed in table names
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-[#e0e0e0]">
              Initial Columns <span className="text-red-400">*</span>
            </label>
            <div className="space-y-2 mb-2">
              {initialColumns.map((col, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md"
                >
                  <span className="flex-1 text-sm text-[#e0e0e0]">
                    <span className="font-medium">{col.name}</span>
                    <span className="text-[#8b8b8b] ml-2">({col.type})</span>
                  </span>
                  <button
                    onClick={() => handleRemoveInitialColumn(index)}
                    className="text-[#ef4444] hover:text-[#dc2626] text-lg font-bold transition-colors"
                    title="Remove column"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newColumnName}
                onChange={(e) => {
                  const value = e.target.value.replace(/\s/g, '');
                  setNewColumnName(value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddInitialColumn();
                  }
                }}
                className="flex-1 p-2 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md text-white placeholder-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] text-sm"
                placeholder="Column name"
              />
              <select
                value={newColumnType}
                onChange={(e) => setNewColumnType(e.target.value)}
                className="p-2 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#3b82f6] text-sm"
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="boolean">Boolean</option>
              </select>
              <button
                onClick={handleAddInitialColumn}
                className="px-3 py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded-md text-sm font-medium transition-colors"
                title="Add column"
              >
                +
              </button>
            </div>
            <p className="text-xs text-[#8b8b8b] mt-1">
              At least one column is required to create a table
            </p>
            {initialColumns.length === 0 && (
              <p className="text-xs text-red-400 mt-1">
                ⚠ Please add at least one column before creating the table
              </p>
            )}
          </div>

          {tableNames.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2 text-[#e0e0e0]">
                Link to Other Tables (Optional)
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-[#2a2a2a] p-2 rounded-md bg-[#1e1e1e]">
                {tableNames.map((tableName) => (
                  <label
                    key={tableName}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-[#252525] p-1.5 rounded-md transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={tablesToLink.includes(tableName)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTablesToLink([...tablesToLink, tableName]);
                        } else {
                          setTablesToLink(
                            tablesToLink.filter((t) => t !== tableName)
                          );
                        }
                      }}
                      className="w-4 h-4 text-[#3b82f6] bg-[#1e1e1e] border-[#2a2a2a] rounded focus:ring-[#3b82f6]"
                    />
                    <span className="text-sm flex-1 text-[#e0e0e0]">
                      {tableName}
                    </span>
                    <span className="text-xs text-[#8b8b8b]">
                      ({tableName}_id)
                    </span>
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
            onClick={() => {
              handleCreateTable(initialColumns);
            }}
            disabled={initialColumns.length === 0}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              initialColumns.length === 0
                ? "bg-[#3a3a3a] text-[#6b6b6b] cursor-not-allowed"
                : "bg-[#3b82f6] hover:bg-[#2563eb] text-white"
            }`}
            title={initialColumns.length === 0 ? "Please add at least one column" : "Create table"}
          >
            Create
          </button>
          <button
            onClick={handleReset}
            className="flex-1 px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] rounded-md font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
