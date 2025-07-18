import * as SQLite from 'expo-sqlite';

// Type definitions
export interface Product {
  id: number;
  name: string;
  sku?: string;
  barcode?: string;
  category: string;
  price: number;
  cost?: number;
  image_url?: string;
  created_at: string;
  updated_at: string;
  current_stock?: number;
  min_stock?: number;
  max_stock?: number;
  location?: string;
}

export interface InventoryItem {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  price: number;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  location: string;
  last_updated: string;
}

export interface StockMovement {
  id: number;
  product_id: number;
  type: 'in' | 'out';
  quantity: number;
  reason: string;
  user: string;
  created_at: string;
}

export interface DashboardStats {
  totalProducts: number;
  lowStockItems: number;
  outOfStock: number;
  recentTransactions: number;
}

interface Transaction {
  id: number;
  type: 'pos' | 'internal';
  total_amount: number;
  employee_id?: number;
  customer_name?: string;
  payment_method?: string;
  created_at: string;
}

interface TransactionItem {
  id: number;
  transaction_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  reason?: string;
  product_name: string;
}

interface TransactionWithItems extends Transaction {
  items: TransactionItem[];
}

export interface ChangeTracker {
  products_last_modified: string;
  inventory_last_modified: string;
  transactions_last_modified: string;
}

// Database name
const DATABASE_NAME = 'smartstock.db';
const DEFAULT_MIN_STOCK = 5; // Configurable default minimum stock level

// Database instance
let db: SQLite.SQLiteDatabase | null = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

// Get database instance with retry
const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) {
    if (isInitializing && initPromise) {
      // Wait for initialization to complete
      await initPromise;
    } else {
      // Try to initialize if not already doing so
      await initDatabase();
    }
    
    if (!db) {
      throw new Error('Database failed to initialize');
    }
  }
  return db;
};

// Add migration function
const migrateDatabase = async (database: SQLite.SQLiteDatabase): Promise<void> => {
  try {
    // Check if sku column exists
    const columns = await database.getAllAsync("PRAGMA table_info(products)") as Array<{name: string}>;
    const hasSkuColumn = columns.some(col => col.name === 'sku');
    
    if (!hasSkuColumn) {
      console.log('Adding missing sku column to products table...');
      
      // Start transaction
      await database.execAsync('BEGIN TRANSACTION');
      
      try {
        // 1. Add the column without UNIQUE constraint
        await database.execAsync('ALTER TABLE products ADD COLUMN sku TEXT');
        
        // 2. Generate and update SKUs for existing products
        const products = await database.getAllAsync('SELECT id, name FROM products') as Array<{id: number; name: string}>;
        for (const product of products) {
          const sku = `SKU-${product.id.toString().padStart(4, '0')}`;
          await database.runAsync(
            'UPDATE products SET sku = ? WHERE id = ?',
            [sku, product.id]
          );
        }

        // 3. Create a new table with the UNIQUE constraint
        await database.execAsync(`
          CREATE TABLE products_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            sku TEXT UNIQUE,
            barcode TEXT,
            category TEXT,
            price REAL NOT NULL,
            cost REAL,
            image_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`);
        
        // 4. Copy data to new table
        await database.execAsync(`
          INSERT INTO products_new (id, name, sku, barcode, category, price, cost, image_url, created_at, updated_at)
          SELECT id, name, sku, barcode, category, price, cost, image_url, created_at, updated_at
          FROM products`);
        
        // 5. Drop old table and rename new one
        await database.execAsync('DROP TABLE products');
        await database.execAsync('ALTER TABLE products_new RENAME TO products');
        
        // Commit transaction
        await database.execAsync('COMMIT');
        console.log('Successfully added sku column and generated SKUs for existing products');
      } catch (error) {
        // Rollback on error
        await database.execAsync('ROLLBACK');
        throw error;
      }
    }
  } catch (error) {
    console.error('Error during database migration:', error);
    throw error;
  }
};

