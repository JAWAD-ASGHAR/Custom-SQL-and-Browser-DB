const STORAGE_KEY = 'MiniDB';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

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

export function saveDB(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (error) {
    console.error('Error saving database:', error);
    throw new Error('Failed to save database. Storage may be full.');
  }
}

export function getTable(tableName) {
  const db = loadDB();
  return db.tables[tableName] || null;
}

export function getAllTables() {
  const db = loadDB();
  return db.tables;
}

export function createTable(name, schema) {
  const db = loadDB();
  
  if (db.tables[name]) {
    throw new Error(`Table "${name}" already exists`);
  }

  const columns = {
    id: { type: 'uuid', primary: true },
    ...schema.columns
  };

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

function validateSchema(columns, foreignKeys) {
  for (const fkColumn in foreignKeys) {
    if (!columns[fkColumn]) {
      throw new Error(`Foreign key column "${fkColumn}" does not exist in schema`);
    }
    const fk = foreignKeys[fkColumn];
    if (!fk.references) {
      throw new Error(`Foreign key "${fkColumn}" must specify references`);
    }
    const [refTable] = fk.references.split('.');
    if (!refTable) {
      throw new Error(`Invalid foreign key reference format: "${fk.references}"`);
    }
  }
}

export function insertRow(tableName, data) {
  const db = loadDB();
  const table = db.tables[tableName];
  
  if (!table) {
    throw new Error(`Table "${tableName}" does not exist`);
  }

  const id = generateUUID();
  
  const row = { id };
  
  for (const columnName in table.schema.columns) {
    if (columnName === 'id') continue;
    
    const column = table.schema.columns[columnName];
    const value = data[columnName];
    
    if (columnName === 'createdAt' && column.type === 'date' && (value === undefined || value === null || value === '')) {
      row[columnName] = new Date().toISOString();
    }
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

  validateForeignKeys(tableName, row, db);

  table.rows[id] = row;
  saveDB(db);
  
  return row;
}

export function updateRow(tableName, id, changes) {
  const db = loadDB();
  const table = db.tables[tableName];
  
  if (!table) {
    throw new Error(`Table "${tableName}" does not exist`);
  }

  if (!table.rows[id]) {
    throw new Error(`Row with id "${id}" does not exist`);
  }

  if ('id' in changes) {
    delete changes.id;
  }

  const updatedRow = { ...table.rows[id] };
  
  for (const columnName in changes) {
    if (!table.schema.columns[columnName]) {
      throw new Error(`Column "${columnName}" does not exist`);
    }
    updatedRow[columnName] = changes[columnName];
  }

  validateForeignKeys(tableName, updatedRow, db);

  table.rows[id] = updatedRow;
  saveDB(db);
  
  return updatedRow;
}

export function deleteRow(tableName, id) {
  const db = loadDB();
  const table = db.tables[tableName];
  
  if (!table) {
    throw new Error(`Table "${tableName}" does not exist`);
  }

  if (!table.rows[id]) {
    throw new Error(`Row with id "${id}" does not exist`);
  }

  handleCascadeDelete(tableName, id, db);

  delete table.rows[id];
  saveDB(db);
}

function validateForeignKeys(tableName, row, db) {
  const table = db.tables[tableName];
  if (!table) return;

  for (const fkColumn in table.schema.foreignKeys) {
    const fkValue = row[fkColumn];
    
    if (fkValue === null || fkValue === undefined || fkValue === '') {
      continue;
    }

    const fk = table.schema.foreignKeys[fkColumn];
    const [refTable, refColumn] = fk.references.split('.');
    
    if (!db.tables[refTable]) {
      throw new Error(`Referenced table "${refTable}" does not exist`);
    }

    const refTableObj = db.tables[refTable];
    const refRow = refTableObj.rows[fkValue];
    
    if (!refRow) {
      throw new Error(`Foreign key violation: Referenced row "${fkValue}" does not exist in table "${refTable}"`);
    }

    if (refColumn && !refTableObj.schema.columns[refColumn]) {
      throw new Error(`Referenced column "${refColumn}" does not exist in table "${refTable}"`);
    }
  }
}

function handleCascadeDelete(tableName, id, db) {
  const toDelete = [];
  const toUpdate = [];
  
  for (const otherTableName in db.tables) {
    const otherTable = db.tables[otherTableName];
    
    for (const fkColumn in otherTable.schema.foreignKeys) {
      const fk = otherTable.schema.foreignKeys[fkColumn];
      const [refTable] = fk.references.split('.');
      
      if (refTable === tableName) {
        for (const rowId in otherTable.rows) {
          const row = otherTable.rows[rowId];
          
          if (row[fkColumn] === id) {
            switch (fk.onDelete) {
              case 'cascade':
                toDelete.push({ tableName: otherTableName, id: rowId });
                break;
              case 'set-null':
                otherTable.rows[rowId][fkColumn] = null;
                break;
              case 'restrict':
              default:
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
  
  for (const { tableName: childTable, id: childId } of toDelete) {
    delete db.tables[childTable].rows[childId];
    handleCascadeDelete(childTable, childId, db);
  }
}

export function getTableRows(tableName) {
  const table = getTable(tableName);
  if (!table) {
    return [];
  }
  return Object.values(table.rows);
}

function migrateDatabaseIfNeeded() {
  const db = loadDB();
  
  if (Object.keys(db.tables).length === 0) {
    return;
  }

  if (db.tables.users) {
    return;
  }

  console.log('Old database structure detected. Migrating to new structure...');
  
  try {
    db.tables.users = {
      name: 'users',
      schema: {
        columns: {
          id: { type: 'uuid', primary: true },
          username: { type: 'string' },
          email: { type: 'string' },
          password: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          createdAt: { type: 'date' }
        },
        foreignKeys: {}
      },
      rows: {}
    };

    if (db.tables.customers) {
      if (!db.tables.customers.schema.columns.userId) {
        db.tables.customers.schema.columns.userId = { type: 'uuid' };
        db.tables.customers.schema.foreignKeys.userId = {
          references: 'users.id',
          onDelete: 'cascade'
        };
      }

      for (const customerId in db.tables.customers.rows) {
        const customer = db.tables.customers.rows[customerId];
        
        const userId = generateUUID();
        
        const email = customer.email || '';
        const name = customer.name || '';
        const nameParts = name.split(' ');
        
        db.tables.users.rows[userId] = {
          id: userId,
          username: email ? email.split('@')[0] : (name ? name.toLowerCase().replace(/\s+/g, '') : `user_${customerId}`),
          email: email,
          password: customer.password || '',
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          createdAt: customer.createdAt || new Date().toISOString()
        };

        db.tables.customers.rows[customerId].userId = userId;
        delete db.tables.customers.rows[customerId].name;
        delete db.tables.customers.rows[customerId].email;
        delete db.tables.customers.rows[customerId].password;
      }
    }

    if (db.tables.admins) {
      if (!db.tables.admins.schema.columns.userId) {
        db.tables.admins.schema.columns.userId = { type: 'uuid' };
        db.tables.admins.schema.foreignKeys.userId = {
          references: 'users.id',
          onDelete: 'cascade'
        };
      }

      for (const adminId in db.tables.admins.rows) {
        const admin = db.tables.admins.rows[adminId];
        
        const userId = generateUUID();
        
        const email = admin.email || '';
        const name = admin.name || '';
        const nameParts = name.split(' ');
        
        db.tables.users.rows[userId] = {
          id: userId,
          username: email ? email.split('@')[0] : (name ? name.toLowerCase().replace(/\s+/g, '') : `admin_${adminId}`),
          email: email,
          password: '',
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          createdAt: admin.createdAt || new Date().toISOString()
        };

        db.tables.admins.rows[adminId].userId = userId;
        delete db.tables.admins.rows[adminId].name;
        delete db.tables.admins.rows[adminId].email;
      }
    }

    saveDB(db);
    console.log('Database migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    localStorage.removeItem('MiniDB');
  }
}

export function initSampleData() {
  const db = loadDB();
  
  migrateDatabaseIfNeeded();
  
  const dbAfterMigration = loadDB();
  
  if (Object.keys(dbAfterMigration.tables).length > 0) {
    return;
  }

  try {
    createTable('users', {
      columns: {
        username: { type: 'string' },
        email: { type: 'string' },
        password: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        createdAt: { type: 'date' }
      },
      foreignKeys: {}
    });

    createTable('customers', {
      columns: {
        phone: { type: 'string' },
        userId: { type: 'uuid' },
        createdAt: { type: 'date' }
      },
      foreignKeys: {
        userId: {
          references: 'users.id',
          onDelete: 'cascade'
        }
      }
    });

    createTable('admins', {
      columns: {
        role: { type: 'string' },
        userId: { type: 'uuid' },
        createdAt: { type: 'date' }
      },
      foreignKeys: {
        userId: {
          references: 'users.id',
          onDelete: 'cascade'
        }
      }
    });

    createTable('categories', {
      columns: {
        name: { type: 'string' },
        description: { type: 'string' },
        createdAt: { type: 'date' }
      },
      foreignKeys: {}
    });

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

    createTable('addresses', {
      columns: {
        street: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        zipCode: { type: 'string' },
        country: { type: 'string' },
        addressType: { type: 'string' },
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

    createTable('carts', {
      columns: {
        status: { type: 'string' },
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

    createTable('cart_items', {
      columns: {
        quantity: { type: 'number' },
        price: { type: 'number' },
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

    createTable('orders', {
      columns: {
        orderNumber: { type: 'string' },
        total: { type: 'number' },
        subtotal: { type: 'number' },
        tax: { type: 'number' },
        shipping: { type: 'number' },
        status: { type: 'string' },
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

    createTable('order_items', {
      columns: {
        quantity: { type: 'number' },
        price: { type: 'number' },
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

    createTable('payments', {
      columns: {
        amount: { type: 'number' },
        paymentMethod: { type: 'string' },
        status: { type: 'string' },
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

    createTable('reviews', {
      columns: {
        rating: { type: 'number' },
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

    const baseDate = new Date('2024-01-15');
    const now = new Date().toISOString();

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

    const user1 = insertRow('users', {
      username: 'johndoe',
      email: 'john.doe@email.com',
      password: 'hashed_password_1',
      firstName: 'John',
      lastName: 'Doe'
    });
    const user2 = insertRow('users', {
      username: 'janesmith',
      email: 'jane.smith@email.com',
      password: 'hashed_password_2',
      firstName: 'Jane',
      lastName: 'Smith'
    });
    const user3 = insertRow('users', {
      username: 'bobjohnson',
      email: 'bob.johnson@email.com',
      password: 'hashed_password_3',
      firstName: 'Bob',
      lastName: 'Johnson'
    });
    const user4 = insertRow('users', {
      username: 'alicewilliams',
      email: 'alice.williams@email.com',
      password: 'hashed_password_4',
      firstName: 'Alice',
      lastName: 'Williams'
    });
    const user5 = insertRow('users', {
      username: 'charliebrown',
      email: 'charlie.brown@email.com',
      password: 'hashed_password_5',
      firstName: 'Charlie',
      lastName: 'Brown'
    });
    const user6 = insertRow('users', {
      username: 'adminuser',
      email: 'admin@store.com',
      password: 'hashed_admin_password',
      firstName: 'Admin',
      lastName: 'User'
    });
    const user7 = insertRow('users', {
      username: 'manageruser',
      email: 'manager@store.com',
      password: 'hashed_manager_password',
      firstName: 'Manager',
      lastName: 'User'
    });
    const user8 = insertRow('users', {
      username: 'supportstaff',
      email: 'support@store.com',
      password: 'hashed_support_password',
      firstName: 'Support',
      lastName: 'Staff'
    });

    const customer1 = insertRow('customers', {
      phone: '555-0101',
      userId: user1.id
    });
    const customer2 = insertRow('customers', {
      phone: '555-0102',
      userId: user2.id
    });
    const customer3 = insertRow('customers', {
      phone: '555-0103',
      userId: user3.id
    });
    const customer4 = insertRow('customers', {
      phone: '555-0104',
      userId: user4.id
    });
    const customer5 = insertRow('customers', {
      phone: '555-0105',
      userId: user5.id
    });

    insertRow('admins', {
      role: 'superadmin',
      userId: user6.id
    });
    insertRow('admins', {
      role: 'manager',
      userId: user7.id
    });
    insertRow('admins', {
      role: 'support',
      userId: user8.id
    });

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

export function exportDatabase() {
  const db = loadDB();
  return JSON.stringify(db, null, 2);
}

export function importDatabase(jsonString, overwrite = false) {
  try {
    const importedDb = JSON.parse(jsonString);
    
    if (!importedDb.meta || !importedDb.tables) {
      throw new Error('Invalid database format. Expected { meta: {}, tables: {} }');
    }

    if (overwrite) {
      saveDB(importedDb);
    } else {
      const currentDb = loadDB();
      for (const tableName in importedDb.tables) {
        currentDb.tables[tableName] = importedDb.tables[tableName];
      }
      currentDb.meta = { ...currentDb.meta, ...importedDb.meta };
      saveDB(currentDb);
    }
    
    return true;
  } catch (error) {
    console.error('Error importing database:', error);
    throw new Error(`Failed to import database: ${error.message}`);
  }
}

export function getSampleDataset() {
  const sampleDb = {
    meta: {
      version: '1.0',
      createdAt: new Date().toISOString(),
      description: 'Sample Online Store Database'
    },
    tables: {}
  };

  return sampleDb;
}
