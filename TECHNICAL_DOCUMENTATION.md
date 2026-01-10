# MiniDB - Comprehensive Technical Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Core Files & Functionality](#core-files--functionality)
4. [Data Structures](#data-structures)
5. [Query Engine Implementation](#query-engine-implementation)
6. [Database Operations](#database-operations)
7. [Component Architecture](#component-architecture)
8. [Discrete Mathematics Integration](#discrete-mathematics-integration)

---

## Project Overview

**MiniDB** is a client-side, file-based database management system built entirely in the browser using React and localStorage. It implements a relational database engine with SQL-like query capabilities, demonstrating real-world application of discrete mathematics concepts (sets, relations, operations) in database systems.

### Key Features
- **Relational Database Engine**: Full CRUD operations with schema validation
- **SQL-like Query Language**: SELECT, UNION, INTERSECT, DIFF operations
- **Foreign Key Relationships**: Referential integrity with cascade/restrict/set-null behaviors
- **Visual Relationship Mapping**: Interactive ER diagram using ReactFlow
- **Data Persistence**: Browser localStorage (no backend required)
- **Discrete Math Operations**: Column-based set theory operations (union, intersection, difference)

---

## System Architecture

### Technology Stack
- **Frontend Framework**: React 18.2.0
- **Build Tool**: Vite 5.0.0
- **Styling**: TailwindCSS 3.3.6
- **Visualization**: @xyflow/react 12.10.0 (for relationship diagrams)
- **Storage**: Browser localStorage API

### Architecture Pattern
- **MVC-like Structure**: 
  - **Model**: `database.js` (data layer)
  - **Controller**: `queryEngine.js` (business logic)
  - **View**: React components (presentation layer)

### Data Flow
```
User Input → React Component → App.jsx Handler → 
database.js / queryEngine.js → localStorage → 
State Update → React Re-render
```

---

## Core Files & Functionality

### 1. `src/database.js` - Database Engine Core

**Purpose**: Manages all database operations, schema definitions, and data persistence.

#### Key Functions:

**`loadDB()`** (Lines 11-34)
- **Functionality**: Loads database from localStorage
- **Storage Key**: `'MiniDB'`
- **Returns**: Database object with `{ meta: {}, tables: {} }` structure
- **Error Handling**: Returns empty database structure on parse errors
- **Implementation**: Uses `localStorage.getItem()` and `JSON.parse()`

**`saveDB(db)`** (Lines 36-43)
- **Functionality**: Persists database to localStorage
- **Error Handling**: Throws error if storage is full
- **Implementation**: `localStorage.setItem()` with JSON stringification

**`generateUUID()`** (Lines 3-9)
- **Functionality**: Generates RFC4122-compliant UUID v4
- **Algorithm**: Random hex generation with version/variant bits
- **Format**: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
- **Usage**: Primary key generation for all rows

**`createTable(name, schema)`** (Lines 55-80)
- **Functionality**: Creates new table with schema definition
- **Parameters**:
  - `name`: Table name (lowercased, no spaces allowed)
  - `schema`: `{ columns: {}, foreignKeys: {} }`
- **Schema Structure**:
  - Automatically adds `id` column (UUID, primary key)
  - Validates foreign key references
  - Creates empty `rows: {}` object
- **Validation**: 
  - Checks table doesn't exist
  - Validates foreign key column existence
  - Validates foreign key reference format
- **Naming Rules**:
  - Table names cannot contain spaces (enforced in frontend)
  - Table names are automatically lowercased

**`insertRow(tableName, data)`** (Lines 98-139)
- **Functionality**: Inserts new row with referential integrity checks
- **Process**:
  1. Generates UUID for primary key
  2. Fills missing columns with `null` or default values
  3. Auto-fills `createdAt` for date columns
  4. **Foreign Key Validation**: Checks referenced table and row exist
  5. Saves to database
- **Error Handling**: Throws on FK violations or missing tables

**`updateRow(tableName, id, changes)`** (Lines 141-187)
- **Functionality**: Updates existing row with validation
- **Validations**:
  - Row exists check
  - Column existence check
  - Foreign key integrity (if FK column updated)
  - Prevents ID modification
- **Process**: Updates specified fields, validates FKs, saves

**`deleteRow(tableName, id)`** (Lines 189-239)
- **Functionality**: Deletes row with cascade/restrict/set-null handling
- **Referential Integrity Actions**:
  - **restrict**: Throws error if row is referenced
  - **cascade**: Deletes all referencing rows recursively
  - **set-null**: Sets FK columns to null in referencing rows
- **Implementation**: Iterates through all tables checking foreign keys

**`getTableRows(tableName)`** (Lines 241-247)
- **Functionality**: Returns array of all rows in table
- **Returns**: `Object.values(table.rows)` - converts object to array

**`exportDatabase()`** (Lines 249-252)
- **Functionality**: Exports entire database as JSON string
- **Returns**: Pretty-printed JSON (2-space indent)

**`importDatabase(jsonString, overwrite)`** (Lines 254-277)
- **Functionality**: Imports database from JSON
- **Modes**:
  - `overwrite=true`: Replaces entire database
  - `overwrite=false`: Merges tables and metadata
- **Validation**: Checks for `meta` and `tables` structure

**`dropTable(tableName)`** (Lines 281-304)
- **Functionality**: Removes table from database with referential integrity checks
- **Process**:
  1. Validates table exists
  2. Checks all other tables for foreign key references to this table
  3. Throws error if table is referenced (restrict behavior)
  4. Deletes table if safe
  5. Saves database
- **Error Handling**: Throws error if table is referenced by foreign keys

**`dropColumn(tableName, columnName)`** (Lines 306-339)
- **Functionality**: Removes column from table with validation
- **Validations**:
  - Table exists check
  - Column exists check
  - Prevents dropping primary key (`id`)
  - Prevents dropping columns used as foreign keys
- **Process**:
  1. Validates table and column exist
  2. Checks if column is primary key or foreign key
  3. Removes column from schema
  4. Removes column from all existing rows
  5. Saves database

**`dropDatabase()`** (Lines 341-349)
- **Functionality**: Completely clears the database
- **Process**:
  1. Creates empty database structure with default meta
  2. Saves to localStorage
- **Use Case**: Complete database reset

**Sample Dataset**:
- **Location**: Pre-generated JSON file at `/public/minidb-sample-dataset.json`
- **Usage**: Downloaded directly from public folder when user clicks "Download Sample"
- **Implementation**: `handleDownloadSample()` in App.jsx fetches the file using `fetch()` API
- **Note**: No code generation needed - static file is read and exported

---

### 2. `src/queryEngine.js` - Query Parser & Executor

**Purpose**: Parses and executes SQL-like queries, implements discrete math set operations.

#### Query Types Supported:
1. **SELECT** - Projection and filtering
2. **UNION** - Column-based set union operation
3. **INTERSECT** - Column-based set intersection operation
4. **DIFF** - Column-based set difference operation
5. **DELETE** - Data deletion with WHERE clause support
6. **DROP** - Structure-level operations (table, column, database)
7. **SHOW TABLES** - Metadata query

#### Core Functions:

**`executeQuery(query)`** (Lines 393-440)
- **Entry Point**: Main query dispatcher
- **Process**:
  1. Trims and uppercases query
  2. Loads database
  3. Routes to appropriate executor based on query prefix
  4. Returns `{ data: [], type: 'table'|'set'|'tables' }`, `{ message: string, type: 'action' }`, or `{ error: string }`

**`executeSelect(query, db)`** (Lines 51-107)
- **Syntax**: `SELECT columns FROM table [WHERE condition]`
- **Features**:
  - Column projection (`*` or comma-separated list)
  - WHERE clause filtering
  - Column validation
- **WHERE Parsing**:
  - Uses `parseWhere()` to extract field, operator, value
  - Supports: `=`, `!=`, `>`, `<`, `>=`, `<=`
  - Basic comparison operators only (no pattern matching)
- **Value Parsing**: `parseValue()` handles numbers, booleans, strings
- **Returns**: `{ data: filteredRows, type: 'table' }`

**`executeUnion(query, db)`** (Lines 104-160)
- **Syntax**: `UNION tableA tableB ON columnName`
- **Discrete Math**: Implements set union (A ∪ B) on column values
- **Parsing**: Searches for `" ON "` (with spaces) to avoid matching "ON" inside "UNION"
- **Validation**:
  1. Validates both tables exist
  2. Validates specified column exists in both tables
- **Algorithm**:
  1. Extracts column values from table A (ignoring null/undefined)
  2. Extracts column values from table B (ignoring null/undefined)
  3. Combines into a Set to get distinct values
  4. Returns array of distinct values
- **Time Complexity**: O(n + m) where n, m are row counts
- **Space Complexity**: O(n + m) for Set storage
- **Returns**: `{ data: [values], type: 'set' }` - Array of column values, not full rows

**`executeIntersect(query, db)`** (Lines 162-227)
- **Syntax**: `INTERSECT tableA tableB ON columnName`
- **Discrete Math**: Implements set intersection (A ∩ B) on column values
- **Parsing**: Searches for `" ON "` (with spaces) to avoid matching "ON" inside words
- **Validation**:
  1. Validates both tables exist
  2. Validates specified column exists in both tables
- **Algorithm**:
  1. Extracts column values from table A into Set A (ignoring null/undefined)
  2. Extracts column values from table B into Set B (ignoring null/undefined)
  3. Finds values that exist in both sets
  4. Returns array of intersecting values
- **Time Complexity**: O(n + m)
- **Space Complexity**: O(n + m) for both sets
- **Returns**: `{ data: [values], type: 'set' }` - Array of column values, not full rows

**`executeDiff(query, db)`** (Lines 229-294)
- **Syntax**: `DIFF tableA tableB ON columnName`
- **Discrete Math**: Implements set difference (A - B) on column values
- **Parsing**: Searches for `" ON "` (with spaces) to avoid matching "ON" inside words
- **Validation**:
  1. Validates both tables exist
  2. Validates specified column exists in both tables
- **Algorithm**:
  1. Extracts column values from table A into Set A (ignoring null/undefined)
  2. Extracts column values from table B into Set B (ignoring null/undefined)
  3. Finds values in A that are not in B
  4. Returns array of difference values
- **Time Complexity**: O(n + m)
- **Space Complexity**: O(n + m) for both sets
- **Returns**: `{ data: [values], type: 'set' }` - Array of column values, not full rows

**`executeDelete(query, db)`** (Lines 296-343)
- **Syntax**: `DELETE FROM tableName [WHERE condition]`
- **Purpose**: Deletes rows from a table with optional WHERE clause filtering
- **Features**:
  - Deletes all rows if no WHERE clause provided
  - Filters rows using WHERE clause before deletion
  - Uses existing `deleteRow()` function to ensure FK constraints and onDelete rules are respected
- **Process**:
  1. Validates table exists
  2. Gets all rows from table
  3. If WHERE clause present, filters rows using `parseWhere()` and `evaluateCondition()`
  4. Deletes each matching row using `deleteRow()` from database.js
  5. Handles cascade deletes gracefully (skips rows already deleted)
- **Foreign Key Handling**:
  - Respects `restrict` behavior (throws error if row is referenced)
  - Respects `cascade` behavior (deletes referencing rows)
  - Respects `set-null` behavior (sets FK to null in referencing rows)
- **Returns**: `{ message: "X row(s) deleted", type: 'action' }` or `{ error: string }`

**`executeDrop(query, db)`** (Lines 345-391)
- **Syntax**: 
  - `DROP TABLE tableName`
  - `DROP COLUMN columnName FROM tableName`
  - `DROP DATABASE`
- **Purpose**: Structure-level destructive operations
- **DROP TABLE**:
  - Validates table exists
  - Checks if table is referenced by any foreign keys
  - Throws error if referenced (restrict behavior)
  - Removes table completely (schema + rows) if safe
  - Returns: `{ message: "Table \"name\" dropped successfully", type: 'action' }`
- **DROP COLUMN**:
  - Validates table and column exist
  - Prevents dropping primary key (`id`)
  - Prevents dropping columns used as foreign keys
  - Removes column from schema and all existing rows
  - Returns: `{ message: "Column \"name\" dropped from table \"name\" successfully", type: 'action' }`
- **DROP DATABASE**:
  - Completely clears database stored under MiniDB storage key
  - Reinitializes empty database with default meta structure
  - Returns: `{ message: "Database dropped successfully", type: 'action' }`
- **Returns**: Action message or `{ error: string }`

**Helper Functions**:

**`parseValue(str)`** (Lines 3-11)
- **Purpose**: Converts string to appropriate type
- **Logic**:
  - Numbers: `!isNaN(Number(str))`
  - Booleans: `'true'`/`'false'` strings
  - Strings: Removes surrounding quotes

**`evaluateCondition(record, field, operator, value)`** (Lines 13-30)
- **Purpose**: Evaluates WHERE clause conditions
- **Operators**: `=`, `!=`, `>`, `<`, `>=`, `<=`
- **Note**: Pattern matching (LIKE) is not supported

**`parseWhere(whereStr)`** (Lines 32-49)
- **Purpose**: Extracts WHERE clause components
- **Regex Patterns**: 
  - `/(\w+)\s*(>=|<=|!=)\s*(.+)/i` (multi-char operators)
  - `/(\w+)\s*(>|<|=)\s*(.+)/` (single-char operators)
- **Returns**: `{ field, operator, value }` or `null`

---

### 3. `src/App.jsx` - Application Controller

**Purpose**: Main application component managing state and orchestrating all operations.

#### State Management (Lines 31-59):
- `db`: Current database state
- `selectedTable`: Currently viewed table
- `query`, `result`: Query editor state
- Modal visibility states
- Form input states
- UI state (sidebar, menus)

#### Key Handler Functions:

**`refreshDb()`** (Lines 70-73)
- **Functionality**: Reloads database from localStorage
- **Usage**: Called after any mutation to sync UI

**`handleRunQuery()`** (Lines 75-85)
- **Functionality**: Executes query via `executeQuery()`
- **Process**: Validates input, executes, updates result state, refreshes DB

**`handleCreateTable()`** (Lines 126-200)
- **Functionality**: Creates table with validation
- **Process**:
  1. Validates table name (checks for spaces)
  2. Processes columns from modal or initial columns
  3. Creates foreign keys from `tablesToLink`
  4. Validates at least one column exists
  5. Calls `createTable()` from database.js
  6. Updates UI state
- **Validation**:
  - Table name cannot contain spaces
  - Table name is trimmed and lowercased
  - Column names cannot contain spaces (enforced in modal)

**`handleDeleteTable()`** (Lines 163-178)
- **Functionality**: Deletes table and updates selection
- **Process**: Confirms, deletes from DB object, saves, refreshes

**`handleAddColumn()`** (Lines 220-223)
- **Functionality**: Opens add column modal
- **Process**: Sets table context and shows modal

**`handleConfirmAddColumn()`** (Lines 225-303)
- **Functionality**: Adds column to existing table with validation
- **Process**:
  1. Validates column name (checks for spaces if not FK)
  2. Handles foreign key column creation
  3. Updates schema
  4. Adds column to all existing rows (null values)
  5. Saves and refreshes
- **Validation**:
  - Column name cannot contain spaces (enforced in frontend)
  - Column name cannot be "id" (reserved for primary key)
  - Column name is trimmed and lowercased

**`handleCreateRelation()`** (Lines 305-350)
- **Functionality**: Creates foreign key relationship
- **Process**:
  1. Validates both tables selected
  2. Validates column name (checks for spaces if manually entered)
  3. Creates FK column if doesn't exist
  4. Adds FK constraint to schema
  5. Initializes FK values in existing rows
  6. Saves with onDelete action
- **Validation**:
  - Column name cannot contain spaces (enforced in frontend)
  - Auto-generates column name as `{tableName}_id` if not provided

**`handleDeleteRow()`** (Lines 334-343)
- **Functionality**: Deletes row via `deleteRow()` from database.js
- **Cascade Handling**: Handled in database.js deleteRow function

**`handleCellSave()`** (Lines 355-377)
- **Functionality**: Updates cell value on inline edit
- **Process**:
  1. Parses value (number if numeric, string otherwise)
  2. Handles foreign key values specially
  3. Calls `updateRow()` from database.js
  4. Refreshes UI

**`getForeignKeyDisplay()`** (Lines 402-436)
- **Functionality**: Formats FK values for display
- **Logic**: Looks up referenced row, displays meaningful name
- **Special Cases**: Handles `users` table specially (name formatting)

**`getAllRelations()`** (Lines 438-456)
- **Functionality**: Extracts all foreign key relationships
- **Returns**: Array of `{ fromTable, fromColumn, toTable, onDelete }`
- **Usage**: For relationship diagram and modal

**`handleDownloadSample()`** (Lines 510-533)
- **Functionality**: Downloads pre-generated sample database JSON file
- **Process**: 
  1. Fetches `/minidb-sample-dataset.json` from public folder using `fetch()` API
  2. Creates blob from response text
  3. Triggers browser download
- **Note**: No code generation - reads static file from public directory

**`handleImport()`** (Lines 485-509)
- **Functionality**: Imports database from JSON file
- **Process**: Reads file, parses JSON, calls `importDatabase()`

**Suggested Queries** (Lines 600-609):
- One canonical example per supported command type
- Includes: SELECT, UNION, INTERSECT, DIFF, DELETE, DROP TABLE, DROP DATABASE, SHOW TABLES
- Demonstrates discrete math operations and data manipulation
- Used in QueryEditor component sidebar and modal
- Examples:
  - `SELECT * FROM users`
  - `UNION customers admins ON userId`
  - `INTERSECT cart_items order_items ON productId`
  - `DIFF cart_items order_items ON productId`
  - `DELETE FROM users WHERE email = "john.doe@email.com"`
  - `DROP TABLE payments`
  - `DROP DATABASE`
  - `SHOW TABLES`

---

## Data Structures

### Database Schema Structure

```javascript
{
  meta: {
    version: string,
    createdAt: ISO8601 string,
    description?: string
  },
  tables: {
    [tableName: string]: {
      name: string,
      schema: {
        columns: {
          [columnName: string]: {
            type: 'string' | 'number' | 'uuid' | 'date',
            primary?: boolean
          }
        },
        foreignKeys: {
          [fkColumnName: string]: {
            references: 'tableName.columnName',
            onDelete: 'restrict' | 'cascade' | 'set-null'
          }
        }
      },
      rows: {
        [rowId: UUID]: {
          id: UUID,
          [columnName: string]: any
        }
      }
    }
  }
}
```

### Table Structure
- **Primary Key**: Always `id` (UUID v4)
- **Columns**: Defined in `schema.columns`
- **Foreign Keys**: Defined in `schema.foreignKeys`
- **Rows**: Object with UUID keys (not array for O(1) lookup)

### Naming Conventions

**Table Names**:
- Cannot contain spaces (enforced in frontend)
- Automatically lowercased
- Must be unique within database
- Examples: `users`, `products`, `cart_items`

**Column Names**:
- Cannot contain spaces (enforced in frontend)
- Automatically lowercased
- Cannot be `id` (reserved for primary key)
- Must be unique within table
- Examples: `email`, `productId`, `createdAt`

**Foreign Key Column Naming**:
- Auto-generated as `{referencedTable}_id` if not specified
- Can be manually specified (must follow column naming rules)
- Examples: `userId`, `productId`, `customerId`

**Validation**:
- Frontend input fields automatically filter out spaces in real-time
- Handler functions validate and show error messages if spaces detected
- Helper text guides users: "Spaces are not allowed in table/column names"

### Row Structure
```javascript
{
  id: "uuid-v4-string",
  column1: value1,
  column2: value2,
  // ... other columns
  foreignKeyColumn: "referenced-row-uuid" | null
}
```

---

## Query Engine Implementation

### Query Parsing Strategy

**Pattern Matching Approach**:
- Uses regex patterns for parsing
- Case-insensitive matching (uppercased for keywords)
- Whitespace-tolerant

**Query Routing**:
```javascript
if (upper.startsWith('SELECT')) → executeSelect()
if (upper.startsWith('UNION')) → executeUnion()
if (upper.startsWith('INTERSECT')) → executeIntersect()
if (upper.startsWith('DIFF')) → executeDiff()
if (upper.startsWith('DELETE')) → executeDelete()
if (upper.startsWith('DROP')) → executeDrop()
if (upper === 'SHOW TABLES') → metadata query
```

### Set Operations Implementation Details

Set operations are **column-based**, operating on values from a specific column rather than entire rows. This provides a simpler, more consistent approach aligned with the localStorage database model.

#### UNION (A ∪ B)
**Mathematical Definition**: All distinct values in A or B (or both)
**Syntax**: `UNION tableA tableB ON columnName`
**Implementation**:
```javascript
const values = new Set();
// Extract column values from tableA, ignoring null/undefined
for (const record of rowsA) {
  const value = record[columnName];
  if (value !== null && value !== undefined) {
    values.add(value);
  }
}
// Extract column values from tableB, ignoring null/undefined
for (const record of rowsB) {
  const value = record[columnName];
  if (value !== null && value !== undefined) {
    values.add(value);
  }
}
return Array.from(values); // Returns array of distinct values
```
**Key Features**:
- Validates column exists in both tables
- Ignores null and undefined values
- Returns array of distinct column values (not full rows)
- Result type: `{ data: [values], type: 'set' }`

#### INTERSECT (A ∩ B)
**Mathematical Definition**: Values that exist in both A and B
**Syntax**: `INTERSECT tableA tableB ON columnName`
**Implementation**:
```javascript
const valuesA = new Set();
const valuesB = new Set();
// Extract column values from tableA, ignoring null/undefined
for (const record of rowsA) {
  const value = record[columnName];
  if (value !== null && value !== undefined) {
    valuesA.add(value);
  }
}
// Extract column values from tableB, ignoring null/undefined
for (const record of rowsB) {
  const value = record[columnName];
  if (value !== null && value !== undefined) {
    valuesB.add(value);
  }
}
// Find intersection: values that exist in both sets
const intersection = [];
for (const value of valuesA) {
  if (valuesB.has(value)) {
    intersection.push(value);
  }
}
return intersection; // Returns array of intersecting values
```
**Key Features**:
- Validates column exists in both tables
- Ignores null and undefined values
- Returns array of intersecting column values (not full rows)
- Result type: `{ data: [values], type: 'set' }`

#### DIFF (A - B)
**Mathematical Definition**: Values in A but not in B
**Syntax**: `DIFF tableA tableB ON columnName`
**Implementation**:
```javascript
const valuesA = new Set();
const valuesB = new Set();
// Extract column values from tableA, ignoring null/undefined
for (const record of rowsA) {
  const value = record[columnName];
  if (value !== null && value !== undefined) {
    valuesA.add(value);
  }
}
// Extract column values from tableB, ignoring null/undefined
for (const record of rowsB) {
  const value = record[columnName];
  if (value !== null && value !== undefined) {
    valuesB.add(value);
  }
}
// Find difference: values in A but not in B
const diff = [];
for (const value of valuesA) {
  if (!valuesB.has(value)) {
    diff.push(value);
  }
}
return diff; // Returns array of difference values
```
**Key Features**:
- Validates column exists in both tables
- Ignores null and undefined values
- Returns array of difference column values (not full rows)
- Result type: `{ data: [values], type: 'set' }`

**Column-Based Design Benefits**:
- Simpler implementation aligned with localStorage model
- More intuitive for users (operate on specific columns)
- Consistent result format (arrays of values)
- Better performance (no full row comparison needed)

---

## Database Operations

### CRUD Operations

**Create**:
- `createTable()`: Creates table schema
- `insertRow()`: Adds row with FK validation

**Read**:
- `getTable()`: Gets table schema
- `getTableRows()`: Gets all rows as array
- `getAllTables()`: Gets all tables

**Update**:
- `updateRow()`: Updates row with validation
- Schema updates: Direct object manipulation + save

**Delete**:
- `deleteRow()`: Deletes row with referential integrity (used by DELETE query)
- `DELETE FROM tableName [WHERE condition]`: Query-level deletion
- `dropTable()`: Removes entire table (structure + data)
- `dropColumn()`: Removes column from table
- `dropDatabase()`: Clears entire database

**Structure Operations**:
- `DROP TABLE tableName`: Removes table if not referenced
- `DROP COLUMN columnName FROM tableName`: Removes column if not PK/FK
- `DROP DATABASE`: Clears entire database

### Foreign Key Behaviors

**restrict** (Default):
- Prevents deletion if row is referenced
- Throws error on violation

**cascade**:
- Deletes all referencing rows recursively
- Implementation: Finds all references, deletes them

**set-null**:
- Sets FK column to null in referencing rows
- Used for optional relationships

### Referential Integrity Checks

**On Insert/Update**:
1. Check referenced table exists
2. Check referenced row exists (by UUID)
3. Throw error if violation

**On Delete**:
1. Find all tables with FK pointing to deleted row
2. Apply onDelete action (restrict/cascade/set-null)
3. Recursively handle cascades

---

## Component Architecture

### 1. `RelationsDiagram.jsx` - ER Diagram Visualization

**Purpose**: Visual representation of database schema and relationships

**Business Logic** (Lines 62-162):
- **Node Generation**: Creates ReactFlow nodes for each table
- **Layout Algorithm**: Circular arrangement
  - Center: (600, 500)
  - Radius: `Math.max(280, tableNames.length * 70)`
  - Angle: `(2π / tableCount) * index - π/2` (starts at top)
- **Edge Generation**: Creates edges from foreign keys
  - Source: Table with FK
  - Target: Referenced table
  - Label: FK column name
- **Column Classification**:
  - Primary: `colName === 'id'`
  - Foreign Key: `colName in table.schema.foreignKeys`
  - Regular: Everything else

**Visual Features**:
- Color-coded columns (green=PK, purple=FK, gray=regular)
- Interactive nodes (click to select table)
- Animated edges
- Zoom/pan controls

### 2. `QueryEditor.jsx` - Query Input Interface

**Purpose**: SQL query input and execution

**Functionality**:
- Textarea for query input
- Run button (calls `handleRunQuery` from App.jsx)
- Suggested queries sidebar
- Keyboard shortcut: Ctrl+Enter to run
- Clear button

**No Business Logic**: Pure presentation component

### 3. `QueryResults.jsx` - Results Display

**Purpose**: Displays query execution results

**Handles Result Types**:
- `type: 'table'` - Regular table data (SELECT queries)
- `type: 'set'` - Set operation results (UNION, INTERSECT, DIFF)
- `type: 'tables'` - Metadata (SHOW TABLES)
- `type: 'action'` - Action results (DELETE, DROP operations)
- `error` - Error messages

**Action Results Display**:
- Shows success message in green banner for DELETE/DROP operations
- Format: `{ message: "X row(s) deleted", type: 'action' }`
- No export options for action results (informational only)

### 4. `TableView.jsx` - Table Data Grid

**Purpose**: Displays and edits table rows

**Functionality**:
- Displays rows in table format
- Inline cell editing (double-click)
- Foreign key value resolution (shows referenced row name)
- Row deletion
- Column management UI

**Business Logic**:
- Calls `getForeignKeyDisplay()` from App.jsx for FK formatting
- Handles cell edit state
- Triggers save/cancel on edit

### 5. Modal Components

**`CreateTableModal.jsx`**:
- Collects table name (spaces automatically removed)
- Column definition (name, type)
- Foreign key relationships
- Calls `handleCreateTable()` from App.jsx
- **Validation**:
  - Table name input filters out spaces in real-time
  - Column name input filters out spaces in real-time
  - Shows error if spaces detected in column names
  - Helper text: "Spaces are not allowed in table/column names"

**`AddRowModal.jsx`**:
- Form for new row data
- Foreign key dropdowns (shows referenced row names)
- Calls `handleAddRow()` from App.jsx

**`AddColumnModal.jsx`**:
- Column name and type (spaces automatically removed)
- Foreign key option
- Calls `handleConfirmAddColumn()` from App.jsx
- **Validation**:
  - Column name input filters out spaces in real-time
  - Helper text: "Spaces are not allowed in column names"

**`CreateRelationModal.jsx`**:
- Select source and target tables
- FK column name (spaces automatically removed, auto-generated if empty)
- onDelete action selection
- Calls `handleCreateRelation()` from App.jsx
- **Validation**:
  - Column name input filters out spaces in real-time
  - Helper text: "Spaces are not allowed in column names"

**`SuggestedQueriesModal.jsx`**:
- Displays all suggested queries
- Click to populate query editor
- Organized by operation type

---

## Discrete Mathematics Integration

### Set Theory Concepts

**1. Sets as Column Values**:
- Set operations work on values from a specific column
- Each table column represents a multiset of values
- Operations extract distinct values from specified columns
- Null and undefined values are ignored

**2. Union Operation (A ∪ B)**:
- **Mathematical**: All distinct values in A or B (or both)
- **Implementation**: `executeUnion()` in queryEngine.js
- **Syntax**: `UNION tableA tableB ON columnName`
- **Use Case**: Combining distinct values from a column across tables
- **Example**: `UNION customers admins ON userId` - all distinct user IDs
- **Returns**: Array of distinct column values

**3. Intersection Operation (A ∩ B)**:
- **Mathematical**: Values that exist in both A and B
- **Implementation**: `executeIntersect()` in queryEngine.js
- **Syntax**: `INTERSECT tableA tableB ON columnName`
- **Use Case**: Finding common values in a column
- **Example**: `INTERSECT cart_items order_items ON productId` - product IDs in both
- **Returns**: Array of intersecting column values

**4. Set Difference (A - B)**:
- **Mathematical**: Values in A but not in B
- **Implementation**: `executeDiff()` in queryEngine.js
- **Syntax**: `DIFF tableA tableB ON columnName`
- **Use Case**: Finding unique values in one table's column
- **Example**: `DIFF cart_items order_items ON productId` - product IDs only in cart
- **Returns**: Array of difference column values

### Relations as Foreign Keys

**Mathematical Relation**:
- Foreign key represents a relation R ⊆ A × B
- `table1.fkColumn → table2.id` is a relation
- Supports one-to-many relationships

**Referential Integrity**:
- Enforces relation constraints
- Ensures FK values exist in referenced table
- Implements relation properties (reflexive, transitive via cascades)

### Graph Theory in Relations Diagram

**Nodes**: Tables
**Edges**: Foreign key relationships
**Graph Type**: Directed graph (FK points from source to target)
**Visualization**: Uses ReactFlow library for graph rendering

---

## Technical Implementation Details

### UUID Generation Algorithm

```javascript
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
```

**RFC4122 Compliance**:
- Version 4 (random)
- Variant bits: `0x8` (10xx pattern)
- Format: 8-4-4-4-12 hex digits

### Column Value Comparison Strategy

**Method**: Direct value comparison using JavaScript Set
**Why**: 
- Simple and efficient for column-based operations
- Native Set handles value equality (uses SameValueZero algorithm)
- Works with primitives (strings, numbers, booleans)
- Null and undefined values are filtered out before comparison

**Implementation**: 
- Extracts column values from rows
- Filters out null/undefined
- Uses Set for O(1) lookup and automatic deduplication
- Returns array of distinct values

**Limitation**: 
- Only works on single column values (not full rows)
- Complex objects compared by reference (not deep equality)

### Storage Limitations

**localStorage Constraints**:
- ~5-10MB per domain (browser-dependent)
- String-only storage (JSON serialization)
- Synchronous API (blocks main thread)

**Optimization Opportunities**:
- IndexedDB for larger datasets
- Compression for JSON
- Pagination for large tables

### Query Performance

**Time Complexities**:
- SELECT: O(n) where n = rows
- UNION/INTERSECT/DIFF: O(n + m) with Set lookup, where n, m = row counts
- DELETE: O(n) where n = rows to delete (plus FK constraint checks)
- DROP TABLE: O(t) where t = number of tables (FK reference check)
- DROP COLUMN: O(n) where n = rows in table
- WHERE filtering: O(n)

**Optimization Notes**:
- No indexes (full table scans)
- Set operations use hash sets (Set) for O(1) value lookup
- Column-based operations are more efficient than row-based (no full record comparison)
- Null/undefined filtering happens during extraction (single pass)
- DELETE operations respect FK constraints and cascade rules
- DROP operations perform referential integrity checks before deletion

---

## File Summary

| File | Purpose | Key Functions | Lines |
|------|---------|--------------|-------|
| `database.js` | Core DB engine | loadDB, saveDB, createTable, insertRow, updateRow, deleteRow, dropTable, dropColumn, dropDatabase, exportDatabase, importDatabase | 349 |
| `queryEngine.js` | Query parser/executor | executeQuery, executeSelect, executeUnion, executeIntersect, executeDiff, executeDelete, executeDrop | 441 |
| `App.jsx` | Main controller | State management, event handlers, UI orchestration | 803 |
| `RelationsDiagram.jsx` | ER diagram | Node/edge generation, layout algorithm | 226 |
| `QueryEditor.jsx` | Query input UI | Query textarea, suggested queries | 92 |
| `TableView.jsx` | Table grid | Row display, inline editing | ~300 |
| Modal components | Forms | Data collection, validation | ~100-200 each |

---

## Key Algorithms

### 1. Foreign Key Cascade Delete
```javascript
// Pseudocode
function deleteRow(tableName, id) {
  for each table in database:
    for each FK in table:
      if FK references tableName:
        for each row in table:
          if row[FK] === id:
            switch (FK.onDelete):
              case 'restrict': throw error
              case 'cascade': deleteRow(table, row.id)
              case 'set-null': row[FK] = null
  delete row from tableName
}
```

### 2. Column-Based Set Union
```javascript
// Extract distinct column values from both tables
const values = new Set();
for each row in tableA:
  value = row[columnName]
  if value !== null && value !== undefined:
    values.add(value)
for each row in tableB:
  value = row[columnName]
  if value !== null && value !== undefined:
    values.add(value)
return Array.from(values) // Distinct values
```

### 3. Column-Based Set Intersection
```javascript
// Find common column values
valuesA = new Set()
valuesB = new Set()
for each row in tableA:
  value = row[columnName]
  if value !== null && value !== undefined:
    valuesA.add(value)
for each row in tableB:
  value = row[columnName]
  if value !== null && value !== undefined:
    valuesB.add(value)
intersection = []
for each value in valuesA:
  if value in valuesB:
    intersection.push(value)
return intersection
```

### 4. Column-Based Set Difference
```javascript
// Find values in A but not in B
valuesA = new Set()
valuesB = new Set()
// Extract values (same as intersection)
diff = []
for each value in valuesA:
  if value not in valuesB:
    diff.push(value)
return diff
```

### 5. DELETE Operation
```javascript
// Pseudocode
function executeDelete(query, db) {
  tableName = parseTableName(query)
  rowsToDelete = getTableRows(tableName)
  
  if WHERE clause exists:
    condition = parseWhere(whereClause)
    rowsToDelete = filter rows matching condition
  
  deletedCount = 0
  for each row in rowsToDelete:
    try:
      deleteRow(tableName, row.id) // Respects FK constraints
      deletedCount++
    catch error if row already deleted (cascade):
      continue
    catch error if FK restrict:
      return error
  
  return { message: "X row(s) deleted", type: "action" }
}
```

### 6. DROP TABLE Operation
```javascript
// Pseudocode
function dropTable(tableName) {
  // Check if any table references this table via FK
  for each table in database:
    for each FK in table:
      if FK references tableName:
        throw error "Cannot drop: referenced by table.column"
  
  delete database.tables[tableName]
  saveDatabase()
}
```

### 7. DROP COLUMN Operation
```javascript
// Pseudocode
function dropColumn(tableName, columnName) {
  if columnName === 'id':
    throw error "Cannot drop primary key"
  
  if columnName in table.foreignKeys:
    throw error "Cannot drop: used as foreign key"
  
  delete table.schema.columns[columnName]
  for each row in table.rows:
    delete row[columnName]
  
  saveDatabase()
}
```

---

## Error Handling

**Database Errors**:
- Table not found
- Column not found
- Foreign key violation
- Storage full

**Query Errors**:
- Invalid syntax
- Table doesn't exist
- Column doesn't exist (in SELECT or set operations)
- Invalid WHERE clause
- Set operation syntax errors (missing ON clause, invalid column)
- DELETE errors: FK constraint violations (restrict behavior)
- DROP TABLE errors: Table referenced by foreign keys
- DROP COLUMN errors: Cannot drop primary key or foreign key columns

**Validation Errors**:
- Table names cannot contain spaces
- Column names cannot contain spaces
- Column name "id" is reserved for primary key
- Duplicate table/column names

**Error Propagation**:
- Database functions throw errors
- Query engine catches and returns `{ error: string }`
- UI displays errors in QueryResults component

---

## Testing Considerations

**Unit Test Targets**:
- `executeUnion()` - Set union correctness
- `executeIntersect()` - Set intersection correctness
- `executeDiff()` - Set difference correctness
- `insertRow()` - FK validation
- `deleteRow()` - Cascade behavior

**Integration Test Targets**:
- Full CRUD workflow
- Query execution pipeline
- Foreign key integrity
- Data persistence

---

## Future Enhancement Opportunities

1. **Indexes**: B-tree or hash indexes for faster queries
2. **Transactions**: ACID properties with rollback
3. **Query Optimization**: Query planner, cost-based optimization
4. **Aggregations**: GROUP BY, COUNT, SUM, AVG
5. **Subqueries**: Nested SELECT statements
6. **IndexedDB**: Larger storage capacity
7. **Query History**: Save and replay queries
8. **Export Formats**: CSV, SQL dump

---

## Conclusion

MiniDB demonstrates a complete relational database system implemented entirely in the browser, showcasing:
- **Discrete Mathematics**: Column-based set operations (union, intersection, difference)
- **Database Theory**: Relational model, foreign keys, referential integrity
- **Data Manipulation**: Full CRUD operations with DELETE and DROP support
- **Algorithm Implementation**: Hash-based column value set operations, referential integrity checks
- **Input Validation**: Real-time space filtering and validation for table/column names
- **Software Engineering**: Clean architecture, separation of concerns
- **Real-world Application**: E-commerce database schema with complex relationships

The system successfully bridges theoretical computer science concepts with practical database implementation. The simplified, column-based set operations provide a cleaner, more consistent query engine aligned with the localStorage database model. With support for DELETE and DROP operations, the system offers complete data and structure management capabilities. Strict naming conventions (no spaces in table/column names) ensure consistency and prevent parsing issues, making it an excellent educational tool and proof-of-concept for client-side database systems.
