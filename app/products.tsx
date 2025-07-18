import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addProduct, deleteProduct, getProducts, updateProduct } from '../utils/database';

interface Product {
  id: number;
  name: string;
  sku?: string;
  category: string;
  price: number;
  cost?: number;
  current_stock?: number;
}

export default function Products() {
  const colorScheme = useColorScheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    cost: '',
  });

  const [categories, setCategories] = useState<string[]>(['All']);

  useEffect(() => {
    loadProducts();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadProducts();
    }, [])
  );

  useEffect(() => {
    // Extract unique categories from products
    const uniqueCategories = ['All', ...new Set(products.map(product => product.category).filter(Boolean))];
    setCategories(uniqueCategories);
  }, [products]);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, selectedCategory]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const data = await getProducts();
      setProducts(data);
      console.log('Products loaded:', data.length);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    setFilteredProducts(filtered);
  };

  const handleAddProduct = async () => {
    if (!formData.name || !formData.category || !formData.price) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    try {
      setIsSubmitting(true);
      const newProduct = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        price: price,
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
      };

      await addProduct(newProduct);
      await loadProducts();
      setShowAddModal(false);
      resetForm();
      Alert.alert('Success', 'Product added successfully');
    } catch (error) {
      console.error('Error adding product:', error);
      Alert.alert('Error', 'Failed to add product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProduct = async () => {
    if (!editingProduct || !formData.name || !formData.category || !formData.price) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    try {
      setIsSubmitting(true);
      const updatedProduct = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        price: price,
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
      };

      await updateProduct(editingProduct.id, updatedProduct);
      await loadProducts();
      setEditingProduct(null);
      resetForm();
      Alert.alert('Success', 'Product updated successfully');
    } catch (error) {
      console.error('Error updating product:', error);
      Alert.alert('Error', 'Failed to update product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(product.id);
              await loadProducts();
              Alert.alert('Success', 'Product deleted successfully');
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      price: '',
      cost: '',
    });
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      cost: product.cost?.toString() || '',
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colorScheme === 'dark' ? '#000000' : '#F2F2F7',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    listContainer: {
      paddingBottom: 0,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    },
    addButton: {
      backgroundColor: '#007AFF',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    addButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      marginLeft: 4,
    },
    searchContainer: {
      marginBottom: 16,
    },
    searchInput: {
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
      padding: 12,
      borderRadius: 8,
      fontSize: 16,
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA',
    },
    categoryContainer: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    categoryButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginRight: 8,
      borderWidth: 1,
    },
    categoryButtonActive: {
      backgroundColor: '#007AFF',
      borderColor: '#007AFF',
    },
    categoryButtonInactive: {
      backgroundColor: 'transparent',
      borderColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA',
    },
    categoryButtonText: {
      fontSize: 14,
      fontWeight: '500',
    },
    categoryButtonTextActive: {
      color: '#FFFFFF',
    },
    categoryButtonTextInactive: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    },
    productCard: {
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA',
    },
    productHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    productName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      flex: 1,
    },
    productActions: {
      flexDirection: 'row',
      marginLeft: 8,
    },
    actionButton: {
      padding: 4,
      marginLeft: 4,
    },
    productDetails: {
      marginBottom: 8,
    },
    productDetail: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    detailLabel: {
      fontSize: 14,
      color: colorScheme === 'dark' ? '#8E8E93' : '#6C6C70',
    },
    detailValue: {
      fontSize: 14,
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      fontWeight: '500',
    },
    stockStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
    },
    stockText: {
      fontSize: 14,
      marginLeft: 4,
    },
    stockLow: {
      color: '#FF9500',
    },
    stockNormal: {
      color: '#34C759',
    },
    stockOut: {
      color: '#FF3B30',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
      padding: 20,
      borderRadius: 12,
      width: '90%',
      maxHeight: '85%',
      marginVertical: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      marginBottom: 20,
      textAlign: 'center',
    },
    formGroup: {
      marginBottom: 16,
    },
    formLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      marginBottom: 8,
    },
    formInput: {
      backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7',
      padding: 12,
      borderRadius: 8,
      fontSize: 16,
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA',
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA',
    },
    modalButton: {
      flex: 1,
      padding: 14,
      borderRadius: 8,
      marginHorizontal: 6,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA',
    },
    saveButton: {
      backgroundColor: '#007AFF',
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    cancelButtonText: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    },
    saveButtonText: {
      color: '#FFFFFF',
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 16, color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }}>
            Loading products...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Products</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={colorScheme === 'dark' ? '#8E8E93' : '#6C6C70'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Categories */}
        <View style={styles.categoryContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  selectedCategory === category
                    ? styles.categoryButtonActive
                    : styles.categoryButtonInactive,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    selectedCategory === category
                      ? styles.categoryButtonTextActive
                      : styles.categoryButtonTextInactive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Products List */}
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item: product }) => (
            <View style={styles.productCard}>
              <View style={styles.productHeader}>
                <Text style={styles.productName}>{product.name}</Text>
                <View style={styles.productActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openEditModal(product)}
                  >
                    <Ionicons name="pencil" size={20} color="#007AFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteProduct(product)}
                  >
                    <Ionicons name="trash" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.productDetails}>
                {product.sku && (
                  <View style={styles.productDetail}>
                    <Text style={styles.detailLabel}>SKU:</Text>
                    <Text style={styles.detailValue}>{product.sku}</Text>
                  </View>
                )}
                <View style={styles.productDetail}>
                  <Text style={styles.detailLabel}>Category:</Text>
                  <Text style={styles.detailValue}>{product.category}</Text>
                </View>
                <View style={styles.productDetail}>
                  <Text style={styles.detailLabel}>Price:</Text>
                  <Text style={styles.detailValue}>${product.price.toFixed(2)}</Text>
                </View>
                {product.cost && (
                  <View style={styles.productDetail}>
                    <Text style={styles.detailLabel}>Cost:</Text>
                    <Text style={styles.detailValue}>${product.cost.toFixed(2)}</Text>
                  </View>
                )}
              </View>

              <View style={styles.stockStatus}>
                <Ionicons
                  name="cube"
                  size={16}
                  color={
                    !product.current_stock || product.current_stock === 0
                      ? '#FF3B30'
                      : product.current_stock < 10
                      ? '#FF9500'
                      : '#34C759'
                  }
                />
                <Text
                  style={[
                    styles.stockText,
                    !product.current_stock || product.current_stock === 0
                      ? styles.stockOut
                      : product.current_stock < 10
                      ? styles.stockLow
                      : styles.stockNormal,
                  ]}
                >
                  {product.current_stock || 0} in stock
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            !isLoading ? (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Ionicons name="cube-outline" size={64} color="#8E8E93" />
                <Text style={{ marginTop: 16, color: '#8E8E93', fontSize: 16 }}>
                  No products found
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={{
            ...styles.listContainer,
            paddingBottom: 0,
          }}
          showsVerticalScrollIndicator={true}
        />
      </View>

      {/* Add/Edit Product Modal */}
      <Modal
        visible={showAddModal || editingProduct !== null}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAddModal(false);
          setEditingProduct(null);
          resetForm();
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Name *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Product name"
                  placeholderTextColor={colorScheme === 'dark' ? '#8E8E93' : '#6C6C70'}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Category *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.category}
                  onChangeText={(text) => setFormData({ ...formData, category: text })}
                  placeholder="Enter category (e.g., Electronics, Clothing)"
                  placeholderTextColor={colorScheme === 'dark' ? '#8E8E93' : '#6C6C70'}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Price *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.price}
                  onChangeText={(text) => setFormData({ ...formData, price: text })}
                  placeholder="0.00"
                  keyboardType="numeric"
                  placeholderTextColor={colorScheme === 'dark' ? '#8E8E93' : '#6C6C70'}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Cost</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.cost}
                  onChangeText={(text) => setFormData({ ...formData, cost: text })}
                  placeholder="0.00"
                  keyboardType="numeric"
                  placeholderTextColor={colorScheme === 'dark' ? '#8E8E93' : '#6C6C70'}
                />
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  if (!isSubmitting) {
                    setShowAddModal(false);
                    setEditingProduct(null);
                    resetForm();
                  }
                }}
                disabled={isSubmitting}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>
                  {isSubmitting ? 'Canceling...' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.saveButton,
                  isSubmitting && { opacity: 0.6 }
                ]}
                onPress={editingProduct ? handleEditProduct : handleAddProduct}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={[styles.buttonText, styles.saveButtonText]}>
                      {editingProduct ? 'Updating...' : 'Saving...'}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.buttonText, styles.saveButtonText]}>
                    {editingProduct ? 'Update' : 'Save'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
} 