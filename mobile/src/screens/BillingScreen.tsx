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
import { Customer, Product, Batch, InvoiceItemPayload } from '../types';
import { formatCurrency, formatExpiry, buildUpiDeepLink, buildWhatsAppLink } from '../utils/format';

interface BillingScreenProps {
  onBillCreated?: () => void;
}

export const BillingScreen: React.FC<BillingScreenProps> = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Bill Form State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMode, setPaymentMode] = useState<'Credit' | 'Cash' | 'UPI'>('Credit');
  const [items, setItems] = useState<InvoiceItemPayload[]>([]);

  // Item Picker Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [itemQty, setItemQty] = useState('1');
  const [itemFreeQty, setItemFreeQty] = useState('0');
  const [itemRate, setItemRate] = useState('0');
  const [itemDiscount, setItemDiscount] = useState('0');

  // Customer Picker Modal State
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [searchCustomerQuery, setSearchCustomerQuery] = useState('');

  // Post-Creation Success Modal
  const [createdInvoice, setCreatedInvoice] = useState<any | null>(null);

  useEffect(() => {
    loadPrerequisites();
  }, []);

  const loadPrerequisites = async () => {
    setLoading(true);
    try {
      const [custRes, prodRes] = await Promise.all([
        mobileApiRequest('/customers?limit=250').catch(() => ({ customers: [] })),
        mobileApiRequest('/products?limit=250').catch(() => ({ products: [] })),
      ]);
      setCustomers(custRes.customers || []);
      setProducts(prodRes.products || []);
      if (custRes.customers && custRes.customers.length > 0 && !selectedCustomer) {
        setSelectedCustomer(custRes.customers[0]);
      }
    } catch (err) {
      console.warn('Failed to load customers/products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (prod: Product) => {
    setSelectedProduct(prod);
    const availableBatches = (prod.batches || []).filter((b) => b.current_stock > 0);
    const firstBatch = availableBatches[0] || prod.batches?.[0] || null;
    setSelectedBatch(firstBatch);
    setItemRate(String(firstBatch?.ptr || prod.ptr || prod.mrp || 0));
    setItemQty('1');
    setItemFreeQty('0');
    setItemDiscount('0');
  };

  const handleAddItem = () => {
    if (!selectedProduct || !selectedBatch) {
      Alert.alert('Error', 'Please select product and batch');
      return;
    }
    const qty = parseInt(itemQty, 10) || 0;
    const freeQty = parseInt(itemFreeQty, 10) || 0;
    const rate = parseFloat(itemRate) || 0;
    const disc = parseFloat(itemDiscount) || 0;

    if (qty <= 0) {
      Alert.alert('Invalid Quantity', 'Billed quantity must be greater than zero');
      return;
    }

    const gross = qty * rate;
    const discountAmount = (gross * disc) / 100;
    const taxable = gross - discountAmount;
    const gstRate = selectedProduct.gst_rate || 12;

    const isInterState = selectedCustomer?.state && selectedCustomer.state.toLowerCase() !== 'gujarat';
    const cgst = isInterState ? 0 : (taxable * (gstRate / 2)) / 100;
    const sgst = isInterState ? 0 : (taxable * (gstRate / 2)) / 100;
    const igst = isInterState ? (taxable * gstRate) / 100 : 0;
    const total = taxable + cgst + sgst + igst;

    const newItem: InvoiceItemPayload = {
      product_id: selectedProduct.id,
      batch_id: selectedBatch.id,
      product_name: selectedProduct.product_name,
      batch_number: selectedBatch.batch_number,
      expiry_date: selectedBatch.expiry_date,
      packing: selectedProduct.packing || '',
      hsn_code: selectedProduct.hsn_code || '3004',
      quantity: qty,
      free_quantity: freeQty,
      mrp: selectedBatch.mrp || selectedProduct.mrp,
      rate,
      discount_percent: disc,
      gst_rate: gstRate,
      taxable_amount: Math.round(taxable * 100) / 100,
      cgst_amount: Math.round(cgst * 100) / 100,
      sgst_amount: Math.round(sgst * 100) / 100,
      igst_amount: Math.round(igst * 100) / 100,
      total_amount: Math.round(total * 100) / 100,
    };

    setItems([...items, newItem]);
    setIsItemModalOpen(false);
    setSelectedProduct(null);
    setSelectedBatch(null);
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  // Calculations
  const totalTaxable = items.reduce((sum, it) => sum + it.taxable_amount, 0);
  const totalCGST = items.reduce((sum, it) => sum + it.cgst_amount, 0);
  const totalSGST = items.reduce((sum, it) => sum + it.sgst_amount, 0);
  const totalIGST = items.reduce((sum, it) => sum + it.igst_amount, 0);
  const totalGST = totalCGST + totalSGST + totalIGST;
  const rawTotal = totalTaxable + totalGST;
  const netTotal = Math.round(rawTotal);
  const roundOff = Math.round((netTotal - rawTotal) * 100) / 100;

  const handleFinalizeBill = async () => {
    if (!selectedCustomer) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Empty Bill', 'Add at least one medicine item to generate invoice');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customer_id: selectedCustomer.id,
        invoice_date: new Date().toISOString().split('T')[0],
        payment_mode: paymentMode,
        items,
        total_taxable_amount: totalTaxable,
        total_cgst_amount: totalCGST,
        total_sgst_amount: totalSGST,
        total_igst_amount: totalIGST,
        round_off: roundOff,
        net_invoice_amount: netTotal,
        include_upi_qr: true,
        upi_id: 'aldholakia72@okicici',
      };

      const res = await mobileApiRequest('/sales/invoices', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setCreatedInvoice(res.invoice || { ...payload, invoice_number: 'INV-NEW' });
      setItems([]);
    } catch (err: any) {
      Alert.alert('Billing Failed', err.message || 'Could not record invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  const triggerUpiApp = () => {
    if (!createdInvoice) return;
    const uri = buildUpiDeepLink(
      'aldholakia72@okicici',
      'PARAM PHARMA',
      createdInvoice.net_invoice_amount,
      createdInvoice.invoice_number
    );
    Linking.openURL(uri).catch(() => {
      Alert.alert('UPI Error', 'Could not open UPI apps (Google Pay, PhonePe, Paytm).');
    });
  };

  const triggerWhatsApp = () => {
    if (!createdInvoice || !selectedCustomer) return;
    const msg = `*PARAM PHARMA - INVOICE*\nInvoice: ${createdInvoice.invoice_number}\nDate: ${createdInvoice.invoice_date}\nCustomer: ${selectedCustomer.party_name}\nAmount: Rs. ${createdInvoice.net_invoice_amount.toFixed(2)}\nPay UPI: aldholakia72@okicici\nJurisdiction: Bhuj, Kutch (Gujarat)`;
    const phone = selectedCustomer.mobile || selectedCustomer.phone || '';
    Linking.openURL(buildWhatsAppLink(phone, msg)).catch(() => {
      Alert.alert('WhatsApp Error', 'Could not open WhatsApp.');
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Customer Selector Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>SELECT CUSTOMER (CHEMIST)</Text>
        <TouchableOpacity
          style={styles.customerSelector}
          onPress={() => setIsCustomerModalOpen(true)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.customerSelectedName}>
              {selectedCustomer ? selectedCustomer.party_name : 'Tap to Choose Customer'}
            </Text>
            {selectedCustomer && (
              <Text style={styles.customerSelectedMeta}>
                {selectedCustomer.city || 'Kutch'} | Balance: {formatCurrency(selectedCustomer.current_balance)}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color="#64748b" />
        </TouchableOpacity>

        {/* Payment Mode Selector */}
        <View style={styles.paymentModeRow}>
          {(['Credit', 'Cash', 'UPI'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.modeBtn,
                paymentMode === mode && styles.modeBtnActive,
              ]}
              onPress={() => setPaymentMode(mode)}
            >
              <Text
                style={[
                  styles.modeBtnText,
                  paymentMode === mode && styles.modeBtnTextActive,
                ]}
              >
                {mode === 'Credit' ? 'Bill on Credit' : mode === 'Cash' ? 'Immediate Cash' : 'UPI Payment'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Items Section */}
      <View style={styles.card}>
        <View style={styles.itemHeaderRow}>
          <Text style={styles.cardHeader}>MEDICINE ITEMS ({items.length})</Text>
          <TouchableOpacity
            style={styles.addItemBtn}
            onPress={() => setIsItemModalOpen(true)}
          >
            <Ionicons name="add" size={16} color="#ffffff" />
            <Text style={styles.addItemBtnText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyItemsBox}>
            <Ionicons name="cart-outline" size={32} color="#cbd5e1" />
            <Text style={styles.emptyItemsText}>No medicines added to bill yet.</Text>
            <TouchableOpacity
              style={styles.tapAddBtn}
              onPress={() => setIsItemModalOpen(true)}
            >
              <Text style={styles.tapAddBtnText}>+ Tap to Search & Add Medicine</Text>
            </TouchableOpacity>
          </View>
        ) : (
          items.map((it, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemProdName}>{it.product_name}</Text>
                <Text style={styles.itemBatchMeta}>
                  Batch: {it.batch_number} (Exp: {formatExpiry(it.expiry_date)}) | GST: {it.gst_rate}%
                </Text>
                <Text style={styles.itemQtyMeta}>
                  Qty: {it.quantity} {it.free_quantity > 0 ? `+ ${it.free_quantity} Free` : ''} @ Rs. {it.rate.toFixed(2)}
                  {it.discount_percent > 0 ? ` (${it.discount_percent}% off)` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                <Text style={styles.itemRowTotal}>{formatCurrency(it.total_amount)}</Text>
                <TouchableOpacity onPress={() => handleRemoveItem(idx)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Bill Calculation Summary */}
      {items.length > 0 && (
        <View style={styles.summaryCard}>
          <Text style={styles.cardHeader}>TAX INVOICE SUMMARY</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Taxable Amount:</Text>
            <Text style={styles.summaryVal}>{formatCurrency(totalTaxable)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>CGST + SGST (Total GST):</Text>
            <Text style={styles.summaryVal}>{formatCurrency(totalGST)}</Text>
          </View>
          {roundOff !== 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Round Off:</Text>
              <Text style={styles.summaryVal}>{formatCurrency(roundOff)}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.summaryTotalRow]}>
            <Text style={styles.totalLabel}>NET INVOICE TOTAL:</Text>
            <Text style={styles.totalVal}>{formatCurrency(netTotal)}</Text>
          </View>

          <TouchableOpacity
            style={[styles.finalizeBtn, submitting && { opacity: 0.7 }]}
            onPress={handleFinalizeBill}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={18} color="#ffffff" />
                <Text style={styles.finalizeBtnText}>Finalize Bill & Deduct Stock</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Success Modal */}
      <Modal visible={!!createdInvoice} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successModalCard}>
            <Ionicons name="checkmark-circle" size={48} color="#10b981" />
            <Text style={styles.successTitle}>Invoice Generated Successfully!</Text>
            <Text style={styles.successInvNum}>{createdInvoice?.invoice_number}</Text>
            <Text style={styles.successAmount}>{formatCurrency(createdInvoice?.net_invoice_amount)}</Text>

            <View style={styles.successActions}>
              <TouchableOpacity style={styles.upiActionBtn} onPress={triggerUpiApp}>
                <Ionicons name="phone-portrait-outline" size={18} color="#ffffff" />
                <Text style={styles.upiActionBtnText}>Collect via GPay / UPI App</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.waActionBtn} onPress={triggerWhatsApp}>
                <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
                <Text style={styles.waActionBtnText}>Send Bill on WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => setCreatedInvoice(null)}
              >
                <Text style={styles.doneBtnText}>Close & Start Next Bill</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Customer Picker Modal */}
      <Modal visible={isCustomerModalOpen} animationType="slide">
        <View style={styles.pickerModalContainer}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Retail Chemist</Text>
            <TouchableOpacity onPress={() => setIsCustomerModalOpen(false)}>
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.searchBar}
            placeholder="Search chemist name, city, mobile..."
            value={searchCustomerQuery}
            onChangeText={setSearchCustomerQuery}
          />
          <ScrollView>
            {customers
              .filter((c) =>
                c.party_name.toLowerCase().includes(searchCustomerQuery.toLowerCase()) ||
                (c.city && c.city.toLowerCase().includes(searchCustomerQuery.toLowerCase()))
              )
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
                    <Text style={styles.pickerRowMeta}>{c.city || 'Kutch'} | DL: {c.dl_number || 'N/A'}</Text>
                  </View>
                  <Text style={styles.pickerRowBal}>{formatCurrency(c.current_balance)}</Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Item Picker Modal */}
      <Modal visible={isItemModalOpen} animationType="slide">
        <View style={styles.pickerModalContainer}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Add Medicine to Bill</Text>
            <TouchableOpacity onPress={() => setIsItemModalOpen(false)}>
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>

          {!selectedProduct ? (
            <>
              <TextInput
                style={styles.searchBar}
                placeholder="Search medicine brand, generic name..."
                value={searchProductQuery}
                onChangeText={setSearchProductQuery}
              />
              <ScrollView>
                {products
                  .filter((p) =>
                    p.product_name.toLowerCase().includes(searchProductQuery.toLowerCase()) ||
                    (p.generic_name && p.generic_name.toLowerCase().includes(searchProductQuery.toLowerCase()))
                  )
                  .map((p) => {
                    const totalStk = (p.batches || []).reduce((sum, b) => sum + b.current_stock, 0);
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={styles.pickerRow}
                        onPress={() => handleSelectProduct(p)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.pickerRowTitle}>{p.product_name}</Text>
                          <Text style={styles.pickerRowMeta}>{p.packing || ''} | {p.manufacturer || ''}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.pickerRowPrice}>PTR: Rs. {p.ptr.toFixed(2)}</Text>
                          <Text style={[styles.pickerRowStock, totalStk === 0 && { color: '#ef4444' }]}>
                            {totalStk} in Stock
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            </>
          ) : (
            <ScrollView style={{ padding: 14 }}>
              <TouchableOpacity onPress={() => setSelectedProduct(null)} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={16} color="#2563eb" />
                <Text style={styles.backBtnText}>Change Medicine</Text>
              </TouchableOpacity>

              <Text style={styles.chosenProductTitle}>{selectedProduct.product_name}</Text>
              <Text style={styles.chosenProductMeta}>
                {selectedProduct.packing} | GST: {selectedProduct.gst_rate}%
              </Text>

              {/* Batch Selector */}
              <Text style={styles.inputLabel}>SELECT BATCH (FEFO):</Text>
              {(selectedProduct.batches || []).map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[
                    styles.batchOption,
                    selectedBatch?.id === b.id && styles.batchOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedBatch(b);
                    setItemRate(String(b.ptr || selectedProduct.ptr));
                  }}
                >
                  <View>
                    <Text style={styles.batchNumText}>Batch: {b.batch_number}</Text>
                    <Text style={styles.batchExpText}>Expiry: {formatExpiry(b.expiry_date)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.batchStockText}>{b.current_stock} Units Avail</Text>
                    <Text style={styles.batchPriceText}>PTR: Rs. {b.ptr?.toFixed(2) || selectedProduct.ptr.toFixed(2)}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              <View style={styles.inputsGrid}>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Billed Qty *</Text>
                  <TextInput
                    style={styles.numberInput}
                    keyboardType="numeric"
                    value={itemQty}
                    onChangeText={setItemQty}
                  />
                </View>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Free Scheme Qty</Text>
                  <TextInput
                    style={styles.numberInput}
                    keyboardType="numeric"
                    value={itemFreeQty}
                    onChangeText={setItemFreeQty}
                  />
                </View>
              </View>

              <View style={styles.inputsGrid}>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Rate (PTR) Rs.</Text>
                  <TextInput
                    style={styles.numberInput}
                    keyboardType="numeric"
                    value={itemRate}
                    onChangeText={setItemRate}
                  />
                </View>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Discount %</Text>
                  <TextInput
                    style={styles.numberInput}
                    keyboardType="numeric"
                    value={itemDiscount}
                    onChangeText={setItemDiscount}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.confirmAddBtn} onPress={handleAddItem}>
                <Text style={styles.confirmAddBtnText}>Add Item to Bill</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
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
  paymentModeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
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
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  addItemBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyItemsBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyItemsText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 6,
  },
  tapAddBtn: {
    marginTop: 10,
  },
  tapAddBtnText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemProdName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemBatchMeta: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  itemQtyMeta: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
    marginTop: 1,
  },
  itemRowTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  deleteBtn: {
    marginTop: 4,
    padding: 2,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0f172a',
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#475569',
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  summaryTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    marginTop: 6,
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  totalVal: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  finalizeBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 4,
    marginTop: 12,
  },
  finalizeBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
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
    maxWidth: 340,
  },
  successTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 10,
    textAlign: 'center',
  },
  successInvNum: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563eb',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  successAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 4,
  },
  successActions: {
    width: '100%',
    marginTop: 16,
    gap: 8,
  },
  upiActionBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    borderRadius: 4,
  },
  upiActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  waActionBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    paddingVertical: 10,
    borderRadius: 4,
  },
  waActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  doneBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  doneBtnText: {
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
  pickerRowPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  pickerRowStock: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2,
  },
  pickerRowBal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#b91c1c',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  backBtnText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700',
  },
  chosenProductTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  chosenProductMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    marginTop: 8,
  },
  batchOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginBottom: 6,
  },
  batchOptionActive: {
    borderColor: '#0f172a',
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
  },
  batchNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  batchExpText: {
    fontSize: 11,
    color: '#64748b',
  },
  batchStockText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  batchPriceText: {
    fontSize: 11,
    color: '#334155',
  },
  inputsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  inputCol: {
    flex: 1,
  },
  numberInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
    backgroundColor: '#ffffff',
  },
  confirmAddBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 40,
  },
  confirmAddBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
