/**
 * MiniDB Core Implementation
 * 
 * Discrete Structures Mapping:
 * - Tables = Sets
 * - Rows = Elements
 * - Foreign keys = Relations
 * - JOIN = Relation composition
 * - UNION/INTERSECT/DIFF = Set operations
 * - Self-relations = Transitive relations
 */

const STORAGE_KEY = 'MiniDB';

/**
 * Generate UUID v4
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Load database from localStorage
 */
export function loadDB() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {
        meta: {
          version: '1.0',
          createdAt: new Date().toISOString()
        },
        tables: {}
      };
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error loading database:', error);
    return {
      meta: {
        version: '1.0',
        createdAt: new Date().toISOString()
      },
      tables: {}
    };
  }
}

/**
 * Save database to localStorage
 */
export function saveDB(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (error) {
    console.error('Error saving database:', error);
    throw new Error('Failed to save database. Storage may be full.');
  }
}

/**
 * Get a table by name
 */
export function getTable(tableName) {
  const db = loadDB();
  return db.tables[tableName] || null;
}

/**
 * Get all tables
 */
export function getAllTables() {
  const db = loadDB();
  return db.tables;
}

/**
 * Create a new table with schema
 * @param {string} name - Table name
 * @param {Object} schema - Schema definition
 * @param {Object} schema.columns - Column definitions { columnName: { type, primary?, ... } }
 * @param {Object} schema.foreignKeys - Foreign key definitions { columnName: { references, onDelete } }
 */
export function createTable(name, schema) {
  const db = loadDB();
  
  if (db.tables[name]) {
    throw new Error(`Table "${name}" already exists`);
  }

  // Ensure id column exists as primary key
  const columns = {
    id: { type: 'uuid', primary: true },
    ...schema.columns
  };

  // Validate schema
  validateSchema(columns, schema.foreignKeys || {});

  db.tables[name] = {
    name,
    schema: {
      columns,
      foreignKeys: schema.foreignKeys || {}
    },
    rows: {}
  };

  saveDB(db);
  return db.tables[name];
}

/**
 * Validate schema structure
 */
function validateSchema(columns, foreignKeys) {
  // Check that all foreign key columns exist
  for (const fkColumn in foreignKeys) {
    if (!columns[fkColumn]) {
      throw new Error(`Foreign key column "${fkColumn}" does not exist in schema`);
    }
    const fk = foreignKeys[fkColumn];
    if (!fk.references) {
      throw new Error(`Foreign key "${fkColumn}" must specify references`);
    }
    // Parse references (format: "tableName.columnName")
    const [refTable] = fk.references.split('.');
    if (!refTable) {
      throw new Error(`Invalid foreign key reference format: "${fk.references}"`);
    }
  }
}

/**
 * Insert a row into a table
 * @param {string} tableName - Table name
 * @param {Object} data - Row data (id will be auto-generated)
 */
export function insertRow(tableName, data) {
  const db = loadDB();
  const table = db.tables[tableName];
  
  if (!table) {
    throw new Error(`Table "${tableName}" does not exist`);
  }

  // Generate UUID for id
  const id = generateUUID();
  
  // Build row with all required columns
  const row = { id };
  
  // Add data for each column (except id)
  for (const columnName in table.schema.columns) {
    if (columnName === 'id') continue;
    
    const column = table.schema.columns[columnName];
    const value = data[columnName];
    
    // Auto-set createdAt for date columns if not provided
    if (columnName === 'createdAt' && column.type === 'date' && (value === undefined || value === null || value === '')) {
      row[columnName] = new Date().toISOString();
    }
    // Set default value if not provided
    else if (value === undefined || value === null) {
      if (column.default !== undefined) {
        row[columnName] = column.default;
      } else {
        row[columnName] = null;
      }
    } else {
      row[columnName] = value;
    }
  }

  // Validate foreign keys
  validateForeignKeys(tableName, row, db);

  // Insert row
  table.rows[id] = row;
  saveDB(db);
  
  return row;
}

