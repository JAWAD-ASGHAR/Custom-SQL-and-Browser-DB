import React from "react";

export default function CreateRelationModal({
  showCreateRelation,
  setShowCreateRelation,
  relationFromTable,
  setRelationFromTable,
  relationFromColumn,
  setRelationFromColumn,
  relationToTable,
  setRelationToTable,
  onDeleteAction,
  setOnDeleteAction,
  tableNames,
  handleCreateRelation,
}) {
  if (!showCreateRelation) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 lg:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-white mb-4">
          Create Relation (Foreign Key)
        </h2>
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-[#e0e0e0]">
              From Table (has foreign key)
            </label>
            <select
              value={relationFromTable}
              onChange={(e) => {
                setRelationFromTable(e.target.value);
                setRelationFromColumn("");
              }}
              className="w-full p-2.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md text-white placeholder-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
            >
              <option value="">Select table...</option>
              {tableNames.map((tableName) => (
                <option key={tableName} value={tableName}>
                  {tableName}
                </option>
              ))}
            </select>
          </div>

          {relationFromTable && (
            <div>
              <label className="block text-sm font-medium mb-2 text-[#e0e0e0]">
                Column Name (or leave empty for auto)
              </label>
              <input
                type="text"
                value={relationFromColumn}
                onChange={(e) => setRelationFromColumn(e.target.value)}
                placeholder={`Will be: ${relationToTable || "tablename"}_id`}
                className="w-full p-2.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md text-white placeholder-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
              />
            </div>
          )}

          {relationFromTable && (
            <div>
              <label className="block text-sm font-medium mb-2 text-[#e0e0e0]">
                To Table (referenced table)
              </label>
              <select
                value={relationToTable}
                onChange={(e) => setRelationToTable(e.target.value)}
                className="w-full p-2.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md text-white placeholder-[#6b6b6b] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
              >
                <option value="">Select table to reference...</option>
                {tableNames
                  .filter((t) => t !== relationFromTable)
                  .map((tableName) => (
                    <option key={tableName} value={tableName}>
                      {tableName}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {relationFromTable && relationToTable && (
            <div>
              <label className="block text-sm font-medium mb-2 text-[#e0e0e0]">
                On Delete Action
              </label>
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
                <strong>{relationFromTable}</strong> will have a column{" "}
                <strong>
                  {relationFromColumn || `${relationToTable}_id`}
                </strong>{" "}
                that references <strong>{relationToTable}.id</strong>
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
              setRelationFromTable("");
              setRelationFromColumn("");
              setRelationToTable("");
              setOnDeleteAction("restrict");
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
