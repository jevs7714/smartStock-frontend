import { initDatabase, addProduct, getProducts, getDatabaseStats } from './database';

export const testDatabase = async () => {
  try {
    console.log('🧪 Testing database...');
    
    // Initialize database
    await initDatabase();
    console.log('✅ Database initialized');
    
    // Test adding a product
    const productId = await addProduct({
      name: 'Test Product',
      sku: 'TEST-001',
      category: 'Test',
      price: 99.99,
      cost: 50.00,
      barcode: '123456789',
    });
    console.log('✅ Product added with ID:', productId);
    
    // Test getting products
    const products = await getProducts();
    console.log('✅ Products retrieved:', products.length);
    
    // Test getting stats
    const stats = await getDatabaseStats();
    console.log('✅ Database stats:', stats);
    
    console.log('🎉 Database test completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return false;
  }
}; 