/**
 * Update a row in a table
 * @param {string} tableName - Table name
 * @param {string} id - Row ID (UUID)
 * @param {Object} changes - Fields to update
 */
export function updateRow(tableName, id, changes) {
  const db = loadDB();
  const table = db.tables[tableName];
  
  if (!table) {
    throw new Error(`Table "${tableName}" does not exist`);
  }

  if (!table.rows[id]) {
    throw new Error(`Row with id "${id}" does not exist`);
  }

  // Prevent id modification
  if ('id' in changes) {
    delete changes.id;
  }

  // Create updated row
  const updatedRow = { ...table.rows[id] };
  
  // Apply changes
  for (const columnName in changes) {
    if (!table.schema.columns[columnName]) {
      throw new Error(`Column "${columnName}" does not exist`);
    }
    updatedRow[columnName] = changes[columnName];
  }

  // Validate foreign keys
  validateForeignKeys(tableName, updatedRow, db);

  // Update row
  table.rows[id] = updatedRow;
  saveDB(db);
  
  return updatedRow;
}

/**
 * Delete a row from a table
 * @param {string} tableName - Table name
 * @param {string} id - Row ID (UUID)
 */
export function deleteRow(tableName, id) {
  const db = loadDB();
  const table = db.tables[tableName];
  
  if (!table) {
    throw new Error(`Table "${tableName}" does not exist`);
  }

  if (!table.rows[id]) {
    throw new Error(`Row with id "${id}" does not exist`);
  }

  // Handle cascading deletes
  handleCascadeDelete(tableName, id, db);

  // Delete the row
  delete table.rows[id];
  saveDB(db);
}

/**
 * Validate foreign keys for a row
 */
function validateForeignKeys(tableName, row, db) {
  const table = db.tables[tableName];
  if (!table) return;

  for (const fkColumn in table.schema.foreignKeys) {
    const fkValue = row[fkColumn];
    
    // Allow null foreign keys
    if (fkValue === null || fkValue === undefined || fkValue === '') {
      continue;
    }

    const fk = table.schema.foreignKeys[fkColumn];
    const [refTable, refColumn] = fk.references.split('.');
    
    if (!db.tables[refTable]) {
      throw new Error(`Referenced table "${refTable}" does not exist`);
    }

    // Check if referenced row exists
    const refTableObj = db.tables[refTable];
    const refRow = refTableObj.rows[fkValue];
    
    if (!refRow) {
      throw new Error(`Foreign key violation: Referenced row "${fkValue}" does not exist in table "${refTable}"`);
    }

    // Verify the referenced column exists (should be 'id' typically)
    if (refColumn && !refTableObj.schema.columns[refColumn]) {
      throw new Error(`Referenced column "${refColumn}" does not exist in table "${refTable}"`);
    }
  }
}

/**
 * Handle cascading deletes
 * Processes cascades iteratively to avoid deep recursion
 */
function handleCascadeDelete(tableName, id, db) {
  // Collect all rows that need to be deleted (for cascade) or updated (for set-null)
  const toDelete = [];
  const toUpdate = [];
  
  // Find all tables that reference this table
  for (const otherTableName in db.tables) {
    const otherTable = db.tables[otherTableName];
    
    for (const fkColumn in otherTable.schema.foreignKeys) {
      const fk = otherTable.schema.foreignKeys[fkColumn];
      const [refTable] = fk.references.split('.');
      
      if (refTable === tableName) {
        // Find rows in otherTable that reference the deleted row
        for (const rowId in otherTable.rows) {
          const row = otherTable.rows[rowId];
          
          if (row[fkColumn] === id) {
            switch (fk.onDelete) {
              case 'cascade':
                // Collect for deletion (will process recursively)
                toDelete.push({ tableName: otherTableName, id: rowId });
                break;
              case 'set-null':
                // Set foreign key to null directly
                otherTable.rows[rowId][fkColumn] = null;
                break;
              case 'restrict':
              default:
                // Prevent deletion
                throw new Error(
                  `Cannot delete row: It is referenced by row "${rowId}" in table "${otherTableName}" ` +
                  `(foreign key: ${fkColumn}). Set onDelete to "cascade" or "set-null" to allow deletion.`
                );
            }
          }
        }
      }
    }
  }
  
  // Recursively handle cascaded deletes
  for (const { tableName: childTable, id: childId } of toDelete) {
    // Delete the row (this will trigger its own cascade check)
    delete db.tables[childTable].rows[childId];
    // Recursively handle cascades for this deleted row
    handleCascadeDelete(childTable, childId, db);
  }
}

