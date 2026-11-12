import React, { useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Package, AlertTriangle,
  Clock, ShoppingBag, ArrowUpRight, ArrowDownRight, RefreshCw,
  FileText, CreditCard, BarChart2, PieChart, ShieldAlert
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { formatDate } from '../utils/date';
import type { NavItem } from '../components/Sidebar';

interface DashboardProps {
  setActiveTab: (tab: NavItem) => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab, showToast }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Interactive Chart Tooltip State
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/dashboard');
      setData(res);
    } catch (err: any) {
      showToast(err.message || 'Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 font-mono text-xs">
        <RefreshCw size={20} className="animate-spin mr-2 text-blue-600" />
        Loading real-time financial metrics from local SQLite database...
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const topSelling = data?.top_selling || [];
  const expenseBreakdown = data?.expense_breakdown || {};
  const expenseEntries = Object.entries(expenseBreakdown).map(([cat, amt]: [string, any]) => ({
    category: cat,
    amount: Number(amt),
  }));
  const totalExpenses = expenseEntries.reduce((sum, e) => sum + e.amount, 0);

  // Maximum value for comparative bar charts
  const monthlySales = Number(kpis.monthly_sales || 0);
  const monthlyPurchases = Number(kpis.monthly_purchases || 0);
  const monthlyGross = Number(kpis.monthly_gross_profit || 0);
  const monthlyNet = Number(kpis.monthly_net_profit || 0);
  const maxBarVal = Math.max(monthlySales, monthlyPurchases, 1000);

  const topMaxQty = topSelling.length > 0 ? Math.max(...topSelling.map((t: any) => t.total_qty), 1) : 1;

  return (
    <div className="space-y-4">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white uppercase font-mono tracking-tight">
            Financial Dashboard & Inventory Analytics
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Real-time double-entry ledgers, FIFO gross margin, and provisional net profit
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border-1.5 border-slate-900 dark:border-slate-600 rounded text-xs font-bold text-slate-900 dark:text-slate-100 brutalist-btn cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Live Data</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {/* Today's Sales */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-bold text-slate-700 dark:text-slate-300">Today's Sales</span>
            <span className="p-1 border border-blue-900 dark:border-blue-600 bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300">
              <ShoppingBag size={13} />
            </span>
          </div>
          <div className="text-base font-black text-slate-900 dark:text-white font-mono">
            ₹{kpis.today_sales?.toLocaleString('en-IN') || '0'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            Monthly: <b className="text-slate-900 dark:text-slate-200">₹{kpis.monthly_sales?.toLocaleString('en-IN') || '0'}</b>
          </div>
        </div>

        {/* Today's Purchases */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-bold text-slate-700 dark:text-slate-300">Today's Purchases</span>
            <span className="p-1 border border-indigo-900 dark:border-indigo-600 bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-300">
              <Package size={13} />
            </span>
          </div>
          <div className="text-base font-black text-slate-900 dark:text-white font-mono">
            ₹{kpis.today_purchases?.toLocaleString('en-IN') || '0'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            Monthly: <b className="text-slate-900 dark:text-slate-200">₹{kpis.monthly_purchases?.toLocaleString('en-IN') || '0'}</b>
          </div>
        </div>

        {/* Monthly Gross Profit */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-bold text-slate-700 dark:text-slate-300">Gross Margin (FIFO)</span>
            <span className="p-1 border border-emerald-900 dark:border-emerald-600 bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300">
              <TrendingUp size={13} />
            </span>
          </div>
          <div className="text-base font-black text-emerald-700 dark:text-emerald-400 font-mono">
            ₹{kpis.monthly_gross_profit?.toLocaleString('en-IN') || '0'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            {monthlySales > 0 ? `${((monthlyGross / monthlySales) * 100).toFixed(1)}% Gross Margin` : 'COGS FIFO Costed'}
          </div>
        </div>

        {/* Monthly Net Profit */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-bold text-slate-700 dark:text-slate-300">Net Profit (Provisional)</span>
            <span className="p-1 border border-teal-900 dark:border-teal-600 bg-teal-100 dark:bg-teal-950 text-teal-900 dark:text-teal-300">
              <DollarSign size={13} />
            </span>
          </div>
          <div className={`text-base font-black font-mono ${kpis.monthly_net_profit >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'}`}>
            ₹{kpis.monthly_net_profit?.toLocaleString('en-IN') || '0'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            After Direct & Indirect Expenses
          </div>
        </div>

        {/* Customer Receivables */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-bold text-slate-700 dark:text-slate-300">Customer Receivables</span>
            <span className="p-1 border border-amber-900 dark:border-amber-600 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300">
              <ArrowUpRight size={13} />
            </span>
          </div>
          <div className="text-base font-black text-amber-700 dark:text-amber-400 font-mono">
            ₹{kpis.total_receivables?.toLocaleString('en-IN') || '0'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1 flex justify-between">
            <span>Outstanding From Parties</span>
            <button onClick={() => setActiveTab('customers')} className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer">
              View
            </button>
          </div>
        </div>

        {/* Supplier Payables */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-bold text-slate-700 dark:text-slate-300">Supplier Payables</span>
            <span className="p-1 border border-rose-900 dark:border-rose-600 bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-300">
              <ArrowDownRight size={13} />
            </span>
          </div>
          <div className="text-base font-black text-rose-700 dark:text-rose-400 font-mono">
            ₹{kpis.total_payables?.toLocaleString('en-IN') || '0'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1 flex justify-between">
            <span>Owed To Suppliers</span>
            <button onClick={() => setActiveTab('suppliers')} className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer">
              View
            </button>
          </div>
        </div>

        {/* Current Stock Valuation */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-bold text-slate-700 dark:text-slate-300">Stock Valuation</span>
            <span className="p-1 border border-purple-900 dark:border-purple-600 bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-300">
              <Package size={13} />
            </span>
          </div>
          <div className="text-base font-black text-purple-900 dark:text-purple-300 font-mono">
            ₹{kpis.current_inventory_value?.toLocaleString('en-IN') || '0'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            {kpis.total_products || 0} Products ({kpis.total_stock_qty || 0} Units)
          </div>
        </div>

        {/* Inventory Health & Expiry Alerts */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-bold text-slate-700 dark:text-slate-300">Inventory Alerts</span>
            <span className="p-1 border border-amber-900 dark:border-amber-600 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300">
              <AlertTriangle size={13} />
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-1.5 py-0.5 border border-amber-600 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 font-mono font-bold text-[10px]">
              {kpis.near_expiry_count || 0} Near Exp
            </span>
            <span className="px-1.5 py-0.5 border border-rose-600 bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-300 font-mono font-bold text-[10px]">
              {kpis.expired_count || 0} Expired
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-2 flex justify-between">
            <span>{kpis.low_stock_count || 0} Low Stock Items</span>
            <button onClick={() => setActiveTab('inventory')} className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer">
              Resolve
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
        {/* Chart 1: Interactive Monthly Sales vs Purchases Comparison */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
          <div className="flex items-center justify-between border-b-1.5 border-slate-900 dark:border-slate-700 pb-2 mb-3">
            <h3 className="font-black text-slate-900 dark:text-white uppercase font-mono flex items-center gap-1.5 text-xs">
              <BarChart2 size={15} className="text-blue-600 dark:text-blue-400" />
              Monthly Inflow vs Outflow Comparison
            </h3>
            <span className="text-[10px] font-mono text-slate-500">Current Month</span>
          </div>

          <div className="space-y-4">
            {/* Sales Bar */}
            <div>
              <div className="flex justify-between font-mono font-bold text-[11px] mb-1">
                <span className="text-blue-700 dark:text-blue-400">Total Billed Sales</span>
                <span className="text-slate-900 dark:text-white">₹{monthlySales.toFixed(2)}</span>
              </div>
              <div
                className="h-6 bg-slate-100 dark:bg-slate-800 border border-slate-900 dark:border-slate-700 relative overflow-hidden cursor-pointer"
                onMouseEnter={() => setActiveTooltip(`Total Sales: ₹${monthlySales.toFixed(2)}`)}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <div
                  className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-500 flex items-center justify-end pr-2 text-[10px] font-bold text-white font-mono"
                  style={{ width: `${Math.min(100, (monthlySales / maxBarVal) * 100)}%` }}
                >
                  {monthlySales > 0 ? `${((monthlySales / maxBarVal) * 100).toFixed(0)}%` : ''}
                </div>
              </div>
            </div>

            {/* Purchases Bar */}
            <div>
              <div className="flex justify-between font-mono font-bold text-[11px] mb-1">
                <span className="text-indigo-700 dark:text-indigo-400">Total Inward Purchases</span>
                <span className="text-slate-900 dark:text-white">₹{monthlyPurchases.toFixed(2)}</span>
              </div>
              <div
                className="h-6 bg-slate-100 dark:bg-slate-800 border border-slate-900 dark:border-slate-700 relative overflow-hidden cursor-pointer"
                onMouseEnter={() => setActiveTooltip(`Total Purchases: ₹${monthlyPurchases.toFixed(2)}`)}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <div
                  className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-500 flex items-center justify-end pr-2 text-[10px] font-bold text-white font-mono"
                  style={{ width: `${Math.min(100, (monthlyPurchases / maxBarVal) * 100)}%` }}
                >
                  {monthlyPurchases > 0 ? `${((monthlyPurchases / maxBarVal) * 100).toFixed(0)}%` : ''}
                </div>
              </div>
            </div>

            {/* Gross Profit Bar */}
            <div>
              <div className="flex justify-between font-mono font-bold text-[11px] mb-1">
                <span className="text-emerald-700 dark:text-emerald-400">Gross Margin (FIFO COGS)</span>
                <span className="text-slate-900 dark:text-white">₹{monthlyGross.toFixed(2)}</span>
              </div>
              <div
                className="h-6 bg-slate-100 dark:bg-slate-800 border border-slate-900 dark:border-slate-700 relative overflow-hidden cursor-pointer"
                onMouseEnter={() => setActiveTooltip(`Gross Profit: ₹${monthlyGross.toFixed(2)}`)}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <div
                  className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-500 flex items-center justify-end pr-2 text-[10px] font-bold text-white font-mono"
                  style={{ width: `${Math.min(100, Math.max(0, (monthlyGross / maxBarVal) * 100))}%` }}
                >
                  {monthlyGross > 0 ? `${((monthlyGross / maxBarVal) * 100).toFixed(0)}%` : ''}
                </div>
              </div>
            </div>

            {/* Net Profit Bar */}
            <div>
              <div className="flex justify-between font-mono font-bold text-[11px] mb-1">
                <span className="text-teal-700 dark:text-teal-400">Net Profit (After Expenses)</span>
                <span className="text-slate-900 dark:text-white">₹{monthlyNet.toFixed(2)}</span>
              </div>
              <div
                className="h-6 bg-slate-100 dark:bg-slate-800 border border-slate-900 dark:border-slate-700 relative overflow-hidden cursor-pointer"
                onMouseEnter={() => setActiveTooltip(`Net Profit: ₹${monthlyNet.toFixed(2)}`)}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <div
                  className="h-full bg-teal-600 dark:bg-teal-500 transition-all duration-500 flex items-center justify-end pr-2 text-[10px] font-bold text-white font-mono"
                  style={{ width: `${Math.min(100, Math.max(0, (monthlyNet / maxBarVal) * 100))}%` }}
                >
                  {monthlyNet > 0 ? `${((monthlyNet / maxBarVal) * 100).toFixed(0)}%` : ''}
                </div>
              </div>
            </div>

            {activeTooltip && (
              <div className="p-2 border border-slate-900 dark:border-slate-700 bg-amber-100 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-center text-xs">
                {activeTooltip}
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Top Fast-Moving Medicines Interactive Velocity */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
          <div className="flex items-center justify-between border-b-1.5 border-slate-900 dark:border-slate-700 pb-2 mb-3">
            <h3 className="font-black text-slate-900 dark:text-white uppercase font-mono flex items-center gap-1.5 text-xs">
              <TrendingUp size={15} className="text-emerald-600 dark:text-emerald-400" />
              Fast-Moving Medicines Velocity
            </h3>
            <button
              onClick={() => setActiveTab('products')}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline font-mono text-[10px] cursor-pointer"
            >
              Product Master &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {topSelling.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-mono">
                No medicine sales recorded yet. Dispensed units will appear here automatically.
              </div>
            ) : (
              topSelling.map((prod: any, idx: number) => {
                const pct = Math.min(100, (prod.total_qty / topMaxQty) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                        {idx + 1}. {prod.product_name}
                      </span>
                      <span className="font-bold text-blue-700 dark:text-blue-400">
                        {prod.total_qty} Units (₹{prod.total_sales.toFixed(2)})
                      </span>
                    </div>
                    <div className="h-4 bg-slate-100 dark:bg-slate-800 border border-slate-900 dark:border-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Two-Column Section: Recent Invoices & Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
        {/* Recent Invoices */}
        <div className="bg-white dark:bg-slate-900 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card overflow-hidden">
          <div className="px-4 py-2.5 border-b-1.5 border-slate-900 dark:border-slate-700 flex items-center justify-between bg-slate-200 dark:bg-slate-800">
            <h3 className="font-black text-slate-900 dark:text-white uppercase font-mono flex items-center gap-1.5">
              <FileText size={15} className="text-blue-600 dark:text-blue-400" />
              Recent Sales Invoices
            </h3>
            <button
              onClick={() => setActiveTab('sales-register')}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline font-mono text-[11px] cursor-pointer"
            >
              Full Register &rarr;
            </button>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
            {data?.recent_sales?.length === 0 ? (
              <div className="p-6 text-center text-slate-400 font-mono">No sales invoices generated yet.</div>
            ) : (
              data?.recent_sales?.map((inv: any) => (
                <div key={inv.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{inv.customer_name}</div>
                    <div className="text-[10px] text-slate-500">
                      {inv.invoice_number} &bull; {formatDate(inv.invoice_date)} &bull; {inv.payment_mode}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-slate-900 dark:text-white">₹{inv.net_invoice_amount.toFixed(2)}</div>
                    <span className={`inline-block px-1.5 py-0.2 border text-[9px] font-bold ${
                      inv.payment_status === 'Paid'
                        ? 'border-emerald-600 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        : 'border-amber-600 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                    }`}>
                      {inv.payment_status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Monthly Expense Category Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card overflow-hidden">
          <div className="px-4 py-2.5 border-b-1.5 border-slate-900 dark:border-slate-700 flex items-center justify-between bg-slate-200 dark:bg-slate-800">
            <h3 className="font-black text-slate-900 dark:text-white uppercase font-mono flex items-center gap-1.5">
              <PieChart size={15} className="text-amber-600 dark:text-amber-400" />
              Monthly Expenses Breakdown
            </h3>
            <button
              onClick={() => setActiveTab('expenses')}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline font-mono text-[11px] cursor-pointer"
            >
              Expense Manager &rarr;
            </button>
          </div>
          <div className="p-3 font-mono space-y-2.5">
            {expenseEntries.length === 0 ? (
              <div className="py-6 text-center text-slate-400">
                No business expenses booked this month. Total: ₹0.00
              </div>
            ) : (
              expenseEntries.map((exp) => {
                const expPct = totalExpenses > 0 ? (exp.amount / totalExpenses) * 100 : 0;
                return (
                  <div key={exp.category} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-bold text-slate-900 dark:text-white">{exp.category}</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        ₹{exp.amount.toFixed(2)} ({expPct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 border border-slate-900 dark:border-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 dark:bg-amber-400"
                        style={{ width: `${expPct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
            {totalExpenses > 0 && (
              <div className="pt-2 border-t border-slate-900 dark:border-slate-700 flex justify-between font-black text-xs text-slate-900 dark:text-white">
                <span>TOTAL OPERATING EXPENSES:</span>
                <span>₹{totalExpenses.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
