import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { checkServerHealth } from './src/api/client';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { BillingScreen } from './src/screens/BillingScreen';
import { CollectionsScreen } from './src/screens/CollectionsScreen';
import { CustomersScreen } from './src/screens/CustomersScreen';
import { StockScreen } from './src/screens/StockScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

type ScreenType = 'dashboard' | 'billing' | 'collections' | 'customers' | 'stock' | 'settings';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenType>('dashboard');
  const [serverOnline, setServerOnline] = useState<boolean>(false);

  const verifyConnection = async () => {
    const res = await checkServerHealth();
    setServerOnline(res.online);
  };

  useEffect(() => {
    verifyConnection();
    const interval = setInterval(verifyConnection, 15000); // Heartbeat every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Top Mobile App Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.brandTitle}>PARAM PHARMA</Text>
          <Text style={styles.brandLocation}>Bhuj, Kutch</Text>
        </View>

        <TouchableOpacity
          style={styles.statusPill}
          onPress={() => setActiveScreen('settings')}
        >
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: serverOnline ? '#10b981' : '#ef4444' },
            ]}
          />
          <Text style={styles.statusPillText}>
            {serverOnline ? 'Online' : 'Offline'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Active Screen Body */}
      <View style={styles.screenContainer}>
        {activeScreen === 'dashboard' && (
          <DashboardScreen
            onNavigate={(screen) => setActiveScreen(screen as ScreenType)}
            serverOnline={serverOnline}
          />
        )}
        {activeScreen === 'billing' && <BillingScreen />}
        {activeScreen === 'collections' && <CollectionsScreen />}
        {activeScreen === 'customers' && <CustomersScreen />}
        {activeScreen === 'stock' && <StockScreen />}
        {activeScreen === 'settings' && (
          <SettingsScreen onServerConfigChanged={verifyConnection} />
        )}
      </View>

      {/* Bottom Mobile Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveScreen('dashboard')}
        >
          <Ionicons
            name={activeScreen === 'dashboard' ? 'grid' : 'grid-outline'}
            size={20}
            color={activeScreen === 'dashboard' ? '#0f172a' : '#94a3b8'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeScreen === 'dashboard' && styles.tabLabelActive,
            ]}
          >
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveScreen('billing')}
        >
          <Ionicons
            name={activeScreen === 'billing' ? 'cart' : 'cart-outline'}
            size={20}
            color={activeScreen === 'billing' ? '#0f172a' : '#94a3b8'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeScreen === 'billing' && styles.tabLabelActive,
            ]}
          >
            Van Bill
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveScreen('collections')}
        >
          <Ionicons
            name={activeScreen === 'collections' ? 'cash' : 'cash-outline'}
            size={20}
            color={activeScreen === 'collections' ? '#0f172a' : '#94a3b8'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeScreen === 'collections' && styles.tabLabelActive,
            ]}
          >
            Collect
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveScreen('customers')}
        >
          <Ionicons
            name={activeScreen === 'customers' ? 'people' : 'people-outline'}
            size={20}
            color={activeScreen === 'customers' ? '#0f172a' : '#94a3b8'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeScreen === 'customers' && styles.tabLabelActive,
            ]}
          >
            Chemists
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveScreen('stock')}
        >
          <Ionicons
            name={activeScreen === 'stock' ? 'medkit' : 'medkit-outline'}
            size={20}
            color={activeScreen === 'stock' ? '#0f172a' : '#94a3b8'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeScreen === 'stock' && styles.tabLabelActive,
            ]}
          >
            Stock
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveScreen('settings')}
        >
          <Ionicons
            name={activeScreen === 'settings' ? 'settings' : 'settings-outline'}
            size={20}
            color={activeScreen === 'settings' ? '#0f172a' : '#94a3b8'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeScreen === 'settings' && styles.tabLabelActive,
            ]}
          >
            Server
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  header: {
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerLeft: {
    flexDirection: 'column',
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  brandLocation: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusPillText: {
    color: '#e2e8f0',
    fontSize: 10,
    fontWeight: '700',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  tabBar: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 6,
    paddingBottom: Platform.OS === 'ios' ? 14 : 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
});
