import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mobileApiRequest } from '../api/client';
import { formatCurrency } from '../utils/format';

interface DashboardProps {
  onNavigate: (screen: string) => void;
  serverOnline: boolean;
}

export const DashboardScreen: React.FC<DashboardProps> = ({ onNavigate, serverOnline }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState({
    todaySales: 0,
    todayCollections: 0,
    totalReceivables: 0,
    lowStockCount: 0,
    expiringCount: 0,
    recentInvoices: [] as any[],
  });

  const fetchDashboardData = async () => {
    try {
      const [todayReg, custPayments, customersRes, expiryAlerts] = await Promise.all([
        mobileApiRequest('/registers/sales?limit=10').catch(() => ({ invoices: [], summary: {} })),
        mobileApiRequest('/payments/customer?limit=10').catch(() => []),
        mobileApiRequest('/customers?limit=250').catch(() => ({ customers: [] })),
        mobileApiRequest('/batches/expiry-alerts').catch(() => ({ total_expiring: 0, batches: [] })),
      ]);

      const todayStr = new Date().toISOString().split('T')[0];
      const todaySalesTotal = (todayReg.invoices || [])
        .filter((inv: any) => inv.invoice_date === todayStr)
        .reduce((sum: number, inv: any) => sum + (Number(inv.net_invoice_amount) || 0), 0);

      const todayCollectionsTotal = (Array.isArray(custPayments) ? custPayments : [])
        .filter((p: any) => p.payment_date === todayStr)
        .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

      const totalReceivables = (customersRes.customers || []).reduce(
        (sum: number, c: any) => sum + Math.max(0, Number(c.current_balance) || 0),
        0
      );

      const lowStock = (customersRes.customers || []).length; // fallback metric

      setMetrics({
        todaySales: todaySalesTotal || todayReg.summary?.total_sales_value || 0,
        todayCollections: todayCollectionsTotal,
        totalReceivables,
        lowStockCount: expiryAlerts.batches?.filter((b: any) => b.current_stock < 20).length || 0,
        expiringCount: expiryAlerts.total_expiring || 0,
        recentInvoices: (todayReg.invoices || []).slice(0, 5),
      });
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [serverOnline]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0f172a']} />}
    >
      {/* Top Banner */}
      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroSubtitle}>PHARMACEUTICAL WHOLESALE ERP</Text>
            <Text style={styles.heroTitle}>PARAM PHARMA</Text>
            <Text style={styles.heroJurisdiction}>Bhuj, Kutch (Gujarat) - 370001</Text>
          </View>
          <View style={styles.vpaPill}>
            <Ionicons name="qr-code-outline" size={14} color="#38bdf8" />
            <Text style={styles.vpaText}>aldholakia72@okicici</Text>
          </View>
        </View>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, { borderLeftColor: '#10b981' }]}>
          <Text style={styles.metricLabel}>TODAY'S SALES</Text>
          <Text style={styles.metricValue}>{formatCurrency(metrics.todaySales)}</Text>
        </View>

        <View style={[styles.metricCard, { borderLeftColor: '#3b82f6' }]}>
          <Text style={styles.metricLabel}>TODAY'S COLLECTIONS</Text>
          <Text style={styles.metricValue}>{formatCurrency(metrics.todayCollections)}</Text>
        </View>

        <View style={[styles.metricCard, { borderLeftColor: '#f59e0b' }]}>
          <Text style={styles.metricLabel}>OUTSTANDING RECEIVABLES</Text>
          <Text style={styles.metricValue}>{formatCurrency(metrics.totalReceivables)}</Text>
        </View>

        <View style={[styles.metricCard, { borderLeftColor: '#ef4444' }]}>
          <Text style={styles.metricLabel}>EXPIRING / LOW STOCK</Text>
          <Text style={[styles.metricValue, { color: '#dc2626' }]}>
            {metrics.expiringCount} Batches
          </Text>
        </View>
      </View>

      {/* Quick Action Buttons */}
      <Text style={styles.sectionHeader}>FIELD OPERATIONS</Text>
      <View style={styles.actionGrid}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onNavigate('billing')}>
          <View style={[styles.actionIconBox, { backgroundColor: '#0f172a' }]}>
            <Ionicons name="cart" size={20} color="#ffffff" />
          </View>
          <Text style={styles.actionBtnTitle}>New Van Bill</Text>
          <Text style={styles.actionBtnDesc}>Create GST sales bill</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => onNavigate('collections')}>
          <View style={[styles.actionIconBox, { backgroundColor: '#059669' }]}>
            <Ionicons name="cash" size={20} color="#ffffff" />
          </View>
          <Text style={styles.actionBtnTitle}>Collect Payment</Text>
          <Text style={styles.actionBtnDesc}>Record cash / UPI receipt</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => onNavigate('customers')}>
          <View style={[styles.actionIconBox, { backgroundColor: '#2563eb' }]}>
            <Ionicons name="people" size={20} color="#ffffff" />
          </View>
          <Text style={styles.actionBtnTitle}>Chemists Directory</Text>
          <Text style={styles.actionBtnDesc}>Balances & Ledgers</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => onNavigate('stock')}>
          <View style={[styles.actionIconBox, { backgroundColor: '#d97706' }]}>
            <Ionicons name="medkit" size={20} color="#ffffff" />
          </View>
          <Text style={styles.actionBtnTitle}>Stock & Batches</Text>
          <Text style={styles.actionBtnDesc}>Check available units</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Invoices */}
      <View style={styles.recentSection}>
        <View style={styles.recentHeaderRow}>
          <Text style={styles.sectionHeader}>RECENT FIELD INVOICES</Text>
          <TouchableOpacity onPress={() => onNavigate('billing')}>
            <Text style={styles.seeAllText}>+ New Bill</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color="#0f172a" style={{ marginVertical: 20 }} />
        ) : metrics.recentInvoices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No recent bills recorded.</Text>
          </View>
        ) : (
          metrics.recentInvoices.map((inv) => (
            <View key={inv.id} style={styles.recentItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.recentInvNum}>{inv.invoice_number}</Text>
                <Text style={styles.recentCustName}>{inv.customer_name}</Text>
                <Text style={styles.recentMeta}>{inv.invoice_date} | {inv.item_count || 1} item(s)</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.recentAmount}>{formatCurrency(inv.net_invoice_amount)}</Text>
                <Text
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: inv.payment_status === 'Paid' ? '#dcfce7' : '#fee2e2',
                      color: inv.payment_status === 'Paid' ? '#166534' : '#991b1b',
                    },
                  ]}
                >
                  {inv.payment_status || 'Unpaid'}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 14,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 8,
    marginBottom: 14,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroSubtitle: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  heroJurisdiction: {
    color: '#cbd5e1',
    fontSize: 10,
    marginTop: 3,
  },
  vpaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  vpaText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  actionBtn: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  actionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  actionBtnDesc: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  recentSection: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  seeAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  recentInvNum: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: 'monospace',
  },
  recentCustName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
  },
  recentMeta: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  recentAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  statusPill: {
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginTop: 4,
    overflow: 'hidden',
  },
  emptyCard: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 12,
  },
});
