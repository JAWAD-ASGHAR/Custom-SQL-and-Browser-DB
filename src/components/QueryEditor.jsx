import React from "react";

export default function QueryEditor({
  query,
  setQuery,
  handleRunQuery,
  setShowSuggestedQueriesModal,
  suggestedQueries,
  setResult,
}) {
  return (
    <div className="flex flex-col lg:flex-row h-64 lg:h-72 gap-0 border-b border-[#2a2a2a] flex-shrink-0">
      <div className="flex-1 flex flex-col overflow-hidden border-r border-[#2a2a2a] min-w-0">
        <div className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-4 py-2 flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-semibold text-white">SQL Editor</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSuggestedQueriesModal(true)}
              className="lg:hidden px-3 py-1.5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-md text-xs font-medium transition-colors"
            >
              📋 Queries
            </button>
            <button
              onClick={handleRunQuery}
              className="px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-md text-xs font-medium transition-colors flex items-center gap-2"
            >
              <span>▶</span> Run
            </button>
            <button
              onClick={() => {
                setQuery("");
                setResult(null);
              }}
              className="px-3 py-1.5 bg-[#7b7373] hover:bg-[#b9abab] text-white rounded-md text-xs font-medium transition-colors"
              title="Clear query"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 min-h-0">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your SQL query here"
            className="w-full h-full min-h-[150px] bg-[#1e1e1e] text-[#e0e0e0] font-mono text-sm p-4 rounded-md border border-[#2a2a2a] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] resize-none"
            style={{
              fontFamily:
                "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleRunQuery();
              }
            }}
          />
        </div>
        <div className="bg-[#1a1a1a] border-t border-[#2a2a2a] px-4 py-1.5 text-xs text-[#8b8b8b] flex-shrink-0">
          <span className="font-mono">Ctrl+Enter</span> to run query
        </div>
      </div>

      <div className="hidden lg:flex w-80 bg-[#1a1a1a] flex-col overflow-hidden flex-shrink-0">
        <div className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-4 py-2 flex-shrink-0">
          <h3 className="text-sm font-semibold text-white">
            Suggested Queries
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          <div className="space-y-2">
            {suggestedQueries.map((suggested, idx) => (
              <button
                key={idx}
                onClick={() => setQuery(suggested.query)}
                className="w-full text-left p-3 bg-[#1e1e1e] hover:bg-[#252525] border border-[#2a2a2a] rounded-md transition-colors group"
              >
                <div className="text-xs font-medium text-[#8b8b8b] mb-1">
                  {suggested.name}
                </div>
                <div className="text-xs font-mono text-[#e0e0e0] break-all">
                  {suggested.query}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
