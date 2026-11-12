import React, { useEffect, useState } from 'react';
import { ClipboardList, Download, Search, Calendar } from 'lucide-react';
import { apiRequest, downloadFile } from '../api/client';
import { formatDate } from '../utils/date';

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
            Inward Supply Records, GST Input Tax Credit (ITC), and Supplier Payables
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
        <div className="flex items-center gap-2 flex-wrap font-mono">
          <Calendar size={14} className="text-slate-500" />
          <span className="font-bold text-slate-700 dark:text-slate-300">From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2 py-1 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs outline-hidden"
          />
          <span className="font-bold text-slate-700 dark:text-slate-300 ml-1">To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2 py-1 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs outline-hidden"
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
        <table className="w-full text-left border-collapse min-w-[1150px]">
          <thead>
            <tr className="bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-black border-b-1.5 border-slate-900 dark:border-slate-700 text-[11px] font-mono">
              <th className="py-2.5 px-3">Entry No</th>
              <th className="py-2.5 px-3">Supplier Bill No</th>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Supplier / Company Name</th>
              <th className="py-2.5 px-3">GSTIN</th>
              <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
              <th className="py-2.5 px-3 text-right">CGST (₹)</th>
              <th className="py-2.5 px-3 text-right">SGST (₹)</th>
              <th className="py-2.5 px-3 text-right">IGST (₹)</th>
              <th className="py-2.5 px-3 text-right font-black">Total Bill (₹)</th>
              <th className="py-2.5 px-3 text-right">Paid (₹)</th>
              <th className="py-2.5 px-3 text-right">Balance (₹)</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredPurchases.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-12 text-center text-slate-400 font-mono">
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
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
