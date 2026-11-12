import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Linking,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mobileApiRequest } from '../api/client';
import { Customer, LedgerEntry } from '../types';
import { formatCurrency, formatDate } from '../utils/format';

export const CustomersScreen: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Ledger Statement Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await mobileApiRequest('/customers?limit=250');
      setCustomers(res.customers || []);
    } catch (err) {
      console.warn('Failed to load customers:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenLedger = async (cust: Customer) => {
    setSelectedCustomer(cust);
    setIsLedgerModalOpen(true);
    setLedgerLoading(true);
    try {
      const res = await mobileApiRequest(`/ledgers/customer/${cust.id}`);
      setLedgerEntries(res.entries || []);
    } catch (err: any) {
      Alert.alert('Ledger Error', err.message || 'Failed to fetch customer ledger.');
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleCall = (phone?: string) => {
    if (!phone) {
      Alert.alert('No Number', 'Mobile number not registered for this chemist.');
      return;
    }
    Linking.openURL(`tel:${phone.replace(/[^0-9]/g, '')}`);
  };

  const handleWhatsApp = (phone?: string, name?: string) => {
    if (!phone) {
      Alert.alert('No Number', 'Mobile number not registered for this chemist.');
      return;
    }
    const clean = phone.replace(/[^0-9]/g, '');
    const num = clean.length === 10 ? `91${clean}` : clean;
    const msg = `Hello ${name || 'Sir'}, this is Param Pharma, Bhuj. Regarding your account balance...`;
    Linking.openURL(`whatsapp://send?phone=${num}&text=${encodeURIComponent(msg)}`);
  };

  const filtered = customers.filter(
    (c) =>
      c.party_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.city && c.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.mobile && c.mobile.includes(searchQuery))
  );

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#64748b" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search chemist name, city, phone..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCustomers(); }} colors={['#0f172a']} />}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#0f172a" style={{ marginTop: 30 }} />
        ) : filtered.length === 0 ? (
          <Text style={styles.emptyText}>No matching customers found.</Text>
        ) : (
          filtered.map((c) => (
            <View key={c.id} style={styles.customerCard}>
              <View style={styles.cardTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerName}>{c.party_name}</Text>
                  <Text style={styles.customerCity}>
                    {c.city || 'Kutch, Gujarat'} | DL: {c.dl_number || 'N/A'}
                  </Text>
                  <Text style={styles.customerGstin}>GSTIN: {c.gstin || 'Unregistered'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.balanceLabel}>OUTSTANDING</Text>
                  <Text
                    style={[
                      styles.balanceAmount,
                      { color: c.current_balance > 0 ? '#b91c1c' : '#059669' },
                    ]}
                  >
                    {formatCurrency(c.current_balance)}
                  </Text>
                </View>
              </View>

              {/* Action Buttons Row */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: '#f1f5f9' }]}
                  onPress={() => handleCall(c.mobile || c.phone)}
                >
                  <Ionicons name="call" size={13} color="#0f172a" />
                  <Text style={styles.smallBtnText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: '#dcfce7' }]}
                  onPress={() => handleWhatsApp(c.mobile || c.phone, c.party_name)}
                >
                  <Ionicons name="logo-whatsapp" size={13} color="#166534" />
                  <Text style={[styles.smallBtnText, { color: '#166534' }]}>WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: '#0f172a', flex: 1.4 }]}
                  onPress={() => handleOpenLedger(c)}
                >
                  <Ionicons name="book-outline" size={13} color="#ffffff" />
                  <Text style={[styles.smallBtnText, { color: '#ffffff' }]}>View Ledger</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Ledger Modal */}
      <Modal visible={isLedgerModalOpen} animationType="slide">
        <View style={styles.ledgerModalContainer}>
          <View style={styles.ledgerHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.ledgerTitle}>{selectedCustomer?.party_name}</Text>
              <Text style={styles.ledgerSubtitle}>
                Current Balance: {formatCurrency(selectedCustomer?.current_balance)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setIsLedgerModalOpen(false)}>
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>

          {ledgerLoading ? (
            <ActivityIndicator size="large" color="#0f172a" style={{ marginTop: 40 }} />
          ) : ledgerEntries.length === 0 ? (
            <Text style={styles.emptyLedgerText}>No transactions recorded in this ledger.</Text>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 12 }}>
              {ledgerEntries.map((e) => (
                <View key={e.id} style={styles.ledgerItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ledgerDate}>
                      {formatDate(e.transaction_date)} | {e.reference_type}
                    </Text>
                    <Text style={styles.ledgerRef}>{e.reference_number}</Text>
                    <Text style={styles.ledgerDesc}>{e.description}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {e.debit_amount > 0 && (
                      <Text style={styles.debitText}>+ {formatCurrency(e.debit_amount)} (Bill)</Text>
                    )}
                    {e.credit_amount > 0 && (
                      <Text style={styles.creditText}>- {formatCurrency(e.credit_amount)} (Paid)</Text>
                    )}
                    <Text style={styles.runningBal}>Bal: {formatCurrency(e.running_balance)}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 40,
  },
  customerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  customerCity: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  customerGstin: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  balanceLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
  },
  balanceAmount: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  smallBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 4,
  },
  smallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 40,
    fontSize: 13,
  },
  ledgerModalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 40,
  },
  ledgerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  ledgerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  ledgerSubtitle: {
    fontSize: 12,
    color: '#b91c1c',
    fontWeight: '700',
    marginTop: 2,
  },
  emptyLedgerText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 40,
    fontSize: 13,
  },
  ledgerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  ledgerDate: {
    fontSize: 11,
    color: '#64748b',
  },
  ledgerRef: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: 'monospace',
    marginTop: 1,
  },
  ledgerDesc: {
    fontSize: 11,
    color: '#334155',
    marginTop: 2,
  },
  debitText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  creditText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  runningBal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 3,
  },
});
