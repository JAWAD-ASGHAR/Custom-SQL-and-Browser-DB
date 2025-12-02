import React from 'react';
import { MiniDB } from '../types';

interface SidebarProps {
  db: MiniDB;
  selectedFile: string | null;
  onSelectFile: (fileName: string) => void;
  onCreateFile: () => void;
  onDeleteFile: (fileName: string) => void;
  onRenameFile: (oldName: string, newName: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  db,
  selectedFile,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
}) => {
  const [renamingFile, setRenamingFile] = React.useState<string | null>(null);
  const [newFileName, setNewFileName] = React.useState('');

  const handleRenameStart = (fileName: string) => {
    setRenamingFile(fileName);
    setNewFileName(fileName);
  };

  const handleRenameSubmit = (oldName: string) => {
    if (newFileName.trim() && newFileName !== oldName) {
      onRenameFile(oldName, newFileName.trim());
    }
    setRenamingFile(null);
    setNewFileName('');
  };

  const handleRenameCancel = () => {
    setRenamingFile(null);
    setNewFileName('');
  };

  return (
    <div className="w-64 bg-gray-800 text-white h-screen flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">MiniDB</h1>
        <p className="text-sm text-gray-400 mt-1">File-Based Database</p>
      </div>

      <div className="p-4">
        <button
          onClick={onCreateFile}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          + Create New File
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Files ({Object.keys(db).length})
        </div>
        <div className="px-2">
          {Object.keys(db).length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              No files yet. Create one to get started!
            </div>
          ) : (
            Object.keys(db).map((fileName) => (
              <div
                key={fileName}
                className={`group flex items-center justify-between p-2 rounded mb-1 cursor-pointer transition-colors ${
                  selectedFile === fileName
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-700 text-gray-300'
                }`}
              >
                {renamingFile === fileName ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRenameSubmit(fileName);
                        } else if (e.key === 'Escape') {
                          handleRenameCancel();
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 px-2 py-1 text-sm text-gray-900 rounded"
                      autoFocus
                    />
                    <button
                      onClick={() => handleRenameSubmit(fileName)}
                      className="text-green-400 hover:text-green-300"
                    >
                      ✓
                    </button>
                    <button
                      onClick={handleRenameCancel}
                      className="text-red-400 hover:text-red-300"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <div
                      onClick={() => onSelectFile(fileName)}
                      className="flex-1 flex items-center gap-2"
                    >
                      <span className="text-sm font-medium">{fileName}</span>
                      <span className="text-xs opacity-75">
                        ({db[fileName].length})
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameStart(fileName);
                        }}
                        className="text-gray-400 hover:text-yellow-400 text-xs px-1"
                        title="Rename"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete file "${fileName}"?`)) {
                            onDeleteFile(fileName);
                          }
                        }}
                        className="text-gray-400 hover:text-red-400 text-xs px-1"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

