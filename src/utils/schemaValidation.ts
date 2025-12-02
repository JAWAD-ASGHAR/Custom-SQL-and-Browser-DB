import { MiniDB, MiniDBSchema, TableSchema } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateRecord(
  record: Record<string, any>,
  schema: TableSchema,
  db: MiniDB,
  _tableName: string,
  existingRecords?: Record<string, any>[],
  currentIndex?: number
): ValidationResult {
  const errors: string[] = [];

  // Check all required fields exist
  const recordKeys = Object.keys(record);
  const schemaFieldNames = schema.fields.map(f => f.name);

  // Check for missing fields
  for (const field of schema.fields) {
    if (!(field.name in record)) {
      errors.push(`Field "${field.name}" is required`);
    }
  }

  // Check for extra fields
  for (const key of recordKeys) {
    if (!schemaFieldNames.includes(key)) {
      errors.push(`Field "${key}" is not defined in schema`);
    }
  }

  // Check type matching
  for (const field of schema.fields) {
    if (!(field.name in record)) continue; // Already reported as missing

    const value = record[field.name];
    const expectedType = field.type;

    if (value === null || value === undefined) {
      continue; // Allow null/undefined, will be caught by required check if needed
    }

    let typeMatch = false;
    switch (expectedType) {
      case 'number':
        typeMatch = typeof value === 'number' && !isNaN(value);
        break;
      case 'boolean':
        typeMatch = typeof value === 'boolean';
        break;
      case 'string':
        typeMatch = typeof value === 'string';
        break;
    }

    if (!typeMatch) {
      errors.push(`Field "${field.name}" must be of type ${expectedType}, got ${typeof value}`);
    }
  }

  // Check primary key uniqueness
  if (schema.primaryKey) {
    const pkValue = record[schema.primaryKey];
    if (pkValue !== null && pkValue !== undefined && existingRecords) {
      const duplicateIndex = existingRecords.findIndex((r, idx) => {
        if (currentIndex !== undefined && idx === currentIndex) return false;
        return r[schema.primaryKey!] === pkValue;
      });

      if (duplicateIndex !== -1) {
        errors.push(`Primary key "${schema.primaryKey}" value "${pkValue}" already exists`);
      }
    }
  }

  // Check foreign key references
  if (schema.foreignKeys) {
    for (const fk of schema.foreignKeys) {
      const fkValue = record[fk.field];
      if (fkValue === null || fkValue === undefined) {
        continue; // Allow null foreign keys
      }

      const referencedTableName = fk.references.table.toLowerCase();
      const referencedTable = db[referencedTableName];
      if (!referencedTable) {
        errors.push(`Referenced table "${fk.references.table}" does not exist`);
        continue;
      }

      const referencedField = fk.references.field;
      const referenceExists = referencedTable.some(r => r[referencedField] === fkValue);

      if (!referenceExists) {
        errors.push(
          `Foreign key "${fk.field}" value "${fkValue}" does not exist in table "${fk.references.table}" field "${referencedField}"`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function parseValueByType(value: string, type: 'string' | 'number' | 'boolean'): any {
  switch (type) {
    case 'number':
      const num = Number(value);
      if (isNaN(num) && value !== '') {
        throw new Error(`Cannot parse "${value}" as number`);
      }
      return value === '' ? undefined : num;
    case 'boolean':
      const lower = value.toLowerCase();
      if (lower === 'true') return true;
      if (lower === 'false') return false;
      throw new Error(`Cannot parse "${value}" as boolean (must be "true" or "false")`);
    case 'string':
      return value;
    default:
      return value;
  }
}

export interface ReferenceInfo {
  table: string;
  field: string;
  recordIndices: number[];
}

export function findReferencingRecords(
  tableName: string,
  recordValue: any,
  primaryKeyField: string,
  db: MiniDB,
  schema: MiniDBSchema
): ReferenceInfo[] {
  const references: ReferenceInfo[] = [];
  const tableNameLower = tableName.toLowerCase();

  // Check all tables for foreign keys that reference this table
  for (const [otherTableName, otherTableSchema] of Object.entries(schema)) {
    if (!otherTableSchema.foreignKeys) continue;

    for (const fk of otherTableSchema.foreignKeys) {
      const refTableLower = fk.references.table.toLowerCase();
      if (refTableLower === tableNameLower && fk.references.field === primaryKeyField) {
        // This foreign key references our table
        const otherTableRecords = db[otherTableName] || [];
        const matchingIndices: number[] = [];

        otherTableRecords.forEach((record, index) => {
          if (record[fk.field] === recordValue) {
            matchingIndices.push(index);
          }
        });

        if (matchingIndices.length > 0) {
          references.push({
            table: otherTableName,
            field: fk.field,
            recordIndices: matchingIndices,
          });
        }
      }
    }
  }

  return references;
}

export function cascadeDelete(
  tableName: string,
  recordIndex: number,
  db: MiniDB,
  schema: MiniDBSchema
): MiniDB {
  // Create a deep copy to avoid mutating the original
  let updatedDb: MiniDB = {};
  for (const [key, value] of Object.entries(db)) {
    updatedDb[key] = [...value];
  }

  const tableNameLower = tableName.toLowerCase();
  const tableSchema = schema[tableNameLower];
  
  if (!tableSchema || !tableSchema.primaryKey) {
    // No primary key, just delete the record
    updatedDb[tableName] = updatedDb[tableName].filter((_, i) => i !== recordIndex);
    return updatedDb;
  }

  const recordToDelete = updatedDb[tableName][recordIndex];
  if (!recordToDelete) {
    return updatedDb; // Record already deleted
  }

  const pkValue = recordToDelete[tableSchema.primaryKey];

  // Find all referencing records
  const references = findReferencingRecords(
    tableName,
    pkValue,
    tableSchema.primaryKey,
    updatedDb,
    schema
  );

  // Delete referencing records recursively (in reverse order to avoid index issues)
  for (const ref of references) {
    // Sort indices in descending order to avoid index shifting issues
    const sortedIndices = [...ref.recordIndices].sort((a, b) => b - a);
    for (const idx of sortedIndices) {
      // Recursively cascade delete before removing from current table
      updatedDb = cascadeDelete(ref.table, idx, updatedDb, schema);
    }
  }

  // Finally delete the original record
  updatedDb[tableName] = updatedDb[tableName].filter((_, i) => i !== recordIndex);
  return updatedDb;
}

