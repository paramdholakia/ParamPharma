import React, { useEffect, useState } from 'react';
import { RotateCcw, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiRequest } from '../api/client';
import { Modal } from '../components/Modal';
import { formatDate } from '../utils/date';

interface SalesReturnsProps {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const SalesReturns: React.FC<SalesReturnsProps> = ({ showToast }) => {
  const [returns, setReturns] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New Return Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [originalInvoiceNo, setOriginalInvoiceNo] = useState('');
  const [returnReason, setReturnReason] = useState('Expired / Breakage Return');
  const [items, setItems] = useState<any[]>([]);

  // Item entry
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | ''>('');
  const [itemQty, setItemQty] = useState(1);
  const [itemRate, setItemRate] = useState(0);
  const [itemCondition, setItemCondition] = useState('Damaged');

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const [rets, custs, prods] = await Promise.all([
        apiRequest('/returns/sales'),
        apiRequest('/customers?limit=200'),
        apiRequest('/products?limit=200')
      ]);
      setReturns(rets || []);
      setCustomers(custs.customers || []);
      setProducts(prods.products || []);
    } catch (err: any) {
      showToast(err.message || 'Error loading returns', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      apiRequest(`/products/${selectedProductId}/batches`)
        .then((b) => setAvailableBatches(b || []))
        .catch(() => setAvailableBatches([]));
    } else {
      setAvailableBatches([]);
    }
  }, [selectedProductId]);

  const addItemToReturn = () => {
    if (!selectedProductId || !selectedBatchId) {
      showToast('Select a product and batch', 'error');
      return;
    }
    const prod = products.find((p) => p.id === Number(selectedProductId));
    const batch = availableBatches.find((b) => b.id === Number(selectedBatchId));
    if (!prod || !batch) return;

    setItems([
      ...items,
      {
        product_id: prod.id,
        product_name: prod.medicine_name,
        batch_id: batch.id,
        batch_number: batch.batch_number,
        condition: itemCondition,
        quantity: itemQty,
        rate: itemRate,
      }
    ]);
    setSelectedProductId('');
    setSelectedBatchId('');
    setItemQty(1);
    setItemRate(0);
  };

  const handleSaveReturn = async () => {
    if (!selectedCustomerId) {
      showToast('Select a customer', 'error');
      return;
    }
    if (items.length === 0) {
      showToast('Add at least one return item', 'error');
      return;
    }

    try {
      const res = await apiRequest('/returns/sales', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: Number(selectedCustomerId),
          original_invoice_number: originalInvoiceNo,
          return_reason: returnReason,
          items: items.map((it) => ({
            product_id: it.product_id,
            batch_id: it.batch_id,
            quantity: Number(it.quantity),
            rate: Number(it.rate),
            condition: it.condition
          }))
        })
      });
      showToast(`Sales return created! Credit Note: ${res.credit_note_number}`, 'success');
      setIsModalOpen(false);
      setItems([]);
      fetchReturns();
    } catch (err: any) {
      showToast(err.message || 'Failed to create return', 'error');
    }
  };

  const handleApproveInspection = async (returnId: number) => {
    try {
      await apiRequest(`/returns/sales/${returnId}/inspect`, {
        method: 'POST',
        body: JSON.stringify({
          inspector_notes: 'Inspected and verified at warehouse counter',
          items_inspected: []
        })
      });
      showToast('Inspection approved! Credit Note posted to customer ledger.', 'success');
      fetchReturns();
    } catch (err: any) {
      showToast(err.message || 'Inspection failed', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase font-mono tracking-tight">
            Sales Returns & Credit Notes (CN)
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Inspection-gated return workflow: goods undergo quality inspection before entering sellable stock
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs border-1.5 border-slate-900 dark:border-slate-600 rounded brutalist-btn cursor-pointer self-start sm:self-auto"
        >
          <Plus size={14} />
          Create Sales Return
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card overflow-x-auto text-xs">
        <table className="w-full text-left border-collapse min-w-[1050px]">
          <thead>
            <tr className="bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-black border-b-1.5 border-slate-900 dark:border-slate-700 text-[11px] font-mono">
              <th className="py-2.5 px-3">Return No</th>
              <th className="py-2.5 px-3">Credit Note No</th>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Customer Name</th>
              <th className="py-2.5 px-3">Reason</th>
              <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
              <th className="py-2.5 px-3 text-right">GST (₹)</th>
              <th className="py-2.5 px-3 text-right font-black">Total Return (₹)</th>
              <th className="py-2.5 px-3 text-center">Inspection Status</th>
              <th className="py-2.5 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {returns.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400 font-mono">
                  No sales returns recorded.
                </td>
              </tr>
            ) : (
              returns.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">{r.return_number}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-900 dark:text-blue-400">
                    <span className="bg-blue-100 dark:bg-blue-950 border border-blue-300 dark:border-blue-700 px-2 py-0.5 rounded text-[11px]">
                      {r.credit_note_number}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">{formatDate(r.return_date)}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{r.customer_name}</td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{r.return_reason}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">{r.total_taxable_amount.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">{r.total_gst_amount.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-rose-700 dark:text-rose-400">₹{r.total_return_amount.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`px-2 py-0.5 border text-[10px] font-bold font-mono ${
                      r.status === 'Approved'
                        ? 'border-emerald-600 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        : 'border-amber-600 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {r.status !== 'Approved' ? (
                      <button
                        onClick={() => handleApproveInspection(r.id)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[11px] border border-slate-900 dark:border-slate-600 brutalist-btn cursor-pointer"
                      >
                        Approve & Credit
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center gap-1 font-mono">
                        <CheckCircle2 size={13} /> Completed
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Creating Sales Return */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Sales Return & Credit Note"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 text-xs font-mono">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Select Customer *</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold outline-hidden"
              >
                <option value="">-- Choose Party --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.party_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Original Invoice No (Optional)</label>
              <input
                type="text"
                placeholder="e.g. PP26A01"
                value={originalInvoiceNo}
                onChange={(e) => setOriginalInvoiceNo(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold uppercase outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Return Reason</label>
              <input
                type="text"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden"
              />
            </div>
          </div>

          {/* Add Item Row */}
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded border border-slate-900 dark:border-slate-700 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white text-[11px] uppercase">Add Returned Product</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="col-span-2">
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-2 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold outline-hidden"
                >
                  <option value="">-- Select Medicine --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.medicine_name} ({p.packing})</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedBatchId}
                  onChange={(e) => {
                    setSelectedBatchId(e.target.value ? Number(e.target.value) : '');
                    const b = availableBatches.find((item) => item.id === Number(e.target.value));
                    if (b) setItemRate(b.ptr);
                  }}
                  className="w-full px-2 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden"
                >
                  <option value="">-- Batch --</option>
                  {availableBatches.map((b) => (
                    <option key={b.id} value={b.id}>{b.batch_number} (Exp: {formatDate(b.expiry_date)})</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={itemCondition}
                  onChange={(e) => setItemCondition(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden"
                >
                  <option value="Damaged">Damaged / Broken</option>
                  <option value="Expired">Expired</option>
                  <option value="Sellable">Sellable (Restockable)</option>
                </select>
              </div>

              <div>
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={itemQty}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setItemQty(parseInt(e.target.value) || 1)}
                  className="w-full px-2 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden text-center font-bold"
                />
              </div>

              <div>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Rate"
                  value={itemRate}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setItemRate(Number(e.target.value))}
                  className="w-full px-2 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden text-right font-mono"
                />
              </div>

              <div className="col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={addItemToReturn}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold border border-slate-900 dark:border-slate-600 rounded brutalist-btn cursor-pointer"
                >
                  + Add Line
                </button>
              </div>
            </div>
          </div>

          {/* Items List */}
          {items.length > 0 && (
            <div className="border border-slate-900 dark:border-slate-700 rounded overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-200 dark:bg-slate-800 font-bold border-b border-slate-900 dark:border-slate-700 text-slate-900 dark:text-white">
                  <tr>
                    <th className="py-1.5 px-2">Medicine</th>
                    <th className="py-1.5 px-2">Batch</th>
                    <th className="py-1.5 px-2">Condition</th>
                    <th className="py-1.5 px-2 text-center">Qty</th>
                    <th className="py-1.5 px-2 text-right">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-1 px-2 font-bold text-slate-900 dark:text-white">{it.product_name}</td>
                      <td className="py-1 px-2 font-mono text-blue-700 dark:text-blue-400">{it.batch_number}</td>
                      <td className="py-1 px-2 text-slate-700 dark:text-slate-300">{it.condition}</td>
                      <td className="py-1 px-2 text-center font-bold text-slate-900 dark:text-white">{it.quantity}</td>
                      <td className="py-1 px-2 text-right font-mono font-bold text-slate-900 dark:text-white">₹{it.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-900 dark:border-slate-700">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold brutalist-btn cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveReturn}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold border border-slate-900 dark:border-slate-600 rounded brutalist-btn cursor-pointer"
            >
              Save Return (Submit for Inspection)
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
