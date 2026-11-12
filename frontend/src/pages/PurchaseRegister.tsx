import React, { useEffect, useState } from 'react';
import { ClipboardList, Download, Search, Calendar, Edit2, CheckCircle2, Trash2, X } from 'lucide-react';
import { apiRequest, downloadFile } from '../api/client';
import { formatDate } from '../utils/date';
import { Modal } from '../components/Modal';
import { BrutalistNumberInput } from '../components/BrutalistNumberInput';

interface PurchaseRegisterProps {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const PurchaseRegister: React.FC<PurchaseRegisterProps> = ({ showToast }) => {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Edit Purchase State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<any>(null);
  const [editingItems, setEditingItems] = useState<any[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchRegister = async () => {
    setLoading(true);
    try {
      let endpoint = `/registers/purchases?`;
      if (fromDate) endpoint += `&from_date=${fromDate}`;
      if (toDate) endpoint += `&to_date=${toDate}`;
      const res = await apiRequest(endpoint);
      setPurchases(res.purchases || []);
      setSummary(res.summary || {});
    } catch (err: any) {
      showToast(err.message || 'Error loading purchase register', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegister();
  }, [fromDate, toDate]);

  const handleExportExcel = async () => {
    try {
      let endpoint = `/registers/purchases/export-excel?`;
      if (fromDate) endpoint += `&from_date=${fromDate}`;
      if (toDate) endpoint += `&to_date=${toDate}`;
      await downloadFile(endpoint, 'Purchase_Register.xlsx');
      showToast('Purchase register exported to Excel', 'success');
    } catch (err: any) {
      showToast(err.message || 'Export failed', 'error');
    }
  };

  const handleOpenEdit = async (p: any) => {
    try {
      const res = await apiRequest(`/purchases/${p.id}`);
      setEditingPurchase({ ...res.purchase });
      setEditingItems(
        (res.items || []).map((it: any) => ({
          product_id: it.product_id,
          product_name: it.product_name,
          manufacturer: it.manufacturer,
          packing: it.packing,
          batch_number: it.batch_number,
          mfg_date: it.mfg_date,
          expiry_date: it.expiry_date,
          mrp: it.mrp,
          purchase_rate: it.purchase_rate,
          ptr: it.ptr,
          pts: it.pts,
          quantity: it.quantity,
          free_quantity: it.free_quantity || 0,
          discount_percent: it.discount_percent || 0,
          gst_rate: it.gst_rate,
        }))
      );
      setIsEditOpen(true);
    } catch (e: any) {
      showToast(e.message || 'Failed to load purchase details for editing', 'error');
    }
  };

  const updateEditItem = (index: number, field: string, value: any) => {
    const updated = [...editingItems];
    updated[index][field] = value;
    setEditingItems(updated);
  };

  const handleSaveEditedPurchase = async () => {
    if (!editingPurchase) return;
    setSavingEdit(true);
    try {
      const payload = {
        supplier_id: editingPurchase.supplier_id,
        supplier_invoice_number: editingPurchase.supplier_invoice_number,
        purchase_date: editingPurchase.purchase_date,
        payment_terms: editingPurchase.payment_terms,
        paid_amount: Number(editingPurchase.paid_amount || 0),
        payment_mode: editingPurchase.payment_mode || 'Bank Transfer',
        notes: editingPurchase.notes || '',
        status: editingPurchase.status || 'Finalized',
        items: editingItems.map((it) => ({
          product_id: it.product_id,
          batch_number: it.batch_number,
          mfg_date: it.mfg_date || null,
          expiry_date: it.expiry_date,
          mrp: Number(it.mrp),
          purchase_rate: Number(it.purchase_rate),
          ptr: Number(it.ptr || it.purchase_rate * 1.15),
          pts: Number(it.pts || it.purchase_rate * 1.05),
          quantity: Number(it.quantity),
          free_quantity: Number(it.free_quantity || 0),
          discount_percent: Number(it.discount_percent || 0),
          gst_rate: Number(it.gst_rate || 12),
        })),
      };

      await apiRequest(`/purchases/${editingPurchase.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      showToast(`Purchase bill ${editingPurchase.supplier_invoice_number} updated successfully!`, 'success');
      setIsEditOpen(false);
      setEditingPurchase(null);
      fetchRegister();
    } catch (err: any) {
      showToast(err.message || 'Failed to update purchase entry', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredPurchases = purchases.filter((p) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      p.purchase_entry_number.toLowerCase().includes(s) ||
      p.supplier_invoice_number.toLowerCase().includes(s) ||
      p.supplier_name.toLowerCase().includes(s) ||
      (p.gstin && p.gstin.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-3">
      {/* Header and Export Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase font-mono tracking-tight">
            Pharmaceutical Purchase Inward Register
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Inward Supply Records, GST Input Tax Credit (ITC), and Supplier Payables (Editable)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs border-1.5 border-slate-900 dark:border-slate-600 brutalist-btn cursor-pointer"
          >
            <Download size={13} />
            Export to Excel
          </button>
        </div>
      </div>

      {/* Date & Filter Ribbon */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar size={14} className="text-slate-500" />
          <span className="font-bold text-slate-700 dark:text-slate-300">From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2 py-1 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs outline-hidden font-mono"
          />
          <span className="font-bold text-slate-700 dark:text-slate-300 ml-1">To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2 py-1 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs outline-hidden font-mono"
          />
          {(fromDate || toDate) && (
            <button
              onClick={() => { setFromDate(''); setToDate(''); }}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline ml-2 cursor-pointer"
            >
              Clear Dates
            </button>
          )}
        </div>

        <div className="relative min-w-[240px]">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search entry no, supplier, bill no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono outline-hidden"
          />
        </div>
      </div>

      {/* Register Table with sticky headers and summary footer */}
      <div className="bg-white dark:bg-slate-900 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card overflow-x-auto text-xs">
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead>
            <tr className="bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-black border-b-1.5 border-slate-900 dark:border-slate-700 text-[11px] font-mono uppercase">
              <th className="py-2.5 px-3">Entry No</th>
              <th className="py-2.5 px-3">Supplier Bill No</th>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Supplier Name</th>
              <th className="py-2.5 px-3">GSTIN</th>
              <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
              <th className="py-2.5 px-3 text-right">CGST (₹)</th>
              <th className="py-2.5 px-3 text-right">SGST (₹)</th>
              <th className="py-2.5 px-3 text-right">IGST (₹)</th>
              <th className="py-2.5 px-3 text-right font-black">Total Bill (₹)</th>
              <th className="py-2.5 px-3 text-right">Paid (₹)</th>
              <th className="py-2.5 px-3 text-right">Balance (₹)</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredPurchases.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-12 text-center text-slate-400 font-mono">
                  {loading ? 'Loading purchase register...' : 'No purchase bills recorded in this period.'}
                </td>
              </tr>
            ) : (
              filteredPurchases.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                  <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white">{p.purchase_entry_number}</td>
                  <td className="py-2 px-3 font-mono font-bold text-blue-900 dark:text-blue-400">{p.supplier_invoice_number}</td>
                  <td className="py-2 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">{formatDate(p.purchase_date)}</td>
                  <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">{p.supplier_name}</td>
                  <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">{p.gstin || 'URP'}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                    {p.total_taxable_amount.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                    {p.cgst_amount > 0 ? p.cgst_amount.toFixed(2) : '-'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                    {p.sgst_amount > 0 ? p.sgst_amount.toFixed(2) : '-'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                    {p.igst_amount > 0 ? p.igst_amount.toFixed(2) : '-'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                    {p.net_purchase_amount.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                    {p.paid_amount > 0 ? p.paid_amount.toFixed(2) : '-'}
                  </td>
                  <td className={`py-2 px-3 text-right font-mono font-black ${p.balance_amount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {p.balance_amount.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={`px-2 py-0.5 border text-[10px] font-bold font-mono ${
                      p.payment_status === 'Paid'
                        ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        : 'border-amber-500 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                    }`}>
                      {p.payment_status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      title="Edit Purchase Record & Correct Line Items"
                      className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-slate-800 dark:text-slate-200 border border-slate-900 dark:border-slate-600 rounded-none font-bold text-[10px] cursor-pointer"
                    >
                      <Edit2 size={11} />
                      <span>Edit</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {/* Summary Row */}
          {summary && purchases.length > 0 && (
            <tfoot>
              <tr className="bg-slate-200 dark:bg-slate-800 font-black border-t-2 border-slate-900 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs">
                <td colSpan={5} className="py-2.5 px-3">TOTAL ({summary.purchase_count} Bills)</td>
                <td className="py-2.5 px-3 text-right">₹{summary.total_taxable?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="py-2.5 px-3 text-right">₹{summary.total_cgst?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="py-2.5 px-3 text-right">₹{summary.total_sgst?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="py-2.5 px-3 text-right">₹{summary.total_igst?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="py-2.5 px-3 text-right text-blue-900 dark:text-blue-400">₹{summary.total_purchase?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400">₹{summary.total_paid?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="py-2.5 px-3 text-right text-rose-700 dark:text-rose-400">₹{summary.total_balance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Edit Purchase Entry Modal */}
      {editingPurchase && (
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title={`Edit Purchase Entry: ${editingPurchase.purchase_entry_number} (${editingPurchase.supplier_name})`}
          maxWidth="max-w-5xl"
        >
          <div className="space-y-4 text-xs font-mono">
            {/* Header fields */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-300 dark:border-slate-700">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Supplier Bill No</label>
                <input
                  type="text"
                  value={editingPurchase.supplier_invoice_number}
                  onChange={(e) => setEditingPurchase({ ...editingPurchase, supplier_invoice_number: e.target.value.toUpperCase() })}
                  className="w-full px-2 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold uppercase"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Purchase Date</label>
                <input
                  type="date"
                  value={editingPurchase.purchase_date}
                  onChange={(e) => setEditingPurchase({ ...editingPurchase, purchase_date: e.target.value })}
                  className="w-full px-2 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Terms</label>
                <input
                  type="text"
                  value={editingPurchase.payment_terms}
                  onChange={(e) => setEditingPurchase({ ...editingPurchase, payment_terms: e.target.value })}
                  className="w-full px-2 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Amount Paid Now (₹)</label>
                <input
                  type="number"
                  value={editingPurchase.paid_amount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEditingPurchase({ ...editingPurchase, paid_amount: Number(e.target.value) })}
                  className="w-full px-2 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-right font-bold"
                />
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <div className="font-bold text-slate-800 dark:text-white mb-1.5 uppercase">
                Invoice Line Items ({editingItems.length} Products):
              </div>
              <div className="max-h-64 overflow-y-auto border border-slate-300 dark:border-slate-700">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 font-bold border-b border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                    <tr>
                      <th className="py-1 px-2">#</th>
                      <th className="py-1 px-2">Medicine</th>
                      <th className="py-1 px-2">Batch</th>
                      <th className="py-1 px-2">Expiry</th>
                      <th className="py-1 px-2 text-right">MRP</th>
                      <th className="py-1 px-2 text-right">Purchase Rate</th>
                      <th className="py-1 px-2 text-center">Qty</th>
                      <th className="py-1 px-2 text-center">Free</th>
                      <th className="py-1 px-2 text-center">Disc%</th>
                      <th className="py-1 px-2 text-center">GST%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {editingItems.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-1 px-2 text-slate-400">{idx + 1}</td>
                        <td className="py-1 px-2 font-bold text-slate-900 dark:text-white">{it.product_name}</td>
                        <td className="py-1 px-2">
                          <input
                            type="text"
                            value={it.batch_number}
                            onChange={(e) => updateEditItem(idx, 'batch_number', e.target.value.toUpperCase())}
                            className="w-20 px-1 py-0.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-bold uppercase"
                          />
                        </td>
                        <td className="py-1 px-2">
                          <input
                            type="date"
                            value={it.expiry_date}
                            onChange={(e) => updateEditItem(idx, 'expiry_date', e.target.value)}
                            className="w-28 px-1 py-0.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                          />
                        </td>
                        <td className="py-1 px-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={it.mrp}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateEditItem(idx, 'mrp', Number(e.target.value))}
                            className="w-16 px-1 py-0.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-right"
                          />
                        </td>
                        <td className="py-1 px-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={it.purchase_rate}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateEditItem(idx, 'purchase_rate', Number(e.target.value))}
                            className="w-16 px-1 py-0.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-right font-bold"
                          />
                        </td>
                        <td className="py-1 px-2 text-center">
                          <input
                            type="number"
                            value={it.quantity}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateEditItem(idx, 'quantity', Number(e.target.value))}
                            className="w-12 px-1 py-0.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-center font-bold"
                          />
                        </td>
                        <td className="py-1 px-2 text-center">
                          <input
                            type="number"
                            value={it.free_quantity}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateEditItem(idx, 'free_quantity', Number(e.target.value))}
                            className="w-12 px-1 py-0.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-center"
                          />
                        </td>
                        <td className="py-1 px-2 text-center">
                          <input
                            type="number"
                            step="0.5"
                            value={it.discount_percent}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateEditItem(idx, 'discount_percent', Number(e.target.value))}
                            className="w-12 px-1 py-0.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-center"
                          />
                        </td>
                        <td className="py-1 px-2 text-center">
                          <input
                            type="number"
                            value={it.gst_rate}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateEditItem(idx, 'gst_rate', Number(e.target.value))}
                            className="w-12 px-1 py-0.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-center"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditedPurchase}
                disabled={savingEdit}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-none font-bold uppercase transition cursor-pointer disabled:opacity-50"
              >
                {savingEdit ? 'Updating Ledger & Batches...' : 'Save & Update Purchase Record'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
