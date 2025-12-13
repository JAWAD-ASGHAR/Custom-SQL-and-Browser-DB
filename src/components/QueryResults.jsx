import React from "react";

export default function QueryResults({ result, resultsMenuOpen, setResultsMenuOpen }) {
  const handleCopyJSON = () => {
    const jsonData = JSON.stringify(result.data, null, 2);
    navigator.clipboard
      .writeText(jsonData)
      .then(() => {
        alert("Results copied to clipboard!");
      })
      .catch(() => {
        alert("Failed to copy to clipboard");
      });
  };

  const handleExportCSV = () => {
    if (result.data.length === 0) return;

    const headers = Object.keys(result.data[0]);
    const csvRows = [
      headers.join(","),
      ...result.data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            if (value === null || value === undefined) return "";
            const stringValue = String(value);
            if (
              stringValue.includes(",") ||
              stringValue.includes('"') ||
              stringValue.includes("\n")
            ) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
          .join(",")
      ),
    ];

    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query-results-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const jsonData = JSON.stringify(result.data, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query-results-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#1a1a1a] min-h-0">
      <div className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-4 py-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          {result ? (result.error ? "Error" : "Results") : "Results"}
        </h3>
        {result && result.data && result.data.length > 0 && (
          <>
            <div className="hidden lg:flex gap-2">
              <button
                onClick={handleCopyJSON}
                className="px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-md text-xs font-medium transition-colors"
                title="Copy results as JSON"
              >
                📋 Copy JSON
              </button>
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-[#10b981] hover:bg-[#059669] text-white rounded-md text-xs font-medium transition-colors"
                title="Export results as CSV"
              >
                📥 Export CSV
              </button>
              <button
                onClick={handleExportJSON}
                className="px-3 py-1.5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-md text-xs font-medium transition-colors"
                title="Export results as JSON file"
              >
                📥 Export JSON
              </button>
            </div>

            <div className="lg:hidden relative flex-shrink-0 z-50">
              <button
                onClick={() => setResultsMenuOpen(!resultsMenuOpen)}
                className="px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-md text-xs font-medium transition-colors"
              >
                ⋯ Export
              </button>
              {resultsMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setResultsMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-40 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md shadow-lg z-50">
                    <button
                      onClick={() => {
                        handleCopyJSON();
                        setResultsMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-[#e0e0e0] hover:bg-[#252525] transition-colors"
                    >
                      📋 Copy JSON
                    </button>
                    <button
                      onClick={() => {
                        handleExportCSV();
                        setResultsMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-[#e0e0e0] hover:bg-[#252525] transition-colors"
                    >
                      📥 Export CSV
                    </button>
                    <button
                      onClick={() => {
                        handleExportJSON();
                        setResultsMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-[#e0e0e0] hover:bg-[#252525] transition-colors"
                    >
                      📥 Export JSON
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4 min-h-0">
        {!result ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[#8b8b8b] text-sm">
              No query executed yet. Write a query and press Ctrl+Enter to run.
            </p>
          </div>
        ) : result.error ? (
          <div className="bg-[#7f1d1d] border border-[#991b1b] rounded-md p-4">
            <p className="text-red-300 text-sm font-medium">
              Error: {result.error}
            </p>
          </div>
        ) : result.data && result.data.length > 0 ? (
          <div className="h-full flex flex-col">
            <p className="text-[#8b8b8b] text-sm mb-4 flex-shrink-0">
              Found {result.data.length} row(s)
            </p>
            <div className="flex-1 overflow-auto min-h-0">
              <div className="table-scroll-container w-full h-full">
                <table className="border-collapse">
                  <thead>
                    <tr className="bg-[#1e1e1e] border-b border-[#2a2a2a]">
                      {Object.keys(result.data[0]).map((col) => (
                        <th
                          key={col}
                          className="border-b border-[#2a2a2a] px-3 py-2 text-left text-xs font-medium text-white whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-[#2a2a2a] hover:bg-[#1e1e1e] transition-colors"
                      >
                        {Object.keys(result.data[0]).map((col) => (
                          <td
                            key={col}
                            className="px-3 py-2 text-xs text-[#e0e0e0]"
                          >
                            <div
                              className="max-w-xs lg:max-w-none truncate lg:whitespace-normal"
                              title={String(row[col] || "")}
                            >
                              {String(row[col] || "")}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-[#8b8b8b] text-sm">No results</p>
          </div>
        )}
      </div>
    </div>
  );
}