/**
 * Get all rows from a table as an array
 */
export function getTableRows(tableName) {
  const table = getTable(tableName);
  if (!table) {
    return [];
  }
  return Object.values(table.rows);
}

/**
 * Initialize demo database with comprehensive e-commerce store data
 */
export function initSampleData() {
  const db = loadDB();
  
  // Only initialize if database is empty
  if (Object.keys(db.tables).length > 0) {
    return;
  }

  try {
    // Create customers table
    createTable('customers', {
      columns: {
        name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        password: { type: 'string' },
        createdAt: { type: 'date' }
      },
      foreignKeys: {}
    });

    // Create admins table (for store management)
    createTable('admins', {
      columns: {
        name: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string' },
        createdAt: { type: 'date' }
      },
      foreignKeys: {}
    });

    // Create categories table (for organizing products)
    createTable('categories', {
      columns: {
        name: { type: 'string' },
        description: { type: 'string' },
        createdAt: { type: 'date' }
      },
      foreignKeys: {}
    });

    // Create products table
    createTable('products', {
      columns: {
        name: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number' },
        stock: { type: 'number' },
        sku: { type: 'string' },
        imageUrl: { type: 'string' },
        categoryId: { type: 'uuid' },
        createdAt: { type: 'date' }
      },
      foreignKeys: {
        categoryId: {
          references: 'categories.id',
          onDelete: 'set-null'
        }
      }
    });

    // Create addresses table (for shipping/billing)
    createTable('addresses', {
      columns: {
        street: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        zipCode: { type: 'string' },
        country: { type: 'string' },
        addressType: { type: 'string' }, // 'shipping' or 'billing'
        customerId: { type: 'uuid' },
        createdAt: { type: 'date' }
      },
      foreignKeys: {
        customerId: {
          references: 'customers.id',
          onDelete: 'cascade'
        }
      }
    });

    // Create carts table
    createTable('carts', {
      columns: {
        status: { type: 'string' }, // 'active', 'abandoned', 'converted'
        customerId: { type: 'uuid' },
        createdAt: { type: 'date' },
        updatedAt: { type: 'date' }
      },
      foreignKeys: {
        customerId: {
          references: 'customers.id',
          onDelete: 'cascade'
        }
      }
    });

    // Create cart_items table (junction table: carts <-> products)
    createTable('cart_items', {
      columns: {
        quantity: { type: 'number' },
        price: { type: 'number' }, // Price at time of adding to cart
        cartId: { type: 'uuid' },
        productId: { type: 'uuid' },
        createdAt: { type: 'date' }
      },
      foreignKeys: {
        cartId: {
          references: 'carts.id',
          onDelete: 'cascade'
        },
        productId: {
          references: 'products.id',
          onDelete: 'restrict'
        }
      }
    });

    // Create orders table
    createTable('orders', {
      columns: {
        orderNumber: { type: 'string' },
        total: { type: 'number' },
        subtotal: { type: 'number' },
        tax: { type: 'number' },
        shipping: { type: 'number' },
        status: { type: 'string' }, // 'pending', 'processing', 'shipped', 'delivered', 'cancelled'
        customerId: { type: 'uuid' },
        shippingAddressId: { type: 'uuid' },
        billingAddressId: { type: 'uuid' },
        createdAt: { type: 'date' },
        shippedAt: { type: 'date' },
        deliveredAt: { type: 'date' }
      },
      foreignKeys: {
        customerId: {
          references: 'customers.id',
          onDelete: 'restrict'
        },
        shippingAddressId: {
          references: 'addresses.id',
          onDelete: 'set-null'
        },
        billingAddressId: {
          references: 'addresses.id',
          onDelete: 'set-null'
        }
      }
    });

    // Create order_items table (what was actually ordered)
    createTable('order_items', {
      columns: {
        quantity: { type: 'number' },
        price: { type: 'number' }, // Price at time of order
        total: { type: 'number' },
        orderId: { type: 'uuid' },
        productId: { type: 'uuid' },
        createdAt: { type: 'date' }
      },
      foreignKeys: {
        orderId: {
          references: 'orders.id',
          onDelete: 'cascade'
        },
        productId: {
          references: 'products.id',
          onDelete: 'restrict'
        }
      }
    });

    // Create payments table
    createTable('payments', {
      columns: {
        amount: { type: 'number' },
        paymentMethod: { type: 'string' }, // 'credit_card', 'paypal', 'bank_transfer'
        status: { type: 'string' }, // 'pending', 'completed', 'failed', 'refunded'
        transactionId: { type: 'string' },
        orderId: { type: 'uuid' },
        createdAt: { type: 'date' }
      },
      foreignKeys: {
        orderId: {
          references: 'orders.id',
          onDelete: 'cascade'
        }
      }
    });

    // Create reviews table (product reviews by customers)
    createTable('reviews', {
      columns: {
        rating: { type: 'number' }, // 1-5
        title: { type: 'string' },
        comment: { type: 'string' },
        customerId: { type: 'uuid' },
        productId: { type: 'uuid' },
        orderId: { type: 'uuid' },
        createdAt: { type: 'date' }
      },
      foreignKeys: {
        customerId: {
          references: 'customers.id',
          onDelete: 'cascade'
        },
        productId: {
          references: 'products.id',
          onDelete: 'cascade'
        },
        orderId: {
          references: 'orders.id',
          onDelete: 'set-null'
        }
      }
    });

    // Insert sample data
    const baseDate = new Date('2024-01-15');
    const now = new Date().toISOString();

    // Categories
    const catElectronics = insertRow('categories', {
      name: 'Electronics',
      description: 'Electronic devices and accessories'
    });
    const catClothing = insertRow('categories', {
      name: 'Clothing',
      description: 'Apparel and fashion items'
    });
    const catHome = insertRow('categories', {
      name: 'Home & Garden',
      description: 'Home improvement and garden supplies'
    });
    const catBooks = insertRow('categories', {
      name: 'Books',
      description: 'Books and reading materials'
    });

    // Customers
    const customer1 = insertRow('customers', {
      name: 'John Doe',
      email: 'john.doe@email.com',
      phone: '555-0101',
      password: 'hashed_password_1'
    });
    const customer2 = insertRow('customers', {
      name: 'Jane Smith',
      email: 'jane.smith@email.com',
      phone: '555-0102',
      password: 'hashed_password_2'
    });
    const customer3 = insertRow('customers', {
      name: 'Bob Johnson',
      email: 'bob.johnson@email.com',
      phone: '555-0103',
      password: 'hashed_password_3'
    });
    const customer4 = insertRow('customers', {
      name: 'Alice Williams',
      email: 'alice.williams@email.com',
      phone: '555-0104',
      password: 'hashed_password_4'
    });
    const customer5 = insertRow('customers', {
      name: 'Charlie Brown',
      email: 'charlie.brown@email.com',
      phone: '555-0105',
      password: 'hashed_password_5'
    });

    // Admins
    insertRow('admins', {
      name: 'Admin User',
      email: 'admin@store.com',
      role: 'superadmin'
    });
    insertRow('admins', {
      name: 'Manager User',
      email: 'manager@store.com',
      role: 'manager'
    });
    insertRow('admins', {
      name: 'Support Staff',
      email: 'support@store.com',
      role: 'support'
    });

    // Products - Electronics
    const product1 = insertRow('products', {
      name: 'MacBook Pro 16"',
      description: 'High-performance laptop with M2 Pro chip, 16GB RAM, 512GB SSD',
      price: 2499.99,
      stock: 25,
      sku: 'MBP-16-M2-512',
      imageUrl: '/images/macbook-pro.jpg',
      categoryId: catElectronics.id
    });
    const product2 = insertRow('products', {
      name: 'Wireless Mouse',
      description: 'Ergonomic wireless mouse with precision tracking',
      price: 29.99,
      stock: 150,
      sku: 'WM-001',
      imageUrl: '/images/wireless-mouse.jpg',
      categoryId: catElectronics.id
    });
    const product3 = insertRow('products', {
      name: 'Mechanical Keyboard',
      description: 'RGB mechanical keyboard with Cherry MX switches',
      price: 129.99,
      stock: 80,
      sku: 'KB-MECH-RGB',
      imageUrl: '/images/mechanical-keyboard.jpg',
      categoryId: catElectronics.id
    });
    const product4 = insertRow('products', {
      name: '4K Monitor 27"',
      description: 'Ultra HD 4K monitor with HDR support',
      price: 449.99,
      stock: 40,
      sku: 'MON-27-4K',
      imageUrl: '/images/4k-monitor.jpg',
      categoryId: catElectronics.id
    });
    const product5 = insertRow('products', {
      name: 'Wireless Earbuds',
      description: 'Noise-cancelling wireless earbuds with 30hr battery',
      price: 199.99,
      stock: 120,
      sku: 'EB-WIRELESS-NC',
      imageUrl: '/images/wireless-earbuds.jpg',
      categoryId: catElectronics.id
    });

    // Products - Clothing
    const product6 = insertRow('products', {
      name: 'Cotton T-Shirt',
      description: '100% organic cotton t-shirt, available in multiple colors',
      price: 24.99,
      stock: 200,
      sku: 'TSH-COT-001',
      imageUrl: '/images/cotton-tshirt.jpg',
      categoryId: catClothing.id
    });
    const product7 = insertRow('products', {
      name: 'Denim Jeans',
      description: 'Classic fit denim jeans, multiple sizes available',
      price: 79.99,
      stock: 150,
      sku: 'JNS-DEN-001',
      imageUrl: '/images/denim-jeans.jpg',
      categoryId: catClothing.id
    });
    const product8 = insertRow('products', {
      name: 'Running Shoes',
      description: 'Lightweight running shoes with cushioned sole',
      price: 89.99,
      stock: 100,
      sku: 'SHO-RUN-001',
      imageUrl: '/images/running-shoes.jpg',
      categoryId: catClothing.id
    });

    // Products - Home
    const product9 = insertRow('products', {
      name: 'Coffee Maker',
      description: 'Programmable coffee maker with thermal carafe',
      price: 89.99,
      stock: 60,
      sku: 'CM-PROG-001',
      imageUrl: '/images/coffee-maker.jpg',
      categoryId: catHome.id
    });
    const product10 = insertRow('products', {
      name: 'Garden Tool Set',
      description: 'Complete garden tool set with 10 pieces',
      price: 49.99,
      stock: 75,
      sku: 'GT-SET-001',
      imageUrl: '/images/garden-tools.jpg',
      categoryId: catHome.id
    });

    // Products - Books
    const product11 = insertRow('products', {
      name: 'JavaScript: The Definitive Guide',
      description: 'Comprehensive guide to JavaScript programming',
      price: 59.99,
      stock: 50,
      sku: 'BK-JS-DEF',
      imageUrl: '/images/js-book.jpg',
      categoryId: catBooks.id
    });
    const product12 = insertRow('products', {
      name: 'Database Design Fundamentals',
      description: 'Learn database design principles and best practices',
      price: 44.99,
      stock: 40,
      sku: 'BK-DB-FUND',
      imageUrl: '/images/db-book.jpg',
      categoryId: catBooks.id
    });

    // Addresses
    const address1 = insertRow('addresses', {
      street: '123 Main Street',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
      addressType: 'shipping',
      customerId: customer1.id
    });
    const address1b = insertRow('addresses', {
      street: '123 Main Street',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
      addressType: 'billing',
      customerId: customer1.id
    });
    const address2 = insertRow('addresses', {
      street: '456 Oak Avenue',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001',
      country: 'USA',
      addressType: 'shipping',
      customerId: customer2.id
    });
    const address3 = insertRow('addresses', {
      street: '789 Pine Road',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      country: 'USA',
      addressType: 'shipping',
      customerId: customer3.id
    });
    const address4 = insertRow('addresses', {
      street: '321 Elm Street',
      city: 'Houston',
      state: 'TX',
      zipCode: '77001',
      country: 'USA',
      addressType: 'shipping',
      customerId: customer4.id
    });

    // Carts
    const cart1 = insertRow('carts', {
      status: 'active',
      customerId: customer1.id
    });
    const cart2 = insertRow('carts', {
      status: 'active',
      customerId: customer2.id
    });
    const cart3 = insertRow('carts', {
      status: 'abandoned',
      customerId: customer3.id
    });

    // Cart Items
    insertRow('cart_items', {
      quantity: 1,
      price: 2499.99,
      cartId: cart1.id,
      productId: product1.id
    });
    insertRow('cart_items', {
      quantity: 2,
      price: 29.99,
      cartId: cart1.id,
      productId: product2.id
    });
    insertRow('cart_items', {
      quantity: 1,
      price: 129.99,
      cartId: cart2.id,
      productId: product3.id
    });
    insertRow('cart_items', {
      quantity: 1,
      price: 449.99,
      cartId: cart2.id,
      productId: product4.id
    });
    insertRow('cart_items', {
      quantity: 3,
      price: 24.99,
      cartId: cart3.id,
      productId: product6.id
    });

    // Orders
    const order1 = insertRow('orders', {
      orderNumber: 'ORD-2024-001',
      subtotal: 1059.97,
      tax: 84.80,
      shipping: 15.00,
      total: 1159.77,
      status: 'delivered',
      customerId: customer1.id,
      shippingAddressId: address1.id,
      billingAddressId: address1b.id,
      shippedAt: new Date('2024-01-16').toISOString(),
      deliveredAt: new Date('2024-01-18').toISOString()
    });
    const order2 = insertRow('orders', {
      orderNumber: 'ORD-2024-002',
      subtotal: 579.98,
      tax: 46.40,
      shipping: 10.00,
      total: 636.38,
      status: 'shipped',
      customerId: customer2.id,
      shippingAddressId: address2.id,
      billingAddressId: address2.id,
      shippedAt: new Date('2024-01-20').toISOString()
    });
    const order3 = insertRow('orders', {
      orderNumber: 'ORD-2024-003',
      subtotal: 79.99,
      tax: 6.40,
      shipping: 5.00,
      total: 91.39,
      status: 'processing',
      customerId: customer3.id,
      shippingAddressId: address3.id,
      billingAddressId: address3.id
    });
    const order4 = insertRow('orders', {
      orderNumber: 'ORD-2024-004',
      subtotal: 149.98,
      tax: 12.00,
      shipping: 8.00,
      total: 169.98,
      status: 'completed',
      customerId: customer4.id,
      shippingAddressId: address4.id,
      billingAddressId: address4.id,
      shippedAt: new Date('2024-01-22').toISOString(),
      deliveredAt: new Date('2024-01-24').toISOString()
    });

    // Order Items
    insertRow('order_items', {
      quantity: 1,
      price: 999.99,
      total: 999.99,
      orderId: order1.id,
      productId: product1.id
    });
    insertRow('order_items', {
      quantity: 2,
      price: 29.99,
      total: 59.98,
      orderId: order1.id,
      productId: product2.id
    });
    insertRow('order_items', {
      quantity: 1,
      price: 129.99,
      total: 129.99,
      orderId: order2.id,
      productId: product3.id
    });
    insertRow('order_items', {
      quantity: 1,
      price: 449.99,
      total: 449.99,
      orderId: order2.id,
      productId: product4.id
    });
    insertRow('order_items', {
      quantity: 1,
      price: 79.99,
      total: 79.99,
      orderId: order3.id,
      productId: product7.id
    });
    insertRow('order_items', {
      quantity: 1,
      price: 89.99,
      total: 89.99,
      orderId: order4.id,
      productId: product9.id
    });
    insertRow('order_items', {
      quantity: 1,
      price: 59.99,
      total: 59.99,
      orderId: order4.id,
      productId: product11.id
    });

    // Payments
    insertRow('payments', {
      amount: 1159.77,
      paymentMethod: 'credit_card',
      status: 'completed',
      transactionId: 'TXN-001-2024',
      orderId: order1.id
    });
    insertRow('payments', {
      amount: 636.38,
      paymentMethod: 'paypal',
      status: 'completed',
      transactionId: 'TXN-002-2024',
      orderId: order2.id
    });
    insertRow('payments', {
      amount: 91.39,
      paymentMethod: 'credit_card',
      status: 'pending',
      transactionId: 'TXN-003-2024',
      orderId: order3.id
    });
    insertRow('payments', {
      amount: 169.98,
      paymentMethod: 'bank_transfer',
      status: 'completed',
      transactionId: 'TXN-004-2024',
      orderId: order4.id
    });

    // Reviews
    insertRow('reviews', {
      rating: 5,
      title: 'Excellent laptop!',
      comment: 'Fast performance, great battery life. Highly recommend!',
      customerId: customer1.id,
      productId: product1.id,
      orderId: order1.id
    });
    insertRow('reviews', {
      rating: 4,
      title: 'Good mouse',
      comment: 'Comfortable to use, battery lasts long. Minor tracking issues sometimes.',
      customerId: customer1.id,
      productId: product2.id,
      orderId: order1.id
    });
    insertRow('reviews', {
      rating: 5,
      title: 'Amazing keyboard',
      comment: 'Best mechanical keyboard I\'ve used. The RGB lighting is beautiful!',
      customerId: customer2.id,
      productId: product3.id,
      orderId: order2.id
    });
    insertRow('reviews', {
      rating: 5,
      title: 'Perfect monitor',
      comment: 'Crystal clear display, great for work and gaming.',
      customerId: customer2.id,
      productId: product4.id,
      orderId: order2.id
    });
    insertRow('reviews', {
      rating: 4,
      title: 'Great coffee maker',
      comment: 'Makes excellent coffee. Easy to program and use.',
      customerId: customer4.id,
      productId: product9.id,
      orderId: order4.id
    });

    console.log('Comprehensive e-commerce database initialized successfully');
  } catch (error) {
    console.error('Error initializing demo data:', error);
    throw error;
  }
}