// Initialize database
export const initDatabase = async (): Promise<void> => {
  if (isInitializing && initPromise) {
    return initPromise;
  }

  if (db) {
    return; // Already initialized
  }

  isInitializing = true;
  initPromise = (async () => {
    try {
      console.log('Initializing database...');
      
      // Use the correct Expo SQLite v15 API
      db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      console.log('Database opened successfully');

      // Verify database structure
      const tables = await db.getAllAsync(
        "SELECT name FROM sqlite_master WHERE type='table'"
      ) as Array<{name: string}>;
      console.log('Existing tables:', tables.map(t => t.name).join(', '));
      
      await createTables();
      console.log('Database tables created successfully');

      // Run migrations
      await migrateDatabase(db);
      
      // Create missing inventory records
      await createMissingInventoryRecords();
      console.log('Missing inventory records created');

      // Verify products table structure
      const columns = await db.getAllAsync(
        "PRAGMA table_info(products)"
      ) as Array<{name: string}>;
      console.log('Products table columns:', columns.map(c => c.name).join(', '));
      
      // Create test product if none exist
      const products = await db.getAllAsync('SELECT COUNT(*) as count FROM products') as Array<{count: number}>;
      if (products[0].count === 0) {
        console.log('Creating test product...');
        await addProduct({
          name: 'Test Product',
          sku: 'TEST-001',
          category: 'Test',
          price: 99.99,
          barcode: '123456789'
        });
      }

      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      // If there was an error, try to delete the database and recreate it
      try {
        if (db) {
          await db.closeAsync();
        }
        // Since deleteAsync isn't available in expo-sqlite, we'll need to handle this differently
        db = null; // Just close and null the database instead
        console.log('Closed existing database due to initialization error');
        
        // Try to create a fresh database
        db = await SQLite.openDatabaseAsync(DATABASE_NAME);
        await createTables();
        console.log('Created fresh database successfully');
      } catch (recreateError) {
        console.error('Failed to recreate database:', recreateError);
        db = null;
        throw recreateError;
      }
    } finally {
      isInitializing = false;
    }
  })();

  return initPromise;
};

// Create tables
const createTables = async (): Promise<void> => {
  const database = await getDatabase();

  const tables = [
    // Products table
    `CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT UNIQUE,
      barcode TEXT,
      category TEXT,
      price REAL NOT NULL,
      cost REAL,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Inventory table
    `CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      current_stock INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 0,
      max_stock INTEGER DEFAULT 100,
      location TEXT DEFAULT 'main',
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products (id)
    )`,

    // Transactions table
    `CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      total_amount REAL,
      employee_id INTEGER,
      customer_name TEXT,
      payment_method TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'pending'
    )`,

    // Transaction items table
    `CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER,
      product_id INTEGER,
      quantity INTEGER,
      unit_price REAL,
      reason TEXT,
      FOREIGN KEY (transaction_id) REFERENCES transactions (id),
      FOREIGN KEY (product_id) REFERENCES products (id)
    )`,

    // Stock movements table
    `CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      type TEXT NOT NULL,
      quantity INTEGER,
      reason TEXT,
      user TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products (id)
    )`,

    // Sync queue table
    `CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      record_id INTEGER,
      action TEXT NOT NULL,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Change tracker table
    `CREATE TABLE IF NOT EXISTS change_tracker (
      table_name TEXT PRIMARY KEY,
      last_modified TEXT NOT NULL
    )`
  ];

  for (const table of tables) {
    await database.execAsync(table);
  }

  // Insert initial change tracker records
  await database.runAsync(`
    INSERT OR IGNORE INTO change_tracker (table_name, last_modified) VALUES
      ('products', datetime('now')),
      ('inventory', datetime('now')),
      ('transactions', datetime('now'));
  `);
};

// Update last modified timestamp for a table
const updateLastModified = async (tableName: string): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE change_tracker SET last_modified = datetime("now") WHERE table_name = ?',
    [tableName]
  );
};

// Get last modified timestamps
export const getChangeTrackerStatus = async (): Promise<ChangeTracker> => {
  const database = await getDatabase();
  const result = await database.getAllAsync('SELECT * FROM change_tracker LIMIT 1') as Array<{
    products_last_modified: string;
    inventory_last_modified: string;
    transactions_last_modified: string;
  }>;
  
  const now = new Date().toISOString();
  return {
    products_last_modified: result[0]?.products_last_modified || now,
    inventory_last_modified: result[0]?.inventory_last_modified || now,
    transactions_last_modified: result[0]?.transactions_last_modified || now
  };
};

