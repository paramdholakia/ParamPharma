import React, { useEffect, useState } from 'react';
import { Boxes, AlertTriangle, Clock, Download, PlusCircle, MinusCircle, RefreshCw } from 'lucide-react';
import { apiRequest, downloadFile } from '../api/client';
import { Modal } from '../components/Modal';
import { formatDate } from '../utils/date';

interface InventoryProps {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const Inventory: React.FC<InventoryProps> = ({ showToast }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'within_30' | 'within_60' | 'within_90' | 'expired'>('all');
  const [alertsData, setAlertsData] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Stock Adjustment Modal
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [adjustData, setAdjustData] = useState({
    adjustment_type: 'EXPIRED_SCRAP',
    quantity: 1,
    reason: 'Scrapped due to expiry',
    authorized_by: 'Admin'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [alertsRes, prodsRes] = await Promise.all([
        apiRequest('/batches/expiry-alerts'),
        apiRequest('/products?limit=250')
      ]);
      setAlertsData(alertsRes);
      setProducts(prodsRes.products || []);
    } catch (err: any) {
      showToast(err.message || 'Error loading inventory', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAdjust = (b: any) => {
    setSelectedBatch(b);
    setAdjustData({
      adjustment_type: 'EXPIRED_SCRAP',
      quantity: 1,
      reason: 'Batch inspection adjustment',
      authorized_by: 'Admin'
    });
    setIsAdjustOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    try {
      await apiRequest(`/batches/${selectedBatch.batch_id || selectedBatch.id}/adjust`, {
        method: 'POST',
        body: JSON.stringify(adjustData)
      });
      showToast('Stock adjusted and audit ledger entry posted', 'success');
      setIsAdjustOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Adjustment failed', 'error');
    }
  };

  const handleExportExcel = async () => {
    try {
      await downloadFile('/registers/expiry/export-excel', 'Expiry_and_Stock_Alerts.xlsx');
      showToast('Expiry report exported to Excel', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to export Excel', 'error');
    }
  };

  const summary = alertsData?.summary || {};
  let currentList: any[] = [];
  if (alertsData) {
    if (activeTab === 'all') currentList = alertsData.all_alert_batches || [];
    else if (activeTab === 'within_30') currentList = alertsData.within_30_days || [];
    else if (activeTab === 'within_60') currentList = alertsData.within_60_days || [];
    else if (activeTab === 'within_90') currentList = alertsData.within_90_days || [];
    else if (activeTab === 'expired') currentList = alertsData.expired_batches || [];
  }

  return (
    <div className="space-y-4">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white uppercase font-mono tracking-tight">
            Batch-wise Inventory & FEFO Expiry Tracking
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Real-time batch stock, 30/60/90 day expiry risk queue, and physical stock write-offs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-1.5 border-slate-900 dark:border-slate-600 rounded text-xs font-bold brutalist-btn cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs border-1.5 border-slate-900 dark:border-slate-600 brutalist-btn cursor-pointer"
          >
            <Download size={13} />
            Export Excel
          </button>
        </div>
      </div>

      {/* Alert KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <button
          onClick={() => setActiveTab('expired')}
          className={`p-3 rounded border-1.5 border-slate-900 dark:border-slate-700 text-left transition cursor-pointer brutalist-btn ${
            activeTab === 'expired'
              ? 'bg-rose-200 dark:bg-rose-950 font-black'
              : 'bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100'
          }`}
        >
          <div className="font-bold text-rose-800 dark:text-rose-300 font-mono">Already Expired</div>
          <div className="text-lg font-black text-rose-900 dark:text-rose-200 mt-1 font-mono">
            {summary.expired_count || 0} Batches
          </div>
          <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-1">Non-sellable; Requires scrap</div>
        </button>

        <button
          onClick={() => setActiveTab('within_30')}
          className={`p-3 rounded border-1.5 border-slate-900 dark:border-slate-700 text-left transition cursor-pointer brutalist-btn ${
            activeTab === 'within_30'
              ? 'bg-amber-200 dark:bg-amber-950 font-black'
              : 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100'
          }`}
        >
          <div className="font-bold text-amber-800 dark:text-amber-300 font-mono">Expiring in &le; 30 Days</div>
          <div className="text-lg font-black text-amber-900 dark:text-amber-200 mt-1 font-mono">
            {summary.within_30_count || 0} Batches
          </div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">Urgent FEFO liquidation</div>
        </button>

        <button
          onClick={() => setActiveTab('within_60')}
          className={`p-3 rounded border-1.5 border-slate-900 dark:border-slate-700 text-left transition cursor-pointer brutalist-btn ${
            activeTab === 'within_60'
              ? 'bg-yellow-200 dark:bg-yellow-950 font-black'
              : 'bg-yellow-50 dark:bg-yellow-950/40 hover:bg-yellow-100'
          }`}
        >
          <div className="font-bold text-yellow-800 dark:text-yellow-300 font-mono">Expiring in &le; 60 Days</div>
          <div className="text-lg font-black text-yellow-900 dark:text-yellow-200 mt-1 font-mono">
            {summary.within_60_count || 0} Batches
          </div>
          <div className="text-[10px] text-yellow-600 dark:text-yellow-400 mt-1">Priority billing queue</div>
        </button>

        <button
          onClick={() => setActiveTab('within_90')}
          className={`p-3 rounded border-1.5 border-slate-900 dark:border-slate-700 text-left transition cursor-pointer brutalist-btn ${
            activeTab === 'within_90'
              ? 'bg-blue-200 dark:bg-blue-950 font-black'
              : 'bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100'
          }`}
        >
          <div className="font-bold text-blue-800 dark:text-blue-300 font-mono">Expiring in &le; 90 Days</div>
          <div className="text-lg font-black text-blue-900 dark:text-blue-200 mt-1 font-mono">
            {summary.within_90_count || 0} Batches
          </div>
          <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">Quarterly watch list</div>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b-1.5 border-slate-900 dark:border-slate-700 gap-1 text-xs font-mono">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-2 font-black border-b-2 transition cursor-pointer ${
            activeTab === 'all'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          All Alert & Active Batches ({currentList.length})
        </button>
        <button
          onClick={() => setActiveTab('within_30')}
          className={`px-3 py-2 font-black border-b-2 transition cursor-pointer ${
            activeTab === 'within_30'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Critical (&le; 30 Days)
        </button>
        <button
          onClick={() => setActiveTab('expired')}
          className={`px-3 py-2 font-black border-b-2 transition cursor-pointer ${
            activeTab === 'expired'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Expired Goods
        </button>
      </div>

      {/* Batch Table */}
      <div className="bg-white dark:bg-slate-900 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card overflow-x-auto text-xs">
        <table className="w-full text-left border-collapse min-w-[950px]">
          <thead>
            <tr className="bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-black border-b-1.5 border-slate-900 dark:border-slate-700 text-[11px] font-mono">
              <th className="py-2.5 px-3">Medicine Description</th>
              <th className="py-2.5 px-3">Manufacturer</th>
              <th className="py-2.5 px-3 font-mono">Batch Number</th>
              <th className="py-2.5 px-3">Expiry Date</th>
              <th className="py-2.5 px-3 text-center">Days Remaining</th>
              <th className="py-2.5 px-3 text-right">Available Qty</th>
              <th className="py-2.5 px-3 text-right">Cost Rate (₹)</th>
              <th className="py-2.5 px-3 text-right">Stock Value (₹)</th>
              <th className="py-2.5 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {currentList.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400 font-mono">
                  No batches under this category filter.
                </td>
              </tr>
            ) : (
              currentList.map((b: any, idx: number) => {
                const isExp = b.days_remaining < 0;
                return (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                      <div>{b.medicine_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{b.packing}</div>
                    </td>
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{b.manufacturer}</td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">{b.batch_number}</td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {formatDate(b.expiry_date)}
                    </td>
                    <td className="py-2 px-3 text-center font-mono">
                      {isExp ? (
                        <span className="px-2 py-0.5 border border-rose-600 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 text-[10px] font-bold">
                          EXPIRED ({Math.abs(b.days_remaining)}d ago)
                        </span>
                      ) : b.days_remaining <= 30 ? (
                        <span className="px-2 py-0.5 border border-amber-600 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                          {b.days_remaining} Days Left
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 border border-blue-600 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 text-[10px] font-bold">
                          {b.days_remaining} Days Left
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-black font-mono text-slate-900 dark:text-white">{b.available_qty}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">{b.purchase_rate.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ₹{b.stock_value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => openAdjust(b)}
                        className="px-2 py-1 border border-slate-900 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-[11px] font-bold brutalist-btn cursor-pointer"
                      >
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={isAdjustOpen}
        onClose={() => setIsAdjustOpen(false)}
        title={`Adjust Stock for Batch: ${selectedBatch?.batch_number || ''}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-3 text-xs font-mono">
          <div>
            <span className="text-slate-500 block text-[11px]">Medicine</span>
            <span className="font-bold text-slate-900 dark:text-white">{selectedBatch?.medicine_name}</span>
          </div>

          <div>
            <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Adjustment Action</label>
            <select
              value={adjustData.adjustment_type}
              onChange={(e) => setAdjustData({ ...adjustData, adjustment_type: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold outline-hidden"
            >
              <option value="EXPIRED_SCRAP">Expired Scrap (Write Off Stock)</option>
              <option value="DAMAGE_WRITE_OFF">Breakage / Damage Write Off</option>
              <option value="DECREASE">Physical Stock Audit Deduction</option>
              <option value="INCREASE">Physical Stock Audit Addition</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Quantity</label>
            <input
              type="number"
              min="1"
              value={adjustData.quantity}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setAdjustData({ ...adjustData, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Reason / Audit Remark</label>
            <input
              type="text"
              required
              value={adjustData.reason}
              onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-900 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsAdjustOpen(false)}
              className="px-3 py-1.5 border border-slate-900 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold brutalist-btn cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold border border-slate-900 dark:border-slate-600 brutalist-btn cursor-pointer"
            >
              Confirm Adjustment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
