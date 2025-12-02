import React, { useState, useEffect } from 'react';
import { MiniDB, ViewMode, TableSchema, MiniDBSchema } from './types';
import { loadDB, saveDB, seedSampleData, loadSchema, saveSchema } from './utils/localStorage';
import { Sidebar } from './components/Sidebar';
import { DatasetView } from './components/DatasetView';
import { QueryConsole } from './components/QueryConsole';
import { FileManager } from './components/FileManager';
import { RelationshipMap } from './components/RelationshipMap';

function App() {
  const [db, setDb] = useState<MiniDB>({});
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('dataset');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    // Load database on mount
    const loadedDb = loadDB();
    
    // Seed sample data if database is empty (only once)
    if (Object.keys(loadedDb).length === 0) {
      seedSampleData();
      const seededDb = loadDB();
      setDb(seededDb);
      // Auto-select first file if available
      const firstFile = Object.keys(seededDb)[0];
      if (firstFile) {
        setSelectedFile(firstFile);
      }
    } else {
      setDb(loadedDb);
      // Auto-select first file if available
      const firstFile = Object.keys(loadedDb)[0];
      if (firstFile && !selectedFile) {
        setSelectedFile(firstFile);
      }
    }
  }, []);

  const handleUpdateDb = (updatedDb: MiniDB) => {
    setDb(updatedDb);
    saveDB(updatedDb);
  };

  const handleCreateFile = (fileName: string, schema: TableSchema | null) => {
    if (!fileName) {
      setShowCreateModal(false);
      return;
    }

    const updatedDb = { ...db, [fileName]: [] };
    handleUpdateDb(updatedDb);

    // Save schema if provided
    if (schema) {
      const currentSchema = loadSchema();
      const updatedSchema: MiniDBSchema = {
        ...currentSchema,
        [fileName]: schema,
      };
      saveSchema(updatedSchema);
    }

    setSelectedFile(fileName);
    setShowCreateModal(false);
  };

  const handleDeleteFile = (fileName: string) => {
    const updatedDb = { ...db };
    delete updatedDb[fileName];
    handleUpdateDb(updatedDb);

    // Delete schema
    const currentSchema = loadSchema();
    const updatedSchema = { ...currentSchema };
    delete updatedSchema[fileName];
    saveSchema(updatedSchema);

    if (selectedFile === fileName) {
      const remainingFiles = Object.keys(updatedDb);
      setSelectedFile(remainingFiles.length > 0 ? remainingFiles[0] : null);
    }
  };

  const handleRenameFile = (oldName: string, newName: string) => {
    if (!newName.trim() || newName === oldName) return;
    
    const trimmedNewName = newName.trim().toLowerCase();
    if (db[trimmedNewName]) {
      alert('A file with this name already exists');
      return;
    }

    const updatedDb = { ...db };
    updatedDb[trimmedNewName] = updatedDb[oldName];
    delete updatedDb[oldName];
    handleUpdateDb(updatedDb);

    // Rename schema
    const currentSchema = loadSchema();
    if (currentSchema[oldName]) {
      const updatedSchema = { ...currentSchema };
      updatedSchema[trimmedNewName] = updatedSchema[oldName];
      delete updatedSchema[oldName];
      saveSchema(updatedSchema);
    }
    
    if (selectedFile === oldName) {
      setSelectedFile(trimmedNewName);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        db={db}
        selectedFile={selectedFile}
        onSelectFile={(fileName) => {
          setSelectedFile(fileName);
          setViewMode('dataset');
        }}
        onCreateFile={() => setShowCreateModal(true)}
        onDeleteFile={handleDeleteFile}
        onRenameFile={handleRenameFile}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setViewMode('dataset')}
              className={`px-6 py-3 font-semibold transition-colors ${
                viewMode === 'dataset'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Dataset View
            </button>
            <button
              onClick={() => setViewMode('query')}
              className={`px-6 py-3 font-semibold transition-colors ${
                viewMode === 'query'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Query Console
            </button>
            <button
              onClick={() => setViewMode('relationships')}
              className={`px-6 py-3 font-semibold transition-colors ${
                viewMode === 'relationships'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Relationship Map
            </button>
          </div>
        </div>

        {/* Main Content */}
        {viewMode === 'dataset' ? (
          <DatasetView db={db} fileName={selectedFile} onUpdate={handleUpdateDb} />
        ) : viewMode === 'query' ? (
          <QueryConsole db={db} />
        ) : (
          <RelationshipMap db={db} />
        )}
      </div>

      {/* File Manager Modal */}
      {showCreateModal && (
        <FileManager 
          db={db} 
          onCreateFile={handleCreateFile}
        />
      )}
    </div>
  );
}

export default App;