// Generate a unique SKU
const generateSKU = async (database: SQLite.SQLiteDatabase, category: string): Promise<string> => {
  // Get category prefix (first 3 letters uppercase)
  const prefix = category.substring(0, 3).toUpperCase();
  
  // Get the highest number used for this category
  const result = await database.getAllAsync(
    'SELECT sku FROM products WHERE category = ? AND sku LIKE ?',
    [category, `${prefix}%`]
  ) as Array<{sku: string}>;
  
  let maxNum = 0;
  result.forEach(row => {
    const match = row.sku.match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (num > maxNum) maxNum = num;
    }
  });
  
  // Generate new SKU with incremented number
  const newNum = maxNum + 1;
  const sku = `${prefix}-${newNum.toString().padStart(4, '0')}`;
  
  // Check if SKU already exists (just in case)
  const exists = await database.getAllAsync(
    'SELECT 1 FROM products WHERE sku = ?',
    [sku]
  ) as Array<{1: number}>;
  
  if (exists.length > 0) {
    // Add random suffix if SKU already exists
    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${sku}-${randomSuffix}`;
  }
  
  return sku;
};

// Product operations
export const addProduct = async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<number> => {
  const database = await getDatabase();
  
  // Generate SKU if not provided
  const sku = product.sku || await generateSKU(database, product.category);
  
  const result = await database.runAsync(
    'INSERT INTO products (name, sku, barcode, category, price, cost, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      product.name, 
      sku, 
      product.barcode || null, 
      product.category, 
      product.price, 
      product.cost || null, 
      product.image_url || null
    ]
  );
  
  const productId = result.lastInsertRowId;
  
  // Create initial inventory record
  await database.runAsync(
    'INSERT INTO inventory (product_id, current_stock, min_stock, max_stock, location) VALUES (?, 0, 0, 100, ?)',
    [productId, 'main']
  );
  
  await updateLastModified('products');
  return productId;
};

export const getProducts = async (): Promise<Product[]> => {
  const database = await getDatabase();
  const result = await database.getAllAsync(`
    SELECT 
      p.*,
      COALESCE(i.current_stock, 0) as current_stock,
      COALESCE(i.min_stock, 0) as min_stock,
      COALESCE(i.max_stock, 100) as max_stock,
      COALESCE(i.location, 'main') as location
    FROM products p
    LEFT JOIN inventory i ON p.id = i.product_id
    ORDER BY p.name
  `);
  return result as Product[];
};

export const updateProduct = async (id: number, product: Partial<Product>): Promise<void> => {
  const database = await getDatabase();
  const fields = Object.keys(product).filter(key => key !== 'id' && key !== 'created_at' && key !== 'updated_at');
  const values = fields.map(field => product[field as keyof Product]).filter(val => val !== undefined);
  
  if (fields.length === 0) return;
  
  const query = `UPDATE products SET ${fields.map(f => `${f} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  await database.runAsync(query, [...values, id]);
};

export const deleteProduct = async (id: number): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM products WHERE id = ?', [id]);
};

export const getProductById = async (id: number): Promise<Product | null> => {
  const database = await getDatabase();
  const result = await database.getFirstAsync('SELECT * FROM products WHERE id = ?', [id]);
  return result as Product | null;
};

export const updateProductStock = async (productId: number, quantity: number): Promise<void> => {
  const database = await getDatabase();
  
  // Check if inventory record exists
  const existingRecord = await database.getFirstAsync(
    'SELECT id FROM inventory WHERE product_id = ?',
    [productId]
  );
  
  if (existingRecord) {
    // Update existing record
    await database.runAsync(
      'UPDATE inventory SET current_stock = current_stock + ?, last_updated = CURRENT_TIMESTAMP WHERE product_id = ?',
      [quantity, productId]
    );
  } else {
    // Insert new record
    await database.runAsync(
      'INSERT INTO inventory (product_id, current_stock, min_stock, max_stock, location) VALUES (?, ?, 0, 100, ?)',
      [productId, Math.max(0, quantity), 'main']
    );
  }
  await updateLastModified('inventory');
};

export const setProductStock = async (productId: number, quantity: number): Promise<void> => {
  const database = await getDatabase();
  
  // Check if inventory record exists
  const existingRecord = await database.getFirstAsync(
    'SELECT id FROM inventory WHERE product_id = ?',
    [productId]
  );
  
  if (existingRecord) {
    // Update existing record
    await database.runAsync(
      'UPDATE inventory SET current_stock = ?, last_updated = CURRENT_TIMESTAMP WHERE product_id = ?',
      [quantity, productId]
    );
  } else {
    // Insert new record
    await database.runAsync(
      'INSERT INTO inventory (product_id, current_stock, min_stock, max_stock, location) VALUES (?, ?, 0, 100, ?)',
      [productId, quantity, 'main']
    );
  }
};

// Inventory operations
export const getInventory = async (): Promise<InventoryItem[]> => {
  const database = await getDatabase();
  const result = await database.getAllAsync(`
    SELECT 
      i.id,
      p.id as product_id,
      p.name as product_name,
      p.sku,
      p.price,
      COALESCE(i.current_stock, 0) as current_stock,
      COALESCE(i.min_stock, 0) as min_stock,
      COALESCE(i.max_stock, 100) as max_stock,
      COALESCE(i.location, 'main') as location,
      COALESCE(i.last_updated, p.created_at) as last_updated
    FROM products p 
    LEFT JOIN inventory i ON p.id = i.product_id 
    ORDER BY p.name
  `);
  return result as InventoryItem[];
};

export const addStockMovement = async (movement: Omit<StockMovement, 'id' | 'created_at'>): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO stock_movements (product_id, type, quantity, reason, user) VALUES (?, ?, ?, ?, ?)',
    [movement.product_id, movement.type, movement.quantity, movement.reason, movement.user]
  );
};

// Create inventory records for products that don't have them
export const createMissingInventoryRecords = async (): Promise<void> => {
  const database = await getDatabase();
  
  // Find products without inventory records
  const productsWithoutInventory = await database.getAllAsync(`
    SELECT p.id 
    FROM products p 
    LEFT JOIN inventory i ON p.id = i.product_id 
    WHERE i.id IS NULL
  `);

  // Create inventory records for products that don't have them
  for (const product of productsWithoutInventory) {
    await database.runAsync(
      'INSERT INTO inventory (product_id, current_stock, min_stock, max_stock, location) VALUES (?, 0, ?, 100, ?)',
      [(product as any).id, DEFAULT_MIN_STOCK, 'main']
    );
  }
};

// Dashboard stats
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const database = await getDatabase();
  
  try {
    // Get total products
    const totalProducts = await database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM products'
    ).then(result => result?.count ?? 0);
    
    // Get out of stock items (including products without inventory records)
    const outOfStock = await database.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) as count 
      FROM products p 
      LEFT JOIN inventory i ON p.id = i.product_id 
      WHERE i.current_stock IS NULL OR i.current_stock = 0
    `).then(result => result?.count ?? 0);
    
    // Get low stock items with configurable minimum
    const lowStockItems = await database.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) as count 
      FROM products p 
      JOIN inventory i ON p.id = i.product_id 
      WHERE i.current_stock > 0 
      AND i.current_stock <= CASE 
        WHEN i.min_stock > 0 THEN i.min_stock 
        ELSE ? 
      END
    `, [DEFAULT_MIN_STOCK]).then(result => result?.count ?? 0);
    
    // Get today's transactions
    const today = new Date().toISOString().split('T')[0];
    const recentTransactions = await database.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) as count 
      FROM transactions 
      WHERE date(created_at) = date('${today}')
    `).then(result => result?.count ?? 0);

    return {
      totalProducts,
      outOfStock,
      lowStockItems,
      recentTransactions
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    // Return default values on error
    return {
      totalProducts: 0,
      outOfStock: 0,
      lowStockItems: 0,
      recentTransactions: 0
    };
  }
};

