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
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    setNewFileName('');
    setFields([{ name: '', type: 'string' }]);
    setPrimaryKey('');
    setForeignKeys([]);
    setShowSchema(true);
    setErrors({});
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
    // Clear errors when user makes changes
    if (errors[`field-${index}`]) {
      const newErrors = { ...errors };
      delete newErrors[`field-${index}`];
      setErrors(newErrors);
    }
    if (errors.duplicateFields) {
      const newErrors = { ...errors };
      delete newErrors.duplicateFields;
      setErrors(newErrors);
    }
  };

  const validateFields = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    // Check for empty field names
    fields.forEach((field, index) => {
      if (!field.name.trim()) {
        newErrors[`field-${index}`] = 'Field name is required';
      }
    });

    // Check for duplicate field names (case-insensitive)
    const fieldNames = fields
      .map(f => f.name.trim().toLowerCase())
      .filter(name => name !== '');
    const duplicates = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
    
    if (duplicates.length > 0) {
      newErrors.duplicateFields = 'Field names must be unique';
      // Mark duplicate fields
      fields.forEach((field, index) => {
        const lowerName = field.name.trim().toLowerCase();
        if (lowerName && duplicates.includes(lowerName)) {
          newErrors[`field-${index}`] = 'Duplicate field name';
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
    const newErrors: { [key: string]: string } = {};

    if (!trimmedName) {
      newErrors.fileName = 'Please enter a file name';
    } else if (db[trimmedName]) {
      newErrors.fileName = 'A file with this name already exists';
    }

    // Validate fields
    if (!validateFields()) {
      // Validation errors are already set by validateFields
      setErrors({ ...errors, ...newErrors });
      return;
    }

    const validFields = fields.filter(f => f.name.trim() !== '');
    if (validFields.length === 0) {
      newErrors.fields = 'Please add at least one field';
      setErrors(newErrors);
      return;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Validate primary key
    if (primaryKey && !validFields.some(f => f.name === primaryKey)) {
      newErrors.primaryKey = 'Primary key must be one of the defined fields';
      setErrors(newErrors);
      return;
    }

    // Validate foreign keys
    const schema = loadSchema();
    for (let i = 0; i < foreignKeys.length; i++) {
      const fk = foreignKeys[i];
      if (!fk.field || !fk.references.table || !fk.references.field) {
        newErrors[`fk-${i}`] = 'All foreign key fields must be filled';
        setErrors(newErrors);
        return;
      }
      if (!validFields.some(f => f.name === fk.field)) {
        newErrors[`fk-${i}`] = `Foreign key field "${fk.field}" must be one of the defined fields`;
        setErrors(newErrors);
        return;
      }
      const refTableName = fk.references.table.toLowerCase();
      if (!schema[refTableName]) {
        newErrors[`fk-${i}`] = `Referenced table "${fk.references.table}" does not exist`;
        setErrors(newErrors);
        return;
      }
      const refTableSchema = schema[refTableName];
      if (!refTableSchema.fields.some(f => f.name === fk.references.field)) {
        newErrors[`fk-${i}`] = `Referenced field "${fk.references.field}" does not exist in table "${fk.references.table}"`;
        setErrors(newErrors);
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

    // Clear errors and create file
    setErrors({});
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
            onChange={(e) => {
              setNewFileName(e.target.value);
              if (errors.fileName) {
                const newErrors = { ...errors };
                delete newErrors.fileName;
                setErrors(newErrors);
              }
            }}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.fileName 
                ? 'border-red-300 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Enter table name (e.g., students)"
            autoFocus
          />
          {errors.fileName && (
            <p className="mt-1 text-sm text-red-600">{errors.fileName}</p>
          )}
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
                {errors.fields && (
                  <p className="mb-2 text-sm text-red-600">{errors.fields}</p>
                )}
                {errors.duplicateFields && (
                  <p className="mb-2 text-sm text-red-600">{errors.duplicateFields}</p>
                )}
                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div key={index}>
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => handleFieldChange(index, { name: e.target.value })}
                          placeholder="Field name"
                          className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                            errors[`field-${index}`]
                              ? 'border-red-300 focus:ring-red-500'
                              : 'border-gray-300 focus:ring-blue-500'
                          }`}
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
                        <button
                          type="button"
                          onClick={() => handleRemoveField(index)}
                          disabled={fields.length === 1}
                          className={`px-3 py-2 rounded transition-colors ${
                            fields.length === 1
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                          }`}
                          title={fields.length === 1 ? 'At least one field is required' : 'Delete field'}
                        >
                          ✕
                        </button>
                      </div>
                      {errors[`field-${index}`] && (
                        <p className="mt-1 text-xs text-red-600 ml-1">{errors[`field-${index}`]}</p>
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
                  onChange={(e) => {
                    setPrimaryKey(e.target.value);
                    if (errors.primaryKey) {
                      const newErrors = { ...errors };
                      delete newErrors.primaryKey;
                      setErrors(newErrors);
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    errors.primaryKey
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
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
                {errors.primaryKey && (
                  <p className="mt-1 text-sm text-red-600">{errors.primaryKey}</p>
                )}
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
                    <div key={index}>
                      <div className="flex gap-2 items-center">
                        <select
                          value={fk.field}
                          onChange={(e) => {
                            handleForeignKeyChange(index, { field: e.target.value });
                            if (errors[`fk-${index}`]) {
                              const newErrors = { ...errors };
                              delete newErrors[`fk-${index}`];
                              setErrors(newErrors);
                            }
                          }}
                          className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                            errors[`fk-${index}`]
                              ? 'border-red-300 focus:ring-red-500'
                              : 'border-gray-300 focus:ring-blue-500'
                          }`}
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
                        <span className="text-gray-500 whitespace-nowrap">references</span>
                        <select
                          value={fk.references.table}
                          onChange={(e) => {
                            handleForeignKeyChange(index, {
                              references: { ...fk.references, table: e.target.value, field: '' } // Reset field when table changes
                            });
                            if (errors[`fk-${index}`]) {
                              const newErrors = { ...errors };
                              delete newErrors[`fk-${index}`];
                              setErrors(newErrors);
                            }
                          }}
                          className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                            errors[`fk-${index}`]
                              ? 'border-red-300 focus:ring-red-500'
                              : 'border-gray-300 focus:ring-blue-500'
                          }`}
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
                          onChange={(e) => {
                            handleForeignKeyChange(index, {
                              references: { ...fk.references, field: e.target.value }
                            });
                            if (errors[`fk-${index}`]) {
                              const newErrors = { ...errors };
                              delete newErrors[`fk-${index}`];
                              setErrors(newErrors);
                            }
                          }}
                          className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                            errors[`fk-${index}`]
                              ? 'border-red-300 focus:ring-red-500'
                              : 'border-gray-300 focus:ring-blue-500'
                          }`}
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
                          onClick={() => {
                            handleRemoveForeignKey(index);
                            if (errors[`fk-${index}`]) {
                              const newErrors = { ...errors };
                              delete newErrors[`fk-${index}`];
                              setErrors(newErrors);
                            }
                          }}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded transition-colors"
                          title="Delete foreign key"
                        >
                          ✕
                        </button>
                      </div>
                      {errors[`fk-${index}`] && (
                        <p className="mt-1 text-xs text-red-600 ml-1">{errors[`fk-${index}`]}</p>
                      )}
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
