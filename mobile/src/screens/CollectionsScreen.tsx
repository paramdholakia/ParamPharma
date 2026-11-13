import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mobileApiRequest } from '../api/client';
import { Customer } from '../types';
import { formatCurrency, formatDate, buildWhatsAppLink } from '../utils/format';

export const CollectionsScreen: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [bankName, setBankName] = useState('');
  const [notes, setNotes] = useState('');

  // Customer Picker Modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Created Receipt Modal
  const [createdReceipt, setCreatedReceipt] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [custRes, payRes] = await Promise.all([
        mobileApiRequest('/customers?limit=250').catch(() => ({ customers: [] })),
        mobileApiRequest('/payments/customer?limit=25').catch(() => []),
      ]);
      setCustomers(custRes.customers || []);
      setPayments(Array.isArray(payRes) ? payRes : []);
      if (custRes.customers && custRes.customers.length > 0 && !selectedCustomer) {
        setSelectedCustomer(custRes.customers[0]);
      }
    } catch (err) {
      console.warn('Failed to fetch collections data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordCollection = async () => {
    if (!selectedCustomer) {
      Alert.alert('Error', 'Please select a customer/chemist');
      return;
    }
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Enter valid collection amount greater than 0');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customer_id: selectedCustomer.id,
        amount: numAmount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_mode: paymentMode,
        reference_no: referenceNo,
        bank_name: bankName,
        notes: notes || 'Field collection via mobile app',
      };

      const res = await mobileApiRequest('/payments/customer', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setCreatedReceipt(res.payment || { ...payload, receipt_number: 'RCP-NEW' });
      setAmount('');
      setReferenceNo('');
      setBankName('');
      setNotes('');
      fetchData();
    } catch (err: any) {
      Alert.alert('Collection Failed', err.message || 'Could not record collection.');
    } finally {
      setSubmitting(false);
    }
  };

  const sendWhatsAppReceipt = () => {
    if (!createdReceipt || !selectedCustomer) return;
    const msg = `*PARAM PHARMA - MONEY RECEIPT*\nReceipt No: ${createdReceipt.receipt_number}\nDate: ${createdReceipt.payment_date}\nReceived With Thanks From: ${selectedCustomer.party_name}\nAmount: Rs. ${Number(createdReceipt.amount || 0).toFixed(2)}\nMode: ${createdReceipt.payment_mode} ${createdReceipt.reference_no ? `(Ref: ${createdReceipt.reference_no})` : ''}\nStatutory Jurisdiction: Bhuj, Kutch (Gujarat) - 370001`;
    const phone = selectedCustomer.mobile || selectedCustomer.phone || '';
    Linking.openURL(buildWhatsAppLink(phone, msg)).catch(() => {
      Alert.alert('WhatsApp Error', 'Could not open WhatsApp.');
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Form Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>RECORD MONEY RECEIPT (COLLECTION)</Text>

        <TouchableOpacity
          style={styles.customerSelector}
          onPress={() => setIsCustomerModalOpen(true)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.customerSelectedName}>
              {selectedCustomer ? selectedCustomer.party_name : 'Select Chemist'}
            </Text>
            {selectedCustomer && (
              <Text style={styles.customerSelectedMeta}>
                Outstanding Balance: <Text style={{ color: '#b91c1c', fontWeight: '800' }}>{formatCurrency(selectedCustomer.current_balance)}</Text>
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color="#64748b" />
        </TouchableOpacity>

        {/* Amount Input */}
        <Text style={styles.inputLabel}>AMOUNT RECEIVED (RS.) *</Text>
        <TextInput
          style={styles.amountInput}
          placeholder="e.g. 15000"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />

        {/* Mode Selector */}
        <Text style={styles.inputLabel}>PAYMENT MODE:</Text>
        <View style={styles.modeGrid}>
          {['Cash', 'UPI', 'Cheque', 'Bank Transfer'].map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, paymentMode === m && styles.modeBtnActive]}
              onPress={() => setPaymentMode(m)}
            >
              <Text style={[styles.modeBtnText, paymentMode === m && styles.modeBtnTextActive]}>
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reference / UTR # */}
        <Text style={styles.inputLabel}>REFERENCE / UTR / CHEQUE NUMBER</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. UPI Ref / Cheque #881231"
          value={referenceNo}
          onChangeText={setReferenceNo}
        />

        {/* Bank Name */}
        {paymentMode !== 'Cash' && (
          <>
            <Text style={styles.inputLabel}>BANK NAME (OPTIONAL)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. State Bank of India / HDFC"
              value={bankName}
              onChangeText={setBankName}
            />
          </>
        )}

        {/* Notes */}
        <Text style={styles.inputLabel}>NARRATION / NOTES</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Payment remarks..."
          value={notes}
          onChangeText={setNotes}
        />

        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={handleRecordCollection}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="receipt-outline" size={18} color="#ffffff" />
              <Text style={styles.submitBtnText}>Post Receipt Voucher & Credit Ledger</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Recent Collections List */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>RECENT FIELD COLLECTIONS ({payments.length})</Text>
        {loading ? (
          <ActivityIndicator color="#0f172a" style={{ marginVertical: 15 }} />
        ) : payments.length === 0 ? (
          <Text style={styles.emptyText}>No collections recorded yet.</Text>
        ) : (
          payments.map((p) => (
            <View key={p.id} style={styles.paymentRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentReceiptNum}>{p.receipt_number}</Text>
                <Text style={styles.paymentCustName}>{p.customer_name}</Text>
                <Text style={styles.paymentMeta}>
                  {formatDate(p.payment_date)} | Mode: {p.payment_mode}
                  {p.reference_no ? ` (${p.reference_no})` : ''}
                </Text>
              </View>
              <Text style={styles.paymentAmount}>{formatCurrency(p.amount)}</Text>
            </View>
          ))
        )}
      </View>

      {/* Success Modal */}
      <Modal visible={!!createdReceipt} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successModalCard}>
            <Ionicons name="checkmark-circle" size={48} color="#10b981" />
            <Text style={styles.successTitle}>Payment Receipt Generated!</Text>
            <Text style={styles.successVoucherNum}>{createdReceipt?.receipt_number}</Text>
            <Text style={styles.successAmount}>{formatCurrency(createdReceipt?.amount)}</Text>
            <Text style={styles.successCredited}>Credited to {selectedCustomer?.party_name}'s Ledger</Text>

            <TouchableOpacity style={styles.waBtn} onPress={sendWhatsAppReceipt}>
              <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
              <Text style={styles.waBtnText}>Share Official Receipt on WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setCreatedReceipt(null)}>
              <Text style={styles.closeBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Customer Picker Modal */}
      <Modal visible={isCustomerModalOpen} animationType="slide">
        <View style={styles.pickerModalContainer}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Chemist</Text>
            <TouchableOpacity onPress={() => setIsCustomerModalOpen(false)}>
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.searchBar}
            placeholder="Search chemist..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <ScrollView>
            {customers
              .filter((c) => (c.party_name || '').toLowerCase().includes((searchQuery || '').toLowerCase()))
              .map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.pickerRow}
                  onPress={() => {
                    setSelectedCustomer(c);
                    setIsCustomerModalOpen(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerRowTitle}>{c.party_name}</Text>
                    <Text style={styles.pickerRowMeta}>{c.city || 'Kutch'}</Text>
                  </View>
                  <Text style={styles.pickerRowBal}>{formatCurrency(c.current_balance)}</Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 12,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  cardHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  customerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginBottom: 10,
  },
  customerSelectedName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  customerSelectedMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    marginTop: 8,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#059669',
    backgroundColor: '#f8fafc',
  },
  modeGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  modeBtnActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  modeBtnTextActive: {
    color: '#ffffff',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: '#ffffff',
  },
  submitBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 4,
    marginTop: 16,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  paymentReceiptNum: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: 'monospace',
  },
  paymentCustName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 1,
  },
  paymentMeta: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  paymentAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  successTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 10,
    textAlign: 'center',
  },
  successVoucherNum: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  successAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 4,
  },
  successCredited: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 16,
    textAlign: 'center',
  },
  waBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    paddingVertical: 10,
    borderRadius: 4,
    width: '100%',
  },
  waBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    paddingVertical: 8,
    marginTop: 6,
  },
  closeBtnText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  pickerModalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 40,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  searchBar: {
    backgroundColor: '#f1f5f9',
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    fontSize: 13,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerRowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  pickerRowMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  pickerRowBal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#b91c1c',
  },
});
