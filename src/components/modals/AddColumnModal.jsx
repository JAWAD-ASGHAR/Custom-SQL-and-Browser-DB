import React from "react";

export default function AddColumnModal({
  showAddColumn,
  setShowAddColumn,
  relationFromTable,
  newColumnName,
  setNewColumnName,
  columnType,
  setColumnType,
  columnIsForeignKey,
  setColumnIsForeignKey,
  referencedTable,
  setReferencedTable,
  tableNames,
  handleConfirmAddColumn,
}) {
  if (!showAddColumn) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 lg:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-white mb-4">
          Add Column to {relationFromTable}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-[#e0e0e0]">
              Column Name
            </label>
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
            <label className="block text-sm font-medium mb-2 text-[#e0e0e0]">
              Column Type
            </label>
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
                    setReferencedTable("");
                  }
                }}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">
                This is a Foreign Key (Relation)
              </span>
            </label>
          </div>
          {columnIsForeignKey && (
            <div>
              <label className="block text-sm font-medium mb-2 text-[#e0e0e0]">
                References Table
              </label>
              <select
                value={referencedTable}
                onChange={(e) => setReferencedTable(e.target.value)}
                className="w-full p-2.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md text-white placeholder-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
              >
                <option value="">Select a table...</option>
                {tableNames
                  .filter((t) => t !== relationFromTable)
                  .map((tableName) => (
                    <option key={tableName} value={tableName}>
                      {tableName}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                This column will reference the <strong>id</strong> column of the
                selected table
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
              setNewColumnName("");
              setColumnType("string");
              setColumnIsForeignKey(false);
              setReferencedTable("");
            }}
            className="flex-1 px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] rounded-md font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
