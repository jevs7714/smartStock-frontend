import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { initDatabase } from '../utils/database';
import { checkAndPopulateData } from '../utils/sampleData';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Initialize database when app starts
    const setupDatabase = async () => {
      try {
        console.log('Starting database setup...');
        await initDatabase();
        console.log('Database initialized successfully');
        
        // Populate with sample data if empty
        await checkAndPopulateData();
        console.log('Database setup completed');
      } catch (error) {
        console.error('Failed to initialize database:', error);
        // You might want to show a user-friendly error message here
        // For now, we'll just log the error and continue
      }
    };

    setupDatabase();
  }, []);

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#8E8E93',
          tabBarStyle: {
            backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
            borderTopColor: colorScheme === 'dark' ? '#38383A' : '#C6C6C8',
          },
          headerStyle: {
            backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
          },
          headerTintColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            headerShown: false,
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="products"
          options={{
            headerShown: false,
            title: 'Products',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cube" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="inventory"
          options={{
            headerShown: false,
            title: 'Inventory',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="checkout"
          options={{
            headerShown: false,
            title: 'Checkout',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="card" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            headerShown: false,
            title: 'Reports',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="analytics" size={size} color={color} />
            ),
          }}
        />
         <Tabs.Screen
          name="generateBarcode"
          options={{
            href: null,
            headerShown: false,
            title: 'Generate Barcode',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="analytics" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
