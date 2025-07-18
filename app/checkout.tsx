import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    useColorScheme,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Product } from '../utils/database';
import { addTransaction, getProducts, updateProductStock } from '../utils/database';

type CartItem = Product & { quantity: number; originalStock: number };

export default function Checkout() {
  const colorScheme = useColorScheme();
  const [checkoutMode, setCheckoutMode] = useState<'pos' | 'internal'>('pos');
  const [showPOS, setShowPOS] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showBrowseModal, setShowBrowseModal] = useState(false);
  const [modalAnimation] = useState(new Animated.Value(0));
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchAnimation] = useState(new Animated.Value(0));

  const posFeatures = [
    'Customer payment processing',
    'Receipt generation',
    'Sales tracking',
    'Inventory deduction',
  ];

  const internalFeatures = [
    'Employee authentication',
    'Reason tracking',
    'Department assignment',
    'Internal documentation',
  ];

  useEffect(() => {
    if (showPOS) {
      setIsLoading(true);
      getProducts().then((data) => {
        setProducts(data);
        setIsLoading(false);
      });
    }
  }, [showPOS]);

  const handleStartCheckout = () => {
    if (checkoutMode === 'pos') {
      setShowPOS(true);
    } else {
      Alert.alert('Internal Checkout', 'Internal checkout flow will be implemented');
    }
  };

  const handleBackToDashboard = () => {
    router.push('/');
  };

  // Add function to update product stock in the UI
  const updateProductStockInUI = (productId: number, newStock: number) => {
    setProducts(prevProducts =>
      prevProducts.map(product =>
        product.id === productId
          ? { ...product, current_stock: newStock }
          : product
      )
    );
  };

  // Add function to restore stock when removing from cart
  const restoreStock = async (productId: number, quantity: number) => {
    try {
      const cartItem = cart.find(item => item.id === productId);
      if (cartItem) {
        const newStock = cartItem.originalStock;
        await updateProductStock(productId, quantity);
        updateProductStockInUI(productId, newStock);
      }
    } catch (error) {
      console.error('Error restoring stock:', error);
      Alert.alert('Error', 'Failed to restore stock. Please try again.');
    }
  };

  // Modified addToCart function
  const addToCart = async (product: Product) => {
    try {
      setIsLoading(true);
      const currentStock = product.current_stock ?? 0;
      
      if (currentStock <= 0) {
        Alert.alert('Out of Stock', 'This product is currently out of stock.');
        return;
      }

      const existing = cart.find((item) => item.id === product.id);
      if (existing) {
        if (currentStock <= 0) {
          Alert.alert('Out of Stock', 'Cannot add more of this product.');
          return;
        }
        
        // First update database
        await updateProductStock(product.id, -1);
        
        // Then update UI and cart only if database update was successful
        updateProductStockInUI(product.id, currentStock - 1);
        setCart(prev =>
          prev.map(item =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
      } else {
        // First update database
        await updateProductStock(product.id, -1);
        
        // Then update UI and cart only if database update was successful
        updateProductStockInUI(product.id, currentStock - 1);
        setCart(prev => [...prev, { 
          ...product, 
          quantity: 1,
          originalStock: currentStock 
        }]);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add product to cart. Please try again.');
      // Refresh products to ensure UI is in sync with database
      getProducts().then((data) => {
        setProducts(data);
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Modified removeFromCart function
  const removeFromCart = async (productId: number) => {
    try {
      setIsLoading(true);
      const itemToRemove = cart.find(item => item.id === productId);
      if (itemToRemove) {
        // Restore stock
        await restoreStock(productId, itemToRemove.quantity);
        // Remove from cart
        setCart(prev => prev.filter(item => item.id !== productId));
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      Alert.alert('Error', 'Failed to remove product from cart. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Modified updateQuantity function
  const updateQuantity = async (productId: number, newQuantity: number) => {
    try {
      setIsLoading(true);
      const cartItem = cart.find(item => item.id === productId);
      const product = products.find(p => p.id === productId);
      
      if (!cartItem || !product) return;

      const quantityDiff = newQuantity - cartItem.quantity;
      const currentStock = product.current_stock ?? 0;

      if (quantityDiff > 0 && currentStock <= 0) {
        Alert.alert('Out of Stock', 'Cannot add more of this product.');
        return;
      }

      // Update cart
      setCart(prev =>
        prev.map(item =>
          item.id === productId
            ? { ...item, quantity: Math.max(1, newQuantity) }
            : item
        )
      );

      // Update stock in database and UI
      await updateProductStock(productId, -quantityDiff);
      updateProductStockInUI(productId, currentStock - quantityDiff);
    } catch (error) {
      console.error('Error updating quantity:', error);
      Alert.alert('Error', 'Failed to update quantity. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  // Modified handleCheckout function
  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Cart is empty', 'Please add products to the cart.');
      return;
    }
    setIsLoading(true);
    try {
      // Log transaction without updating stock (stock was already updated when adding to cart)
      await addTransaction({
        type: 'pos',
        total_amount: getTotal(),
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
        })),
      });

      // Clear the cart
      setCart([]);
      Alert.alert('Success', 'Sale completed!');
      setShowPOS(false);
      
      // Refresh products list to ensure UI is in sync
      const updatedProducts = await getProducts();
      setProducts(updatedProducts);
    } catch (error) {
      console.error('Error completing sale:', error);
      Alert.alert('Error', 'Failed to complete sale.');
    } finally {
      setIsLoading(false);
    }
  };

  const showModal = () => {
    setShowBrowseModal(true);
    Animated.spring(modalAnimation, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const hideModal = () => {
    Animated.spring(modalAnimation, {
      toValue: 0,
      useNativeDriver: true,
    }).start(() => setShowBrowseModal(false));
  };

  const openSearchModal = () => {
    setSearchQuery('');
    setIsSearchModalVisible(true);
    Animated.spring(searchAnimation, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const closeSearchModal = () => {
    Animated.spring(searchAnimation, {
      toValue: 0,
      useNativeDriver: true,
    }).start(() => {
      setIsSearchModalVisible(false);
      setSearchQuery('');
    });
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.id.toString().includes(searchQuery)
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colorScheme === 'dark' ? '#000000' : '#F2F2F7',
    },
    safeArea: {
      flex: 1,
      backgroundColor: colorScheme === 'dark' ? '#000000' : '#F2F2F7',
      paddingBottom: 0,
    },
    content: {
      flex: 1,
      padding: 16,
      paddingBottom: 0,
    },
    subtitle: {
      fontSize: 14,
      color: colorScheme === 'dark' ? '#8E8E93' : '#6C6C70',
      marginBottom: 8,
    },
    // Product List Styles
    productListContainer: {
      height: Dimensions.get('window').height * 0.35, // 35% of screen height
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
      borderRadius: 12,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    productList: {
      flex: 1,
    },
    productItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA',
    },
    productItemDisabled: {
      opacity: 0.5,
    },
    productInfo: {
      flex: 1,
    },
    productName: {
      fontSize: 16,
      fontWeight: '500',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      marginBottom: 4,
    },
    productPrice: {
      fontSize: 14,
      color: colorScheme === 'dark' ? '#8E8E93' : '#6C6C70',
    },
    productStock: {
      fontSize: 14,
      color: '#34C759',
      marginLeft: 12,
    },
    productStockLow: {
      color: '#FF9500',
    },
    productStockOut: {
      color: '#FF3B30',
    },
    // Cart Styles
    cartContainer: {
      flex: 1,
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    cartContent: {
      flex: 1,
    },
    cartTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      marginBottom: 8,
    },
    cartScrollView: {
      flex: 1,
    },
    cartItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA',
    },
    cartItemInfo: {
      flex: 1,
    },
    cartItemName: {
      fontSize: 16,
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      marginBottom: 4,
    },
    cartItemPrice: {
      fontSize: 14,
      color: colorScheme === 'dark' ? '#8E8E93' : '#6C6C70',
    },
    cartActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    quantityButton: {
      padding: 8,
    },
    totalContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA',
    },
    totalText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    },
    totalAmount: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#34C759',
    },
    // Button Styles
    buttonsContainer: {
      marginTop: 8,
    },
    startButton: {
      backgroundColor: '#34C759',
      padding: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 8,
    },
    startButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: 'bold',
    },
    backButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA',
      position: 'absolute',
      right: 16,
      top: 16,
      zIndex: 1,
    },
    modeSelector: {
      flexDirection: 'row',
      marginBottom: 24,
    },
    modeButton: {
      flex: 1,
      padding: 20,
      borderRadius: 12,
      marginHorizontal: 8,
      alignItems: 'center',
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA',
    },
    modeButtonActive: {
      backgroundColor: '#007AFF',
      borderColor: '#007AFF',
    },
    modeIcon: {
      marginBottom: 8,
    },
    modeTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    },
    modeTitleActive: {
      color: '#FFFFFF',
    },
    modeDescription: {
      fontSize: 12,
      color: colorScheme === 'dark' ? '#8E8E93' : '#6C6C70',
      textAlign: 'center',
      marginTop: 4,
    },
    modeDescriptionActive: {
      color: '#FFFFFF',
    },
    contentArea: {
      flex: 1,
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
      borderRadius: 12,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    contentTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      marginBottom: 16,
    },
    featureList: {
      marginBottom: 20,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    featureIcon: {
      marginRight: 12,
    },
    featureText: {
      fontSize: 16,
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    },
    actionButtonsContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    actionButton: {
      flex: 1,
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    actionButtonIcon: {
      marginBottom: 8,
    },
    actionButtonText: {
      fontSize: 12,
      fontWeight: '500',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      textAlign: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      minHeight: Dimensions.get('window').height * 0.7,
      padding: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    },
    closeButton: {
      padding: 8,
    },
    searchContainer: {
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      minHeight: Dimensions.get('window').height * 0.7,
      padding: 20,
    },
    searchHeader: {
      marginBottom: 16,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7',
      borderRadius: 10,
      padding: 8,
      marginBottom: 16,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    searchIcon: {
      padding: 4,
    },
    clearButton: {
      padding: 4,
    },
    noResults: {
      textAlign: 'center',
      fontSize: 16,
      color: colorScheme === 'dark' ? '#8E8E93' : '#6C6C70',
      marginTop: 20,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: colorScheme === 'dark' ? '#8E8E93' : '#6C6C70',
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2,
    },
  });

  if (showPOS) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setShowPOS(false)}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
          />
        </TouchableOpacity>

        <View style={styles.content}>
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>
                {cart.length > 0 ? 'Processing sale...' : 'Loading products...'}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={showModal}
              disabled={isLoading}
            >
              <Ionicons
                name="grid"
                size={24}
                color="#007AFF"
                style={styles.actionButtonIcon}
              />
              <Text style={styles.actionButtonText}>Browse Products</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={openSearchModal}
              disabled={isLoading}
            >
              <Ionicons
                name="search"
                size={24}
                color="#FF9500"
                style={styles.actionButtonIcon}
              />
              <Text style={styles.actionButtonText}>Search</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                // TODO: Implement barcode scanner
              }}
              disabled={isLoading}
            >
              <Ionicons
                name="barcode"
                size={24}
                color="#34C759"
                style={styles.actionButtonIcon}
              />
              <Text style={styles.actionButtonText}>Scan Barcode</Text>
            </TouchableOpacity>
          </View>

          {/* Cart Section */}
          <View style={styles.cartContainer}>
            <Text style={styles.cartTitle}>Cart</Text>
            <View style={styles.cartContent}>
              <ScrollView style={styles.cartScrollView}>
                {cart.length === 0 ? (
                  <Text style={styles.subtitle}>No items in cart.</Text>
                ) : (
                  cart.map((item) => (
                    <View key={item.id} style={styles.cartItem}>
                      <View style={styles.cartItemInfo}>
                        <Text style={styles.cartItemName}>{item.name}</Text>
                        <Text style={styles.cartItemPrice}>
                          ₱{(item.price * item.quantity).toFixed(2)} (₱{item.price} × {item.quantity})
                        </Text>
                      </View>
                      <View style={styles.cartActions}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1 || isLoading}
                        >
                          <Ionicons
                            name="remove-circle"
                            size={24}
                            color={item.quantity <= 1 ? '#8E8E93' : '#FF3B30'}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= (products.find(p => p.id === item.id)?.current_stock ?? 0) || isLoading}
                        >
                          <Ionicons
                            name="add-circle"
                            size={24}
                            color={
                              item.quantity >= (products.find(p => p.id === item.id)?.current_stock ?? 0)
                                ? '#8E8E93'
                                : '#34C759'
                            }
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => removeFromCart(item.id)}
                          disabled={isLoading}
                        >
                          <Ionicons name="trash" size={24} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
              {cart.length > 0 && (
                <View style={styles.totalContainer}>
                  <Text style={styles.totalText}>Total:</Text>
                  <Text style={styles.totalAmount}>₱{getTotal().toFixed(2)}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity 
              style={[
                styles.startButton,
                isLoading && { opacity: 0.7 }
              ]} 
              onPress={handleCheckout}
              disabled={isLoading || cart.length === 0}
            >
              <Text style={styles.startButtonText}>Complete Sale</Text>
            </TouchableOpacity>
          </View>

          {/* Browse Products Modal */}
          <Modal
            visible={showBrowseModal}
            transparent
            animationType="none"
            onRequestClose={hideModal}
          >
            <TouchableWithoutFeedback onPress={hideModal}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                  <Animated.View
                    style={[
                      styles.modalContent,
                      {
                        transform: [{
                          translateY: modalAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [600, 0],
                          }),
                        }],
                      },
                    ]}
                  >
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Browse Products</Text>
                      <TouchableOpacity
                        style={styles.closeButton}
                        onPress={hideModal}
                      >
                        <Ionicons
                          name="close"
                          size={24}
                          color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
                        />
                      </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.productList}>
                      {products.map((product) => (
                        <TouchableOpacity
                          key={product.id}
                          style={[
                            styles.productItem,
                            product.current_stock === 0 && styles.productItemDisabled,
                          ]}
                          onPress={() => {
                            addToCart(product);
                            hideModal();
                          }}
                          disabled={product.current_stock === 0}
                        >
                          <View style={styles.productInfo}>
                            <Text style={styles.productName}>{product.name}</Text>
                            <Text style={styles.productPrice}>₱{product.price.toFixed(2)}</Text>
                          </View>
                          <Text
                            style={[
                              styles.productStock,
                              (product.current_stock ?? 0) <= 5 && styles.productStockLow,
                              (product.current_stock ?? 0) === 0 && styles.productStockOut,
                            ]}
                          >
                            Stock: {product.current_stock ?? 0}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </Animated.View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          {/* Search Modal */}
          <Modal
            visible={isSearchModalVisible}
            transparent
            animationType="none"
            onRequestClose={closeSearchModal}
          >
            <TouchableWithoutFeedback onPress={closeSearchModal}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                  <Animated.View
                    style={[
                      styles.searchContainer,
                      {
                        transform: [{
                          translateY: searchAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [600, 0],
                          }),
                        }],
                      },
                    ]}
                  >
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Search Products</Text>
                      <TouchableOpacity
                        style={styles.closeButton}
                        onPress={closeSearchModal}
                      >
                        <Ionicons
                          name="close"
                          size={24}
                          color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.searchInputContainer}>
                      <Ionicons
                        name="search"
                        size={20}
                        color={colorScheme === 'dark' ? '#8E8E93' : '#6C6C70'}
                        style={styles.searchIcon}
                      />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name or ID"
                        placeholderTextColor={colorScheme === 'dark' ? '#8E8E93' : '#6C6C70'}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus
                      />
                      {searchQuery !== '' && (
                        <TouchableOpacity
                          style={styles.clearButton}
                          onPress={() => setSearchQuery('')}
                        >
                          <Ionicons
                            name="close-circle"
                            size={20}
                            color={colorScheme === 'dark' ? '#8E8E93' : '#6C6C70'}
                          />
                        </TouchableOpacity>
                      )}
                    </View>

                    <ScrollView style={styles.productList}>
                      {filteredProducts.length === 0 ? (
                        <Text style={styles.noResults}>
                          No products found
                        </Text>
                      ) : (
                        filteredProducts.map((product) => (
                          <TouchableOpacity
                            key={product.id}
                            style={[
                              styles.productItem,
                              product.current_stock === 0 && styles.productItemDisabled,
                            ]}
                            onPress={() => {
                              addToCart(product);
                              closeSearchModal();
                            }}
                            disabled={product.current_stock === 0}
                          >
                            <View style={styles.productInfo}>
                              <Text style={styles.productName}>{product.name}</Text>
                              <Text style={styles.productPrice}>₱{product.price.toFixed(2)}</Text>
                            </View>
                            <Text
                              style={[
                                styles.productStock,
                                (product.current_stock ?? 0) <= 5 && styles.productStockLow,
                                (product.current_stock ?? 0) === 0 && styles.productStockOut,
                              ]}
                            >
                              Stock: {product.current_stock ?? 0}
                            </Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </Animated.View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              checkoutMode === 'pos' && styles.modeButtonActive
            ]}
            onPress={() => setCheckoutMode('pos')}
          >
            <Ionicons
              name="card"
              size={32}
              color={checkoutMode === 'pos' ? '#FFFFFF' : '#34C759'}
              style={styles.modeIcon}
            />
            <Text style={[
              styles.modeTitle,
              checkoutMode === 'pos' && styles.modeTitleActive
            ]}>
              POS Checkout
            </Text>
            <Text style={[
              styles.modeDescription,
              checkoutMode === 'pos' && styles.modeDescriptionActive
            ]}>
              Customer sales
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              checkoutMode === 'internal' && styles.modeButtonActive
            ]}
            onPress={() => setCheckoutMode('internal')}
          >
            <Ionicons
              name="business"
              size={32}
              color={checkoutMode === 'internal' ? '#FFFFFF' : '#FF9500'}
              style={styles.modeIcon}
            />
            <Text style={[
              styles.modeTitle,
              checkoutMode === 'internal' && styles.modeTitleActive
            ]}>
              Internal Checkout
            </Text>
            <Text style={[
              styles.modeDescription,
              checkoutMode === 'internal' && styles.modeDescriptionActive
            ]}>
              Internal use
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Area */}
        <View style={styles.contentArea}>
          <Text style={styles.contentTitle}>
            {checkoutMode === 'pos' ? 'POS Checkout Features' : 'Internal Checkout Features'}
          </Text>

          <View style={styles.featureList}>
            {(checkoutMode === 'pos' ? posFeatures : internalFeatures).map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color="#34C759"
                  style={styles.featureIcon}
                />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartCheckout}
          >
            <Text style={styles.startButtonText}>
              Start {checkoutMode === 'pos' ? 'POS' : 'Internal'} Checkout
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToDashboard}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
} 