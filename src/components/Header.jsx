import React from "react";

export default function Header({
  sidebarOpen,
  setSidebarOpen,
  selectedTable,
  setSelectedTable,
  tableNames,
  headerMenuOpen,
  setHeaderMenuOpen,
  handleDownloadSample,
  handleClearDatabase,
  fileInputRef,
}) {
  return (
    <div className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-4 lg:px-6 py-3 flex justify-between items-center gap-3 flex-shrink-0 relative">
      <div className="flex items-center gap-3 flex-1 min-w-0">
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
                ? "bg-[#2a2a2a] text-white"
                : "text-[#8b8b8b] hover:text-white hover:bg-[#2a2a2a]"
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
                ? "bg-[#2a2a2a] text-white"
                : "text-[#8b8b8b] hover:text-white hover:bg-[#2a2a2a]"
            }`}
            onClick={() => setSelectedTable(null)}
          >
            SQL Editor
          </button>
        </div>
      </div>

      <div className="hidden lg:flex gap-2 flex-shrink-0">
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
          Drop DB
        </button>
      </div>

      <div className="lg:hidden relative flex-shrink-0 z-50">
        <button
          onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
          className="px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-md text-xs font-medium transition-colors"
        >
          ⋯
        </button>
        {headerMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setHeaderMenuOpen(false)}
            />
            <div className="absolute right-0 top-full mt-2 w-40 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md shadow-lg z-50">
              <button
                onClick={() => {
                  handleDownloadSample();
                  setHeaderMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-[#e0e0e0] hover:bg-[#252525] transition-colors"
              >
                📥 Sample
              </button>
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setHeaderMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-[#e0e0e0] hover:bg-[#252525] transition-colors"
              >
                📤 Import
              </button>
              <button
                onClick={() => {
                  handleClearDatabase();
                  setHeaderMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-[#ef4444] hover:bg-[#252525] transition-colors"
              >
                🗑️ Drop DB
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
