import React, { useState } from 'react';
import { MiniDB, QueryResult } from '../types';
import { executeQuery } from '../utils/queryEngine';
import { ResultViewer } from './ResultViewer';

interface QueryConsoleProps {
  db: MiniDB;
  onUpdate?: (updatedDb: MiniDB) => void;
}

export const QueryConsole: React.FC<QueryConsoleProps> = ({ db, onUpdate }) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);

  const handleRunQuery = () => {
    if (!query.trim()) {
      setResult({ error: 'Please enter a query' });
      return;
    }

    const queryResult = executeQuery(query, db);
    setResult(queryResult);

    // Handle database mutations (INSERT, UPDATE, DELETE)
    if (queryResult.updatedDb && onUpdate) {
      onUpdate(queryResult.updatedDb);
    }

    // Add to history if not already there
    if (query.trim() && !queryHistory.includes(query.trim())) {
      setQueryHistory([query.trim(), ...queryHistory].slice(0, 10));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleRunQuery();
    }
  };

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-full">
      <div className="bg-white border-b border-gray-200 p-4">
        <h2 className="text-2xl font-bold text-gray-800">Query Console</h2>
        <p className="text-sm text-gray-500 mt-1">
          Enter queries to interact with your database. Press Ctrl/Cmd + Enter to run.
        </p>
      </div>

      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        <div className="flex-1 flex flex-col">
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Query
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="SELECT name, age FROM students&#10;SELECT FROM students WHERE age > 20 ORDERBY age DESC LIMIT 10&#10;INSERT INTO students { &quot;id&quot;: 4, &quot;name&quot;: &quot;Zara&quot;, &quot;age&quot;: 21 }&#10;UPDATE students SET age = 25 WHERE id = 2&#10;DELETE FROM students WHERE gpa < 2.0&#10;JOIN students enrollments ON students.id = enrollments.studentId&#10;SHOW FILES"
              className="w-full h-40 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>
          <div className="flex gap-2 mb-4">
            <button
              onClick={handleRunQuery}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded transition-colors"
            >
              Run Query
            </button>
            <button
              onClick={() => {
                setQuery('');
                setResult(null);
              }}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-6 rounded transition-colors"
            >
              Clear
            </button>
          </div>

          {queryHistory.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Query History</h3>
              <div className="bg-white border border-gray-200 rounded-md p-2 max-h-32 overflow-y-auto">
                {queryHistory.map((historyQuery, index) => (
                  <button
                    key={index}
                    onClick={() => handleHistoryClick(historyQuery)}
                    className="block w-full text-left px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded mb-1 font-mono"
                  >
                    {historyQuery}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Query Examples:</h3>
            <ul className="text-xs text-blue-800 space-y-1 font-mono">
              <li>• SELECT name, age FROM students</li>
              <li>• SELECT FROM students WHERE age &gt; 20 ORDERBY age DESC LIMIT 10</li>
              <li>• INSERT INTO students {`{ "id": 4, "name": "Zara", "age": 21 }`}</li>
              <li>• UPDATE students SET age = 25 WHERE id = 2</li>
              <li>• DELETE FROM students WHERE gpa &lt; 2.0</li>
              <li>• UNION students teachers</li>
              <li>• INTERSECT students alumni</li>
              <li>• DIFF students teachers</li>
              <li>• JOIN students enrollments ON students.id = enrollments.studentId</li>
              <li>• SHOW FILES</li>
            </ul>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Results</h3>
          </div>
          <div className="p-4 overflow-auto max-h-[calc(100vh-300px)]">
            <ResultViewer result={result} />
          </div>
        </div>
      </div>
    </div>
  );
};

