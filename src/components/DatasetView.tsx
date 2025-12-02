import React, { useState } from 'react';
import { MiniDB } from '../types';
import { loadSchema } from '../utils/localStorage';
import { validateRecord, parseValueByType, findReferencingRecords, cascadeDelete } from '../utils/schemaValidation';

interface DatasetViewProps {
  db: MiniDB;
  fileName: string | null;
  onUpdate: (updatedDb: MiniDB) => void;
}

export const DatasetView: React.FC<DatasetViewProps> = ({ db, fileName, onUpdate }) => {
  const [editingRecord, setEditingRecord] = useState<Record<string, any> | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRecord, setNewRecord] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  if (!fileName || !db[fileName]) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <div className="text-center text-gray-500">
          <p className="text-lg">No file selected</p>
          <p className="text-sm mt-2">Select a file from the sidebar to view its contents</p>
        </div>
      </div>
    );
  }

  const records = db[fileName];
  const schema = loadSchema();
  const tableSchema = schema[fileName];

  // Use schema if available, otherwise fall back to first record
  const fields = tableSchema
    ? tableSchema.fields.map(f => f.name)
    : records.length > 0
    ? Object.keys(records[0])
    : [];

  const handleAddRecord = () => {
    if (!tableSchema) {
      alert('Cannot add record: No schema defined for this table. Please recreate the table with a schema.');
      return;
    }

    // Validate the record
    const validation = validateRecord(newRecord, tableSchema, db, fileName, records);
    
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    setValidationErrors([]);
    const updatedDb = { ...db };
    updatedDb[fileName] = [...updatedDb[fileName], { ...newRecord }];
    onUpdate(updatedDb);
    setNewRecord({});
    setShowAddModal(false);
  };

  const handleEditRecord = (index: number) => {
    setEditingRecord({ ...records[index], __index: index });
    setValidationErrors([]);
  };

  const handleSaveEdit = () => {
    if (!editingRecord || !tableSchema) return;
    
    const index = editingRecord.__index;
    const recordToSave = { ...editingRecord };
    delete recordToSave.__index;

    // Validate the record
    const validation = validateRecord(recordToSave, tableSchema, db, fileName, records, index);
    
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    setValidationErrors([]);
    const updatedDb = { ...db };
    updatedDb[fileName] = [...updatedDb[fileName]];
    updatedDb[fileName][index] = recordToSave;
    onUpdate(updatedDb);
    setEditingRecord(null);
  };

  const handleDeleteRecord = (index: number) => {
    if (!tableSchema || !tableSchema.primaryKey) {
      // No schema or primary key, simple delete
      if (confirm('Delete this record?')) {
        const updatedDb = { ...db };
        updatedDb[fileName] = updatedDb[fileName].filter((_, i) => i !== index);
        onUpdate(updatedDb);
      }
      return;
    }

    // Check for foreign key references
    const record = records[index];
    const pkValue = record[tableSchema.primaryKey];
    const references = findReferencingRecords(
      fileName,
      pkValue,
      tableSchema.primaryKey,
      db,
      schema
    );

    if (references.length > 0) {
      // Build reference message
      const refMessages = references.map(ref => {
        const count = ref.recordIndices.length;
        return `  • ${count} record(s) in table "${ref.table}" (field: ${ref.field})`;
      });

      const totalRefs = references.reduce((sum, ref) => sum + ref.recordIndices.length, 0);
      
      // First dialog: Show references and ask for action
      const action = confirm(
        `⚠️ This record is referenced by other records:\n\n${refMessages.join('\n')}\n\n` +
        `Total: ${totalRefs} referencing record(s)\n\n` +
        `Click OK to block deletion (recommended)\n` +
        `Click Cancel to proceed with cascade delete`
      );
      
      if (action) {
        // User clicked OK - block deletion
        alert('❌ Deletion blocked: This record is referenced by other records.\n\nTo delete this record, you must first delete or update all referencing records, or use cascade delete.');
        return;
      } else {
        // User clicked Cancel - proceed with cascade delete
        const cascadeConfirm = confirm(
          `⚠️ WARNING: Cascade Delete\n\n` +
          `This will delete the following records:\n${refMessages.join('\n')}\n\n` +
          `Total: ${totalRefs} record(s) will be deleted\n\n` +
          `Are you sure you want to proceed?`
        );
        
        if (cascadeConfirm) {
          const updatedDb = cascadeDelete(fileName, index, db, schema);
          onUpdate(updatedDb);
          alert(`✅ Successfully deleted ${totalRefs + 1} record(s) (including ${totalRefs} referencing record(s))`);
        }
      }
    } else {
      // No references, safe to delete
      if (confirm('Delete this record?')) {
        const updatedDb = { ...db };
        updatedDb[fileName] = updatedDb[fileName].filter((_, i) => i !== index);
        onUpdate(updatedDb);
      }
    }
  };

  const handleFieldChange = (field: string, value: string, record: Record<string, any>, isNew: boolean) => {
    if (!tableSchema) {
      // Fallback to old behavior if no schema
      const numValue = !isNaN(Number(value)) && value !== '' ? Number(value) : value;
      record[field] = numValue;
      if (isNew) {
        setNewRecord({ ...record });
      } else {
        setEditingRecord({ ...record });
      }
      return;
    }

    const fieldSchema = tableSchema.fields.find(f => f.name === field);
    if (!fieldSchema) return;

    try {
      const parsedValue = value === '' ? undefined : parseValueByType(value, fieldSchema.type);
      record[field] = parsedValue;
      if (isNew) {
        setNewRecord({ ...record });
      } else {
        setEditingRecord({ ...record });
      }
      // Clear validation errors when user starts typing
      if (validationErrors.length > 0) {
        setValidationErrors([]);
      }
    } catch (error) {
      // Don't update value if parsing fails
      console.error('Parse error:', error);
    }
  };

  const getInputType = (fieldType: 'string' | 'number' | 'boolean') => {
    switch (fieldType) {
      case 'number':
        return 'number';
      case 'boolean':
        return 'checkbox';
      default:
        return 'text';
    }
  };

  const renderFieldInput = (field: string, value: any, record: Record<string, any>, isNew: boolean) => {
    if (!tableSchema) {
      // Fallback to text input
      return (
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => handleFieldChange(field, e.target.value, record, isNew)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={`Enter ${field}`}
        />
      );
    }

    const fieldSchema = tableSchema.fields.find(f => f.name === field);
    if (!fieldSchema) return null;

    const fieldType = fieldSchema.type;

    if (fieldType === 'boolean') {
      return (
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => handleFieldChange(field, e.target.checked.toString(), record, isNew)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-600">
            {value === true ? 'True' : 'False'}
          </span>
        </div>
      );
    }

    return (
      <input
        type={getInputType(fieldType)}
        value={value ?? ''}
        onChange={(e) => handleFieldChange(field, e.target.value, record, isNew)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={`Enter ${field} (${fieldType})`}
      />
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{fileName}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {records.length} record{records.length !== 1 ? 's' : ''}
            {tableSchema && (
              <span className="ml-2 text-blue-600">
                (Schema: {tableSchema.fields.length} field{tableSchema.fields.length !== 1 ? 's' : ''})
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddModal(true);
            setValidationErrors([]);
            setNewRecord({});
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          + Add Record
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {records.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No records in this file</p>
            <p className="text-sm mt-2">Click "Add Record" to create your first record</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {fields.map((field) => (
                      <th
                        key={field}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {field}
                        {tableSchema && tableSchema.primaryKey === field && (
                          <span className="ml-1 text-blue-600" title="Primary Key">🔑</span>
                        )}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map((record, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      {fields.map((field) => (
                        <td key={field} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {String(record[field] ?? '')}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEditRecord(index)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(index)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Add New Record</h3>
            
            {validationErrors.length > 0 && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                <h4 className="text-sm font-semibold text-red-800 mb-2">Validation Errors:</h4>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-4">
              {fields.map((field) => {
                const fieldSchema = tableSchema?.fields.find(f => f.name === field);
                const isRequired = true; // All fields are required for now
                const isPrimaryKey = tableSchema?.primaryKey === field;
                
                return (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field}
                      {isPrimaryKey && <span className="ml-1 text-blue-600" title="Primary Key">🔑</span>}
                      {isRequired && <span className="text-red-500 ml-1">*</span>}
                      {fieldSchema && (
                        <span className="ml-2 text-xs text-gray-500">({fieldSchema.type})</span>
                      )}
                    </label>
                    {renderFieldInput(field, newRecord[field], newRecord, true)}
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewRecord({});
                  setValidationErrors([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRecord}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Edit Record</h3>
            
            {validationErrors.length > 0 && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                <h4 className="text-sm font-semibold text-red-800 mb-2">Validation Errors:</h4>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-4">
              {Object.keys(editingRecord)
                .filter((key) => key !== '__index')
                .map((field) => {
                  const fieldSchema = tableSchema?.fields.find(f => f.name === field);
                  const isPrimaryKey = tableSchema?.primaryKey === field;
                  
                  return (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field}
                        {isPrimaryKey && <span className="ml-1 text-blue-600" title="Primary Key">🔑</span>}
                        {fieldSchema && (
                          <span className="ml-2 text-xs text-gray-500">({fieldSchema.type})</span>
                        )}
                      </label>
                      {renderFieldInput(field, editingRecord[field], editingRecord, false)}
                    </div>
                  );
                })}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditingRecord(null);
                  setValidationErrors([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
