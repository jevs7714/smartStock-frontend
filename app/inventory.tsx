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
import { addStockMovement, getInventory, setProductStock } from '../utils/database';

interface InventoryItem {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  price: number;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  location: string;
  value?: number;
}

const DEFAULT_MIN_STOCK = 5; // Consistent with dashboard

export default function Inventory() {
  const colorScheme = useColorScheme();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustmentData, setAdjustmentData] = useState({
    quantity: '',
    reason: '',
    type: 'add' as 'add' | 'subtract',
  });

  const filters = [
    { key: 'All', label: 'All Items' },
    { key: 'Low', label: 'Low Stock' },
    { key: 'Out', label: 'Out of Stock' },
    { key: 'Over', label: 'Overstocked' },
  ];

  useEffect(() => {
    loadInventory();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadInventory();
    }, [])
  );

  useEffect(() => {
    filterInventory();
  }, [inventory, searchQuery, selectedFilter]);

  const loadInventory = async () => {
    try {
      setIsLoading(true);
      const data = await getInventory();
      setInventory(data);
      console.log('Inventory loaded:', data.length);
    } catch (error) {
      console.error('Error loading inventory:', error);
      Alert.alert('Error', 'Failed to load inventory');
    } finally {
      setIsLoading(false);
    }
  };

  const filterInventory = () => {
    let filtered = inventory;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by stock status
    switch (selectedFilter) {
      case 'Low':
        filtered = filtered.filter(item => 
          item.current_stock <= (item.min_stock || DEFAULT_MIN_STOCK) && 
          item.current_stock > 0
        );
        break;
      case 'Out':
        filtered = filtered.filter(item => item.current_stock === 0);
        break;
      case 'Over':
        filtered = filtered.filter(item => item.current_stock > item.max_stock);
        break;
      default:
        break;
    }

    setFilteredInventory(filtered);
  };

  const handleStockAdjustment = async () => {
    if (!selectedItem || !adjustmentData.quantity || !adjustmentData.reason) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const quantity = parseInt(adjustmentData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    try {
      const newStock = adjustmentData.type === 'add' 
        ? selectedItem.current_stock + quantity
        : Math.max(0, selectedItem.current_stock - quantity);

      // Update inventory
      await setProductStock(selectedItem.product_id, newStock);

      // Add stock movement record
      await addStockMovement({
        product_id: selectedItem.product_id,
        type: adjustmentData.type === 'add' ? 'in' : 'out',
        quantity: quantity,
        reason: adjustmentData.reason,
        user: 'Current User',
      });

      await loadInventory();
      setShowAdjustModal(false);
      setSelectedItem(null);
      setAdjustmentData({ quantity: '', reason: '', type: 'add' });
      Alert.alert('Success', 'Stock adjusted successfully');
    } catch (error) {
      console.error('Error adjusting stock:', error);
      Alert.alert('Error', 'Failed to adjust stock');
    }
  };

  const openAdjustModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjustmentData({ quantity: '', reason: '', type: 'add' });
    setShowAdjustModal(true);
  };

  const getStockStatusColor = (item: InventoryItem) => {
    if (item.current_stock === 0) return '#FF3B30';
    if (item.current_stock <= (item.min_stock || DEFAULT_MIN_STOCK)) return '#FF9500';
    if (item.current_stock > item.max_stock) return '#FF9500';
    return '#34C759';
  };

  const getStockStatusText = (item: InventoryItem) => {
    if (item.current_stock === 0) return 'Out of Stock';
    if (item.current_stock <= (item.min_stock || DEFAULT_MIN_STOCK)) return 'Low Stock';
    if (item.current_stock > item.max_stock) return 'Overstocked';
    return 'In Stock';
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
    scanButton: {
      backgroundColor: '#007AFF',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    scanButtonText: {
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
    filterContainer: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    filterButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginRight: 8,
      borderWidth: 1,
    },
    filterButtonActive: {
      backgroundColor: '#007AFF',
      borderColor: '#007AFF',
    },
    filterButtonInactive: {
      backgroundColor: 'transparent',
      borderColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA',
    },
    filterButtonText: {
      fontSize: 14,
      fontWeight: '500',
    },
    filterButtonTextActive: {
      color: '#FFFFFF',
    },
    filterButtonTextInactive: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    },
    inventoryCard: {
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
    itemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    itemName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      flex: 1,
    },
    stockStatus: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginLeft: 8,
    },
    stockStatusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    itemDetails: {
      marginBottom: 12,
    },
    itemDetail: {
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
    stockInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    stockQuantity: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    },
    stockRange: {
      fontSize: 12,
      color: colorScheme === 'dark' ? '#8E8E93' : '#6C6C70',
    },
    itemActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    actionButton: {
      flex: 1,
      padding: 8,
      borderRadius: 8,
      marginHorizontal: 4,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    adjustButton: {
      backgroundColor: '#007AFF',
    },
    locationButton: {
      backgroundColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA',
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 4,
    },
    adjustButtonText: {
      color: '#FFFFFF',
    },
    locationButtonText: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
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
      maxHeight: '80%',
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
    typeSelector: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    typeButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      marginHorizontal: 4,
      alignItems: 'center',
    },
    typeButtonActive: {
      backgroundColor: '#007AFF',
    },
    typeButtonInactive: {
      backgroundColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA',
    },
    typeButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    typeButtonTextActive: {
      color: '#FFFFFF',
    },
    typeButtonTextInactive: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    modalButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      marginHorizontal: 4,
    },
    cancelButton: {
      backgroundColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA',
    },
    saveButton: {
      backgroundColor: '#007AFF',
    },
    buttonText: {
      textAlign: 'center',
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
            Loading inventory...
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
          <Text style={styles.title}>Inventory</Text>
          <TouchableOpacity 
            style={styles.scanButton}
            onPress={() => Alert.alert('Barcode Scanner', 'Barcode scanning will be implemented in the next version')}
          >
            <Ionicons name="scan" size={20} color="#FFFFFF" />
            <Text style={styles.scanButtonText}>Scan</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search inventory..."
            placeholderTextColor={colorScheme === 'dark' ? '#8E8E93' : '#6C6C70'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filters */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterButton,
                  selectedFilter === filter.key
                    ? styles.filterButtonActive
                    : styles.filterButtonInactive,
                ]}
                onPress={() => setSelectedFilter(filter.key)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    selectedFilter === filter.key
                      ? styles.filterButtonTextActive
                      : styles.filterButtonTextInactive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Inventory List */}
        <FlatList
          data={filteredInventory}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.inventoryCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.product_name}</Text>
                <View
                  style={[
                    styles.stockStatus,
                    { backgroundColor: getStockStatusColor(item) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.stockStatusText,
                      { color: getStockStatusColor(item) },
                    ]}
                  >
                    {getStockStatusText(item)}
                  </Text>
                </View>
              </View>

              <View style={styles.itemDetails}>
                <View style={styles.itemDetail}>
                  <Text style={styles.detailLabel}>SKU:</Text>
                  <Text style={styles.detailValue}>{item.sku}</Text>
                </View>
                <View style={styles.itemDetail}>
                  <Text style={styles.detailLabel}>Location:</Text>
                  <Text style={styles.detailValue}>{item.location}</Text>
                </View>
                <View style={styles.itemDetail}>
                  <Text style={styles.detailLabel}>Value:</Text>
                  <Text style={styles.detailValue}>${item.value?.toFixed(2) || '0.00'}</Text>
                </View>
              </View>

              <View style={styles.stockInfo}>
                <Text style={styles.stockQuantity}>{item.current_stock}</Text>
                <Text style={styles.stockRange}>
                  Min: {item.min_stock} | Max: {item.max_stock}
                </Text>
              </View>

              <View style={styles.itemActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.adjustButton]}
                  onPress={() => openAdjustModal(item)}
                >
                  <Ionicons name="add-circle" size={16} color="#FFFFFF" />
                  <Text style={[styles.actionButtonText, styles.adjustButtonText]}>
                    Adjust Stock
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.locationButton]}
                  onPress={() => Alert.alert('Location', `Current location: ${item.location}`)}
                >
                  <Ionicons 
                    name="location" 
                    size={16} 
                    color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} 
                  />
                  <Text style={[styles.actionButtonText, styles.locationButtonText]}>
                    Location
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            !isLoading ? (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Ionicons name="cube-outline" size={64} color="#8E8E93" />
                <Text style={{ marginTop: 16, color: '#8E8E93', fontSize: 16 }}>
                  No inventory items found
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

      {/* Stock Adjustment Modal */}
      <Modal
        visible={showAdjustModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAdjustModal(false);
          setSelectedItem(null);
          setAdjustmentData({ quantity: '', reason: '', type: 'add' });
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Adjust Stock - {selectedItem?.product_name}
            </Text>

            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  adjustmentData.type === 'add'
                    ? styles.typeButtonActive
                    : styles.typeButtonInactive,
                ]}
                onPress={() => setAdjustmentData({ ...adjustmentData, type: 'add' })}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    adjustmentData.type === 'add'
                      ? styles.typeButtonTextActive
                      : styles.typeButtonTextInactive,
                  ]}
                >
                  Add Stock
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  adjustmentData.type === 'subtract'
                    ? styles.typeButtonActive
                    : styles.typeButtonInactive,
                ]}
                onPress={() => setAdjustmentData({ ...adjustmentData, type: 'subtract' })}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    adjustmentData.type === 'subtract'
                      ? styles.typeButtonTextActive
                      : styles.typeButtonTextInactive,
                  ]}
                >
                  Remove Stock
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Quantity *</Text>
              <TextInput
                style={styles.formInput}
                value={adjustmentData.quantity}
                onChangeText={(text) => setAdjustmentData({ ...adjustmentData, quantity: text })}
                placeholder="Enter quantity"
                keyboardType="numeric"
                placeholderTextColor={colorScheme === 'dark' ? '#8E8E93' : '#6C6C70'}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Reason *</Text>
              <TextInput
                style={styles.formInput}
                value={adjustmentData.reason}
                onChangeText={(text) => setAdjustmentData({ ...adjustmentData, reason: text })}
                placeholder="e.g., Received shipment, Damaged items"
                placeholderTextColor={colorScheme === 'dark' ? '#8E8E93' : '#6C6C70'}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAdjustModal(false);
                  setSelectedItem(null);
                  setAdjustmentData({ quantity: '', reason: '', type: 'add' });
                }}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleStockAdjustment}
              >
                <Text style={[styles.buttonText, styles.saveButtonText]}>Adjust</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
} 