export interface MiniDB {
  [fileName: string]: Record<string, any>[];
}

export interface QueryResult {
  data?: any[];
  error?: string;
  type?: 'table' | 'set' | 'files';
}

export type ViewMode = 'dataset' | 'query' | 'relationships';

export interface TableField {
  name: string;
  type: 'string' | 'number' | 'boolean';
}

export interface ForeignKey {
  field: string;
  references: {
    table: string;
    field: string;
  };
}

export interface TableSchema {
  fields: TableField[];
  primaryKey?: string;
  foreignKeys?: ForeignKey[];
}

export interface MiniDBSchema {
  [tableName: string]: TableSchema;
}

