import React, { useEffect, useState } from 'react';
import { CornerUpLeft, Plus, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../api/client';
import { Modal } from '../components/Modal';
import { formatDate } from '../utils/date';

interface PurchaseReturnsProps {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const PurchaseReturns: React.FC<PurchaseReturnsProps> = ({ showToast }) => {
  const [returns, setReturns] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | ''>('');
  const [originalPurchaseNo, setOriginalPurchaseNo] = useState('');
  const [returnReason, setReturnReason] = useState('Expired / Damaged Return to Manufacturer');
  const [items, setItems] = useState<any[]>([]);

  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | ''>('');
  const [itemQty, setItemQty] = useState(1);
  const [itemRate, setItemRate] = useState(0);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const [rets, supps, prods] = await Promise.all([
        apiRequest('/returns/purchases'),
        apiRequest('/suppliers?limit=200'),
        apiRequest('/products?limit=200')
      ]);
      setReturns(rets || []);
      setSuppliers(supps.suppliers || []);
      setProducts(prods.products || []);
    } catch (err: any) {
      showToast(err.message || 'Error loading purchase returns', 'error');
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

  const addItem = () => {
    if (!selectedProductId || !selectedBatchId) {
      showToast('Select product and batch first', 'error');
      return;
    }
    const prod = products.find((p) => p.id === Number(selectedProductId));
    const batch = availableBatches.find((b) => b.id === Number(selectedBatchId));
    if (!prod || !batch) return;

    if (itemQty > batch.available_qty) {
      showToast(`Cannot return ${itemQty}; available batch stock is ${batch.available_qty}`, 'error');
      return;
    }

    setItems([
      ...items,
      {
        product_id: prod.id,
        batch_id: batch.id,
        product_name: prod.medicine_name,
        batch_number: batch.batch_number,
        quantity: itemQty,
        rate: itemRate > 0 ? itemRate : batch.purchase_rate,
        gst_rate: batch.gst_rate,
        condition: 'Expired / Damaged'
      }
    ]);

    setSelectedProductId('');
    setSelectedBatchId('');
    setItemQty(1);
    setItemRate(0);
  };

  const handleSaveReturn = async () => {
    if (!selectedSupplierId || items.length === 0) {
      showToast('Supplier and returned items required', 'error');
      return;
    }

    try {
      await apiRequest('/returns/purchases', {
        method: 'POST',
        body: JSON.stringify({
          supplier_id: Number(selectedSupplierId),
          original_purchase_number: originalPurchaseNo,
          return_reason: returnReason,
          items: items
        })
      });
      showToast('Purchase return finalized & Debit Note posted to supplier ledger!', 'success');
      setIsModalOpen(false);
      setItems([]);
      fetchReturns();
    } catch (err: any) {
      showToast(err.message || 'Error saving purchase return', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white uppercase tracking-wide">Purchase Returns & Debit Notes (DN)</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Return damaged or expired stock to pharmaceutical manufacturers and reduce accounts payable</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-none text-xs font-bold hover:bg-black dark:hover:bg-slate-200 shadow-xs cursor-pointer border border-slate-900 dark:border-white uppercase tracking-wider self-start sm:self-auto"
        >
          <Plus size={14} />
          Create Debit Note (DN)
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-300 dark:border-slate-700 shadow-2xs overflow-x-auto text-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-300 dark:border-slate-700 uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-3">Return Entry No</th>
              <th className="py-2.5 px-3">Debit Note No</th>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Supplier Name</th>
              <th className="py-2.5 px-3">Return Reason</th>
              <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
              <th className="py-2.5 px-3 text-right">GST (₹)</th>
              <th className="py-2.5 px-3 text-right font-bold">Total Debit Note (₹)</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {returns.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-slate-400 dark:text-slate-500">
                  No purchase returns recorded.
                </td>
              </tr>
            ) : (
              returns.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-100">{r.return_number}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-purple-700 dark:text-purple-300">
                    <span className="bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-none">
                      {r.debit_note_number}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">{formatDate(r.return_date)}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">{r.supplier_name}</td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{r.return_reason}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800 dark:text-slate-200">{r.total_taxable_amount.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">{r.total_gst_amount.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">{r.total_return_amount.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-none text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 uppercase tracking-wider">
                      Finalized (Stock Deducted)
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Issue Purchase Debit Note to Supplier"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 text-xs text-slate-800 dark:text-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Select Supplier</label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none focus:ring-1 focus:ring-slate-900 outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="">-- Choose Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.supplier_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Original Purchase Bill No (Optional)</label>
              <input
                type="text"
                value={originalPurchaseNo}
                onChange={(e) => setOriginalPurchaseNo(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none outline-hidden font-mono bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Return Reason</label>
              <input
                type="text"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-none border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="font-bold text-slate-800 dark:text-white text-[11px] uppercase tracking-wider">Add Product to Debit Note</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="col-span-2">
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="">-- Select Medicine --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.medicine_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedBatchId}
                  onChange={(e) => {
                    setSelectedBatchId(e.target.value ? Number(e.target.value) : '');
                    const b = availableBatches.find((item) => item.id === Number(e.target.value));
                    if (b) setItemRate(b.purchase_rate);
                  }}
                  className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="">-- Batch --</option>
                  {availableBatches.map((b) => (
                    <option key={b.id} value={b.id}>{b.batch_number} (Avail: {b.available_qty})</option>
                  ))}
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
                  className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none outline-hidden text-center bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Purchase Rate"
                  value={itemRate}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setItemRate(Number(e.target.value))}
                  className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none outline-hidden text-right bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="col-span-3 flex justify-end">
                <button
                  type="button"
                  onClick={addItem}
                  className="px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-none font-bold hover:bg-black dark:hover:bg-slate-200 cursor-pointer uppercase tracking-wider text-[11px]"
                >
                  + Add Line
                </button>
              </div>
            </div>
          </div>

          {items.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-none overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-1.5 px-2">Medicine</th>
                    <th className="py-1.5 px-2">Batch</th>
                    <th className="py-1.5 px-2 text-center">Qty</th>
                    <th className="py-1.5 px-2 text-right">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-1 px-2 font-medium text-slate-900 dark:text-slate-100">{it.product_name}</td>
                      <td className="py-1 px-2 font-mono text-slate-700 dark:text-slate-300">{it.batch_number}</td>
                      <td className="py-1 px-2 text-center font-bold text-slate-900 dark:text-white">{it.quantity}</td>
                      <td className="py-1 px-2 text-right font-mono text-slate-900 dark:text-slate-100">₹{it.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer uppercase tracking-wider font-bold"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveReturn}
              className="px-4 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-none font-bold hover:bg-black dark:hover:bg-slate-200 cursor-pointer uppercase tracking-wider"
            >
              Issue Debit Note & Deduct Stock
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
