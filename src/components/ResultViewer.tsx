import React from 'react';
import { QueryResult } from '../types';

interface ResultViewerProps {
  result: QueryResult | null;
}

export const ResultViewer: React.FC<ResultViewerProps> = ({ result }) => {
  if (!result) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No query executed yet</p>
        <p className="text-sm mt-2">Run a query to see results here</p>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex items-center gap-2">
          <span className="text-red-600 text-xl">⚠️</span>
          <h3 className="text-red-800 font-semibold">Error</h3>
        </div>
        <p className="text-red-700 mt-2">{result.error}</p>
      </div>
    );
  }

  if (!result.data || result.data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Query executed successfully</p>
        <p className="text-sm mt-2">No results found</p>
      </div>
    );
  }

  // Display files list
  if (result.type === 'files') {
    return (
      <div>
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Found <span className="font-semibold">{result.data.length}</span> file(s)
          </p>
        </div>
        <div className="space-y-2">
          {result.data.map((file: any, index: number) => (
            <div
              key={index}
              className="bg-gray-50 border border-gray-200 rounded-md p-3 flex items-center justify-between"
            >
              <div>
                <span className="font-semibold text-gray-800">{file.name}</span>
              </div>
              <div className="text-sm text-gray-600">
                {file.recordCount} record{file.recordCount !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Display set-based results (for UNION, INTERSECT, DIFF)
  if (result.type === 'set') {
    return (
      <div>
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Found <span className="font-semibold">{result.data.length}</span> record(s)
          </p>
        </div>
        {result.data.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(result.data[0]).map((field) => (
                      <th
                        key={field}
                        className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {field}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {result.data.map((record: Record<string, any>, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      {Object.keys(record).map((field) => (
                        <td key={field} className="px-4 py-2 text-sm text-gray-900">
                          {String(record[field] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Display table results (for SELECT)
  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Found <span className="font-semibold">{result.data.length}</span> record(s)
        </p>
      </div>
      <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {Object.keys(result.data[0]).map((field) => (
                  <th
                    key={field}
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {field}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {result.data.map((record: Record<string, any>, index: number) => (
                <tr key={index} className="hover:bg-gray-50">
                  {Object.keys(record).map((field) => (
                    <td key={field} className="px-4 py-2 text-sm text-gray-900">
                      {String(record[field] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

