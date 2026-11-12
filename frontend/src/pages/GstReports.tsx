import React, { useEffect, useState } from 'react';
import { FileText, Download, Calendar, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../api/client';

interface GstReportsProps {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const GstReports: React.FC<GstReportsProps> = ({ showToast }) => {
  const [salesSummary, setSalesSummary] = useState<any>({});
  const [purchaseSummary, setPurchaseSummary] = useState<any>({});
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchGstData = async () => {
    setLoading(true);
    try {
      let sEndpoint = `/registers/sales?`;
      let pEndpoint = `/registers/purchases?`;
      if (fromDate) {
        sEndpoint += `&from_date=${fromDate}`;
        pEndpoint += `&from_date=${fromDate}`;
      }
      if (toDate) {
        sEndpoint += `&to_date=${toDate}`;
        pEndpoint += `&to_date=${toDate}`;
      }

      const [sRes, pRes] = await Promise.all([
        apiRequest(sEndpoint),
        apiRequest(pEndpoint)
      ]);
      setSalesSummary(sRes.summary || {});
      setPurchaseSummary(pRes.summary || {});
    } catch (err: any) {
      showToast(err.message || 'Error loading GST data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGstData();
  }, [fromDate, toDate]);

  const outputGst = salesSummary.total_gst || 0;
  const inputGst = purchaseSummary.total_gst || 0;
  const netGstLiability = Math.max(0, outputGst - inputGst);
  const excessItc = Math.max(0, inputGst - outputGst);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white uppercase tracking-wide">Indian GST Returns & Input Tax Credit (ITC) Report</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">GSTR-1 Outward Supplies vs GSTR-3B Input Tax Credit Reconciliation</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-3 rounded-none border border-slate-300 dark:border-slate-700 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-slate-400 dark:text-slate-500" />
          <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Period:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-none outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
          <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-none outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* 3-Card Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-none border border-slate-300 dark:border-slate-700 shadow-2xs">
          <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-bold uppercase tracking-wider">Output Tax (Sales Tax Collected)</span>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">₹{outputGst.toFixed(2)}</div>
          <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 space-y-1 border-t border-slate-200 dark:border-slate-800 pt-2">
            <div className="flex justify-between">
              <span>Taxable Value:</span>
              <span className="font-mono text-slate-900 dark:text-slate-100 font-medium">₹{salesSummary.total_taxable?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between">
              <span>CGST:</span>
              <span className="font-mono text-slate-900 dark:text-slate-100">₹{salesSummary.total_cgst?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between">
              <span>SGST:</span>
              <span className="font-mono text-slate-900 dark:text-slate-100">₹{salesSummary.total_sgst?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between">
              <span>IGST:</span>
              <span className="font-mono text-slate-900 dark:text-slate-100">₹{salesSummary.total_igst?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-none border border-slate-300 dark:border-slate-700 shadow-2xs">
          <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-bold uppercase tracking-wider">Input Tax Credit (ITC - Purchases)</span>
          <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1">₹{inputGst.toFixed(2)}</div>
          <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 space-y-1 border-t border-slate-200 dark:border-slate-800 pt-2">
            <div className="flex justify-between">
              <span>Inward Taxable:</span>
              <span className="font-mono text-slate-900 dark:text-slate-100 font-medium">₹{purchaseSummary.total_taxable?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between">
              <span>CGST ITC:</span>
              <span className="font-mono text-slate-900 dark:text-slate-100">₹{purchaseSummary.total_cgst?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between">
              <span>SGST ITC:</span>
              <span className="font-mono text-slate-900 dark:text-slate-100">₹{purchaseSummary.total_sgst?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between">
              <span>IGST ITC:</span>
              <span className="font-mono text-slate-900 dark:text-slate-100">₹{purchaseSummary.total_igst?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-none border border-slate-300 dark:border-slate-700 shadow-2xs">
          <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-bold uppercase tracking-wider">Net Tax Liability / (Excess ITC)</span>
          <div className={`text-xl font-bold font-mono mt-1 ${netGstLiability > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
            {netGstLiability > 0 ? `Payable: ₹${netGstLiability.toFixed(2)}` : `ITC Carry Forward: ₹${excessItc.toFixed(2)}`}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 border-t border-slate-200 dark:border-slate-800 pt-2 leading-relaxed">
            {netGstLiability > 0
              ? 'Net liability after adjusting available input tax credit against sales tax.'
              : 'Purchases exceeded sales tax; input tax credit can be carried forward to next month.'}
          </div>
        </div>
      </div>
    </div>
  );
};
