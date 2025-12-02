import React, { useState, useEffect } from 'react';
import { MiniDB, TableField, ForeignKey, TableSchema } from '../types';
import { loadSchema } from '../utils/localStorage';

interface FileManagerProps {
  db: MiniDB;
  onCreateFile: (fileName: string, schema: TableSchema | null) => void;
}

export const FileManager: React.FC<FileManagerProps> = ({ db, onCreateFile }) => {
  const [newFileName, setNewFileName] = useState('');
  const [fields, setFields] = useState<TableField[]>([{ name: '', type: 'string' }]);
  const [primaryKey, setPrimaryKey] = useState<string>('');
  const [foreignKeys, setForeignKeys] = useState<ForeignKey[]>([]);
  const [showSchema, setShowSchema] = useState(true);

  useEffect(() => {
    setNewFileName('');
    setFields([{ name: '', type: 'string' }]);
    setPrimaryKey('');
    setForeignKeys([]);
    setShowSchema(true);
  }, []);

  const handleAddField = () => {
    setFields([...fields, { name: '', type: 'string' }]);
  };

  const handleRemoveField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    setFields(newFields);
    // Clear primary key if it was the removed field
    if (primaryKey === fields[index].name) {
      setPrimaryKey('');
    }
    // Remove foreign keys for this field
    setForeignKeys(foreignKeys.filter(fk => fk.field !== fields[index].name));
  };

  const handleFieldChange = (index: number, field: Partial<TableField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...field };
    setFields(newFields);
    // Clear primary key if field name changed
    if (primaryKey === fields[index].name && field.name) {
      setPrimaryKey('');
    }
  };

  const handleAddForeignKey = () => {
    setForeignKeys([...foreignKeys, { field: '', references: { table: '', field: '' } }]);
  };

  const handleRemoveForeignKey = (index: number) => {
    setForeignKeys(foreignKeys.filter((_, i) => i !== index));
  };

  const handleForeignKeyChange = (index: number, fk: Partial<ForeignKey>) => {
    const newFks = [...foreignKeys];
    newFks[index] = { ...newFks[index], ...fk };
    setForeignKeys(newFks);
  };

  const handleCreateFile = () => {
    const trimmedName = newFileName.trim().toLowerCase();
    if (!trimmedName) {
      alert('Please enter a file name');
      return;
    }

    if (db[trimmedName]) {
      alert('A file with this name already exists');
      return;
    }

    // Validate fields
    const validFields = fields.filter(f => f.name.trim() !== '');
    if (validFields.length === 0) {
      alert('Please add at least one field');
      return;
    }

    // Check for duplicate field names
    const fieldNames = validFields.map(f => f.name.trim().toLowerCase());
    const uniqueNames = new Set(fieldNames);
    if (fieldNames.length !== uniqueNames.size) {
      alert('Field names must be unique');
      return;
    }

    // Validate primary key
    if (primaryKey && !validFields.some(f => f.name === primaryKey)) {
      alert('Primary key must be one of the defined fields');
      return;
    }

    // Validate foreign keys
    const schema = loadSchema();
    for (const fk of foreignKeys) {
      if (!fk.field || !fk.references.table || !fk.references.field) {
        alert('All foreign key fields must be filled');
        return;
      }
      if (!validFields.some(f => f.name === fk.field)) {
        alert(`Foreign key field "${fk.field}" must be one of the defined fields`);
        return;
      }
      const refTableName = fk.references.table.toLowerCase();
      if (!schema[refTableName]) {
        alert(`Referenced table "${fk.references.table}" does not exist`);
        return;
      }
      const refTableSchema = schema[refTableName];
      if (!refTableSchema.fields.some(f => f.name === fk.references.field)) {
        alert(`Referenced field "${fk.references.field}" does not exist in table "${fk.references.table}"`);
        return;
      }
    }

    const tableSchema: TableSchema = {
      fields: validFields.map(f => ({ name: f.name.trim(), type: f.type })),
      primaryKey: primaryKey.trim() || undefined,
      foreignKeys: foreignKeys.length > 0 ? foreignKeys.map(fk => ({
        field: fk.field.trim(),
        references: {
          table: fk.references.table.trim().toLowerCase(),
          field: fk.references.field.trim(),
        },
      })) : undefined,
    };

    onCreateFile(trimmedName, tableSchema);
  };

  const availableTables = Object.keys(db);
  const schema = loadSchema();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">Create New File</h3>

        {/* Table Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Table Name *
          </label>
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter table name (e.g., students)"
            autoFocus
          />
        </div>

        {/* Schema Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Schema Definition
            </label>
            <button
              type="button"
              onClick={() => setShowSchema(!showSchema)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showSchema ? 'Hide' : 'Show'} Schema
            </button>
          </div>

          {showSchema && (
            <div className="border border-gray-200 rounded-md p-4 space-y-4">
              {/* Fields */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Fields *</label>
                  <button
                    type="button"
                    onClick={handleAddField}
                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    + Add Field
                  </button>
                </div>
                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) => handleFieldChange(index, { name: e.target.value })}
                        placeholder="Field name"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={field.type}
                        onChange={(e) => handleFieldChange(index, { type: e.target.value as 'string' | 'number' | 'boolean' })}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                      </select>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveField(index)}
                          className="text-red-600 hover:text-red-800 px-2"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Primary Key */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Primary Key (Optional)
                </label>
                <select
                  value={primaryKey}
                  onChange={(e) => setPrimaryKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None</option>
                  {fields
                    .filter(f => f.name.trim() !== '')
                    .map((field) => (
                      <option key={field.name} value={field.name}>
                        {field.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Foreign Keys */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Foreign Keys (Optional)</label>
                  <button
                    type="button"
                    onClick={handleAddForeignKey}
                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    + Add Foreign Key
                  </button>
                </div>
                <div className="space-y-2">
                  {foreignKeys.map((fk, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <select
                        value={fk.field}
                        onChange={(e) => handleForeignKeyChange(index, { field: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select field</option>
                        {fields
                          .filter(f => f.name.trim() !== '')
                          .map((field) => (
                            <option key={field.name} value={field.name}>
                              {field.name}
                            </option>
                          ))}
                      </select>
                      <span className="text-gray-500">references</span>
                      <select
                        value={fk.references.table}
                        onChange={(e) => handleForeignKeyChange(index, {
                          references: { ...fk.references, table: e.target.value, field: '' } // Reset field when table changes
                        })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select table</option>
                        {availableTables.map((table) => (
                          <option key={table} value={table}>
                            {table}
                          </option>
                        ))}
                      </select>
                      <span className="text-gray-500">.</span>
                      <select
                        value={fk.references.field}
                        onChange={(e) => handleForeignKeyChange(index, {
                          references: { ...fk.references, field: e.target.value }
                        })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!fk.references.table}
                      >
                        <option value="">Select field</option>
                        {fk.references.table && schema[fk.references.table.toLowerCase()]?.fields.map((field) => (
                          <option key={field.name} value={field.name}>
                            {field.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveForeignKey(index)}
                        className="text-red-600 hover:text-red-800 px-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => onCreateFile('', null)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateFile}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};
