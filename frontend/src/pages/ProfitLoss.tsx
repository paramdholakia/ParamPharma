import React, { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, Calendar, RefreshCw, BarChart2, Layers } from 'lucide-react';
import { apiRequest } from '../api/client';

interface ProfitLossProps {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const ProfitLoss: React.FC<ProfitLossProps> = ({ showToast }) => {
  const [statement, setStatement] = useState<any>(null);
  const [productProfits, setProductProfits] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'statement' | 'products'>('statement');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [otherIncome, setOtherIncome] = useState<number>(0);
  const [financeCosts, setFinanceCosts] = useState<number>(0);
  const [depreciation, setDepreciation] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const fetchPnl = async () => {
    setLoading(true);
    try {
      let endpoint = `/profit-loss?other_income=${otherIncome}&finance_costs=${financeCosts}&depreciation=${depreciation}`;
      if (fromDate) endpoint += `&from_date=${fromDate}`;
      if (toDate) endpoint += `&to_date=${toDate}`;

      let prodEndpoint = `/profit-loss/product-wise?`;
      if (fromDate) prodEndpoint += `&from_date=${fromDate}`;
      if (toDate) prodEndpoint += `&to_date=${toDate}`;

      const [res, prodRes] = await Promise.all([
        apiRequest(endpoint),
        apiRequest(prodEndpoint)
      ]);
      setStatement(res);
      setProductProfits(prodRes || []);
    } catch (err: any) {
      showToast(err.message || 'Error loading P&L', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPnl();
  }, [fromDate, toDate]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white uppercase tracking-wide">Financial Profit & Loss Statement (FIFO Costed)</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Accurate wholesale margin calculation: Net Sales - FIFO COGS - Operating Overheads</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('statement')}
            className={`px-3 py-1.5 rounded-none text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 border border-slate-900 dark:border-white ${
              viewMode === 'statement' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-xs' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
            }`}
          >
            <BarChart2 size={13} />
            P&L Statement
          </button>
          <button
            onClick={() => setViewMode('products')}
            className={`px-3 py-1.5 rounded-none text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 border border-slate-900 dark:border-white ${
              viewMode === 'products' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-xs' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Layers size={13} />
            Product-wise Margins
          </button>
        </div>
      </div>

      {/* Date Filter & Period */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-none border border-slate-300 dark:border-slate-700 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-slate-400 dark:text-slate-500" />
          <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-none outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
          <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] ml-2">To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-none outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
          <button
            onClick={fetchPnl}
            className="ml-2 px-3 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-none font-bold uppercase tracking-wider hover:bg-black dark:hover:bg-slate-200 transition cursor-pointer flex items-center gap-1"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Recalculate
          </button>
        </div>

        <div className="text-slate-500 dark:text-slate-400 text-[11px]">
          Current Stock Valuation: <b className="text-slate-900 dark:text-white font-mono text-xs">₹{statement?.current_inventory_value?.toLocaleString('en-IN') || '0'}</b> ({statement?.current_inventory_units || 0} units)
        </div>
      </div>

      {viewMode === 'statement' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Financial Statement */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-none border border-slate-300 dark:border-slate-700 shadow-2xs overflow-hidden text-xs">
            <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 font-bold border-b border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white uppercase tracking-wider flex justify-between">
              <span>Financial Item Particulars</span>
              <span>Amount (₹)</span>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {/* Revenue */}
              <div className="p-3 bg-blue-50/40 dark:bg-blue-950/20">
                <div className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">1. REVENUE FROM OPERATIONS (NET SALES)</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Gross Sales Revenue excluding GST, less trade discounts and customer returns</div>
              </div>
              <div className="p-2.5 px-4 flex justify-between">
                <span className="text-slate-700 dark:text-slate-300 pl-3">Gross Taxable Sales</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">₹{statement?.gross_sales_taxable?.toFixed(2)}</span>
              </div>
              <div className="p-2.5 px-4 flex justify-between text-slate-500 dark:text-slate-400">
                <span className="pl-3">Less: Sales Discounts & Schemes</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400">-₹{statement?.sales_discounts?.toFixed(2)}</span>
              </div>
              <div className="p-2.5 px-4 flex justify-between text-slate-500 dark:text-slate-400">
                <span className="pl-3">Less: Sales Returns (Approved Credit Notes)</span>
                <span className="font-mono text-rose-600 dark:text-rose-400">-₹{statement?.sales_returns?.toFixed(2)}</span>
              </div>
              <div className="p-2.5 px-4 flex justify-between font-bold bg-blue-50/60 dark:bg-blue-950/30 text-blue-900 dark:text-blue-300">
                <span>NET SALES REVENUE</span>
                <span className="font-mono">₹{statement?.net_sales?.toFixed(2)}</span>
              </div>

              {/* COGS */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40">
                <div className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">2. COST OF GOODS SOLD (FIFO COGS)</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Batch-specific purchase cost of all medicines actually dispensed</div>
              </div>
              <div className="p-2.5 px-4 flex justify-between">
                <span className="text-slate-700 dark:text-slate-300 pl-3">Cost of Sales (Batch Purchase Rates)</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">₹{statement?.cogs?.toFixed(2)}</span>
              </div>
              <div className="p-2.5 px-4 flex justify-between font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300">
                <span>GROSS PROFIT (Margin: {statement?.gross_profit_percent}%)</span>
                <span className="font-mono text-sm">₹{statement?.gross_profit?.toFixed(2)}</span>
              </div>

              {/* Overheads */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40">
                <div className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">3. OPERATING OVERHEADS & BUSINESS EXPENSES</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Employee salaries, office rent, electricity, transport, and delivery</div>
              </div>
              <div className="p-2.5 px-4 flex justify-between">
                <span className="text-slate-700 dark:text-slate-300 pl-3">Total Registered Business Overheads</span>
                <span className="font-mono text-rose-600 dark:text-rose-400">₹{statement?.total_operating_expenses?.toFixed(2)}</span>
              </div>
              <div className="p-2.5 px-4 flex justify-between font-bold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">
                <span>OPERATING PROFIT</span>
                <span className="font-mono">₹{statement?.operating_profit?.toFixed(2)}</span>
              </div>

              {/* Net Profit */}
              <div className="p-2.5 px-4 flex justify-between text-slate-600 dark:text-slate-400">
                <span className="pl-3">Tax Provision (25% on positive profit)</span>
                <span className="font-mono text-slate-500 dark:text-slate-400">-₹{statement?.tax_provision?.toFixed(2)}</span>
              </div>
              <div className="p-3.5 px-4 flex justify-between font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 text-sm border-t-2 border-emerald-500">
                <span>NET PROFIT AFTER TAX (Margin: {statement?.net_profit_percent}%)</span>
                <span className="font-mono text-base font-bold">₹{statement?.net_profit?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Side Column: Category Breakdown */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-none border border-slate-300 dark:border-slate-700 shadow-2xs text-xs">
              <h3 className="font-bold text-slate-800 dark:text-white mb-2 uppercase tracking-wide">Operating Expense Breakdown</h3>
              <div className="space-y-2">
                {Object.keys(statement?.expense_by_category || {}).length === 0 ? (
                  <div className="text-slate-400 dark:text-slate-500 py-4 text-center">No expenses registered in period.</div>
                ) : (
                  Object.entries(statement?.expense_by_category || {}).map(([cat, amt]: any) => (
                    <div key={cat} className="flex justify-between items-center text-[11px] border-b border-slate-200 dark:border-slate-800 pb-1">
                      <span className="text-slate-600 dark:text-slate-300">{cat}</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">₹{amt.toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-none border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-300 space-y-1">
              <span className="font-bold block uppercase tracking-wider text-[11px]">Important Accounting Rule:</span>
              <p className="text-[11px] text-blue-800 dark:text-blue-200 leading-relaxed">
                GST collected on sales is treated as a government tax liability (Output Tax) and is never counted as sales revenue. Similarly, GST paid on purchases is an Input Tax Credit (ITC) asset and is never treated as a cost of goods sold.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Product-wise Margins Table */
        <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-300 dark:border-slate-700 shadow-2xs overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-300 dark:border-slate-700 text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Medicine Description</th>
                <th className="py-2.5 px-3">Manufacturer</th>
                <th className="py-2.5 px-3 text-center">Dispensed Qty</th>
                <th className="py-2.5 px-3 text-center">Free Given</th>
                <th className="py-2.5 px-3 text-right">Revenue (₹)</th>
                <th className="py-2.5 px-3 text-right">FIFO Cost (₹)</th>
                <th className="py-2.5 px-3 text-right font-bold">Gross Profit (₹)</th>
                <th className="py-2.5 px-3 text-center font-bold">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {productProfits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 dark:text-slate-500">
                    No sales recorded in selected period to compute product margins.
                  </td>
                </tr>
              ) : (
                productProfits.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">{p.product_name}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{p.manufacturer}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-800 dark:text-slate-200">{p.total_quantity_sold}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500 dark:text-slate-400">{p.total_free_given}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800 dark:text-slate-200">{p.revenue.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">{p.cogs.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">₹{p.gross_profit.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-none text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        {p.profit_margin_percent}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
