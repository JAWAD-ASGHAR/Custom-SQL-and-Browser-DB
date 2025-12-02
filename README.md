# MiniDB - File-Based Database System

A React application that implements a file-based mini database system inside the browser using localStorage. This project demonstrates sets, relations, and custom query parsing.

## Features

- **File Management**: Create, rename, and delete database files (tables)
- **Schema Definition**: Define table schemas with fields, primary keys, and foreign keys
- **Record CRUD**: Create, read, update, and delete records through UI
- **Query Engine**: Execute SQL-like queries including:
  - **SELECT** with field projection, WHERE filtering, ORDERBY sorting, and LIMIT
  - **INSERT** to add new records
  - **UPDATE** to modify existing records
  - **DELETE** to remove records
  - **JOIN** to combine data from multiple tables
  - **UNION**, **INTERSECT**, and **DIFF** for set operations
  - **SHOW FILES** to list all tables
- **Data Persistence**: All data stored in browser localStorage
- **Schema Validation**: Inline validation for table creation with error messages
- **Relationship Mapping**: Visual representation of table relationships
- **Query History**: Track and reuse previous queries
- **Real-time Updates**: Database mutations automatically persist to localStorage

## Tech Stack

- React 18.2.0 with TypeScript
- TailwindCSS 3.3.6 for styling
- Vite 5.0.0 for build tooling
- localStorage for data persistence (no backend, no IndexedDB)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to the URL shown (typically `http://localhost:5173`)

## Data Structure

The database is stored in localStorage with the following structure:

```typescript
interface MiniDB {
  [fileName: string]: Record<string, any>[];
}
```

**Storage Key**: `minidb_database`

**Example stored data**:
```json
{
  "students": [
    { "id": 1, "name": "Ali", "age": 20, "major": "Computer Science", "gpa": 3.8 },
    { "id": 2, "name": "Jawad", "age": 21, "major": "Mathematics", "gpa": 3.9 }
  ],
  "courses": []
}
```

## Application Layout

### Sidebar (Left Panel)

**Header Section**:
- Title: "MiniDB"
- Subtitle: "File-Based Database"
- Fixed at top, dark gray background (bg-gray-800)

**Create File Button**:
- Blue button labeled "+ Create New File"
- Opens a modal dialog for file creation
- File names are automatically converted to lowercase

**Files List**:
- Displays all files (datasets) in the database
- Shows file count in header: "Files (N)"
- Each file item displays:
  - File name
  - Record count in parentheses: "(N)"
- Selected file is highlighted in blue (bg-blue-600)
- Hover effects reveal action buttons (rename ✏️, delete 🗑️)
- Empty state message: "No files yet. Create one to get started!"

**File Actions**:
- **Rename**: Click ✏️ icon to enter rename mode
  - Inline text input appears
  - Press Enter to save, Escape to cancel
  - ✓ button to confirm, ✕ button to cancel
  - File names are converted to lowercase
  - Shows alert if new name already exists
- **Delete**: Click 🗑️ icon
  - Confirmation dialog: "Delete file "[fileName]"?"
  - If deleted file was selected, auto-selects first remaining file
  - If no files remain, selection becomes null

### Main Content Area (Right Panel)

**Tab Navigation**:
- Three tabs: "Dataset View", "Query Console", and "Relationship Map"
- Active tab highlighted in blue with bottom border
- Clicking a file in sidebar automatically switches to Dataset View

**Dataset View Tab**:

*Header Section*:
- Displays selected file name as title
- Shows record count: "N record(s)"
- "+ Add Record" button (blue, top-right)

*Table View*:
- Displays all records in a table
- Columns are dynamically generated from the first record's keys
- Each row shows all field values
- Last column is "Actions" with Edit and Delete buttons
- Empty state: "No records in this file" with message to add first record
- Table has hover effects (hover:bg-gray-50)

*Add Record Modal*:
- Triggered by "+ Add Record" button
- Modal overlay with white form
- Input fields generated from existing record structure
- If no records exist, shows alert: "Cannot add record: No fields detected. Add at least one record manually or use a file with existing structure."
- Input fields auto-parse numbers (if value is numeric, stores as number)
- Cancel button closes modal and clears form
- Add Record button saves and closes modal
- Automatically saves to localStorage

