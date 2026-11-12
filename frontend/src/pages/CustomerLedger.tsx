import React, { useEffect, useState } from 'react';
import { BookOpen, Calendar, Search } from 'lucide-react';
import { apiRequest } from '../api/client';
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

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white uppercase tracking-wide">Customer Statement of Account & Ledger</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Track debits, credits, payments received, and running receivables</p>
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
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Voucher / Ref Type</th>
              <th className="py-2.5 px-3">Reference No</th>
              <th className="py-2.5 px-3">Particulars / Description</th>
              <th className="py-2.5 px-3 text-right">Debit / Invoiced (₹)</th>
              <th className="py-2.5 px-3 text-right">Credit / Paid (₹)</th>
              <th className="py-2.5 px-3 text-right font-bold">Running Balance (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {ledgerData?.entries?.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400 dark:text-slate-500">
                  {loading ? 'Fetching ledger...' : 'No transactions recorded for this party.'}
                </td>
              </tr>
            ) : (
              ledgerData?.entries?.map((e: any) => (
                <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
