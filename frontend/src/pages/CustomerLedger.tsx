import React, { useEffect, useState } from 'react';
import { BookOpen, Calendar, Search, Printer, FileText, CheckSquare, Square, Download } from 'lucide-react';
import { apiRequest, downloadFile, printPdf } from '../api/client';
import { formatDate } from '../utils/date';

interface CustomerLedgerProps {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const CustomerLedger: React.FC<CustomerLedgerProps> = ({ showToast }) => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    apiRequest('/customers?limit=250')
      .then((res) => {
        const list = res.customers || [];
        setCustomers(list);
        if (list.length > 0) setSelectedCustomerId(list[0].id);
      })
      .catch((err) => showToast(err.message, 'error'));
  }, []);

  const fetchLedger = async () => {
    if (!selectedCustomerId) return;
    setLoading(true);
    setSelectedEntryIds(new Set());
    try {
      let endpoint = `/ledgers/customer/${selectedCustomerId}?`;
      if (fromDate) endpoint += `&from_date=${fromDate}`;
      if (toDate) endpoint += `&to_date=${toDate}`;
      const res = await apiRequest(endpoint);
      setLedgerData(res);
    } catch (err: any) {
      showToast(err.message || 'Error loading ledger', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [selectedCustomerId, fromDate, toDate]);

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

  const handlePrintFullLedgerPdf = async () => {
    if (!selectedCustomerId) return;
    try {
      let endpoint = `/ledgers/customer/${selectedCustomerId}/pdf?`;
      if (fromDate) endpoint += `&from_date=${fromDate}`;
      if (toDate) endpoint += `&to_date=${toDate}`;
      await printPdf(endpoint);
      showToast('Opened Statement of Account for printing', 'info');
    } catch (err: any) {
      showToast(err.message || 'Print failed', 'error');
    }
  };

  const handleDownloadFullLedgerPdf = async () => {
    if (!selectedCustomerId) return;
    try {
      let endpoint = `/ledgers/customer/${selectedCustomerId}/pdf?`;
      if (fromDate) endpoint += `&from_date=${fromDate}`;
      if (toDate) endpoint += `&to_date=${toDate}`;
      const custName = ledgerData?.customer?.party_name || 'Customer';
      await downloadFile(endpoint, `Ledger_${custName.replace(/\s+/g, '_')}.pdf`);
      showToast('Statutory Statement of Account PDF downloaded', 'success');
    } catch (err: any) {
      showToast(err.message || 'PDF download failed', 'error');
    }
  };

  const handlePrintSingleReceiptPdf = async (paymentId: number, receiptNo: string) => {
    try {
      await printPdf(`/payments/customer/${paymentId}/pdf`);
      showToast(`Opened Receipt Voucher ${receiptNo} for printing`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Receipt print failed', 'error');
    }
  };

  const handleDownloadSelectedPdf = async () => {
    if (!selectedCustomerId || selectedEntryIds.size === 0) return;
    try {
      const ids = Array.from(selectedEntryIds).join(',');
      const endpoint = `/ledgers/customer/${selectedCustomerId}/pdf?entry_ids=${ids}`;
      const custName = ledgerData?.customer?.party_name || 'Customer';
      await downloadFile(endpoint, `Selected_Ledger_${custName.replace(/\s+/g, '_')}.pdf`);
      showToast(`Exported ${selectedEntryIds.size} transaction(s) to Statement PDF`, 'success');
    } catch (err: any) {
      showToast(err.message || 'PDF download failed', 'error');
    }
  };

  const handleDownloadSingleEntryPdf = async (entryId: number, refNo: string) => {
    if (!selectedCustomerId) return;
    try {
      const endpoint = `/ledgers/customer/${selectedCustomerId}/pdf?entry_ids=${entryId}`;
      await downloadFile(endpoint, `Transaction_Receipt_${refNo.replace(/\//g, '_')}.pdf`);
      showToast(`Downloaded Transaction Receipt for ${refNo}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'PDF download failed', 'error');
    }
  };

  const handleDownloadSingleReceiptPdf = async (paymentId: number, receiptNo: string) => {
    try {
      await downloadFile(`/payments/customer/${paymentId}/pdf`, `Receipt_${receiptNo.replace(/\//g, '_')}.pdf`);
      showToast(`Downloaded Payment Receipt Voucher ${receiptNo}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Receipt voucher download failed', 'error');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white uppercase tracking-wide">Customer Statement of Account & Ledger</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Statutory balance confirmation, running balances, and transactional receipts (Bhuj, Kutch)</p>
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
            onClick={handlePrintFullLedgerPdf}
            disabled={!ledgerData || ledgerData.entries?.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-950 border border-slate-900 dark:border-white brutalist-btn cursor-pointer disabled:opacity-50 transition shadow-2xs uppercase tracking-wider"
            title="Open Statement of Account for 1-click printing"
          >
            <Printer size={13} />
            <span>Print Statement</span>
          </button>
          <button
            onClick={handleDownloadFullLedgerPdf}
            disabled={!ledgerData || ledgerData.entries?.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 brutalist-btn cursor-pointer disabled:opacity-50 transition shadow-2xs uppercase tracking-wider"
            title="Download full Statement of Account & Balance Confirmation PDF"
          >
            <Download size={13} />
            <span>PDF</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-3 rounded-none border border-slate-300 dark:border-slate-700 shadow-2xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex-1 min-w-[240px]">
          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Select Customer</label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none focus:ring-1 focus:ring-slate-900 outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.party_name} ({c.customer_category})</option>
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

        {(fromDate || toDate) && (
          <button
            onClick={() => { setFromDate(''); setToDate(''); }}
            className="mt-4 text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
          >
            Reset Dates
          </button>
        )}
      </div>

      {ledgerData && (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-none border border-slate-300 dark:border-slate-700 shadow-2xs flex flex-wrap justify-between items-center gap-3 text-xs">
          <div>
            <span className="font-bold text-slate-900 dark:text-white text-sm block">{ledgerData.customer?.party_name}</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">GST: {ledgerData.customer?.gstin || 'URP'} &bull; Mobile: {ledgerData.customer?.mobile}</span>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Total Debited</span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-200">₹{ledgerData.summary?.total_debit?.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Total Credited</span>
              <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400">₹{ledgerData.summary?.total_credit?.toFixed(2)}</span>
            </div>
            <div className="border-l border-slate-300 dark:border-slate-700 pl-4">
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Current Outstanding</span>
              <span className={`font-bold font-mono text-base ${ledgerData.customer?.current_balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}>
                ₹{ledgerData.customer?.current_balance?.toFixed(2)}
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
              <th className="py-2.5 px-3">Voucher / Ref Type</th>
              <th className="py-2.5 px-3">Reference No</th>
              <th className="py-2.5 px-3">Particulars / Description</th>
              <th className="py-2.5 px-3 text-right">Debit / Invoiced (Rs.)</th>
              <th className="py-2.5 px-3 text-right">Credit / Paid (Rs.)</th>
              <th className="py-2.5 px-3 text-right font-bold">Running Balance (Rs.)</th>
              <th className="py-2.5 px-3 text-center">Receipt / Print</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {ledgerData?.entries?.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-slate-400 dark:text-slate-500">
                  {loading ? 'Fetching ledger...' : 'No transactions recorded for this party.'}
                </td>
              </tr>
            ) : (
              ledgerData?.entries?.map((e: any) => {
                const isSelected = selectedEntryIds.has(e.id);
                const isPayment = e.reference_type === 'Payment' || e.reference_type === 'Receipt';
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
                    <td className="py-2 px-3 text-right font-mono font-medium text-slate-900 dark:text-slate-100">
                      {e.debit_amount > 0 ? e.debit_amount.toFixed(2) : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-medium text-emerald-700 dark:text-emerald-400">
                      {e.credit_amount > 0 ? e.credit_amount.toFixed(2) : '-'}
                    </td>
                    <td className={`py-2 px-3 text-right font-mono font-bold ${e.running_balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}>
                      {e.running_balance.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isPayment && e.reference_id && (
                          <button
                            onClick={() => handlePrintSingleReceiptPdf(e.reference_id, e.reference_number)}
                            title="Print Official Payment Receipt Voucher"
                            className="px-1.5 py-1 border border-slate-900 dark:border-slate-600 bg-emerald-600 hover:bg-emerald-700 text-white brutalist-btn cursor-pointer inline-flex items-center gap-1 text-[10px] font-bold shadow-2xs"
                          >
                            <Printer size={11} />
                            <span>Receipt</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadSingleEntryPdf(e.id, e.reference_number)}
                          title="Download Single Transaction Statement PDF"
                          className="p-1 border border-slate-300 dark:border-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 brutalist-btn cursor-pointer"
                        >
                          <Download size={12} />
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