*Edit Record Modal*:
- Triggered by "Edit" button on any row
- Modal overlay with white form
- Pre-filled with current record values
- Input fields auto-parse numbers
- Cancel button discards changes
- Save Changes button updates record and saves to localStorage

*Delete Record*:
- Triggered by "Delete" button on any row
- Confirmation dialog: "Delete this record?"
- Automatically saves to localStorage after deletion

**Query Console Tab**:

*Header Section*:
- Title: "Query Console"
- Subtitle: "Enter queries to interact with your database. Press Ctrl/Cmd + Enter to run."

*Left Panel - Query Input*:
- Textarea for query input (font-mono, 40px height)
- Placeholder shows example queries
- "Run Query" button (blue)
- "Clear" button (gray) - clears query and results
- Keyboard shortcut: Ctrl/Cmd + Enter to run query
- Query History section (appears when history exists):
  - Shows up to 10 most recent unique queries
  - Clickable items to re-insert query
  - Scrollable list (max-height: 32px)
- Query Examples panel (blue background):
  - Shows example queries including:
    - SELECT with projection, WHERE, ORDERBY, LIMIT
    - INSERT, UPDATE, DELETE operations
    - JOIN operations
    - Set operations (UNION, INTERSECT, DIFF)
    - SHOW FILES
  - Styled in monospace font

*Right Panel - Results*:
- White panel with "Results" header
- Scrollable content area
- Displays query execution results

## Query Engine

### Supported Operations

#### 1. SELECT

**Syntax**: `SELECT [field1, field2, ...] FROM <file> [WHERE <field> <operator> <value>] [ORDERBY <field> [DESC|ASC]] [LIMIT <n>]`

**Description**: Retrieves records from a file with optional field projection, filtering, sorting, and limiting.

**Field Projection**:
- `SELECT * FROM <file>` or `SELECT FROM <file>` - Returns all fields
- `SELECT name, age FROM <file>` - Returns only specified fields
- Field names are case-sensitive

**Examples**:
- `SELECT FROM students` - Returns all fields from all students
- `SELECT name, age FROM students` - Returns only name and age fields
- `SELECT FROM students WHERE age > 20` - Filters students by age
- `SELECT name, age FROM students WHERE age > 20 ORDERBY age DESC LIMIT 10` - Combined query

**WHERE Clause**:
- Optional filtering condition
- Format: `WHERE <field> <operator> <value>`
- Supported operators: `=`, `!=`, `>`, `<`, `>=`, `<=`
- Value parsing:
  - Numbers are parsed as numbers
  - "true"/"false" (case-insensitive) are parsed as booleans
  - Strings can be quoted or unquoted (quotes are stripped)
  - Comparison operators (`>`, `<`, `>=`, `<=`) convert both sides to numbers

**ORDERBY Clause**:
- Optional sorting (replaces legacy SORTBY, which is still supported)
- Format: `ORDERBY <field> [DESC|ASC]`
- Defaults to ASC (ascending) if not specified
- DESC sorts in descending order
- ASC sorts in ascending order
- Can be combined with WHERE and LIMIT clauses
- Example: `ORDERBY age DESC` or `ORDERBY name ASC`

**LIMIT Clause**:
- Optional result limiting
- Format: `LIMIT <number>`
- Restricts the number of results returned
- Must be a non-negative integer
- Can be combined with WHERE and ORDERBY clauses
- Example: `LIMIT 10` returns only the first 10 results

**Error Cases**:
- Missing file name: "Invalid query: Missing file name after FROM"
- File doesn't exist: "File "[fileName]" does not exist"
- Invalid WHERE syntax: "Invalid WHERE clause syntax"
- Invalid LIMIT value: "Invalid LIMIT value"

#### 2. UNION

**Syntax**: `UNION <fileA> <fileB>`

**Description**: Returns all unique records from both files (set union operation).

**Behavior**:
- Records are compared for equality by comparing all key-value pairs
- Duplicate records (within same file or across files) are removed
- Case-insensitive file names (converted to lowercase)

**Examples**:
- `UNION students teachers`
- `UNION courses students`

**Error Cases**:
- Missing file names: "Invalid query: UNION requires two file names"
- File doesn't exist: "One or both files do not exist: [fileA], [fileB]"

#### 3. INTERSECT

**Syntax**: `INTERSECT <fileA> <fileB>`

**Description**: Returns records that exist in both files (set intersection operation).

