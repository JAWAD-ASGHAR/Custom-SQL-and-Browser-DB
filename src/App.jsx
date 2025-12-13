import React, { useState, useEffect, useRef } from "react";
import {
  loadDB,
  saveDB,
  getAllTables,
  getTable,
  getTableRows,
  createTable,
  insertRow,
  updateRow,
  deleteRow,
  exportDatabase,
  importDatabase,
  getSampleDataset,
} from "./database";
import { executeQuery } from "./queryEngine";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import TableView from "./components/TableView";
import QueryEditor from "./components/QueryEditor";
import QueryResults from "./components/QueryResults";
import CreateTableModal from "./components/modals/CreateTableModal";
import AddRowModal from "./components/modals/AddRowModal";
import AddColumnModal from "./components/modals/AddColumnModal";
import CreateRelationModal from "./components/modals/CreateRelationModal";
import ViewRelationsModal from "./components/modals/ViewRelationsModal";
import SuggestedQueriesModal from "./components/modals/SuggestedQueriesModal";

function App() {
  const [db, setDb] = useState({ meta: {}, tables: {} });
  const [selectedTable, setSelectedTable] = useState(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [showCreateTable, setShowCreateTable] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [showAddRow, setShowAddRow] = useState(false);
  const [newRow, setNewRow] = useState({});
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [columnType, setColumnType] = useState("string");
  const [columnIsForeignKey, setColumnIsForeignKey] = useState(false);
  const [referencedTable, setReferencedTable] = useState("");
  const [showCreateRelation, setShowCreateRelation] = useState(false);
  const [relationFromTable, setRelationFromTable] = useState("");
  const [relationFromColumn, setRelationFromColumn] = useState("");
  const [relationToTable, setRelationToTable] = useState("");
  const [onDeleteAction, setOnDeleteAction] = useState("restrict");
  const [showRelationsView, setShowRelationsView] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [tablesToLink, setTablesToLink] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [tableActionsMenuOpen, setTableActionsMenuOpen] = useState(false);
  const [resultsMenuOpen, setResultsMenuOpen] = useState(false);
  const [showSuggestedQueriesModal, setShowSuggestedQueriesModal] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadedDb = loadDB();
    setDb(loadedDb);
    const firstTable = Object.keys(loadedDb.tables)[0];
    if (firstTable) {
      setSelectedTable(firstTable);
    }
  }, []);

  const refreshDb = () => {
    const loadedDb = loadDB();
    setDb(loadedDb);
  };

  const handleRunQuery = () => {
    if (!query.trim()) {
      setResult({ error: "Please enter a query" });
      return;
    }

    const queryResult = executeQuery(query);
    setResult(queryResult);

    refreshDb();
  };

  const handleCreateTable = () => {
    if (!newTableName.trim()) {
      alert("Please enter a table name");
      return;
    }

    const tableName = newTableName.trim().toLowerCase();
    if (db.tables[tableName]) {
      alert("Table already exists");
      return;
    }

    try {
      const foreignKeys = {};
      if (tablesToLink.length > 0) {
        tablesToLink.forEach((refTable) => {
          const fkColumnName = `${refTable}_id`;
          foreignKeys[fkColumnName] = {
            references: `${refTable}.id`,
            onDelete: "restrict",
          };
        });
      }

      createTable(tableName, {
        columns: {},
        foreignKeys,
      });

      refreshDb();
      setSelectedTable(tableName);
      setShowCreateTable(false);
      setNewTableName("");
      setTablesToLink([]);
    } catch (error) {
      alert(`Error creating table: ${error.message}`);
    }
  };

  const handleDeleteTable = (tableName) => {
    if (confirm(`Delete table "${tableName}"?`)) {
      try {
        const updatedDb = loadDB();
        delete updatedDb.tables[tableName];
        saveDB(updatedDb);
        refreshDb();
        if (selectedTable === tableName) {
          const remaining = Object.keys(updatedDb.tables);
          setSelectedTable(remaining.length > 0 ? remaining[0] : null);
        }
      } catch (error) {
        alert(`Error deleting table: ${error.message}`);
      }
    }
  };

  const handleAddColumn = (tableName) => {
    setRelationFromTable(tableName);
    setShowAddColumn(true);
  };

  const handleConfirmAddColumn = () => {
    if (!newColumnName.trim() && !columnIsForeignKey) {
      alert("Please enter a column name");
      return;
    }

    try {
      const table = getTable(relationFromTable);
      if (!table) {
        alert("Table not found");
        return;
      }

      const colName =
        columnIsForeignKey && referencedTable
          ? `${referencedTable}_id`
          : newColumnName.trim();

      if (columnIsForeignKey && !referencedTable) {
        alert("Please select a table to reference");
        return;
      }

      const updatedDb = loadDB();
      const tableObj = updatedDb.tables[relationFromTable];

      tableObj.schema.columns[colName] = { type: columnType };
      if (columnIsForeignKey) {
        tableObj.schema.foreignKeys[colName] = {
          references: `${referencedTable}.id`,
          onDelete: "restrict",
        };
      }

      for (const rowId in tableObj.rows) {
        if (!(colName in tableObj.rows[rowId])) {
          tableObj.rows[rowId][colName] = null;
        }
      }

      saveDB(updatedDb);
      refreshDb();

      setNewColumnName("");
      setColumnType("string");
      setColumnIsForeignKey(false);
      setReferencedTable("");
      setShowAddColumn(false);
    } catch (error) {
      alert(`Error adding column: ${error.message}`);
    }
  };

  const handleCreateRelation = () => {
    if (!relationFromTable || !relationToTable) {
      alert("Please select both tables");
      return;
    }

    try {
      const updatedDb = loadDB();
      const tableObj = updatedDb.tables[relationFromTable];

      const fkColumnName = relationFromColumn || `${relationToTable}_id`;

      if (tableObj.schema.columns[fkColumnName]) {
        alert(`Column "${fkColumnName}" already exists`);
        return;
      }

      tableObj.schema.columns[fkColumnName] = { type: "uuid" };

      tableObj.schema.foreignKeys[fkColumnName] = {
        references: `${relationToTable}.id`,
        onDelete: onDeleteAction,
      };

      for (const rowId in tableObj.rows) {
        tableObj.rows[rowId][fkColumnName] = null;
      }

      saveDB(updatedDb);
      refreshDb();

      setRelationFromTable("");
      setRelationFromColumn("");
      setRelationToTable("");
      setOnDeleteAction("restrict");
      setShowCreateRelation(false);
    } catch (error) {
      alert(`Error creating relation: ${error.message}`);
    }
  };

  const handleDeleteColumn = (tableName, colName) => {
    if (colName === "id") {
      alert("Cannot delete id column (primary key)");
      return;
    }
    if (confirm(`Delete column "${colName}"?`)) {
      try {
        const updatedDb = loadDB();
        const tableObj = updatedDb.tables[tableName];

        delete tableObj.schema.columns[colName];
        delete tableObj.schema.foreignKeys[colName];
        for (const rowId in tableObj.rows) {
          delete tableObj.rows[rowId][colName];
        }

        saveDB(updatedDb);
        refreshDb();
      } catch (error) {
        alert(`Error deleting column: ${error.message}`);
      }
    }
  };

  const handleAddRow = () => {
    if (!selectedTable) return;

    try {
      const data = { ...newRow };
      delete data.id;

      insertRow(selectedTable, data);
      refreshDb();
      setNewRow({});
      setShowAddRow(false);
    } catch (error) {
      alert(`Error adding row: ${error.message}`);
    }
  };

  const handleDeleteRow = (tableName, rowId) => {
    if (confirm("Delete this row?")) {
      try {
        deleteRow(tableName, rowId);
        refreshDb();
      } catch (error) {
        alert(`Error deleting row: ${error.message}`);
      }
    }
  };

  const handleCellDoubleClick = (rowId, column) => {
    if (column === "id") return;
    const rows = getTableRows(selectedTable);
    const row = rows.find((r) => r.id === rowId);
    if (row) {
      setEditingCell({ rowId, column });
      setEditValue(String(row[column] || ""));
    }
  };

  const handleCellSave = (tableName, rowId, column) => {
    try {
      let value = editValue.trim();

      const numValue =
        value !== "" && !isNaN(value) && !isNaN(parseFloat(value))
          ? Number(value)
          : value;

      const isFK = isForeignKey(column);
      const finalValue =
        isFK && value !== "" ? value : value === "" ? null : numValue;

      updateRow(tableName, rowId, { [column]: finalValue });
      refreshDb();
      setEditingCell(null);
      setEditValue("");
    } catch (error) {
      alert(`Error updating cell: ${error.message}`);
      setEditingCell(null);
      setEditValue("");
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const isForeignKey = (columnName) => {
    if (columnName === "id") return false;
    if (!selectedTable) return false;
    const table = getTable(selectedTable);
    if (!table) return false;
    return columnName in table.schema.foreignKeys;
  };

  const getReferencedTable = (columnName) => {
    if (!selectedTable) return null;
    const table = getTable(selectedTable);
    if (!table) return null;
    const fk = table.schema.foreignKeys[columnName];
    if (!fk) return null;
    const [refTable] = fk.references.split(".");
    return refTable;
  };

  const getForeignKeyDisplay = (columnName, rowValue) => {
    if (!isForeignKey(columnName) || !rowValue) return String(rowValue || "");

    const refTable = getReferencedTable(columnName);
    if (!refTable) return String(rowValue);

    const refRows = getTableRows(refTable);
    const refRow = refRows.find((r) => r.id === rowValue);
    if (!refRow) return String(rowValue);

    if (refTable === "users") {
      if (refRow.firstName && refRow.lastName) {
        return `${refRow.firstName} ${refRow.lastName} (${
          refRow.username || refRow.email
        })`;
      }
      return (
        refRow.username || refRow.email || `User ${rowValue.substring(0, 8)}`
      );
    }

    const name =
      refRow.name ||
      refRow.title ||
      Object.values(refRow).find(
        (v) =>
          typeof v === "string" &&
          v.length < 50 &&
          v !== String(rowValue) &&
          v !== refRow.id
      ) ||
      `ID ${rowValue}`;

    return name;
  };

  const getAllRelations = () => {
    const relations = [];
    const tables = getAllTables();

    for (const tableName in tables) {
      const table = tables[tableName];
      for (const fkColumn in table.schema.foreignKeys) {
        const fk = table.schema.foreignKeys[fkColumn];
        const [refTable] = fk.references.split(".");
        relations.push({
          fromTable: tableName,
          fromColumn: fkColumn,
          toTable: refTable,
          onDelete: fk.onDelete,
        });
      }
    }
    return relations;
  };

  const currentTable = selectedTable ? getTableRows(selectedTable) : [];

  const tableColumns =
    selectedTable && getTable(selectedTable)
      ? Object.keys(getTable(selectedTable).schema.columns)
      : [];

  const tableNames = Object.keys(db.tables || {});

  const handleClearDatabase = () => {
    const confirmMessage =
      "Are you sure you want to clear the entire database?\n\n" +
      "This will delete ALL tables and data. This action cannot be undone!\n\n" +
      "Consider exporting your data first if you want to keep a backup.";

    if (confirm(confirmMessage)) {
      try {
        localStorage.removeItem("MiniDB");
        refreshDb();
        setSelectedTable(null);
        alert("Database cleared successfully!");
      } catch (error) {
        alert(`Error clearing database: ${error.message}`);
      }
    }
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonString = e.target.result;
        const overwrite = confirm(
          "Import database?\n\n" +
            "OK = Replace all existing data\n" +
            "Cancel = Merge with existing data"
        );

        importDatabase(jsonString, overwrite);
        refreshDb();
        alert("Database imported successfully!");
      } catch (error) {
        alert(`Error importing database: ${error.message}`);
      }
    };
    reader.readAsText(file);

    event.target.value = "";
  };

  const handleDownloadSample = async () => {
    try {
      const sampleDb = getSampleDataset();
      const jsonData = JSON.stringify(sampleDb, null, 2);
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "minidb-sample-dataset.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      localStorage.setItem("MiniDB", currentDbString);
      refreshDb();

      alert(
        "Sample dataset downloaded! You can import it to restore the demo database."
      );
    } catch (error) {
      alert(`Error generating sample dataset: ${error.message}`);
      try {
        const currentDb = loadDB();
        if (Object.keys(currentDb.tables).length === 0) {
          refreshDb();
        }
      } catch (e) {
        console.error("Error restoring database:", e);
      }
    }
  };

  const suggestedQueries = [
    { name: "Select all users", query: "SELECT * FROM users" },
    { name: "Select all customers", query: "SELECT * FROM customers" },
    { name: "Select all admins", query: "SELECT * FROM admins" },
    { name: "Select all products", query: "SELECT * FROM products" },
    {
      name: "Join customers with users",
      query: "JOIN customers users ON customers.userId = users.id",
    },
    {
      name: "Join admins with users",
      query: "JOIN admins users ON admins.userId = users.id",
    },
    {
      name: "Join carts and customers",
      query: "JOIN carts customers ON carts.customerId = customers.id",
    },
    {
      name: "Join cart items and products",
      query: "JOIN cart_items products ON cart_items.productId = products.id",
    },
    {
      name: "Join orders and customers",
      query: "JOIN orders customers ON orders.customerId = customers.id",
    },
    {
      name: "Join products with categories",
      query: "JOIN products categories ON products.categoryId = categories.id",
    },
    {
      name: "Filter users by email",
      query: 'SELECT * FROM users WHERE email = "john.doe@email.com"',
    },
    {
      name: "Filter products by price",
      query: "SELECT * FROM products WHERE price > 100",
    },
    { name: "Show all tables", query: "SHOW TABLES" },
  ];

  return (
    <div className="flex h-screen bg-[#1e1e1e] overflow-hidden text-[#e0e0e0] w-full max-w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImport}
        accept=".json"
        style={{ display: "none" }}
      />

      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        tableNames={tableNames}
        selectedTable={selectedTable}
        setSelectedTable={setSelectedTable}
        setShowCreateTable={setShowCreateTable}
        setShowRelationsView={setShowRelationsView}
        handleDeleteTable={handleDeleteTable}
      />

      <div className="flex-1 flex flex-col lg:ml-64 bg-[#1e1e1e] min-w-0 overflow-hidden">
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          selectedTable={selectedTable}
          setSelectedTable={setSelectedTable}
          tableNames={tableNames}
          headerMenuOpen={headerMenuOpen}
          setHeaderMenuOpen={setHeaderMenuOpen}
          handleDownloadSample={handleDownloadSample}
          handleClearDatabase={handleClearDatabase}
          fileInputRef={fileInputRef}
        />

        {selectedTable ? (
          <TableView
            selectedTable={selectedTable}
            currentTable={currentTable}
            tableColumns={tableColumns}
            tableActionsMenuOpen={tableActionsMenuOpen}
            setTableActionsMenuOpen={setTableActionsMenuOpen}
            setRelationFromTable={setRelationFromTable}
            setShowCreateRelation={setShowCreateRelation}
            handleAddColumn={handleAddColumn}
            setShowAddRow={setShowAddRow}
            handleDeleteColumn={handleDeleteColumn}
            handleDeleteRow={handleDeleteRow}
            editingCell={editingCell}
            setEditingCell={setEditingCell}
            editValue={editValue}
            setEditValue={setEditValue}
            handleCellDoubleClick={handleCellDoubleClick}
            handleCellSave={handleCellSave}
            handleCellCancel={handleCellCancel}
            isForeignKey={isForeignKey}
            getReferencedTable={getReferencedTable}
            getForeignKeyDisplay={getForeignKeyDisplay}
          />
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <QueryEditor
              query={query}
              setQuery={setQuery}
              handleRunQuery={handleRunQuery}
              setShowSuggestedQueriesModal={setShowSuggestedQueriesModal}
              suggestedQueries={suggestedQueries}
              setResult={setResult}
            />
            <QueryResults
              result={result}
              resultsMenuOpen={resultsMenuOpen}
              setResultsMenuOpen={setResultsMenuOpen}
            />
          </div>
        )}
      </div>

      <CreateTableModal
        showCreateTable={showCreateTable}
        setShowCreateTable={setShowCreateTable}
        newTableName={newTableName}
        setNewTableName={setNewTableName}
        tablesToLink={tablesToLink}
        setTablesToLink={setTablesToLink}
        tableNames={tableNames}
        handleCreateTable={handleCreateTable}
      />

      <AddRowModal
        showAddRow={showAddRow}
        setShowAddRow={setShowAddRow}
        selectedTable={selectedTable}
        tableColumns={tableColumns}
        newRow={newRow}
        setNewRow={setNewRow}
        handleAddRow={handleAddRow}
        isForeignKey={isForeignKey}
        getReferencedTable={getReferencedTable}
        getForeignKeyDisplay={getForeignKeyDisplay}
      />

      <AddColumnModal
        showAddColumn={showAddColumn}
        setShowAddColumn={setShowAddColumn}
        relationFromTable={relationFromTable}
        newColumnName={newColumnName}
        setNewColumnName={setNewColumnName}
        columnType={columnType}
        setColumnType={setColumnType}
        columnIsForeignKey={columnIsForeignKey}
        setColumnIsForeignKey={setColumnIsForeignKey}
        referencedTable={referencedTable}
        setReferencedTable={setReferencedTable}
        tableNames={tableNames}
        handleConfirmAddColumn={handleConfirmAddColumn}
      />

      <CreateRelationModal
        showCreateRelation={showCreateRelation}
        setShowCreateRelation={setShowCreateRelation}
        relationFromTable={relationFromTable}
        setRelationFromTable={setRelationFromTable}
        relationFromColumn={relationFromColumn}
        setRelationFromColumn={setRelationFromColumn}
        relationToTable={relationToTable}
        setRelationToTable={setRelationToTable}
        onDeleteAction={onDeleteAction}
        setOnDeleteAction={setOnDeleteAction}
        tableNames={tableNames}
        handleCreateRelation={handleCreateRelation}
      />

      <ViewRelationsModal
        showRelationsView={showRelationsView}
        setShowRelationsView={setShowRelationsView}
        getAllRelations={getAllRelations}
        setSelectedTable={setSelectedTable}
      />

      <SuggestedQueriesModal
        showSuggestedQueriesModal={showSuggestedQueriesModal}
        setShowSuggestedQueriesModal={setShowSuggestedQueriesModal}
        suggestedQueries={suggestedQueries}
        setQuery={setQuery}
      />
    </div>
  );
}

export default App;
