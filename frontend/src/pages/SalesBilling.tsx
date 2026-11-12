import React, { useEffect, useState } from 'react';
import {
  ShoppingCart, Search, Plus, Trash2, Printer, AlertTriangle,
  UserPlus, CheckCircle2, FileText, ArrowRight, QrCode, MessageSquare, ExternalLink
} from 'lucide-react';
import { apiRequest, downloadFile } from '../api/client';
import { QuickCustomerModal } from '../components/QuickCustomerModal';
import { BrutalistNumberInput } from '../components/BrutalistNumberInput';
import { formatDate } from '../utils/date';

interface SalesBillingProps {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

interface BillingItem {
  id: string; // client temporary id
  product_id: number;
  product_name: string;
  manufacturer: string;
  packing: string;
  hsn_code: string;
  batch_id: number;
  batch_number: string;
  expiry_date: string;
  mrp: number;
  ptr: number;
  rate: number;
  quantity: number;
  free_quantity: number;
  discount_percent: number;
  gst_rate: number;
  available_qty: number;
  is_expired?: boolean;
  fefo_warning?: string | null;
}

export const SalesBilling: React.FC<SalesBillingProps> = ({ showToast }) => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<string>('Credit');
  const [paymentTerms, setPaymentTerms] = useState<string>('21 Days');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [allowExpiredOverride, setAllowExpiredOverride] = useState<boolean>(false);

  // UPI QR Code Feature Toggle (Target: 9429041051)
  const [includeUpiQr, setIncludeUpiQr] = useState<boolean>(true);

  // Billing Line Items
  const [items, setItems] = useState<BillingItem[]>([]);