**Behavior**:
- Records are compared for equality by comparing all key-value pairs
- Only records present in both files are returned
- Duplicates are removed from result

**Examples**:
- `INTERSECT students alumni`
- `INTERSECT courses teachers`

**Error Cases**:
- Missing file names: "Invalid query: INTERSECT requires two file names"
- File doesn't exist: "One or both files do not exist: [fileA], [fileB]"

#### 4. DIFFERENCE (DIFF)

**Syntax**: `DIFF <fileA> <fileB>` or `DIFFERENCE <fileA> <fileB>`

**Description**: Returns records in fileA that are not in fileB (set difference operation).

**Behavior**:
- Records are compared for equality by comparing all key-value pairs
- Returns records from fileA that don't exist in fileB
- Duplicates are removed from result

**Examples**:
- `DIFF students teachers`
- `DIFFERENCE A B`

**Error Cases**:
- Missing file names: "Invalid query: DIFF requires two file names"
- File doesn't exist: "One or both files do not exist: [fileA], [fileB]"

#### 5. JOIN

**Syntax**: `JOIN <tableA> <tableB> ON <tableA.fieldA> = <tableB.fieldB>`

**Description**: Performs an inner join between two tables based on matching field values.

**Behavior**:
- Performs Cartesian product of both tables
- Filters pairs where `fieldA == fieldB`
- Merges the two objects into one combined record
- Field names are prefixed with table name to avoid conflicts (e.g., `students.id`, `enrollments.studentId`)
- Returns only records where the join condition is satisfied (inner join)

**Examples**:
- `JOIN students enrollments ON students.id = enrollments.studentId`
- `JOIN courses teachers ON courses.instructor = teachers.name`

**Error Cases**:
- Missing ON clause: "Invalid query: JOIN requires ON clause"
- Missing table names: "Invalid query: JOIN requires two table names"
- Table doesn't exist: "One or both tables do not exist: [tableA], [tableB]"
- Invalid ON syntax: "Invalid ON clause syntax. Expected: tableA.fieldA = tableB.fieldB"
- Table name mismatch: "Table names in ON clause must match table names in JOIN"

#### 6. INSERT

**Syntax**: `INSERT INTO <table> { "field1": value1, "field2": value2, ... }`

**Description**: Inserts a new record into the specified table.

**Behavior**:
- Parses JSON object from the query
- Adds the record to the table
- Automatically updates the database and persists to localStorage
- Returns the inserted record and affected row count (1)

**Examples**:
- `INSERT INTO students { "id": 4, "name": "Zara", "age": 21 }`
- `INSERT INTO courses { "id": 8, "name": "Machine Learning", "code": "CS401", "credits": 3 }`

**Error Cases**:
- Missing table name: "Invalid query: Missing table name after INTO"
- Missing JSON object: "Invalid query: Missing JSON object"
- Invalid JSON: "Invalid JSON: [error message]"

#### 7. UPDATE

**Syntax**: `UPDATE <table> SET <field> = <value> [WHERE <field> <operator> <value>]`

**Description**: Updates records in the specified table.

**Behavior**:
- Updates all records if no WHERE clause is provided
- Updates only matching records if WHERE clause is present
- Automatically updates the database and persists to localStorage
- Returns updated records and affected row count

**Examples**:
- `UPDATE students SET age = 25 WHERE id = 2` - Updates age for student with id=2
- `UPDATE courses SET credits = 4` - Updates credits for all courses

**Error Cases**:
- Missing table name: "Invalid query: Missing table name after UPDATE"
- Table doesn't exist: "Table "[tableName]" does not exist"
- Missing SET clause: "Invalid query: Missing SET clause"
- Invalid SET syntax: "Invalid SET clause syntax. Expected: field = value"
- Invalid WHERE syntax: "Invalid WHERE clause syntax"

#### 8. DELETE

**Syntax**: `DELETE FROM <table> [WHERE <field> <operator> <value>]`

**Description**: Deletes records from the specified table.

**Behavior**:
- Deletes all records if no WHERE clause is provided
- Deletes only matching records if WHERE clause is present
- Automatically updates the database and persists to localStorage
- Returns affected row count

**Examples**:
- `DELETE FROM students WHERE gpa < 2.0` - Deletes students with low GPA
- `DELETE FROM courses` - Deletes all courses (use with caution!)

