import React from "react";

export default function ViewRelationsModal({
  showRelationsView,
  setShowRelationsView,
  getAllRelations,
  setSelectedTable,
}) {
  if (!showRelationsView) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 lg:p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">
            Database Relations
          </h2>
          <button
            onClick={() => setShowRelationsView(false)}
            className="text-[#8b8b8b] hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {getAllRelations().length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#8b8b8b] mb-4">No relations created yet.</p>
            <p className="text-sm text-[#6b6b6b]">
              Use the "🔗 Create Relation" button on any table to create a
              foreign key relationship.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-[#1e1e1e] border border-[#3b82f6] rounded-md p-3 text-sm mb-4">
              <p className="font-semibold text-[#3b82f6]">How Relations Work:</p>
              <p className="text-[#e0e0e0] mt-1">
                A foreign key column stores the{" "}
                <strong className="text-white">id</strong> (UUID) of a row from
                another table, creating a link between tables.
              </p>
            </div>

            <div className="space-y-3">
              {getAllRelations().map((rel, idx) => (
                <div
                  key={idx}
                  className="border border-[#2a2a2a] rounded-md p-4 bg-[#1e1e1e] hover:bg-[#252525] transition-colors"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">🔗</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white">
                        {rel.fromTable}.{rel.fromColumn}
                      </div>
                      <div className="text-sm text-[#8b8b8b] mt-1">
                        → references →{" "}
                        <strong className="text-[#8b5cf6]">
                          {rel.toTable}.id
                        </strong>
                      </div>
                      <div className="text-xs text-[#6b6b6b] mt-1">
                        On delete:{" "}
                        <strong className="text-[#e0e0e0]">{rel.onDelete}</strong>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedTable(rel.fromTable);
                        setShowRelationsView(false);
                      }}
                      className="px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm rounded-md font-medium transition-colors flex-shrink-0"
                    >
                      View Table
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={() => setShowRelationsView(false)}
            className="w-full px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] rounded-md font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
