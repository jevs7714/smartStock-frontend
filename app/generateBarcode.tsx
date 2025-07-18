import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Product } from '../utils/database';
import { getProducts } from '../utils/database';

interface QRCodeRef {
  toDataURL: (callback: (dataURL: string) => void) => void;
}

export default function GenerateBarcode() {
  const colorScheme = useColorScheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const qrRef = useRef<QRCodeRef | null>(null);

  useEffect(() => {
    loadProducts();
    // Request permission for saving to gallery
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to save barcodes to your gallery'
        );
      }
    })();
  }, []);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateBarcode = (product: Product) => {
    setSelectedProduct(product);
    setShowModal(true);
  };

  const handleSaveToGallery = async () => {
    if (!selectedProduct || !qrRef.current) return;

    try {
      setIsSaving(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Unable to save to gallery without permission');
        return;
      }

      qrRef.current.toDataURL(async (dataURL: string) => {
        try {
          // Save base64 image to temporary file
          const tempFilePath = `${FileSystem.cacheDirectory}temp_qr_${selectedProduct.id}.png`;
          await FileSystem.writeAsStringAsync(tempFilePath, dataURL, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // Save to gallery
          const asset = await MediaLibrary.createAssetAsync(tempFilePath);
          
          // Create album if it doesn't exist
          const album = await MediaLibrary.getAlbumAsync('Smart Stock Barcodes');
          if (album === null) {
            await MediaLibrary.createAlbumAsync('Smart Stock Barcodes', asset, false);
          } else {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          }

          // Clean up temp file
          await FileSystem.deleteAsync(tempFilePath);

          Alert.alert(
            'Success',
            'Barcode saved to gallery in "Smart Stock Barcodes" album'
          );
        } catch (error) {
          console.error('Error saving to gallery:', error);
          Alert.alert('Error', 'Failed to save barcode to gallery');
        }
      });
    } catch (error) {
      console.error('Error in save process:', error);
      Alert.alert('Error', 'Failed to save barcode');
    } finally {
      setIsSaving(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colorScheme === 'dark' ? '#000000' : '#F2F2F7',
    },
    content: {
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      flex: 1,
    },
    backButton: {
      padding: 8,
      borderRadius: 8,
      marginRight: 12,
    },
    productList: {
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    productItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA',
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
    productId: {
      fontSize: 14,
      color: colorScheme === 'dark' ? '#8E8E93' : '#6C6C70',
    },
    generateButton: {
      backgroundColor: '#007AFF',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    generateButtonText: {
      color: '#FFFFFF',
      fontWeight: '500',
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
      borderRadius: 16,
      padding: 20,
      width: '80%',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      marginBottom: 16,
    },
    modalProductInfo: {
      marginBottom: 20,
      alignItems: 'center',
    },
    modalProductName: {
      fontSize: 18,
      fontWeight: '500',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      marginBottom: 4,
    },
    modalProductDetails: {
      fontSize: 14,
      color: colorScheme === 'dark' ? '#8E8E93' : '#6C6C70',
      marginBottom: 4,
    },
    qrContainer: {
      padding: 16,
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      marginBottom: 20,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      gap: 12,
    },
    modalButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    saveButton: {
      backgroundColor: '#34C759',
    },
    closeButton: {
      backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#E5E5EA',
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '500',
    },
    saveButtonText: {
      color: '#FFFFFF',
    },
    closeButtonText: {
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    },
    buttonIcon: {
      marginRight: 6,
    },
    spinner: {
      marginRight: 8,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
            />
          </TouchableOpacity>
          <Text style={styles.title}>Generate Barcode</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        ) : (
          <ScrollView style={styles.productList}>
            {products.map((product) => (
              <View key={product.id} style={styles.productItem}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productId}>ID: {product.id}</Text>
                </View>
                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={() => handleGenerateBarcode(product)}
                >
                  <Text style={styles.generateButtonText}>Generate</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        <Modal
          visible={showModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Generated Barcode</Text>
              
              {selectedProduct && (
                <>
                  <View style={styles.modalProductInfo}>
                    <Text style={styles.modalProductName}>
                      {selectedProduct.name}
                    </Text>
                    <Text style={styles.modalProductDetails}>
                      ID: {selectedProduct.id}
                    </Text>
                    <Text style={styles.modalProductDetails}>
                      Price: ₱{selectedProduct.price}
                    </Text>
                  </View>

                  <View style={styles.qrContainer}>
                    <QRCode
                      value={selectedProduct.sku || `SKU-${selectedProduct.id.toString().padStart(4, '0')}`}
                      size={200}
                      getRef={(ref) => (qrRef.current = ref)}
                    />
                  </View>

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.saveButton]}
                      onPress={handleSaveToGallery}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <ActivityIndicator size="small" color="#FFFFFF" style={styles.spinner} />
                          <Text style={[styles.buttonText, styles.saveButtonText]}>
                            Saving...
                          </Text>
                        </>
                      ) : (
                        <>
                          <Ionicons
                            name="save-outline"
                            size={20}
                            color="#FFFFFF"
                            style={styles.buttonIcon}
                          />
                          <Text style={[styles.buttonText, styles.saveButtonText]}>
                            Save to Gallery
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, styles.closeButton]}
                      onPress={() => setShowModal(false)}
                      disabled={isSaving}
                    >
                      <Ionicons
                        name="close-outline"
                        size={20}
                        color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
                        style={styles.buttonIcon}
                      />
                      <Text style={[styles.buttonText, styles.closeButtonText]}>
                        Close
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
} 