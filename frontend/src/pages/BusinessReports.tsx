import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Users, Truck, Package, Clock } from 'lucide-react';
import { apiRequest } from '../api/client';

interface BusinessReportsProps {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const BusinessReports: React.FC<BusinessReportsProps> = ({ showToast }) => {
  const [data, setData] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiRequest('/dashboard'),
      apiRequest('/customers?limit=250'),
      apiRequest('/suppliers?limit=250')
    ])
      .then(([dash, custs, supps]) => {
        setData(dash);
        setCustomers(custs.customers || []);
        setSuppliers(supps.suppliers || []);
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const highDebtCustomers = customers
    .filter((c) => c.current_balance > 0)
    .sort((a, b) => b.current_balance - a.current_balance)
    .slice(0, 10);

  const highPayableSuppliers = suppliers
    .filter((s) => s.current_balance > 0)
    .sort((a, b) => b.current_balance - a.current_balance)
    .slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white uppercase tracking-wide">Pharmaceutical Business Analytics & Registers</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Party exposure, customer credit risks, supplier liabilities, and turnover analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Top Outstanding Customers */}
        <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-300 dark:border-slate-700 shadow-2xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Users size={15} className="text-blue-600 dark:text-blue-400" />
            Top 10 Parties with Outstanding Receivables
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {highDebtCustomers.length === 0 ? (
              <div className="p-6 text-center text-slate-400 dark:text-slate-500">No parties with pending receivables.</div>
            ) : (
              highDebtCustomers.map((c, idx) => (
                <div key={c.id} className="p-2.5 px-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-none bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{c.party_name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {c.customer_category} &bull; Credit: ₹{c.credit_limit} ({c.payment_terms_days}d)
                      </div>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                    ₹{c.current_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Payable Suppliers */}
        <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-300 dark:border-slate-700 shadow-2xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Truck size={15} className="text-purple-600 dark:text-purple-400" />
            Top 10 Suppliers by Accounts Payable
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {highPayableSuppliers.length === 0 ? (
              <div className="p-6 text-center text-slate-400 dark:text-slate-500">No pending supplier payables.</div>
            ) : (
              highPayableSuppliers.map((s, idx) => (
                <div key={s.id} className="p-2.5 px-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-none bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{s.supplier_name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Credit Terms: {s.credit_terms_days} Days</div>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                    ₹{s.current_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