// Transaction operations
export const addTransaction = async (transaction: {
  type: 'pos' | 'internal';
  total_amount: number;
  employee_id?: number;
  customer_name?: string;
  payment_method?: string;
  items: Array<{
    product_id: number;
    quantity: number;
    unit_price: number;
    reason?: string;
  }>;
}): Promise<number> => {
  const database = await getDatabase();

  // Start transaction
  await database.execAsync('BEGIN TRANSACTION');

  try {
    // Insert transaction
    const result = await database.runAsync(
      `INSERT INTO transactions (type, total_amount, employee_id, customer_name, payment_method)
       VALUES (?, ?, ?, ?, ?)`,
      [
        transaction.type, 
        transaction.total_amount, 
        transaction.employee_id || null, 
        transaction.customer_name || null, 
        transaction.payment_method || null
      ]
    );

    const transactionId = result.lastInsertRowId;

    // Insert transaction items
    for (const item of transaction.items) {
      await database.runAsync(
        `INSERT INTO transaction_items (transaction_id, product_id, quantity, unit_price, reason)
         VALUES (?, ?, ?, ?, ?)`,
        [transactionId, item.product_id, item.quantity, item.unit_price, item.reason || null]
      );

      // Add stock movement record only (no stock update since it's already done)
      await database.runAsync(
        `INSERT INTO stock_movements (product_id, type, quantity, reason, user)
         VALUES (?, ?, ?, ?, ?)`,
        [item.product_id, 'out', item.quantity, item.reason || 'Sale', 'Current User']
      );
    }

    // Commit transaction
    await database.execAsync('COMMIT');
    await updateLastModified('transactions');

    // Add to sync queue
    await addToSyncQueue('transactions', transactionId, 'INSERT', JSON.stringify(transaction));

    return transactionId;
  } catch (error) {
    // Rollback on error
    await database.execAsync('ROLLBACK');
    throw error;
  }
};

