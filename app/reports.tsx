import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    AppState,
    AppStateStatus,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ChangeTracker,
    deleteAllTransactions,
    getChangeTrackerStatus,
    getProducts,
    getTransactions,
    initDatabase
} from '../utils/database';

interface TransactionItem {
  id: number;
  transaction_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  reason?: string;
  product_name: string;
}

interface Transaction {
  id: number;
  type: 'pos' | 'internal';
  total_amount: number;
  employee_id?: number;
  customer_name?: string;
  payment_method?: string;
  created_at: string;
  items: TransactionItem[];
}

interface ReportData {
  totalSales: number;
  totalProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  averageTransactionValue: number;
  totalTransactions: number;
  topSellingProducts: Array<{ name: string; sales: number; revenue: number }>;
  recentTransactions: Array<{ 
    type: string; 
    amount: number; 
    date: string;
    items?: TransactionItem[];
  }>;
}

export default function Reports() {
  const colorScheme = useColorScheme();
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colorScheme === 'dark' ? '#000000' : '#F2F2F7',
    },
    content: {
      padding: 16,
    },
    header: {
      marginBottom: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colorScheme === 'dark' ? '#8E8E93' : '#6C6C70',
    },
    periodSelector: {
      flexDirection: 'row',
      marginBottom: 20,
    },
    periodButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      marginHorizontal: 4,
      alignItems: 'center',
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA',
    },
    periodButtonActive: {
      backgroundColor: '#007AFF',
      borderColor: '#007AFF',
    },
    periodButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    },
    periodButtonTextActive: {
      color: '#FFFFFF',
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    statCard: {
      width: '48%',
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 14,
      color: colorScheme === 'dark' ? '#8E8E93' : '#6C6C70',
    },
    revenueText: {
      color: '#34C759',
      fontSize: 14,
      marginTop: 4,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      marginBottom: 16,
    },
    reportCard: {
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    topProductItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA',
    },
    topProductName: {
      fontSize: 16,
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      flex: 1,
    },
    topProductSales: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#34C759',
    },
    transactionItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA',
    },
    transactionInfo: {
      flex: 1,
    },
    transactionType: {
      fontSize: 16,
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      marginBottom: 2,
    },
    transactionDate: {
      fontSize: 12,
      color: colorScheme === 'dark' ? '#8E8E93' : '#6C6C70',
    },
    transactionAmount: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#34C759',
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
      gap: 12,
    },
    exportButton: {
      flex: 1,
      backgroundColor: '#007AFF',
      padding: 16,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    clearButton: {
      flex: 1,
      backgroundColor: '#FF3B30',
      padding: 16,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    backButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA',
    },
    loadingContainer: {
      minHeight: 400,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: colorScheme === 'dark' ? '#8E8E93' : '#6C6C70',
    },
    noDataText: {
      textAlign: 'center',
      fontSize: 16,
      color: '#8E8E93',
      padding: 16,
    },
    syncContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    syncText: {
      fontSize: 12,
      color: colorScheme === 'dark' ? '#8E8E93' : '#6C6C70',
      marginRight: 8,
    },
    syncButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA',
    },
    syncButtonActive: {
      backgroundColor: '#007AFF',
      borderColor: '#007AFF',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorText: {
      fontSize: 16,
      color: colorScheme === 'dark' ? '#FF453A' : '#FF3B30',
      textAlign: 'center',
      marginTop: 12,
      marginBottom: 20,
    },
    retryButton: {
      backgroundColor: '#007AFF',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [lastModified, setLastModified] = useState<ChangeTracker | null>(null);
  const [dataCleared, setDataCleared] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData>({
    totalSales: 0,
    totalProducts: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    averageTransactionValue: 0,
    totalTransactions: 0,
    topSellingProducts: [],
    recentTransactions: [],
  });
  const [selectedPeriod, setSelectedPeriod] = useState('Today');
  const syncIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const appState = useRef(AppState.currentState);
  const isMounted = useRef(true);

  const periods = ['Today', 'Week', 'Month', 'Year'];

  // Initialize database
  useEffect(() => {
    const initializeDb = async () => {
      try {
        await initDatabase();
        if (isMounted.current) {
          await syncData();
        }
      } catch (error) {
        console.error('Database initialization error:', error);
        setError('Failed to initialize database. Please restart the app.');
      }
    };
    initializeDb();

    return () => {
      isMounted.current = false;
    };
  }, []);

  const checkForChanges = async (): Promise<boolean> => {
    try {
      const currentStatus = await getChangeTrackerStatus();
      
      // First sync
      if (!lastModified) {
        setLastModified(currentStatus);
        return true;
      }

      // Check if any table has been modified
      const hasChanges = 
        currentStatus.products_last_modified !== lastModified.products_last_modified ||
        currentStatus.inventory_last_modified !== lastModified.inventory_last_modified ||
        currentStatus.transactions_last_modified !== lastModified.transactions_last_modified;

      if (hasChanges) {
        setLastModified(currentStatus);
      }

      return hasChanges;
    } catch (error) {
      console.error('Error checking for changes:', error);
      return true; // On error, force sync
    }
  };

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) && 
        nextAppState === 'active' &&
        isMounted.current
      ) {
        const needsSync = await checkForChanges();
        if (needsSync) {
          syncData();
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [lastModified]);

  // Setup periodic sync
  useEffect(() => {
    if (!error && !dataCleared) {
      const checkAndSync = async () => {
        if (isMounted.current && !isSyncing) {
          const needsSync = await checkForChanges();
          if (needsSync) {
            await syncData();
          }
        }
      };

      // Initial check
      checkAndSync();

      // Set up polling interval (every 30 seconds)
      const interval = setInterval(checkAndSync, 30000);
      syncIntervalRef.current = interval;

      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }
  }, [selectedPeriod, dataCleared, error, lastModified]);

  const syncData = async () => {
    if (isSyncing || dataCleared || error || !isMounted.current) return;

    try {
      setIsSyncing(true);
      setError(null);
      await loadReportData();
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Sync error:', error);
      setError('Failed to sync data. Please try again.');
    } finally {
      if (isMounted.current) {
        setIsSyncing(false);
      }
    }
  };

  const formatSyncTime = () => {
    if (!lastSyncTime) return 'Never';
    return formatDate(lastSyncTime);
  };

  const getDateRangeForPeriod = (period: string): { start: Date; end: Date } => {
    const end = new Date();
    const start = new Date();
    
    switch (period) {
      case 'Today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'Week':
        start.setDate(start.getDate() - 7);
        break;
      case 'Month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'Year':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start.setHours(0, 0, 0, 0);
    }
    
    return { start, end };
  };

  const loadReportData = async () => {
    if (dataCleared) {
      return;
    }

    try {
      setIsLoading(true);
      const { start, end } = getDateRangeForPeriod(selectedPeriod);

      // Get all transactions
      const transactions = await getTransactions(100) as Transaction[]; // Get last 100 transactions
      
      // Filter transactions by date range
      const filteredTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.created_at);
        return transactionDate >= start && transactionDate <= end;
      });

      // Calculate financial metrics
      const totalSales = filteredTransactions.reduce((sum, t) => sum + t.total_amount, 0);
      const totalTransactions = filteredTransactions.length;
      const averageTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;

      // Get products and calculate stock status
      const products = await getProducts();
      const outOfStock = products.filter(p => (p.current_stock ?? 0) === 0).length;
      const lowStock = products.filter(p => {
        const stock = p.current_stock ?? 0;
        const minStock = p.min_stock ?? 5;
        return stock > 0 && stock <= minStock;
      }).length;

      // Calculate top selling products with revenue
      const productSales = new Map<number, { 
        name: string; 
        sales: number; 
        revenue: number;
      }>();
      
      filteredTransactions.forEach(transaction => {
        transaction.items.forEach(item => {
          const current = productSales.get(item.product_id) ?? {
            name: item.product_name,
            sales: 0,
            revenue: 0
          };
          
          productSales.set(item.product_id, {
            name: item.product_name,
            sales: current.sales + item.quantity,
            revenue: current.revenue + (item.quantity * item.unit_price)
          });
        });
      });

      // Convert to array and sort by revenue
      const topProducts = Array.from(productSales.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Format transactions for display
      const formattedTransactions = filteredTransactions
        .slice(0, 10) // Show only last 10 transactions
        .map(t => ({
          type: t.type === 'pos' ? 'POS Sale' : 'Internal Checkout',
          amount: t.total_amount,
          date: formatDate(new Date(t.created_at)),
          items: t.items
        }));

      setReportData({
        totalSales,
        totalProducts: products.length,
        lowStockItems: lowStock,
        outOfStockItems: outOfStock,
        averageTransactionValue,
        totalTransactions,
        topSellingProducts: topProducts,
        recentTransactions: formattedTransactions,
      });
    } catch (error) {
      console.error('Error loading report data:', error);
      throw new Error('Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) {
      return minutes <= 1 ? '1 min ago' : `${minutes} min ago`;
    } else if (hours < 24) {
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    } else {
      return days === 1 ? '1 day ago' : `${days} days ago`;
    }
  };

  const formatCurrency = (amount: number): string => {
    return '₱' + amount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const clearReportData = () => {
    Alert.alert(
      "Delete All Financial Reports",
      "Are you sure you want to permanently delete all financial reports? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              await deleteAllTransactions();
              setDataCleared(true);
              setReportData({
                totalSales: 0,
                totalProducts: 0,
                lowStockItems: 0,
                outOfStockItems: 0,
                averageTransactionValue: 0,
                totalTransactions: 0,
                topSellingProducts: [],
                recentTransactions: [],
              });
              Alert.alert("Success", "All financial reports have been permanently deleted.");
            } catch (error) {
              console.error('Error deleting reports:', error);
              Alert.alert("Error", "Failed to delete financial reports. Please try again.");
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              syncData();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={styles.title}>Reports & Analytics</Text>
              <Text style={styles.subtitle}>Business insights and performance metrics</Text>
            </View>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.push('/')}
            >
              <Ionicons name="arrow-back" size={20} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sync Status */}
        <View style={styles.syncContainer}>
          <Text style={styles.syncText}>Last synced: {formatSyncTime()}</Text>
          <TouchableOpacity 
            style={[styles.syncButton, isSyncing && styles.syncButtonActive]}
            onPress={syncData}
            disabled={isSyncing || dataCleared || error}
          >
            <Ionicons 
              name={isSyncing ? "sync" : "sync-outline"} 
              size={20} 
              color={isSyncing ? '#FFFFFF' : (colorScheme === 'dark' ? '#FFFFFF' : '#000000')}
              style={isSyncing ? { transform: [{ rotate: '360deg' }] } : undefined}
            />
          </TouchableOpacity>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive
              ]}
              onPress={() => {
                setSelectedPeriod(period);
                if (dataCleared) {
                  setDataCleared(false);
                }
              }}
              disabled={isLoading || error}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive
              ]}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading reports...</Text>
          </View>
        ) : (
          <>
            {/* Statistics Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{formatCurrency(reportData.totalSales)}</Text>
                <Text style={styles.statLabel}>Total Sales ({selectedPeriod})</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{reportData.totalTransactions}</Text>
                <Text style={styles.statLabel}>Total Transactions</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{formatCurrency(reportData.averageTransactionValue)}</Text>
                <Text style={styles.statLabel}>Average Transaction</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{reportData.lowStockItems}</Text>
                <Text style={styles.statLabel}>Low Stock Items</Text>
              </View>
            </View>

            {/* Top Selling Products */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top Selling Products</Text>
              <View style={styles.reportCard}>
                {reportData.topSellingProducts.length === 0 ? (
                  <Text style={styles.noDataText}>No sales data available for {selectedPeriod}</Text>
                ) : (
                  reportData.topSellingProducts.map((product, index) => (
                    <View key={index} style={styles.topProductItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.topProductName}>
                          {index + 1}. {product.name}
                        </Text>
                        <Text style={styles.revenueText}>
                          Revenue: {formatCurrency(product.revenue)}
                        </Text>
                      </View>
                      <Text style={styles.topProductSales}>
                        {product.sales} sold
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>

            {/* Recent Transactions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <View style={styles.reportCard}>
                {reportData.recentTransactions.length === 0 ? (
                  <Text style={styles.noDataText}>No transactions for {selectedPeriod}</Text>
                ) : (
                  reportData.recentTransactions.map((transaction, index) => (
                    <View key={index} style={styles.transactionItem}>
                      <View style={styles.transactionInfo}>
                        <Text style={styles.transactionType}>{transaction.type}</Text>
                        <Text style={styles.transactionDate}>{transaction.date}</Text>
                      </View>
                      <Text style={styles.transactionAmount}>
                        {formatCurrency(transaction.amount)}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>

            {/* Export Button */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.exportButton}
                onPress={() => {
                  // TODO: Export reports functionality
                }}
              >
                <Ionicons name="download" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Export Report</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearReportData}
              >
                <Ionicons name="trash" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Clear Data</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
} 