**Error Cases**:
- Missing table name: "Invalid query: Missing table name after FROM"
- Table doesn't exist: "Table "[tableName]" does not exist"
- Invalid WHERE syntax: "Invalid WHERE clause syntax"

#### 9. SHOW FILES

**Syntax**: `SHOW FILES`

**Description**: Lists all files in the database with their record counts.

**Returns**: Array of objects with `name` and `recordCount` properties

**Example**:
- `SHOW FILES`

**No error cases** (always succeeds, even with empty database)

### Query Parsing Details

- **Case Insensitivity**: All query keywords are case-insensitive (SELECT, FROM, WHERE, etc.)
- **File Names**: File names in queries are converted to lowercase
- **Field Names**: Field names in SELECT projection are case-sensitive
- **Whitespace**: Extra whitespace is trimmed
- **Invalid Queries**: Returns `{ error: "Invalid query syntax" }` for unrecognized queries
- **Query Execution Errors**: Catches exceptions and returns error message
- **Database Mutations**: INSERT, UPDATE, and DELETE operations automatically update the database and persist changes to localStorage

### Record Equality

Records are considered equal if:
- They have the same number of keys
- All key-value pairs match exactly (value comparison, not reference)

## Result Viewer

The ResultViewer component displays query results in different formats:

**No Query Executed**:
- Message: "No query executed yet"
- Subtitle: "Run a query to see results here"

**Error State**:
- Red background panel (bg-red-50)
- Warning icon (⚠️)
- "Error" heading
- Error message displayed

**Empty Results**:
- Message: "Query executed successfully"
- Subtitle: "No results found"

**SHOW FILES Results** (type: 'files'):
- Displays list of files
- Each item shows file name and record count
- Format: "N record(s)"

**Set Operations Results** (type: 'set'):
- Displays results in a table
- Shows record count: "Found N record(s)"
- Table with all fields as columns
- Each row represents one record

**SELECT Results** (type: 'table'):
- Displays results in a table
- Shows record count: "Found N record(s)"
- Table with all fields as columns (or only selected fields if projection was used)
- Each row represents one record

**Mutation Results** (INSERT, UPDATE, DELETE):
- Shows success message with green background
- Displays affected row count: "N row(s) affected"
- For INSERT: Shows the inserted record in a table
- For UPDATE: Shows all updated records in a table
- For DELETE: Shows empty result with success message

## File Management

### Create File

**Trigger**: Click "+ Create New File" button in sidebar

**Modal Dialog**:
- Title: "Create New File"
- Input field for file name (required)
- Schema definition section (can be shown/hidden)
- Cancel button (gray)
- Create button (blue)
- Keyboard shortcuts:
  - Enter: Create file
  - Escape: Cancel

**Schema Definition**:
- **Fields Section**:
  - Add multiple fields dynamically with "+ Add Field" button
  - Each field has:
    - Field name input (required, case-sensitive)
    - Field type dropdown (String, Number, Boolean)
    - Delete button (✕) - disabled when only one field remains
  - Inline validation:
    - Red border and error message for empty field names
    - Red border and error message for duplicate field names
    - Error messages clear when issues are fixed
- **Primary Key Section**:
  - Dropdown selector populated with defined fields
  - Optional (can select "None")
  - Validates that selected field exists