export const getTransactions = async (limit: number = 50): Promise<TransactionWithItems[]> => {
  const database = await getDatabase();

  // First get transactions
  const transactions = await database.getAllAsync(
    `SELECT t.* 
     FROM transactions t
     ORDER BY t.created_at DESC
     LIMIT ?`,
    [limit]
  ) as Transaction[];

  // Then get items for each transaction
  const results = await Promise.all(
    transactions.map(async (transaction) => {
      const items = await database.getAllAsync(
        `SELECT ti.*, p.name as product_name
         FROM transaction_items ti
         JOIN products p ON ti.product_id = p.id
         WHERE ti.transaction_id = ?`,
        [transaction.id]
      ) as TransactionItem[];

      return {
        ...transaction,
        items: items || [],
      };
    })
  );

  return results;
};

export const deleteAllTransactions = async (): Promise<void> => {
  const database = await getDatabase();
  
  try {
    await database.execAsync('BEGIN TRANSACTION');
    
    // Delete all transaction items first (due to foreign key constraints)
    await database.execAsync('DELETE FROM transaction_items');
    
    // Delete all transactions
    await database.execAsync('DELETE FROM transactions');
    
    await database.execAsync('COMMIT');
    await updateLastModified('transactions');
  } catch (error) {
    await database.execAsync('ROLLBACK');
    console.error('Error deleting transactions:', error);
    throw error;
  }
};

// Sync operations
export const addToSyncQueue = async (tableName: string, recordId: number, action: string, data: string): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO sync_queue (table_name, record_id, action, data) VALUES (?, ?, ?, ?)',
    [tableName, recordId, action, data]
  );
};

export const getSyncQueue = async (): Promise<any[]> => {
  const database = await getDatabase();
  const result = await database.getAllAsync('SELECT * FROM sync_queue ORDER BY created_at');
  return result;
};

export const removeFromSyncQueue = async (id: number): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
};

// Utility functions
export const getDatabaseStats = async (): Promise<any> => {
  const database = await getDatabase();

  const stats = {
    totalProducts: 0,
    outOfStock: 0,
    lowStockItems: 0,
    recentTransactions: 0,
  };

  // Get product count
  const productCount = await database.getFirstAsync('SELECT COUNT(*) as count FROM products');
  stats.totalProducts = (productCount as any)?.count || 0;

  // Get out of stock items
  const outOfStock = await database.getFirstAsync(
    'SELECT COUNT(*) as count FROM inventory WHERE current_stock = 0'
  );
  stats.outOfStock = (outOfStock as any)?.count || 0;

  // Get low stock items
  const lowStock = await database.getFirstAsync(
    `SELECT COUNT(*) as count
     FROM inventory i
     WHERE i.current_stock <= i.min_stock AND i.current_stock > 0`
  );
  stats.lowStockItems = (lowStock as any)?.count || 0;

  // Get recent transactions
  const recentTransactions = await database.getFirstAsync(
    `SELECT COUNT(*) as count
     FROM transactions
     WHERE created_at >= datetime('now', '-1 day')`
  );
  stats.recentTransactions = (recentTransactions as any)?.count || 0;

  return stats;
};

export const getStockMovements = async (productId?: number, limit: number = 50): Promise<any[]> => {
  const database = await getDatabase();

  let query = `
    SELECT sm.*, p.name as product_name
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
  `;
  
  const params: any[] = [];
  
  if (productId) {
    query += ' WHERE sm.product_id = ?';
    params.push(productId);
  }
  
  query += ' ORDER BY sm.created_at DESC LIMIT ?';
  params.push(limit);

  const result = await database.getAllAsync(query, params);
  return result;
};

// Export database functions
export default {
  initDatabase,
  addProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  setProductStock,
  getInventory,
  addTransaction,
  getTransactions,
  addStockMovement,
  getStockMovements,
  addToSyncQueue,
  getSyncQueue,
  removeFromSyncQueue,
  getDatabaseStats,
  deleteAllTransactions,
  getChangeTrackerStatus,
}; 