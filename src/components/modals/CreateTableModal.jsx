import React from "react";

export default function CreateTableModal({
  showCreateTable,
  setShowCreateTable,
  newTableName,
  setNewTableName,
  tablesToLink,
  setTablesToLink,
  tableNames,
  handleCreateTable,
}) {
  if (!showCreateTable) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
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
              onChange={(e) => setNewTableName(e.target.value)}
              className="w-full p-2.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md text-white placeholder-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
              placeholder="e.g., products"
            />
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
            onClick={handleCreateTable}
            className="flex-1 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-md font-medium transition-colors"
          >
            Create
          </button>
          <button
            onClick={() => {
              setShowCreateTable(false);
              setNewTableName("");
              setTablesToLink([]);
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