/**
 * Export database to JSON string
 */
export function exportDatabase() {
  const db = loadDB();
  return JSON.stringify(db, null, 2);
}

/**
 * Import database from JSON string
 * @param {string} jsonString - JSON string of database
 * @param {boolean} overwrite - If true, replaces existing data. If false, merges.
 */
export function importDatabase(jsonString, overwrite = false) {
  try {
    const importedDb = JSON.parse(jsonString);
    
    // Validate structure
    if (!importedDb.meta || !importedDb.tables) {
      throw new Error('Invalid database format. Expected { meta: {}, tables: {} }');
    }

    if (overwrite) {
      // Replace entire database
      saveDB(importedDb);
    } else {
      // Merge with existing database
      const currentDb = loadDB();
      // Merge tables
      for (const tableName in importedDb.tables) {
        currentDb.tables[tableName] = importedDb.tables[tableName];
      }
      // Update meta
      currentDb.meta = { ...currentDb.meta, ...importedDb.meta };
      saveDB(currentDb);
    }
    
    return true;
  } catch (error) {
    console.error('Error importing database:', error);
    throw new Error(`Failed to import database: ${error.message}`);
  }
}

/**
 * Get sample/predefined dataset
 * Returns a complete database structure with sample data
 */
export function getSampleDataset() {
  const sampleDb = {
    meta: {
      version: '1.0',
      createdAt: new Date().toISOString(),
      description: 'Sample Online Store Database'
    },
    tables: {}
  };

  // This will be populated by initSampleData, but we'll create a clean version
  // For now, return empty - the actual sample is created by initSampleData
  // Users can export their current database as a sample
  return sampleDb;
}
