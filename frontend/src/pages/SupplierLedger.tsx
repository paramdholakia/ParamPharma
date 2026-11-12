import React, { useEffect, useState } from 'react';
import { BookMarked, Calendar, Printer, FileText, CheckSquare, Square, Download } from 'lucide-react';
import { apiRequest, downloadFile } from '../api/client';
import { formatDate } from '../utils/date';

interface SupplierLedgerProps {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const SupplierLedger: React.FC<SupplierLedgerProps> = ({ showToast }) => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    apiRequest('/suppliers?limit=250')
      .then((res) => {
        const list = res.suppliers || [];
        setSuppliers(list);
        if (list.length > 0) setSelectedSupplierId(list[0].id);
      })
      .catch((err) => showToast(err.message, 'error'));
  }, []);

  const fetchLedger = async () => {
    if (!selectedSupplierId) return;
    setLoading(true);
    setSelectedEntryIds(new Set());
    try {
      let endpoint = `/ledgers/supplier/${selectedSupplierId}?`;
      if (fromDate) endpoint += `&from_date=${fromDate}`;
      if (toDate) endpoint += `&to_date=${toDate}`;
      const res = await apiRequest(endpoint);
      setLedgerData(res);
    } catch (err: any) {
      showToast(err.message || 'Error loading supplier ledger', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [selectedSupplierId, fromDate, toDate]);

  const toggleSelectEntry = (id: number) => {
    const next = new Set(selectedEntryIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedEntryIds(next);
  };

  const handleSelectAll = () => {
    if (!ledgerData?.entries) return;
    if (selectedEntryIds.size === ledgerData.entries.length) {
      setSelectedEntryIds(new Set());
    } else {
      setSelectedEntryIds(new Set(ledgerData.entries.map((e: any) => e.id)));
    }
  };

  const handleDownloadFullLedgerPdf = async () => {
    if (!selectedSupplierId) return;
    try {
      let endpoint = `/ledgers/supplier/${selectedSupplierId}/pdf?`;
      if (fromDate) endpoint += `&from_date=${fromDate}`;
      if (toDate) endpoint += `&to_date=${toDate}`;
      const suppName = ledgerData?.supplier?.supplier_name || 'Supplier';
      await downloadFile(endpoint, `Supplier_Ledger_${suppName.replace(/\s+/g, '_')}.pdf`);
      showToast('Statutory Supplier Statement of Account PDF downloaded', 'success');
    } catch (err: any) {
      showToast(err.message || 'PDF download failed', 'error');
    }
  };

  const handleDownloadSelectedPdf = async () => {
    if (!selectedSupplierId || selectedEntryIds.size === 0) return;
    try {
      const ids = Array.from(selectedEntryIds).join(',');
      const endpoint = `/ledgers/supplier/${selectedSupplierId}/pdf?entry_ids=${ids}`;
      const suppName = ledgerData?.supplier?.supplier_name || 'Supplier';
      await downloadFile(endpoint, `Selected_Supplier_Ledger_${suppName.replace(/\s+/g, '_')}.pdf`);
      showToast(`Exported ${selectedEntryIds.size} transaction(s) to Statement PDF`, 'success');
    } catch (err: any) {
      showToast(err.message || 'PDF download failed', 'error');
    }
  };

  const handleDownloadSingleEntryPdf = async (entryId: number, refNo: string) => {
    if (!selectedSupplierId) return;
    try {
      const endpoint = `/ledgers/supplier/${selectedSupplierId}/pdf?entry_ids=${entryId}`;
      await downloadFile(endpoint, `Supplier_Transaction_${refNo.replace(/\//g, '_')}.pdf`);
      showToast(`Downloaded Transaction Voucher for ${refNo}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'PDF download failed', 'error');
    }
  };

  const handleDownloadSingleVoucherPdf = async (paymentId: number, voucherNo: string) => {
    try {
      await downloadFile(`/payments/supplier/${paymentId}/pdf`, `Voucher_${voucherNo.replace(/\//g, '_')}.pdf`);
      showToast(`Downloaded Payment Voucher ${voucherNo}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Voucher download failed', 'error');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white uppercase tracking-wide">Supplier Statement of Account & Ledger</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Track purchase bills, payments made, debit notes, and running payables (Bhuj, Kutch)</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedEntryIds.size > 0 && (
            <button
              onClick={handleDownloadSelectedPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 border border-slate-900 brutalist-btn cursor-pointer transition shadow-2xs"
              title="Export selected transactions as a statutory confirmation statement"
            >
              <Download size={13} />
              <span>Export Selected ({selectedEntryIds.size})</span>
            </button>
          )}
          <button
            onClick={handleDownloadFullLedgerPdf}
            disabled={!ledgerData || ledgerData.entries?.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white border border-slate-900 dark:border-blue-700 brutalist-btn cursor-pointer disabled:opacity-50 transition shadow-2xs"
            title="Download full Statement of Account & Balance Confirmation PDF"
          >
            <Printer size={13} />
            <span>Print / Export Full Ledger PDF</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-3 rounded-none border border-slate-300 dark:border-slate-700 shadow-2xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex-1 min-w-[240px]">
          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Select Supplier / Manufacturer</label>
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none focus:ring-1 focus:ring-slate-900 outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.supplier_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {ledgerData && (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-none border border-slate-300 dark:border-slate-700 shadow-2xs flex flex-wrap justify-between items-center gap-3 text-xs">
          <div>
            <span className="font-bold text-slate-900 dark:text-white text-sm block">{ledgerData.supplier?.supplier_name}</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">GST: {ledgerData.supplier?.gstin || 'URP'} &bull; Mobile: {ledgerData.supplier?.mobile}</span>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Total Debited (Paid)</span>
              <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400">₹{ledgerData.summary?.total_debit?.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Total Credited (Billed)</span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-200">₹{ledgerData.summary?.total_credit?.toFixed(2)}</span>
            </div>
            <div className="border-l border-slate-300 dark:border-slate-700 pl-4">
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Current Payable Balance</span>
              <span className={`font-bold font-mono text-base ${ledgerData.supplier?.current_balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}>
                ₹{ledgerData.supplier?.current_balance?.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-300 dark:border-slate-700 shadow-2xs overflow-x-auto text-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-300 dark:border-slate-700 text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-3 w-8 text-center">
                <input
                  type="checkbox"
                  aria-label="Select all transactions"
                  checked={ledgerData?.entries?.length > 0 && selectedEntryIds.size === ledgerData?.entries?.length}
                  onChange={handleSelectAll}
                  className="rounded-none cursor-pointer"
                />
              </th>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Transaction Type</th>
              <th className="py-2.5 px-3">Reference No</th>
              <th className="py-2.5 px-3">Description</th>
              <th className="py-2.5 px-3 text-right">Debit / Paid (₹)</th>
              <th className="py-2.5 px-3 text-right">Credit / Bill (₹)</th>
              <th className="py-2.5 px-3 text-right font-bold">Payable Balance (₹)</th>
              <th className="py-2.5 px-3 text-center">Voucher / Print</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {ledgerData?.entries?.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-slate-400 dark:text-slate-500">
                  {loading ? 'Fetching supplier ledger...' : 'No transactions recorded for this supplier.'}
                </td>
              </tr>
            ) : (
              ledgerData?.entries?.map((e: any) => {
                const isSelected = selectedEntryIds.has(e.id);
                const isPayment = e.reference_type === 'Payment' || e.reference_type === 'Voucher';
                return (
                  <tr
                    key={e.id}
                    className={`transition ${isSelected ? 'bg-amber-50/70 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
                  >
                    <td className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectEntry(e.id)}
                        className="rounded-none cursor-pointer"
                      />
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400">{formatDate(e.transaction_date)}</td>
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.5 rounded-none text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                        {e.reference_type}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">{e.reference_number}</td>
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{e.description}</td>
                    <td className="py-2 px-3 text-right font-mono font-medium text-emerald-700 dark:text-emerald-400">
                      {e.debit_amount > 0 ? e.debit_amount.toFixed(2) : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-medium text-slate-900 dark:text-slate-100">
                      {e.credit_amount > 0 ? e.credit_amount.toFixed(2) : '-'}
                    </td>
                    <td className={`py-2 px-3 text-right font-mono font-bold ${e.running_balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}>
                      {e.running_balance.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isPayment && e.reference_id && (
                          <button
                            onClick={() => handleDownloadSingleVoucherPdf(e.reference_id, e.reference_number)}
                            title="Print Official Supplier Disbursement Voucher"
                            className="p-1 border border-slate-900 dark:border-slate-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 brutalist-btn cursor-pointer"
                          >
                            <FileText size={12} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadSingleEntryPdf(e.id, e.reference_number)}
                          title="Print Single Transaction Statement PDF"
                          className="p-1 border border-slate-900 dark:border-slate-600 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 brutalist-btn cursor-pointer"
                        >
                          <Printer size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
