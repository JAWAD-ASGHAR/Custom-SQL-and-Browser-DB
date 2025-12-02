# MiniDB - File-Based Database System

A React application that implements a file-based mini database system inside the browser using localStorage. This project demonstrates sets, relations, and custom query parsing.

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
- Two tabs: "Dataset View" and "Query Console"
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
  - Shows 6 example queries
  - Styled in monospace font

*Right Panel - Results*:
- White panel with "Results" header
- Scrollable content area
- Displays query execution results

## Query Engine

### Supported Operations

#### 1. SELECT

**Syntax**: `SELECT FROM <file> [WHERE <field> <operator> <value>] [SORTBY <field>]`

**Description**: Retrieves records from a file with optional filtering and sorting.

**Examples**:
- `SELECT FROM students`
- `SELECT FROM students WHERE age > 20`
- `SELECT FROM courses SORTBY name`
- `SELECT FROM students WHERE age > 20 SORTBY name`

**WHERE Clause**:
- Optional filtering condition
- Format: `WHERE <field> <operator> <value>`
- Supported operators: `=`, `!=`, `>`, `<`, `>=`, `<=`
- Value parsing:
  - Numbers are parsed as numbers
  - "true"/"false" (case-insensitive) are parsed as booleans
  - Strings can be quoted or unquoted (quotes are stripped)
  - Comparison operators (`>`, `<`, `>=`, `<=`) convert both sides to numbers

**SORTBY Clause**:
- Optional sorting
- Format: `SORTBY <field>`
- Sorts in ascending order (string comparison for strings, numeric for numbers)
- Can be combined with WHERE clause

**Error Cases**:
- Missing file name: "Invalid query: Missing file name after FROM"
- File doesn't exist: "File "[fileName]" does not exist"
- Invalid WHERE syntax: "Invalid WHERE clause syntax"

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

#### 5. SHOW FILES

**Syntax**: `SHOW FILES`

**Description**: Lists all files in the database with their record counts.

**Returns**: Array of objects with `name` and `recordCount` properties

**Example**:
- `SHOW FILES`

**No error cases** (always succeeds, even with empty database)

### Query Parsing Details

- **Case Insensitivity**: All query keywords are case-insensitive (SELECT, FROM, WHERE, etc.)
- **File Names**: File names in queries are converted to lowercase
- **Whitespace**: Extra whitespace is trimmed
- **Invalid Queries**: Returns `{ error: "Invalid query syntax" }` for unrecognized queries
- **Query Execution Errors**: Catches exceptions and returns error message

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
- Table with all fields as columns
- Each row represents one record

## File Management

### Create File

**Trigger**: Click "+ Create New File" button in sidebar

**Modal Dialog**:
- Title: "Create New File"
- Input field for file name
- Placeholder: "Enter file name (e.g., students)"
- Cancel button (gray)
- Create button (blue)
- Keyboard shortcuts:
  - Enter: Create file
  - Escape: Cancel

**Behavior**:
- File name is trimmed and converted to lowercase
- Empty name shows alert: "Please enter a file name"
- Duplicate name shows alert: "A file with this name already exists"
- New file is created with empty array: `[]`
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

## Error Handling

**Query Errors**:
- Invalid syntax: "Invalid query syntax"
- Missing file: "File "[fileName]" does not exist"
- Missing WHERE condition: "Invalid WHERE clause syntax"
- Missing file names in set operations: "Invalid query: [OPERATION] requires two file names"
- Execution errors: "Query execution error: [error message]"

**File Management Errors**:
- Empty file name: Alert "Please enter a file name"
- Duplicate file name: Alert "A file with this name already exists"

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
    FileManager.tsx      # Create file modal component
  utils/
    localStorage.ts      # Database load/save/seed functions
    queryEngine.ts       # Query parser and executor
  types.ts              # TypeScript interfaces (MiniDB, QueryResult, ViewMode)
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
