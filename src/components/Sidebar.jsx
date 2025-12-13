import React from "react";
import { getTable } from "../database";

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  tableNames,
  selectedTable,
  setSelectedTable,
  setShowCreateTable,
  setShowRelationsView,
  handleDeleteTable,
}) {
  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`w-64 bg-[#1a1a1a] border-r border-[#2a2a2a] text-white flex flex-col fixed left-0 top-0 bottom-0 overflow-y-auto z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="p-4 border-b border-[#2a2a2a] flex items-center gap-3">
          <img
            src="/favicon.png"
            alt="MiniDB Logo"
            className="w-8 h-8 rounded"
            onError={(e) => {
              e.target.style.display = "none";
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
            <p className="text-xs font-semibold text-[#8b8b8b] uppercase tracking-wider px-3 py-2">
              Tables
            </p>
          </div>
          <div className="space-y-1">
            {tableNames.length === 0 ? (
              <p className="text-[#8b8b8b] text-sm p-3">No tables yet</p>
            ) : (
              tableNames.map((tableName) => {
                const table = getTable(tableName);
                const rowCount = table ? Object.keys(table.rows).length : 0;
                return (
                  <div
                    key={tableName}
                    className={`px-3 py-2 rounded-md cursor-pointer flex justify-between items-center group transition-colors ${
                      selectedTable === tableName
                        ? "bg-[#3b82f6] text-white"
                        : "hover:bg-[#2a2a2a] text-[#e0e0e0]"
                    }`}
                    onClick={() => {
                      setSelectedTable(tableName);
                      setSidebarOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm truncate">{tableName}</span>
                      <span
                        className={`text-xs ${
                          selectedTable === tableName
                            ? "text-blue-200"
                            : "text-[#8b8b8b]"
                        }`}
                      >
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
    </>
  );
}