- **Foreign Keys Section**:
  - Add multiple foreign keys dynamically with "+ Add Foreign Key" button
  - Each foreign key requires:
    - Field selection (from current table's fields)
    - Table selection (from existing tables)
    - Field selection (from selected table's fields)
  - Delete button (✕) for each foreign key
  - Field dropdown updates based on selected table
  - Inline validation for foreign key errors

**Validation**:
- Cannot create table with no fields (shows error message)
- Cannot create table with duplicate field names (shows inline errors)
- All validation errors are displayed before creation
- File name is trimmed and converted to lowercase
- Empty name shows inline error: "Please enter a file name"
- Duplicate name shows inline error: "A file with this name already exists"

**Behavior**:
- New file is created with empty array: `[]`
- Schema is saved separately if provided
- Newly created file is automatically selected
- Automatically saves to localStorage

### Rename File

**Trigger**: Click ✏️ icon on file item (visible on hover)

**Behavior**:
- Inline editing mode activated
- Text input appears with current file name
- ✓ button to confirm, ✕ button to cancel
- Keyboard shortcuts:
  - Enter: Save rename
  - Escape: Cancel rename
- File name is trimmed and converted to lowercase
- If new name is same as old name, no action taken
- If new name already exists, shows alert: "A file with this name already exists"
- If renamed file was selected, selection updates to new name
- Automatically saves to localStorage

### Delete File

**Trigger**: Click 🗑️ icon on file item (visible on hover)

**Behavior**:
- Confirmation dialog: "Delete file "[fileName]"?"
- If confirmed:
  - File is removed from database
  - If deleted file was selected:
    - If other files exist, first remaining file is selected
    - If no files remain, selection becomes null
  - Automatically saves to localStorage

### File Selection

**Trigger**: Click on file name in sidebar

**Behavior**:
- File becomes selected (highlighted in blue)
- Automatically switches to "Dataset View" tab
- Dataset view displays the selected file's records

## Record Management (CRUD)

### Create Record

**Trigger**: Click "+ Add Record" button in Dataset View

**Requirements**:
- File must have at least one existing record (to determine field structure)
- If no records exist, shows alert: "Cannot add record: No fields detected. Add at least one record manually or use a file with existing structure."

**Modal Form**:
- Input fields generated from first record's keys
- Each field has label and text input
- Placeholder: "Enter [fieldName]"
- Values are auto-parsed:
  - Numeric strings become numbers
  - Non-numeric strings remain strings
- Cancel button closes modal and clears form
- Add Record button saves new record

**Behavior**:
- New record is appended to file's array
- Automatically saves to localStorage
- Modal closes after successful add

### Read Records

**Display**: Automatic in Dataset View table

**Behavior**:
- All records displayed in table format
- Columns match all keys from records
- Values displayed as strings (using `String()` conversion)
- Empty/null values displayed as empty string

### Update Record

**Trigger**: Click "Edit" button on any record row

**Modal Form**:
- Pre-filled with current record values
- Input fields for all record fields
- Values are auto-parsed (numbers if numeric)
- Cancel button discards changes
- Save Changes button updates record

**Behavior**:
- Record at specific index is updated
- Automatically saves to localStorage
- Modal closes after successful update

### Delete Record

**Trigger**: Click "Delete" button on any record row

**Behavior**:
- Confirmation dialog: "Delete this record?"
- If confirmed, record is removed from array
- Automatically saves to localStorage

## LocalStorage Integration

### Storage Functions

**loadDB()**:
- Reads from localStorage key: `minidb_database`
- Returns parsed JSON object
- Returns empty object `{}` if no data exists
- Catches and logs errors, returns empty object on error

**saveDB(db: MiniDB)**:
- Writes to localStorage key: `minidb_database`
- Converts database object to JSON string
- Throws error if storage fails: "Failed to save database. Storage may be full."
- Logs errors to console

**seedSampleData()**:
- Only executes if database is empty (no files exist)
- Creates three sample files with data:
  - `students`: 7 records
  - `courses`: 7 records
  - `teachers`: 8 records
- Automatically saves to localStorage
- Called automatically on first app load if database is empty

### Auto-Save Triggers

The database is automatically saved to localStorage when:
- A file is created
- A file is renamed
- A file is deleted
- A record is added
- A record is edited
- A record is deleted
- An INSERT query is executed
- An UPDATE query is executed
- A DELETE query is executed

### Sample Data Structure

**students** (7 records):
- Fields: `id` (number), `name` (string), `age` (number), `major` (string), `gpa` (number)
- Sample: `{ id: 1, name: 'Ali', age: 20, major: 'Computer Science', gpa: 3.8 }`

**courses** (7 records):
- Fields: `id` (number), `name` (string), `code` (string), `credits` (number), `instructor` (string)
- Sample: `{ id: 1, name: 'Discrete Structures', code: 'CS201', credits: 3, instructor: 'Dr. Smith' }`

**teachers** (8 records):
- Fields: `id` (number), `name` (string), `department` (string), `experience` (number)
- Sample: `{ id: 1, name: 'Dr. Smith', department: 'Computer Science', experience: 15 }`

## Application Initialization

**On First Load**:
1. Attempts to load database from localStorage
2. If database is empty:
   - Calls `seedSampleData()` to create sample files
   - Loads seeded database
   - Auto-selects first file (if any exist)
3. If database exists:
   - Loads existing database
   - Auto-selects first file (if not already selected)

**State Management**:
- Database state stored in React state
- Synchronized with localStorage on every change
- Selected file tracked in state
- View mode (dataset/query) tracked in state

## Keyboard Shortcuts

- **Ctrl/Cmd + Enter**: Run query in Query Console
- **Enter** (in rename mode): Save file rename
- **Escape** (in rename mode): Cancel file rename
- **Enter** (in create file modal): Create file
- **Escape** (in create file modal): Cancel file creation

## Schema Management

The application supports schema definition for tables:

**Schema Structure**:
- Fields: Array of field definitions with name and type (string, number, boolean)
- Primary Key: Optional single field designation
- Foreign Keys: Optional array of foreign key relationships

**Schema Storage**:
- Stored separately from data in localStorage key: `minidb_schema`
- Automatically saved when creating files with schema
- Used for validation and relationship mapping

**Schema Functions**:
- `loadSchema()`: Loads schema from localStorage
- `saveSchema(schema)`: Saves schema to localStorage
- Schema is automatically created for sample data on first load

## Error Handling

**Query Errors**:
- Invalid syntax: "Invalid query syntax"
- Missing file: "File "[fileName]" does not exist"
- Missing WHERE condition: "Invalid WHERE clause syntax"
- Missing file names in set operations: "Invalid query: [OPERATION] requires two file names"
- Invalid LIMIT value: "Invalid LIMIT value"
- Invalid JSON in INSERT: "Invalid JSON: [error message]"
- Missing SET clause in UPDATE: "Invalid query: Missing SET clause"
- Invalid SET syntax: "Invalid SET clause syntax. Expected: field = value"
- Missing ON clause in JOIN: "Invalid query: JOIN requires ON clause"
- Invalid ON syntax: "Invalid ON clause syntax. Expected: tableA.fieldA = tableB.fieldB"
- Execution errors: "Query execution error: [error message]"

**File Management Errors**:
- Empty file name: Inline error "Please enter a file name"
- Duplicate file name: Inline error "A file with this name already exists"
- No fields: Inline error "Please add at least one field"
- Duplicate field names: Inline error "Field names must be unique" with red borders on duplicate fields
- Invalid primary key: Inline error "Primary key must be one of the defined fields"
- Invalid foreign key: Inline error with specific message about the foreign key issue

**Record Management Errors**:
- Adding record to empty file: Alert "Cannot add record: No fields detected. Add at least one record manually or use a file with existing structure."

**Storage Errors**:
- Save failure: Throws error "Failed to save database. Storage may be full."
- Load failure: Logs to console, returns empty database

## UI Styling

- **Color Scheme**: Blue primary (#2563eb), gray backgrounds, white panels
- **Typography**: System font stack, monospace for queries
- **Layout**: Flexbox-based, responsive design
- **Modals**: Overlay with semi-transparent black background (bg-opacity-50)
- **Tables**: Striped rows, hover effects, bordered cells
- **Buttons**: Rounded corners, hover state transitions
- **Sidebar**: Fixed width (256px), dark theme (gray-800)

## Project Structure

```
src/
  components/
    Sidebar.tsx          # File navigation sidebar with create/rename/delete
    DatasetView.tsx      # CRUD operations for records
    QueryConsole.tsx     # Query input and execution interface
    ResultViewer.tsx     # Query results display component
    FileManager.tsx      # Create file modal with schema definition
    RelationshipMap.tsx  # Visual relationship mapping component
  utils/
    localStorage.ts      # Database load/save/seed functions
    queryEngine.ts       # Query parser and executor (SELECT, INSERT, UPDATE, DELETE, JOIN, etc.)
    schemaValidation.ts # Schema validation utilities
  types.ts              # TypeScript interfaces (MiniDB, QueryResult, ViewMode, TableSchema, etc.)
  App.tsx               # Main application component with state management
  main.tsx              # React entry point
  index.css             # TailwindCSS imports
  vite-env.d.ts         # Vite TypeScript declarations
```

## Build Commands

- **Development**: `npm run dev` - Starts Vite dev server
- **Build**: `npm run build` - Compiles TypeScript and builds for production
- **Preview**: `npm run preview` - Preview production build

## Browser Compatibility

- Requires modern browser with localStorage support
- Requires ES6+ JavaScript support
- Tested with Chrome, Firefox, Safari, Edge
