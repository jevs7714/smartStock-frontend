import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    AppState,
    AppStateStatus,
    RefreshControl,
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
    DashboardStats,
    getChangeTrackerStatus,
    getDashboardStats,
    initDatabase
} from '../utils/database';

interface LastStats {
  totalProducts: number;
  outOfStock: number;
  lowStockItems: number;
  recentTransactions: number;
}

export default function Dashboard() {
  const colorScheme = useColorScheme();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    outOfStock: 0,
    lowStockItems: 0,
    recentTransactions: 0,
  });
  const lastStatsRef = useRef<LastStats>({
    totalProducts: 0,
    outOfStock: 0,
    lowStockItems: 0,
    recentTransactions: 0,
  });
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [lastModified, setLastModified] = useState<ChangeTracker | null>(null);
  const syncIntervalRef = useRef<number | null>(null);
  const appState = useRef(AppState.currentState);
  const isMounted = useRef(true);

  // Initialize database and load initial data
  useEffect(() => {
    const initialize = async () => {
      try {
        await initDatabase();
        if (isMounted.current) {
          await syncData(true);
        }
      } catch (error) {
        console.error('Database initialization error:', error);
        if (isMounted.current) {
          setError('Failed to initialize database. Please restart the app.');
        }
      }
    };

    initialize();

    return () => {
      isMounted.current = false;
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, []);

  const hasBusinessChanges = (newStats: DashboardStats): boolean => {
    const lastStats = lastStatsRef.current;
    
    // Check for specific business changes
    const changes = {
      products: newStats.totalProducts !== lastStats.totalProducts,
      stock: newStats.lowStockItems !== lastStats.lowStockItems,
      outOfStock: newStats.outOfStock !== lastStats.outOfStock,
      sales: newStats.recentTransactions !== lastStats.recentTransactions
    };

    // Update last stats if there are changes
    if (changes.products || changes.stock || changes.outOfStock || changes.sales) {
      lastStatsRef.current = { ...newStats };
      console.log('Business changes detected:', changes);
      return true;
    }

    return false;
  };

  const checkForChanges = async (): Promise<boolean> => {
    if (!isMounted.current) return false;
    
    try {
      const currentStatus = await getChangeTrackerStatus();
      
      // First sync or forced sync
      if (!lastModified) {
        setLastModified(currentStatus);
        return true;
      }

      // Check if relevant tables have been modified
      const hasChanges = 
        currentStatus.products_last_modified !== lastModified.products_last_modified ||
        currentStatus.inventory_last_modified !== lastModified.inventory_last_modified ||
        currentStatus.transactions_last_modified !== lastModified.transactions_last_modified;

      if (hasChanges) {
        // Get current stats to check for actual business changes
        const currentStats = await getDashboardStats();
        const hasActualChanges = hasBusinessChanges(currentStats);
        
        if (hasActualChanges) {
          setLastModified(currentStatus);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking for changes:', error);
      return true; // On error, force sync
    }
  };

  const syncData = useCallback(async (showLoading = true) => {
    if (isSyncing || !isMounted.current) return;

    try {
      setIsSyncing(true);
      if (showLoading) {
        setIsLoading(true);
      }
      setError(null);

      // Always get fresh data on manual sync
      if (!showLoading) {
        const needsSync = await checkForChanges();
        if (!needsSync) {
          setIsSyncing(false);
          if (showLoading) {
            setIsLoading(false);
          }
          return;
        }
      }
      
      // Load real data from database
      const databaseStats = await getDashboardStats();
      
      if (!isMounted.current) return;
      
      // Only update if there are actual changes or it's a manual refresh
      if (showLoading || hasBusinessChanges(databaseStats)) {
        setStats(databaseStats);
        setIsOnline(true);
        setLastSyncTime(new Date());
        console.log('Dashboard data updated:', databaseStats);
      }
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      if (!isMounted.current) return;
      
      setError('Failed to load dashboard data');
      setIsOnline(false);
    } finally {
      if (isMounted.current) {
        setIsSyncing(false);
        if (showLoading) {
          setIsLoading(false);
        }
      }
    }
  }, []);

  // Setup periodic sync
  useEffect(() => {
    const startSync = () => {
      // Clear any existing interval
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }

      // Set up new interval if no error
      if (!error) {
        syncIntervalRef.current = window.setInterval(async () => {
          if (isMounted.current && !isSyncing) {
            const needsSync = await checkForChanges();
            if (needsSync) {
              await syncData(false);
            }
          }
        }, 3000) as unknown as number;
      }
    };

    startSync();

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [error]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) && 
        nextAppState === 'active' && 
        isMounted.current
      ) {
        await syncData(false);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    if (isMounted.current) {
      syncData(true);
    }
  }, []);

  const formatSyncTime = () => {
    if (!lastSyncTime) return 'Never';
    return formatDate(lastSyncTime);
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 30) {
      return 'Just now';
    } else if (seconds < 60) {
      return `${seconds} seconds ago`;
    } else if (minutes < 60) {
      return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    } else if (hours < 24) {
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'Add Product':
        router.push('/products');
        break;
      case 'Generate QR Code':
        router.push('/generateBarcode');
        break;
      case 'POS Checkout':
        router.push('/checkout');
        break;
      case 'Internal Checkout':
        router.push('/checkout');
        break;
      default:
        Alert.alert('Quick Action', `${action} functionality will be implemented`);
    }
  };

  const handleStatsPress = (statType: string) => {
    switch (statType) {
      case 'totalProducts':
        router.push('/products');
        break;
      case 'lowStockItems':
        router.push('/inventory');
        break;
      case 'recentTransactions':
        router.push('/reports');
        break;
      case 'totalValue':
        router.push('/reports');
        break;
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
    statusBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
      padding: 12,
      borderRadius: 12,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    statusText: {
      marginLeft: 8,
      fontSize: 14,
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
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
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA',
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
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      marginBottom: 16,
    },
    quickActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    actionButton: {
      width: '48%',
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA',
    },
    actionIcon: {
      marginBottom: 8,
    },
    actionText: {
      fontSize: 14,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorText: {
      fontSize: 16,
      color: '#FF3B30',
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
    syncButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: 'transparent',
      marginLeft: 'auto',
    },
    syncButtonActive: {
      backgroundColor: '#007AFF',
    },
    statusBarError: {
      backgroundColor: '#FFE5E5',
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'right', 'bottom', 'left']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 16, color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }}>
            Loading dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'right', 'bottom', 'left']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              syncData(true);
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'right', 'bottom', 'left']}>
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
            tintColor={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Smart Stock</Text>
          <Text style={styles.subtitle}>Inventory Management Dashboard</Text>
        </View>

        {/* Sync Status */}
        <View style={[styles.statusBar, error && styles.statusBarError]}>
          <Ionicons
            name={isOnline ? 'wifi' : 'wifi-outline'}
            size={20}
            color={isOnline ? '#34C759' : '#FF3B30'}
          />
          <Text style={[styles.statusText, !isOnline && { color: '#FF3B30' }]}>
            {isOnline ? `Online - Last synced ${formatSyncTime()}` : 'Offline - Local Mode'}
          </Text>
          <TouchableOpacity 
            style={[styles.syncButton, isSyncing && styles.syncButtonActive]}
            onPress={() => syncData(true)}
            disabled={isSyncing}
          >
            <Ionicons 
              name={isSyncing ? "sync" : "sync-outline"} 
              size={20} 
              color={isSyncing ? '#FFFFFF' : (colorScheme === 'dark' ? '#FFFFFF' : '#000000')}
              style={isSyncing ? { transform: [{ rotate: '360deg' }] } : undefined}
            />
          </TouchableOpacity>
        </View>

        {/* Statistics Grid */}
        <View style={styles.statsGrid}>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => handleStatsPress('totalProducts')}
          >
            <Text style={styles.statValue}>{stats.totalProducts}</Text>
            <Text style={styles.statLabel}>Total Products</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => handleStatsPress('outOfStock')}
          >
            <Text style={styles.statValue}>{stats.outOfStock}</Text>
            <Text style={styles.statLabel}>Out of Stock</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => handleStatsPress('lowStockItems')}
          >
            <Text style={[styles.statValue, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>
              {stats.lowStockItems}
            </Text>
            <Text style={styles.statLabel}>Low Stock Items (≤ 5)</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => handleStatsPress('recentTransactions')}
          >
            <Text style={styles.statValue}>{stats.recentTransactions}</Text>
            <Text style={styles.statLabel}>Today's Transactions</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleQuickAction('Add Product')}
            >
              <Ionicons
                name="add-circle"
                size={32}
                color="#007AFF"
                style={styles.actionIcon}
              />
              <Text style={styles.actionText}>Add Product</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleQuickAction('Generate QR Code')}
            >
              <Ionicons
                name="qr-code-outline"
                size={32}
                color="#007AFF"
                style={styles.actionIcon}
              />
              <Text style={styles.actionText}>Generate QR Code</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleQuickAction('POS Checkout')}
            >
              <Ionicons
                name="card"
                size={32}
                color="#34C759"
                style={styles.actionIcon}
              />
              <Text style={styles.actionText}>POS Checkout</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleQuickAction('Internal Checkout')}
            >
              <Ionicons
                name="business"
                size={32}
                color="#FF9500"
                style={styles.actionIcon}
              />
              <Text style={styles.actionText}>Internal Checkout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
