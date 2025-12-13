import React from "react";

export default function SuggestedQueriesModal({
  showSuggestedQueriesModal,
  setShowSuggestedQueriesModal,
  suggestedQueries,
  setQuery,
}) {
  if (!showSuggestedQueriesModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 lg:p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-semibold text-white">
            Suggested Queries
          </h2>
          <button
            onClick={() => setShowSuggestedQueriesModal(false)}
            className="text-[#8b8b8b] hover:text-white transition-colors text-2xl"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="space-y-2">
            {suggestedQueries.map((suggested, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(suggested.query);
                  setShowSuggestedQueriesModal(false);
                }}
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
        <div className="mt-4 flex-shrink-0">
          <button
            onClick={() => setShowSuggestedQueriesModal(false)}
            className="w-full px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] rounded-md font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
