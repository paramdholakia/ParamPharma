import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mobileApiRequest } from '../api/client';
import { Product } from '../types';
import { formatCurrency, formatExpiry, isBatchExpiringSoon } from '../utils/format';

export const StockScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'low' | 'expiring'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    try {
      const res = await mobileApiRequest('/products?limit=250');
      setProducts(res.products || []);
    } catch (err) {
      console.warn('Failed to fetch stock:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.generic_name && p.generic_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.manufacturer && p.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    const totalStk = (p.batches || []).reduce((sum, b) => sum + b.current_stock, 0);

    if (filterMode === 'low') {
      return totalStk <= (p.min_stock_level || 20);
    }
    if (filterMode === 'expiring') {
      return (p.batches || []).some((b) => isBatchExpiringSoon(b.expiry_date) !== 'safe');
    }
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#64748b" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search brand, generic, company..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'low', 'expiring'] as const).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.filterBtn, filterMode === mode && styles.filterBtnActive]}
            onPress={() => setFilterMode(mode)}
          >
            <Text style={[styles.filterBtnText, filterMode === mode && styles.filterBtnTextActive]}>
              {mode === 'all' ? 'All Products' : mode === 'low' ? 'Low Stock' : 'Expiring Soon'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStock(); }} colors={['#0f172a']} />}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#0f172a" style={{ marginTop: 30 }} />
        ) : filtered.length === 0 ? (
          <Text style={styles.emptyText}>No products match the filter criteria.</Text>
        ) : (
          filtered.map((p) => {
            const totalStk = (p.batches || []).reduce((sum, b) => sum + b.current_stock, 0);
            return (
              <View key={p.id} style={styles.productCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productTitle}>{p.product_name}</Text>
                    {p.generic_name && (
                      <Text style={styles.genericText}>{p.generic_name}</Text>
                    )}
                    <Text style={styles.metaText}>
                      {p.packing || ''} | {p.manufacturer || ''} | HSN: {p.hsn_code || '3004'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={[
                        styles.totalStockPill,
                        totalStk === 0
                          ? { backgroundColor: '#fee2e2', color: '#991b1b' }
                          : totalStk <= (p.min_stock_level || 20)
                          ? { backgroundColor: '#fef3c7', color: '#92400e' }
                          : { backgroundColor: '#dcfce7', color: '#166534' },
                      ]}
                    >
                      {totalStk} Units
                    </Text>
                    <Text style={styles.priceRow}>
                      PTR: {formatCurrency(p.ptr)} | MRP: {formatCurrency(p.mrp)}
                    </Text>
                  </View>
                </View>

                {/* Batches Sub-list */}
                <View style={styles.batchesSection}>
                  <Text style={styles.batchesHeader}>ACTIVE BATCHES (FEFO):</Text>
                  {(p.batches || []).length === 0 ? (
                    <Text style={styles.noBatchText}>No batches in stock.</Text>
                  ) : (
                    (p.batches || []).map((b) => {
                      const expStatus = isBatchExpiringSoon(b.expiry_date);
                      return (
                        <View key={b.id} style={styles.batchRow}>
                          <View>
                            <Text style={styles.batchNum}>Batch: {b.batch_number}</Text>
                            <Text style={styles.batchExp}>Exp: {formatExpiry(b.expiry_date)}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.batchStock}>{b.current_stock} Units</Text>
                            <Text
                              style={[
                                styles.expBadge,
                                expStatus === 'expired'
                                  ? { backgroundColor: '#fee2e2', color: '#b91c1c' }
                                  : expStatus === 'critical'
                                  ? { backgroundColor: '#ffedd5', color: '#c2410c' }
                                  : { backgroundColor: '#f1f5f9', color: '#475569' },
                              ]}
                            >
                              {expStatus === 'expired' ? 'Expired' : expStatus === 'critical' ? 'Expires Soon' : 'Safe'}
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
    marginHorizontal: 10,
    marginTop: 10,
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
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginHorizontal: 10,
    marginVertical: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  filterBtnActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  filterBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  filterBtnTextActive: {
    color: '#ffffff',
  },
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 40,
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  genericText: {
    fontSize: 11,
    color: '#475569',
    fontStyle: 'italic',
    marginTop: 1,
  },
  metaText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  totalStockPill: {
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  priceRow: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 3,
    fontWeight: '600',
  },
  batchesSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  batchesHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  noBatchText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  batchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  batchNum: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'monospace',
  },
  batchExp: {
    fontSize: 10,
    color: '#64748b',
  },
  batchStock: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  expBadge: {
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 40,
    fontSize: 13,
  },
});