  // Product Selection Autocomplete / Search
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);

  // Quick Customer Modal
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);

  // Last Generated Invoice modal/alert for instant WhatsApp & Re-print
  const [lastInvoice, setLastInvoice] = useState<any | null>(null);

  // Fetch initial customers
  const fetchCustomers = async () => {
    try {
      const res = await apiRequest('/customers?limit=200');
      setCustomers(res.customers || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load customers', 'error');
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Update selected customer details
  useEffect(() => {
    if (selectedCustomerId) {
      const cust = customers.find((c) => c.id === Number(selectedCustomerId));
      setSelectedCustomer(cust || null);
      if (cust) {
        setPaymentTerms(`${cust.payment_terms_days || 21} Days`);
      }
    } else {
      setSelectedCustomer(null);
    }
  }, [selectedCustomerId, customers]);

  // Debounced Product Search
  useEffect(() => {
    if (!productSearch.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingProduct(true);
      try {
        const res = await apiRequest(`/products?search=${encodeURIComponent(productSearch.trim())}&limit=12`);
        setSearchResults(res.products || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingProduct(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [productSearch]);

  // Add Product with FEFO batch selection
  const handleSelectProduct = async (product: any) => {
    try {
      const batches: any[] = await apiRequest(`/products/${product.id}/batches`);
      if (!batches || batches.length === 0) {
        showToast(`No active batches found for '${product.medicine_name}'`, 'error');
        return;
      }

      // Check available stock
      const availableBatches = batches.filter((b) => b.available_qty > 0);
      if (availableBatches.length === 0) {
        showToast(`Stock out! All batches for '${product.medicine_name}' are currently 0.`, 'error');
        return;
      }

      // FEFO: Earliest Expiry Batch
      const fefoBatch = availableBatches[0];
      const today = new Date().toISOString().split('T')[0];
      const isExpired = fefoBatch.expiry_date < today;

      const newItem: BillingItem = {
        id: Math.random().toString(),
        product_id: product.id,
        product_name: product.medicine_name,
        manufacturer: product.manufacturer,
        packing: product.packing,
        hsn_code: product.hsn_code || '3004',
        batch_id: fefoBatch.id,
        batch_number: fefoBatch.batch_number,
        expiry_date: fefoBatch.expiry_date,
        mrp: fefoBatch.mrp,
        ptr: fefoBatch.ptr,
        rate: fefoBatch.ptr > 0 ? fefoBatch.ptr : product.ptr,
        quantity: 1,
        free_quantity: 0,
        discount_percent: 0,
        gst_rate: fefoBatch.gst_rate || product.gst_rate || 12,
        available_qty: fefoBatch.available_qty,
        is_expired: isExpired,
        fefo_warning: isExpired ? 'EXPIRED BATCH: Requires authorization override' : null,
      };

      setItems((prev) => [...prev, newItem]);
      setProductSearch('');
      setSearchResults([]);
      showToast(`Added '${product.medicine_name}' (Batch: ${fefoBatch.batch_number}) via FEFO`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to select batch', 'error');
    }
  };

  const updateItemField = (index: number, field: keyof BillingItem, val: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = val;
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations
  const isInterstate = selectedCustomer ? selectedCustomer.state_code !== '24' : false;

  let totalGross = 0;
  let totalDiscount = 0;
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const calculatedItems = items.map((it) => {
    const gross = round(it.quantity * it.rate);
    const discAmt = round((gross * (it.discount_percent || 0)) / 100);
    const taxable = round(gross - discAmt);

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isInterstate) {
      igst = round((taxable * it.gst_rate) / 100);
    } else {
      const halfRate = it.gst_rate / 2;
      cgst = round((taxable * halfRate) / 100);
      sgst = round((taxable * halfRate) / 100);
    }

    const lineTotal = round(taxable + cgst + sgst + igst);

    totalGross += gross;
    totalDiscount += discAmt;
    totalTaxable += taxable;
    totalCgst += cgst;
    totalSgst += sgst;
    totalIgst += igst;

    return { ...it, gross, discAmt, taxable, cgst, sgst, igst, lineTotal };
  });

  const totalGst = totalCgst + totalSgst + totalIgst;
  const rawNet = totalTaxable + totalGst;
  const netInvoiceAmount = Math.round(rawNet);
  const roundOff = round(netInvoiceAmount - rawNet);
  const balanceOutstanding = Math.max(0, round(netInvoiceAmount - (paidAmount || 0)));

  function round(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  // Send Invoice summary & UPI details to Customer on WhatsApp
  const sendWhatsAppInvoice = (inv: any, cust: any) => {
    if (!cust) return;
    const phone = (cust.mobile || cust.contact_person || '').replace(/[^0-9]/g, '');
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
    if (!cleanPhone) {
      showToast(`No mobile number on file for ${cust.party_name}`, 'error');
      return;
    }

    const text = `*PARAM PHARMA WHOLESALE TAX INVOICE*
--------------------------------
*Invoice No:* ${inv.invoice_number}
*Date:* ${formatDate(inv.invoice_date)}
*Customer:* ${inv.customer_name}
*Amount Due:* ₹${inv.net_invoice_amount.toFixed(2)}
*Payment Status:* ${inv.payment_status} (Balance: ₹${inv.balance_amount.toFixed(2)})

*PAY VIA UPI:*
UPI ID: *aldholakia72-1@okaxis*
Mobile / Contact: *9429041051*
Exact Amount: ₹${inv.net_invoice_amount.toFixed(2)}

Thank you for your valuable business with Param Pharma!`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    showToast(`WhatsApp sharing opened for ${cust.party_name}`, 'success');
  };

  // Finalize or Draft Invoice
  const handleSaveInvoice = async (status: 'Finalized' | 'Draft') => {
    if (!selectedCustomerId) {
      showToast('Please select a customer before finalizing', 'error');
      return;
    }
    if (items.length === 0) {
      showToast('Please add at least one medicine to the invoice', 'error');
      return;
    }

    // Validate quantities
    for (const it of items) {
      const totalReq = it.quantity + (it.free_quantity || 0);
      if (it.quantity <= 0) {
        showToast(`Quantity for '${it.product_name}' must be at least 1`, 'error');
        return;
      }
      if (totalReq > it.available_qty) {
        showToast(
          `Insufficient stock for '${it.product_name}' (Batch: ${it.batch_number}). Req: ${totalReq}, Avail: ${it.available_qty}`,
          'error'
        );
        return;
      }
      if (it.is_expired && !allowExpiredOverride) {
        showToast(`Cannot sell expired batch '${it.batch_number}' without authorization override`, 'error');
        return;
      }
    }

    setSavingInvoice(true);
    try {
      const payload = {
        customer_id: Number(selectedCustomerId),
        invoice_date: invoiceDate,
        payment_terms: paymentTerms,
        payment_mode: paymentMode,
        paid_amount: paidAmount,
        notes: notes,
        include_upi_qr: includeUpiQr,
        status: status,
        allow_expired_override: allowExpiredOverride,
        items: items.map((it) => ({
          product_id: it.product_id,
          batch_id: it.batch_id,
          quantity: Number(it.quantity),
          free_quantity: Number(it.free_quantity || 0),
          rate: Number(it.rate),
          discount_percent: Number(it.discount_percent || 0),
          gst_rate: Number(it.gst_rate),
        })),
      };

      const res = await apiRequest('/sales', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const inv = res.invoice;
      showToast(`Invoice ${inv.invoice_number} generated successfully!`, 'success');
      setLastInvoice({ invoice: inv, customer: selectedCustomer });

      // Auto trigger PDF download
      try {
        await downloadFile(
          `/sales/${inv.id}/pdf?include_qr=${includeUpiQr}`,
          `Invoice_${inv.invoice_number}.pdf`
        );
      } catch (e) {
        console.error('PDF download error:', e);
      }

      // Reset Billing Form
      setItems([]);
      setSelectedCustomerId('');
      setPaidAmount(0);
      setNotes('');
      fetchCustomers();
    } catch (err: any) {
      showToast(err.message || 'Failed to save sales invoice', 'error');
    } finally {
      setSavingInvoice(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Success Notification Banner for Last Created Invoice */}
      {lastInvoice && (
        <div className="p-3 bg-emerald-100 dark:bg-emerald-950/80 border-2 border-emerald-800 dark:border-emerald-600 rounded flex flex-wrap items-center justify-between gap-3 text-xs brutalist-card">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
            <div>
              <span className="font-black text-slate-900 dark:text-white">
                Invoice {lastInvoice.invoice.invoice_number} generated!
              </span>{' '}
              <span className="text-slate-700 dark:text-slate-300">
                Amount: ₹{lastInvoice.invoice.net_invoice_amount.toFixed(2)} | Party: {lastInvoice.invoice.customer_name}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => sendWhatsAppInvoice(lastInvoice.invoice, lastInvoice.customer)}
              className="flex items-center gap-1.5 px-3 py-1.5 font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded brutalist-btn cursor-pointer"
            >
              <MessageSquare size={14} />
              <span>Send to WhatsApp</span>
            </button>
            <button
              onClick={() =>
                downloadFile(
                  `/sales/${lastInvoice.invoice.id}/pdf?include_qr=${lastInvoice.invoice.include_upi_qr}`,
                  `Invoice_${lastInvoice.invoice.invoice_number}.pdf`
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-900 dark:border-slate-600 rounded brutalist-btn cursor-pointer"
            >
              <Printer size={14} />
              <span>Re-Download PDF</span>
            </button>
            <button
              onClick={() => setLastInvoice(null)}
              className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold px-1.5"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Invoice Header Section */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b-1.5 border-slate-900 dark:border-slate-700 mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-blue-600 text-white"><ShoppingCart size={15} /></span>
            <h2 className="text-sm font-black text-slate-900 dark:text-white font-mono uppercase tracking-tight">
              GST Sales Tax Billing Counter
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 border border-slate-900 dark:border-slate-600 bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300">
              {isInterstate ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Pay Here UPI QR Code Toggle */}
            <button
              type="button"
              onClick={() => setIncludeUpiQr(!includeUpiQr)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold border-1.5 border-slate-900 dark:border-slate-600 brutalist-btn cursor-pointer ${
                includeUpiQr
                  ? 'bg-amber-300 dark:bg-amber-500 text-slate-900 font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
              title="Toggle inclusion of UPI payment QR Code targeting aldholakia72-1@okaxis"
            >
              <QrCode size={13} />
              <span>{includeUpiQr ? 'UPI QR: ON (aldholakia72-1@okaxis)' : 'UPI QR: OFF'}</span>
            </button>

            <button
              onClick={() => setIsQuickCustomerOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold border-1.5 border-slate-900 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 brutalist-btn cursor-pointer"
            >
              <UserPlus size={13} />
              <span>New Customer [F3]</span>
            </button>
          </div>
        </div>

        {/* Customer & Invoice Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Customer Dropdown */}
          <div className="sm:col-span-2">
            <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">
              Select Customer / Party Name *
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-2.5 py-1.5 border-1.5 border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-600 outline-hidden"
            >
              <option value="">-- Search & Choose Customer / Chemist / Doctor --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.party_name} ({c.customer_category}) - {c.city || 'Gujarat'} {c.mobile ? `[${c.mobile}]` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">
              Invoice Date ({formatDate(invoiceDate)})
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full px-2.5 py-1.5 border-1.5 border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-blue-600 outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Payment Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full px-2.5 py-1.5 border-1.5 border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-600 outline-hidden"
            >
              <option value="Credit">Credit (Outstanding)</option>
              <option value="Cash">Cash Counter</option>
              <option value="UPI">UPI (9429041051)</option>
              <option value="Bank Transfer">NEFT / RTGS</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>
        </div>

        {/* Selected Customer Card summary */}
        {selectedCustomer && (
          <div className="mt-2.5 p-2 bg-blue-50/80 dark:bg-slate-800/80 border border-slate-900 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-[11px]">
            <div>
              <span className="font-black text-slate-900 dark:text-white">{selectedCustomer.party_name}</span> &bull;{' '}
              <span className="text-slate-700 dark:text-slate-300">{selectedCustomer.billing_address}, {selectedCustomer.city}</span> &bull;{' '}
              <span className="font-mono text-slate-800 dark:text-slate-200">GST: {selectedCustomer.gstin || 'URP'}</span> &bull;{' '}
              <span className="font-mono text-slate-800 dark:text-slate-200">DL: {selectedCustomer.dl_number || 'N/A'}</span> &bull;{' '}
              <span className="font-mono text-slate-800 dark:text-slate-200">Phone: {selectedCustomer.mobile || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-3 font-bold font-mono">
              <span className="text-slate-700 dark:text-slate-300">Credit Limit: ₹{selectedCustomer.credit_limit}</span>
              <span className={selectedCustomer.current_balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}>
                Current Balance: ₹{selectedCustomer.current_balance?.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Product Search & Entry Bar */}
      <div className="bg-white dark:bg-slate-900 p-2.5 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Type Medicine Name or Generic Formula (e.g. Paracetamol, Amoxicillin, Augmentin, Dolo)... [F2]"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border-1.5 border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 outline-hidden font-mono"
          />

          {/* Autocomplete Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 shadow-2xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {searchResults.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelectProduct(p)}
                  className="p-2.5 hover:bg-amber-50 dark:hover:bg-slate-800 transition cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="font-black text-slate-900 dark:text-white">{p.medicine_name}</div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                      {p.generic_name} &bull; {p.manufacturer} ({p.packing})
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="font-black text-blue-700 dark:text-blue-400">PTR: ₹{p.ptr.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-500">MRP: ₹{p.mrp.toFixed(2)} &bull; Avail: {p.total_available_stock}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white dark:bg-slate-900 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card overflow-x-auto text-xs">
        <table className="w-full text-left border-collapse min-w-[1020px]">
          <thead>
            <tr className="bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-black border-b-1.5 border-slate-900 dark:border-slate-700 text-[11px] font-mono">
              <th className="py-2 px-2 w-8">#</th>
              <th className="py-2 px-2.5">Medicine Description</th>
              <th className="py-2 px-2">Batch</th>
              <th className="py-2 px-2">Expiry</th>
              <th className="py-2 px-2 text-right w-14">Avail</th>
              <th className="py-2 px-2 text-right w-16">MRP</th>
              <th className="py-2 px-2 text-right w-20">Rate (PTR)</th>
              <th className="py-2 px-2 text-center w-16">Qty</th>
              <th className="py-2 px-2 text-center w-14">Free</th>
              <th className="py-2 px-2 text-center w-16">Disc%</th>
              <th className="py-2 px-2 text-right w-20">Taxable</th>
              <th className="py-2 px-2 text-center w-20">GST %</th>
              <th className="py-2 px-2 text-right w-24">Line Total</th>
              <th className="py-2 px-2 text-center w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {calculatedItems.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-12 text-center text-slate-400 font-mono">
                  <ShoppingCart size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  No medicines added to invoice. Search above to add products.
                </td>
              </tr>
            ) : (
              calculatedItems.map((it, idx) => (
                <tr key={it.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-2 px-2 font-bold text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-2 px-2.5">
                    <div className="font-bold text-slate-900 dark:text-white">{it.product_name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {it.packing} &bull; HSN: {it.hsn_code} &bull; {it.manufacturer}
                    </div>
                    {it.fefo_warning && (
                      <div className="text-[10px] text-amber-600 font-bold flex items-center gap-1 mt-0.5">
                        <AlertTriangle size={11} /> {it.fefo_warning}
                      </div>
                    )}
                  </td>

                  {/* Batch Number */}
                  <td className="py-2 px-2">
                    <span className="font-mono font-black text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 border border-slate-900 dark:border-slate-600 text-[11px]">
                      {it.batch_number}
                    </span>
                  </td>

                  <td className="py-2 px-2 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    {formatDate(it.expiry_date)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                    {it.available_qty}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-slate-600 dark:text-slate-400">
                    ₹{it.mrp.toFixed(2)}
                  </td>

                  {/* Rate Edit */}
                  <td className="py-2 px-2 text-right">
                    <BrutalistNumberInput
                      value={it.rate}
                      min={0}
                      step="0.01"
                      allowDecimals={true}
                      onChange={(val) => updateItemField(idx, 'rate', val)}
                      className="w-20 text-right"
                    />
                  </td>

                  {/* Billed Qty */}
                  <td className="py-2 px-2 text-center">
                    <BrutalistNumberInput
                      value={it.quantity}
                      min={1}
                      onChange={(val) => updateItemField(idx, 'quantity', Math.max(1, val))}
                      className="w-14 text-center font-bold bg-amber-50 dark:bg-amber-950/40"
                    />
                  </td>

                  {/* Free Qty */}
                  <td className="py-2 px-2 text-center">
                    <BrutalistNumberInput
                      value={it.free_quantity}
                      min={0}
                      onChange={(val) => updateItemField(idx, 'free_quantity', val)}
                      className="w-12 text-center"
                    />
                  </td>

                  {/* Disc % */}
                  <td className="py-2 px-2 text-center">
                    <BrutalistNumberInput
                      value={it.discount_percent}
                      min={0}
                      max={100}
                      step="0.5"
                      allowDecimals={true}
                      onChange={(val) => updateItemField(idx, 'discount_percent', val)}
                      className="w-14 text-center"
                    />
                  </td>

                  <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                    ₹{it.taxable.toFixed(2)}
                  </td>

                  {/* Changeable GST Rate */}
                  <td className="py-2 px-2 text-center">
                    <select
                      value={it.gst_rate}
                      onChange={(e) => updateItemField(idx, 'gst_rate', Number(e.target.value))}
                      className="px-1 py-1 border border-slate-900 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono font-bold text-xs"
                      title="Override GST rate for this item"
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </td>

                  <td className="py-2 px-2 text-right font-mono font-black text-slate-900 dark:text-white">
                    ₹{it.lineTotal.toFixed(2)}
                  </td>

                  <td className="py-2 px-2 text-center">
                    <button
                      onClick={() => removeItem(idx)}
                      className="text-slate-400 hover:text-rose-600 transition p-1 cursor-pointer"
                      title="Remove Item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invoice Financial Summary & Actions */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Left Column: Remarks & Near Expiry authorization */}
        <div className="space-y-2">
          <label className="block font-bold text-slate-900 dark:text-slate-200">
            Remarks / Delivery / Vehicle Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add vehicle number, transport instructions, or reference notes..."
            className="w-full px-2.5 py-1.5 border-1.5 border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 outline-hidden font-mono text-xs"
          />

          <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={allowExpiredOverride}
              onChange={(e) => setAllowExpiredOverride(e.target.checked)}
              className="rounded text-blue-600"
            />
            <span className="text-[11px] font-bold">Authorize manual batch override / near-expiry supply</span>
          </label>
        </div>

        {/* Middle Column: Payment Settlement */}
        <div className="p-3 bg-slate-100 dark:bg-slate-800 border-1.5 border-slate-900 dark:border-slate-700 space-y-2">
          <div className="font-black text-slate-900 dark:text-white text-[11px] border-b border-slate-900 dark:border-slate-700 pb-1 font-mono uppercase">
            Payment Settlement
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-700 dark:text-slate-300 font-bold">Net Bill Amount:</span>
            <span className="font-black text-slate-900 dark:text-white font-mono text-sm">
              ₹{netInvoiceAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-700 dark:text-slate-300 font-bold">Paid Counter Cash/UPI:</span>
            <BrutalistNumberInput
              value={paidAmount}
              min={0}
              max={netInvoiceAmount}
              step="1"
              allowDecimals={true}
              onChange={(val) => setPaidAmount(val)}
              className="w-28 text-right font-black text-emerald-700 dark:text-emerald-400"
            />
          </div>
          <div className="flex items-center justify-between border-t border-slate-900 dark:border-slate-700 pt-1">
            <span className="text-slate-700 dark:text-slate-300 font-bold">Balance to Ledger:</span>
            <span className={`font-black font-mono ${balanceOutstanding > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
              ₹{balanceOutstanding.toFixed(2)}
            </span>
          </div>

          {/* UPI QR Code Notice */}
          {includeUpiQr && (
            <div className="mt-1 pt-1 border-t border-dashed border-slate-400 dark:border-slate-600 flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-300 font-mono">
              <QrCode size={13} className="text-blue-600 shrink-0" />
              <span>UPI QR for aldholakia72-1@okaxis (₹{netInvoiceAmount.toFixed(2)}) will print on bill</span>
            </div>
          )}
        </div>

        {/* Right Column: Tax Breakdown & Final Actions */}
        <div className="p-3 bg-amber-50 dark:bg-slate-850 border-1.5 border-slate-900 dark:border-slate-700 space-y-1.5 font-mono">
          <div className="flex justify-between text-slate-700 dark:text-slate-300">
            <span>Gross Value:</span>
            <span>₹{totalGross.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-700 dark:text-slate-300">
            <span>Discount:</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">-₹{totalDiscount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-900 dark:text-white border-t border-slate-900 dark:border-slate-700 pt-1">
            <span>Taxable Amount:</span>
            <span>₹{totalTaxable.toFixed(2)}</span>
          </div>

          {isInterstate ? (
            <div className="flex justify-between text-slate-700 dark:text-slate-300">
              <span>Integrated GST (IGST):</span>
              <span>₹{totalIgst.toFixed(2)}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Central GST (CGST):</span>
                <span>₹{totalCgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>State GST (SGST):</span>
                <span>₹{totalSgst.toFixed(2)}</span>
              </div>
            </>
          )}

          <div className="flex justify-between text-slate-500 text-[10px]">
            <span>Round Off:</span>
            <span>{roundOff >= 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}</span>
          </div>

          <div className="flex justify-between items-center border-t-2 border-slate-900 dark:border-slate-600 pt-1.5 text-slate-900 dark:text-white font-black text-base">
            <span>NET TOTAL:</span>
            <span>₹{netInvoiceAmount.toFixed(2)}</span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={() => handleSaveInvoice('Finalized')}
              disabled={savingInvoice || items.length === 0}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black border-1.5 border-slate-900 dark:border-slate-600 brutalist-btn flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Printer size={15} />
              {savingInvoice ? 'Generating...' : 'Finalize & Print'}
            </button>
            <button
              onClick={() => handleSaveInvoice('Draft')}
              disabled={savingInvoice || items.length === 0}
              className="px-3 py-2 border-1.5 border-slate-900 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold brutalist-btn cursor-pointer disabled:opacity-50"
            >
              Draft
            </button>
          </div>
        </div>
      </div>

      {/* Quick Customer Modal on the Fly */}
      <QuickCustomerModal
        isOpen={isQuickCustomerOpen}
        onClose={() => setIsQuickCustomerOpen(false)}
        onCustomerCreated={(newCust) => {
          setCustomers([...customers, newCust]);
          setSelectedCustomerId(newCust.id);
        }}
        showToast={showToast}
      />
    </div>
  );
};
