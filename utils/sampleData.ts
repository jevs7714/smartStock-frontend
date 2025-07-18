import { addProduct, setProductStock, getProducts, createMissingInventoryRecords } from './database';

export const sampleProducts = [
  {
    name: 'MacBook Pro 13"',
    sku: 'MBP-13-001',
    category: 'Electronics',
    price: 1299.99,
    cost: 1100.00,
    barcode: '1234567890123',
    initialStock: 15,
  },
  {
    name: 'Wireless Mouse',
    sku: 'WM-001',
    category: 'Electronics',
    price: 29.99,
    cost: 15.00,
    barcode: '1234567890124',
    initialStock: 45,
  },
  {
    name: 'Cotton T-Shirt',
    sku: 'TS-001',
    category: 'Clothing',
    price: 19.99,
    cost: 8.00,
    barcode: '1234567890125',
    initialStock: 120,
  },
  {
    name: 'Programming Book',
    sku: 'BK-001',
    category: 'Books',
    price: 49.99,
    cost: 25.00,
    barcode: '1234567890126',
    initialStock: 30,
  },
  {
    name: 'Garden Tool Set',
    sku: 'GT-001',
    category: 'Home & Garden',
    price: 89.99,
    cost: 45.00,
    barcode: '1234567890127',
    initialStock: 12,
  },
  {
    name: 'Bluetooth Headphones',
    sku: 'BH-001',
    category: 'Electronics',
    price: 79.99,
    cost: 35.00,
    barcode: '1234567890128',
    initialStock: 25,
  },
  {
    name: 'Running Shoes',
    sku: 'RS-001',
    category: 'Sports',
    price: 89.99,
    cost: 40.00,
    barcode: '1234567890129',
    initialStock: 18,
  },
  {
    name: 'Coffee Maker',
    sku: 'CM-001',
    category: 'Home & Garden',
    price: 149.99,
    cost: 75.00,
    barcode: '1234567890130',
    initialStock: 8,
  },
];

export const populateSampleData = async () => {
  try {
    console.log('Populating database with sample data...');
    
    for (const product of sampleProducts) {
      const { initialStock, ...productData } = product;
      
      // Add product to database
      const productId = await addProduct(productData);
      
      // Set initial inventory
      await setProductStock(productId, initialStock);
      
      console.log(`Added product: ${product.name} with ${initialStock} in stock`);
    }
    
    console.log('Sample data populated successfully');
  } catch (error) {
    console.error('Error populating sample data:', error);
    throw error;
  }
};

export const checkAndPopulateData = async () => {
  try {
    // Check if database has products
    const products = await getProducts();
    
    if (products.length === 0) {
      console.log('Database is empty, populating with sample data...');
      await populateSampleData();
    } else {
      console.log(`Database has ${products.length} products`);
      // Ensure all products have inventory records
      await createMissingInventoryRecords();
    }
  } catch (error) {
    console.error('Error checking/populating data:', error);
    throw error;
  }
}; 