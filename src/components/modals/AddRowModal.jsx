import React from "react";
import { getTableRows, getTable } from "../../database";

export default function AddRowModal({
  showAddRow,
  setShowAddRow,
  selectedTable,
  tableColumns,
  newRow,
  setNewRow,
  handleAddRow,
  isForeignKey,
  getReferencedTable,
  getForeignKeyDisplay,
}) {
  if (!showAddRow || !selectedTable) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={() => {
        setShowAddRow(false);
        setNewRow({});
      }}
    >
      <div
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 lg:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-white mb-4">Add Row</h2>
        <div className="space-y-4">
          {tableColumns.length === 1 && tableColumns[0] === "id" ? (
            <p className="text-[#8b8b8b] text-sm">
              Table has no columns. Add a column first.
            </p>
          ) : (
            tableColumns
              .filter((col) => col !== "id")
              .map((col) => {
                const isFK = isForeignKey(col);
                const refTable = getReferencedTable(col);
                const refTableData = refTable ? getTableRows(refTable) : [];
                const table = getTable(selectedTable);
                const column = table?.schema.columns[col];
                const isDateColumn = column?.type === "date";
                const isCreatedAt = col === "createdAt" && isDateColumn;

                return (
                  <div key={col}>
                    <label className="block text-sm font-medium mb-2 text-[#e0e0e0]">
                      {col}
                      {isFK && (
                        <span
                          className="text-[#8b5cf6] text-xs ml-2"
                          title={`Foreign key → ${refTable}`}
                        >
                          🔗
                        </span>
                      )}
                      {isCreatedAt && (
                        <span
                          className="text-[#10b981] text-xs ml-2"
                          title="Auto-set to current date/time"
                        >
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
                        value={newRow[col] || ""}
                        onChange={(e) => {
                          setNewRow({
                            ...newRow,
                            [col]: e.target.value || null,
                          });
                        }}
                        className="w-full p-2.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                      >
                        <option value="" className="bg-[#1e1e1e]">
                          Select {refTable}...
                        </option>
                        {refTableData.map((row) => (
                          <option
                            key={row.id}
                            value={row.id}
                            className="bg-[#1e1e1e]"
                          >
                            {row.id.substring(0, 8)}... -{" "}
                            {getForeignKeyDisplay(col, row.id)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={newRow[col] || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          const numValue =
                            value.trim() !== "" && !isNaN(value)
                              ? Number(value)
                              : value;
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
  );
}
