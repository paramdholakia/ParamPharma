import React, { useEffect, useState } from 'react';
import { PackagePlus, Search, Plus, Trash2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../api/client';
import { BrutalistNumberInput } from '../components/BrutalistNumberInput';
import { formatDate } from '../utils/date';

interface PurchaseBillingProps {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

interface PurchaseItem {
  id: string;
  product_id: number;
  product_name: string;
  manufacturer: string;
  packing: string;
  hsn_code: string;
  batch_number: string;
  mfg_date?: string;
  expiry_date: string;
  mrp: number;
  purchase_rate: number;
  ptr: number;
  pts: number;
  quantity: number;
  free_quantity: number;
  discount_percent: number;
  gst_rate: number;
}

export const PurchaseBilling: React.FC<PurchaseBillingProps> = ({ showToast }) => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | ''>('');
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);

  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentTerms, setPaymentTerms] = useState('30 Days');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [savingPurchase, setSavingPurchase] = useState(false);

  useEffect(() => {
    apiRequest('/suppliers?limit=200')
      .then((res) => setSuppliers(res.suppliers || []))
      .catch((err) => showToast(err.message || 'Error loading suppliers', 'error'));
  }, []);

  useEffect(() => {
    if (selectedSupplierId) {
      const s = suppliers.find((sup) => sup.id === Number(selectedSupplierId));
      setSelectedSupplier(s || null);
      if (s) setPaymentTerms(`${s.credit_terms_days || 30} Days`);
    } else {
      setSelectedSupplier(null);
    }
  }, [selectedSupplierId, suppliers]);

  useEffect(() => {
    if (!productSearch.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest(`/products?search=${encodeURIComponent(productSearch.trim())}&limit=12`);
        setSearchResults(res.products || []);
      } catch (err) {
        console.error(err);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const handleSelectProduct = (prod: any) => {
    // Default expiry 2 years out
    const expDate = new Date();
    expDate.setFullYear(expDate.getFullYear() + 2);
    const expStr = expDate.toISOString().split('T')[0];

    const newItem: PurchaseItem = {
      id: Math.random().toString(),
      product_id: prod.id,
      product_name: prod.medicine_name,
      manufacturer: prod.manufacturer,
      packing: prod.packing,
      hsn_code: prod.hsn_code || '3004',
      batch_number: '',
      expiry_date: expStr,
      mrp: prod.mrp || 100,
      purchase_rate: prod.pts > 0 ? prod.pts : Math.round(prod.mrp * 0.65),
      ptr: prod.ptr || Math.round(prod.mrp * 0.75),
      pts: prod.pts || Math.round(prod.mrp * 0.65),
      quantity: 10,
      free_quantity: 0,
      discount_percent: 0,
      gst_rate: prod.gst_rate || 12,
    };

    setItems([...items, newItem]);
    setProductSearch('');
    setSearchResults([]);
  };

  const updateItem = (index: number, field: keyof PurchaseItem, val: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = val;
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations
  let totalGross = 0;
  let totalDiscount = 0;
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const isInterstate = selectedSupplier ? selectedSupplier.state_code !== '24' : false;

  const calculatedItems = items.map((it) => {
    const gross = round(it.quantity * it.purchase_rate);
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
  const netPurchaseAmount = Math.round(rawNet);
  const balancePayable = Math.max(0, round(netPurchaseAmount - (paidAmount || 0)));

  function round(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  const handleSavePurchase = async () => {
    if (!selectedSupplierId) {
      showToast('Please select a supplier', 'error');
      return;
    }
    if (!supplierInvoiceNumber.trim()) {
      showToast('Please enter the Supplier Invoice Number', 'error');
      return;
    }
    if (items.length === 0) {
      showToast('Please add at least one medicine', 'error');
      return;
    }

    for (const it of items) {
      if (!it.batch_number.trim()) {
        showToast(`Please enter Batch Number for '${it.product_name}'`, 'error');
        return;
      }
      if (!it.expiry_date) {
        showToast(`Please enter Expiry Date for Batch '${it.batch_number}'`, 'error');
        return;
      }
    }

    setSavingPurchase(true);
    try {
      const payload = {
        supplier_id: Number(selectedSupplierId),
        supplier_invoice_number: supplierInvoiceNumber.trim(),
        purchase_date: purchaseDate,
        payment_terms: paymentTerms,
        payment_mode: paymentMode,
        paid_amount: paidAmount,
        notes: notes,
        items: items.map((it) => ({
          product_id: it.product_id,
          batch_number: it.batch_number.trim(),
          expiry_date: it.expiry_date,
          mrp: Number(it.mrp),
          purchase_rate: Number(it.purchase_rate),
          ptr: Number(it.ptr),
          pts: Number(it.pts),
          quantity: Number(it.quantity),
          free_quantity: Number(it.free_quantity || 0),
          discount_percent: Number(it.discount_percent || 0),
          gst_rate: Number(it.gst_rate),
        })),
      };

      const res = await apiRequest('/purchases', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      showToast(`Purchase inwarded successfully! Internal Ref: ${res.purchase.internal_purchase_number}`, 'success');
      setItems([]);
      setSupplierInvoiceNumber('');
      setSelectedSupplierId('');
      setPaidAmount(0);
      setNotes('');
    } catch (err: any) {
      showToast(err.message || 'Failed to save purchase invoice', 'error');
    } finally {
      setSavingPurchase(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header Box */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
        <div className="flex items-center justify-between pb-2 border-b-1.5 border-slate-900 dark:border-slate-700 mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-slate-900 text-white"><PackagePlus size={15} /></span>
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase font-mono tracking-tight">
              Inward Purchase Billing & Batch Stock Inward
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 border border-slate-900 dark:border-slate-600 bg-amber-100 dark:bg-amber-950 text-slate-900 dark:text-slate-100">
              {isInterstate ? 'Inter-State (IGST ITC)' : 'Intra-State (CGST + SGST ITC)'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="sm:col-span-2">
            <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Select Supplier *</label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold outline-hidden"
            >
              <option value="">-- Choose Pharmaceutical Supplier / Company --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.supplier_name} ({s.city || 'Gujarat'}) - GST: {s.gstin || 'N/A'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Supplier Invoice No *</label>
            <input
              type="text"
              required
              placeholder="e.g. INV-94820"
              value={supplierInvoiceNumber}
              onChange={(e) => setSupplierInvoiceNumber(e.target.value.toUpperCase())}
              className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold uppercase outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">
              Purchase Date ({formatDate(purchaseDate)})
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden"
            />
          </div>
        </div>

        {selectedSupplier && (
          <div className="mt-2.5 p-2 bg-slate-100 dark:bg-slate-800 border border-slate-900 dark:border-slate-700 flex flex-wrap items-center justify-between text-[11px] font-mono">
            <div>
              <span className="font-bold text-slate-900 dark:text-white">{selectedSupplier.supplier_name}</span> &bull;{' '}
              <span className="text-slate-600 dark:text-slate-400">GST: {selectedSupplier.gstin || 'N/A'}</span> &bull;{' '}
              <span className="text-slate-600 dark:text-slate-400">DL: {selectedSupplier.dl_number || 'N/A'}</span>
            </div>
            <div className="font-bold">
              <span>Outstanding Payable: </span>
              <span className="text-rose-600 dark:text-rose-400">₹{selectedSupplier.current_balance?.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Product Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-2.5 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search medicine master to inward batch inventory (e.g. Paracetamol, Augmentin, Dolo)..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold font-mono outline-hidden"
          />

          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {searchResults.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelectProduct(p)}
                  className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center justify-between font-mono"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{p.medicine_name}</div>
                    <div className="text-[10px] text-slate-500">{p.generic_name} &bull; {p.manufacturer} ({p.packing})</div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-blue-700 dark:text-blue-400">PTR: ₹{p.ptr.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Purchase Items Table */}
      <div className="bg-white dark:bg-slate-900 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card overflow-x-auto text-xs">
        <table className="w-full text-left border-collapse min-w-[1050px]">
          <thead>
            <tr className="bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-black border-b-1.5 border-slate-900 dark:border-slate-700 text-[11px] font-mono">
              <th className="py-2 px-2 w-8">#</th>
              <th className="py-2 px-2.5">Medicine Description</th>
              <th className="py-2 px-2.5">Batch No *</th>
              <th className="py-2 px-2.5">Expiry Date *</th>
              <th className="py-2 px-2 text-right w-20">Purchase Rate</th>
              <th className="py-2 px-2 text-right w-20">MRP</th>
              <th className="py-2 px-2 text-right w-20">PTR</th>
              <th className="py-2 px-2 text-center w-16">Inward Qty</th>
              <th className="py-2 px-2 text-center w-14">Free Qty</th>
              <th className="py-2 px-2 text-center w-16">Disc%</th>
              <th className="py-2 px-2 text-right w-20">Taxable</th>
              <th className="py-2 px-2 text-center w-14">GST%</th>
              <th className="py-2 px-2 text-right w-24">Total</th>
              <th className="py-2 px-2 text-center w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {calculatedItems.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-12 text-center text-slate-400 font-mono">
                  <PackagePlus size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  No items in purchase entry. Search medicines above to inward stock.
                </td>
              </tr>
            ) : (
              calculatedItems.map((it, idx) => (
                <tr key={it.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="py-2 px-2 font-bold text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-2 px-2.5 font-bold text-slate-900 dark:text-white">
                    <div>{it.product_name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{it.packing} &bull; {it.manufacturer}</div>
                  </td>
                  <td className="py-2 px-2.5">
                    <input
                      type="text"
                      placeholder="e.g. B26A01"
                      value={it.batch_number}
                      onChange={(e) => updateItem(idx, 'batch_number', e.target.value.toUpperCase())}
                      className="w-24 px-1.5 py-1 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold uppercase outline-hidden"
                    />
                  </td>
                  <td className="py-2 px-2.5">
                    <input
                      type="date"
                      value={it.expiry_date}
                      onChange={(e) => updateItem(idx, 'expiry_date', e.target.value)}
                      className="w-30 px-1.5 py-1 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono outline-hidden text-[11px]"
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <BrutalistNumberInput
                      value={it.purchase_rate}
                      min={0}
                      step="0.01"
                      allowDecimals={true}
                      onChange={(val) => updateItem(idx, 'purchase_rate', val)}
                      className="w-20 text-right"
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <BrutalistNumberInput
                      value={it.mrp}
                      min={0}
                      step="0.01"
                      allowDecimals={true}
                      onChange={(val) => updateItem(idx, 'mrp', val)}
                      className="w-20 text-right"
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <BrutalistNumberInput
                      value={it.ptr}
                      min={0}
                      step="0.01"
                      allowDecimals={true}
                      onChange={(val) => updateItem(idx, 'ptr', val)}
                      className="w-20 text-right"
                    />
                  </td>
                  <td className="py-2 px-2 text-center">
                    <BrutalistNumberInput
                      value={it.quantity}
                      min={1}
                      onChange={(val) => updateItem(idx, 'quantity', Math.max(1, val))}
                      className="w-14 text-center font-bold bg-amber-50 dark:bg-amber-950/40"
                    />
                  </td>
                  <td className="py-2 px-2 text-center">
                    <BrutalistNumberInput
                      value={it.free_quantity}
                      min={0}
                      onChange={(val) => updateItem(idx, 'free_quantity', val)}
                      className="w-12 text-center"
                    />
                  </td>
                  <td className="py-2 px-2 text-center">
                    <BrutalistNumberInput
                      value={it.discount_percent}
                      min={0}
                      max={100}
                      step="0.5"
                      allowDecimals={true}
                      onChange={(val) => updateItem(idx, 'discount_percent', val)}
                      className="w-14 text-center"
                    />
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                    ₹{it.taxable.toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    {it.gst_rate}%
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-black text-slate-900 dark:text-white">
                    ₹{it.lineTotal.toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <button
                      onClick={() => removeItem(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
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

      {/* Financial Summary */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
        <div>
          <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">
            Inward Notes & Transporter Details
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="LR number, transport company, carton count..."
            className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden font-mono"
          />
        </div>

        <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-900 dark:border-slate-700 space-y-2">
          <div className="font-bold text-slate-900 dark:text-white text-[11px] border-b border-slate-900 dark:border-slate-700 pb-1 uppercase">
            Supplier Settlement
          </div>
          <div className="flex justify-between">
            <span className="text-slate-700 dark:text-slate-300">Total Purchase:</span>
            <span className="font-black text-slate-900 dark:text-white text-sm">₹{netPurchaseAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-slate-700 dark:text-slate-300">Amount Paid Now:</span>
            <BrutalistNumberInput
              value={paidAmount}
              min={0}
              step="1"
              allowDecimals={true}
              onChange={(val) => setPaidAmount(val)}
              className="w-28 text-right font-bold text-emerald-700 dark:text-emerald-400"
            />
          </div>
          <div className="flex justify-between border-t border-slate-900 dark:border-slate-700 pt-1">
            <span className="text-slate-700 dark:text-slate-300">Balance Payable:</span>
            <span className="font-black text-rose-700 dark:text-rose-400">₹{balancePayable.toFixed(2)}</span>
          </div>
        </div>

        <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-900 dark:border-slate-700 space-y-1.5">
          <div className="flex justify-between text-slate-700 dark:text-slate-300">
            <span>Gross Purchase:</span>
            <span>₹{totalGross.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-700 dark:text-slate-300">
            <span>Purchase Discount:</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">-₹{totalDiscount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-900 dark:text-white border-t border-slate-900 dark:border-slate-700 pt-1">
            <span>Taxable Value:</span>
            <span>₹{totalTaxable.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-700 dark:text-slate-300">
            <span>Total GST (ITC Eligible):</span>
            <span>₹{totalGst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center border-t-2 border-slate-900 dark:border-slate-700 pt-1.5 text-slate-900 dark:text-white font-black text-base">
            <span>TOTAL BILL:</span>
            <span>₹{netPurchaseAmount.toFixed(2)}</span>
          </div>
          <button
            onClick={handleSavePurchase}
            disabled={savingPurchase || items.length === 0}
            className="w-full mt-2 py-2 bg-slate-900 hover:bg-black text-white font-black border border-slate-900 dark:border-slate-600 brutalist-btn cursor-pointer disabled:opacity-50"
          >
            {savingPurchase ? 'Updating Batches & Ledger...' : 'Finalize Purchase & Inward Stock'}
          </button>
        </div>
      </div>
    </div>
  );
};
