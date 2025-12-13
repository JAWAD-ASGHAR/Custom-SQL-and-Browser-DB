import React from "react";
import { getTableRows, getTable } from "../database";

export default function TableView({
  selectedTable,
  currentTable,
  tableColumns,
  tableActionsMenuOpen,
  setTableActionsMenuOpen,
  setRelationFromTable,
  setShowCreateRelation,
  handleAddColumn,
  setShowAddRow,
  handleDeleteColumn,
  handleDeleteRow,
  editingCell,
  setEditingCell,
  editValue,
  setEditValue,
  handleCellDoubleClick,
  handleCellSave,
  handleCellCancel,
  isForeignKey,
  getReferencedTable,
  getForeignKeyDisplay,
}) {
  return (
    <div className="flex-1 overflow-hidden p-4 lg:p-6 min-w-0">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 lg:p-6 h-full flex flex-col min-w-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 flex-shrink-0">
          <h2 className="text-xl lg:text-2xl font-semibold text-white">
            {selectedTable}
          </h2>

          <div className="hidden sm:flex flex-wrap gap-2">
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

          <div className="sm:hidden relative flex-shrink-0 z-50">
            <button
              onClick={() => setTableActionsMenuOpen(!tableActionsMenuOpen)}
              className="px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-md text-sm font-medium transition-colors"
            >
              ⋯ Actions
            </button>
            {tableActionsMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setTableActionsMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-40 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md shadow-lg z-50">
                  <button
                    onClick={() => {
                      setRelationFromTable(selectedTable);
                      setShowCreateRelation(true);
                      setTableActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-[#e0e0e0] hover:bg-[#252525] transition-colors"
                  >
                    🔗 Relation
                  </button>
                  <button
                    onClick={() => {
                      handleAddColumn(selectedTable);
                      setTableActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-[#e0e0e0] hover:bg-[#252525] transition-colors"
                  >
                    + Column
                  </button>
                  <button
                    onClick={() => {
                      setShowAddRow(true);
                      setTableActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-[#e0e0e0] hover:bg-[#252525] transition-colors"
                  >
                    + Row
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {currentTable.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#8b8b8b] mb-2">
              No rows in this table. Add a row to get started!
            </p>
            <p className="text-sm text-[#6b6b6b]">
              Note: The 'id' column is automatically added as the primary key
              (UUID).
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
            <div className="table-scroll-container h-full w-full">
              <table className="border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#1e1e1e] border-b border-[#2a2a2a]">
                    {tableColumns.map((col) => (
                      <th
                        key={col}
                        className="border-b border-[#2a2a2a] px-3 py-3 text-left whitespace-nowrap"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate text-xs lg:text-sm font-medium text-white">
                              {col}
                            </span>
                            {isForeignKey(col) && (
                              <span
                                className="text-[#8b5cf6] text-xs flex-shrink-0"
                                title={`Foreign key → ${getReferencedTable(col)}`}
                              >
                                🔗
                              </span>
                            )}
                            {col === "id" && (
                              <span
                                className="text-[#10b981] text-xs flex-shrink-0"
                                title="Primary key"
                              >
                                🔑
                              </span>
                            )}
                          </div>
                          {col !== "id" && (
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
                    <th className="border-b border-[#2a2a2a] px-3 py-3 whitespace-nowrap sticky right-0 bg-[#1e1e1e] text-white text-xs lg:text-sm font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentTable.map((row, idx) => (
                    <tr
                      key={row.id || idx}
                      className="border-b border-[#2a2a2a] hover:bg-[#1e1e1e] transition-colors"
                    >
                      {tableColumns.map((col) => {
                        const isEditing =
                          editingCell?.rowId === row.id &&
                          editingCell?.column === col;
                        const isFK = isForeignKey(col);
                        const refTable = getReferencedTable(col);
                        const refTableData = refTable
                          ? getTableRows(refTable)
                          : [];

                        return (
                          <td
                            key={col}
                            className={`px-3 py-3 relative max-w-xs lg:max-w-none ${
                              col === "id"
                                ? "text-[#8b8b8b]"
                                : "text-[#e0e0e0] hover:bg-[#252525] transition-colors"
                            }`}
                            onDoubleClick={() =>
                              handleCellDoubleClick(row.id, col)
                            }
                            style={{
                              cursor: col === "id" ? "default" : "pointer",
                            }}
                            title={
                              col === "id"
                                ? "ID cannot be edited"
                                : "Double-click to edit"
                            }
                          >
                            {isEditing ? (
                              isFK && refTableData.length > 0 ? (
                                <select
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() =>
                                    handleCellSave(selectedTable, row.id, col)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleCellSave(selectedTable, row.id, col);
                                    } else if (e.key === "Escape") {
                                      handleCellCancel();
                                    }
                                  }}
                                  autoFocus
                                  className="w-full p-2 bg-[#1e1e1e] border border-[#3b82f6] rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                                >
                                  <option value="" className="bg-[#1e1e1e]">
                                    Select {refTable}...
                                  </option>
                                  {refTableData.map((refRow) => (
                                    <option
                                      key={refRow.id}
                                      value={refRow.id}
                                      className="bg-[#1e1e1e]"
                                    >
                                      {refRow.id.substring(0, 8)}... -{" "}
                                      {getForeignKeyDisplay(col, refRow.id)}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() =>
                                    handleCellSave(selectedTable, row.id, col)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleCellSave(selectedTable, row.id, col);
                                    } else if (e.key === "Escape") {
                                      handleCellCancel();
                                    }
                                  }}
                                  autoFocus
                                  className="w-full p-2 bg-[#1e1e1e] border border-[#3b82f6] rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                                />
                              )
                            ) : isFK ? (
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[#8b5cf6] font-medium truncate">
                                  {getForeignKeyDisplay(col, row[col])}
                                </span>
                                {row[col] && (
                                  <span className="text-xs text-[#6b6b6b] flex-shrink-0">
                                    ({row[col].substring(0, 8)}...)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div>
                                <div
                                  className="break-words text-xs lg:text-sm truncate lg:whitespace-normal"
                                  title={String(row[col] || "")}
                                >
                                  {col === "id"
                                    ? row[col].substring(0, 8) + "..."
                                    : String(row[col] || "")}
                                </div>
                              </div>
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
  );
}
