import React, { useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Package, AlertTriangle,
  Clock, ShoppingBag, ArrowUpRight, ArrowDownRight, RefreshCw,
  FileText, CreditCard, BarChart2, PieChart, ShieldAlert, Calendar, Users
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

  // Dynamic Time Range State
  const [timeRange, setTimeRange] = useState<string>('monthly');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');

  // Interactive Chart Tooltip State
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      let endpoint = `/dashboard?time_range=${timeRange}`;
      if (timeRange === 'custom') {
        if (customFrom) endpoint += `&from_date=${customFrom}`;
        if (customTo) endpoint += `&to_date=${customTo}`;
      }
      const res = await apiRequest(endpoint);
      setData(res);
    } catch (err: any) {
      showToast(err.message || 'Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange, customFrom, customTo]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 font-mono text-xs">
        <RefreshCw size={20} className="animate-spin mr-2 text-blue-600" />
        Loading real-time financial metrics from local SQLite database...
      </div>
    );
  }

  const rangeInfo = data?.range_info || {};
  const kpis = data?.kpis || {};
  const topSelling = data?.top_selling || [];
  const customerDistribution = data?.customer_distribution || [];
  const trendSeries = data?.trend_series || [];
  const expenseBreakdown = data?.expense_breakdown || {};
  const expenseEntries = Object.entries(expenseBreakdown).map(([cat, amt]: [string, any]) => ({
    category: cat,
    amount: Number(amt),
  }));
  const totalExpenses = expenseEntries.reduce((sum, e) => sum + e.amount, 0);

  // Maximum value for comparative bar charts
  const periodSales = Number(kpis.period_sales || 0);
  const periodPurchases = Number(kpis.period_purchases || 0);
  const periodGross = Number(kpis.period_gross_profit || 0);
  const periodNet = Number(kpis.period_net_profit || 0);
  const maxBarVal = Math.max(periodSales, periodPurchases, 1000);

  // Trend series maximum for scale
  const maxTrendVal = Math.max(...trendSeries.map((t: any) => Math.max(t.sales, t.purchases)), 500);

  const topMaxQty = topSelling.length > 0 ? Math.max(...topSelling.map((t: any) => t.total_qty), 1) : 1;
  const custMaxAmount = customerDistribution.length > 0 ? Math.max(...customerDistribution.map((c: any) => c.total_amount), 1) : 1;

  return (
    <div className="space-y-4">
      {/* Top Banner, Time Range Switcher & Refresh */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white uppercase font-mono tracking-tight flex items-center gap-2">
            <span>Financial Dashboard & Inventory Analytics</span>
            <span className="text-[10px] font-bold px-2 py-0.5 border border-slate-900 dark:border-slate-600 bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300">
              {rangeInfo.range_label || 'Current Period'}
            </span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Real-time double-entry ledgers, FIFO gross margin, and provisional net profit
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border-1.5 border-slate-900 dark:border-slate-600 rounded text-xs font-bold text-slate-900 dark:text-slate-100 brutalist-btn cursor-pointer self-start md:self-auto"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Live</span>
        </button>
      </div>

      {/* Dynamic Period Selector Ribbon */}
      <div className="bg-white dark:bg-slate-900 p-2 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-bold text-slate-500 uppercase mr-1 text-[11px]">Period:</span>
          {[
            { id: 'daily', label: 'Today' },
            { id: 'weekly', label: 'Last 7 Days' },
            { id: 'monthly', label: 'This Month' },
            { id: 'quarterly', label: 'This Quarter' },
            { id: 'yearly', label: 'FY 2026-27' },
            { id: 'custom', label: 'Custom Range' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTimeRange(tab.id)}
              className={`px-2.5 py-1 text-xs font-bold border transition cursor-pointer ${
                timeRange === tab.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-900 dark:border-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {timeRange === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">From:</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-2 py-0.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
            />
            <span className="font-bold text-slate-700 dark:text-slate-300">To:</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-2 py-0.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
            />
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {/* Selected Period Sales */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-bold text-slate-700 dark:text-slate-300 truncate">Period Billed Sales</span>
            <span className="p-1 border border-blue-900 dark:border-blue-600 bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300">
              <ShoppingBag size={13} />
            </span>
          </div>
          <div className="text-base font-black text-slate-900 dark:text-white font-mono">
            ₹{periodSales?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            Today: <b className="text-slate-900 dark:text-slate-200">₹{kpis.today_sales?.toLocaleString('en-IN') || '0'}</b>
          </div>
        </div>

        {/* Selected Period Purchases */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-bold text-slate-700 dark:text-slate-300 truncate">Period Purchases</span>
            <span className="p-1 border border-indigo-900 dark:border-indigo-600 bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-300">
              <Package size={13} />
            </span>
          </div>
          <div className="text-base font-black text-slate-900 dark:text-white font-mono">
            ₹{periodPurchases?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            Today: <b className="text-slate-900 dark:text-slate-200">₹{kpis.today_purchases?.toLocaleString('en-IN') || '0'}</b>
          </div>
        </div>

        {/* Selected Period Gross Profit */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-bold text-slate-700 dark:text-slate-300 truncate">Gross Margin (FIFO)</span>
            <span className="p-1 border border-emerald-900 dark:border-emerald-600 bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300">
              <TrendingUp size={13} />
            </span>
          </div>
          <div className="text-base font-black text-emerald-700 dark:text-emerald-400 font-mono">
            ₹{periodGross?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            {periodSales > 0 ? `${((periodGross / periodSales) * 100).toFixed(1)}% Gross Margin` : 'COGS FIFO Costed'}
          </div>
        </div>

        {/* Selected Period Net Profit */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-bold text-slate-700 dark:text-slate-300 truncate">Period Net Profit</span>
            <span className="p-1 border border-teal-900 dark:border-teal-600 bg-teal-100 dark:bg-teal-950 text-teal-900 dark:text-teal-300">
              <DollarSign size={13} />
            </span>
          </div>
          <div className={`text-base font-black font-mono ${periodNet >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'}`}>
            ₹{periodNet?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            Operating: ₹{kpis.period_expenses?.toFixed(2) || '0.00'} Overheads
          </div>
        </div>

        {/* Customer Receivables */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-bold text-slate-700 dark:text-slate-300 truncate">Customer Receivables</span>
            <span className="p-1 border border-amber-900 dark:border-amber-600 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300">
              <ArrowUpRight size={13} />
            </span>
          </div>
          <div className="text-base font-black text-amber-700 dark:text-amber-400 font-mono">
            ₹{kpis.total_receivables?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
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
            <span className="font-bold text-slate-700 dark:text-slate-300 truncate">Supplier Payables</span>
            <span className="p-1 border border-rose-900 dark:border-rose-600 bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-300">
              <ArrowDownRight size={13} />
            </span>
          </div>
          <div className="text-base font-black text-rose-700 dark:text-rose-400 font-mono">
            ₹{kpis.total_payables?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
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
            <span className="font-bold text-slate-700 dark:text-slate-300 truncate">Stock Valuation</span>
            <span className="p-1 border border-purple-900 dark:border-purple-600 bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-300">
              <Package size={13} />
            </span>
          </div>
          <div className="text-base font-black text-purple-900 dark:text-purple-300 font-mono">
            ₹{kpis.current_inventory_value?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            {kpis.total_products || 0} Products ({kpis.total_stock_qty || 0} Units)
          </div>
        </div>

        {/* Inventory Health & Expiry Alerts */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-bold text-slate-700 dark:text-slate-300 truncate">Inventory Alerts</span>
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

      {/* Interactive Charts Section: Timeline Trend & Fast-Moving Medicines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
        {/* Chart 1: Interactive Multi-Point Timeline Trend */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
          <div className="flex items-center justify-between border-b-1.5 border-slate-900 dark:border-slate-700 pb-2 mb-3">
            <h3 className="font-black text-slate-900 dark:text-white uppercase font-mono flex items-center gap-1.5 text-xs">
              <BarChart2 size={15} className="text-blue-600 dark:text-blue-400" />
              Periodic Cash Flow & Sales Movement
            </h3>
            <span className="text-[10px] font-mono text-slate-500">Hover bars for details</span>
          </div>

          {trendSeries.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-mono">No data points in this period.</div>
          ) : (
            <div className="space-y-3">
              {/* Interactive Multi-Column Bar Chart */}
              <div className="h-44 flex items-end gap-1.5 pt-4 pb-2 px-1 border-b border-slate-300 dark:border-slate-700 overflow-x-auto">
                {trendSeries.map((t: any, idx: number) => {
                  const sHeight = Math.max(4, Math.round((t.sales / maxTrendVal) * 120));
                  const pHeight = Math.max(4, Math.round((t.purchases / maxTrendVal) * 120));
                  return (
                    <div
                      key={idx}
                      className="flex-1 min-w-[20px] flex flex-col items-center justify-end h-full group cursor-pointer"
                      onMouseEnter={() =>
                        setActiveTooltip(
                          `${t.label} | Sales: ₹${t.sales.toFixed(2)} | Purchases: ₹${t.purchases.toFixed(2)} | Profit: ₹${t.profit.toFixed(2)}`
                        )
                      }
                      onMouseLeave={() => setActiveTooltip(null)}
                    >
                      <div className="flex items-end gap-0.5 w-full justify-center">
                        {/* Sales bar */}
                        <div
                          className="w-2.5 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 transition"
                          style={{ height: `${sHeight}px` }}
                          title={`Sales: ₹${t.sales.toFixed(2)}`}
                        />
                        {/* Purchase bar */}
                        <div
                          className="w-2.5 bg-indigo-500 dark:bg-indigo-400 hover:bg-indigo-600 transition"
                          style={{ height: `${pHeight}px` }}
                          title={`Purchases: ₹${t.purchases.toFixed(2)}`}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 truncate w-full text-center mt-1">
                        {t.label.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Chart Legend */}
              <div className="flex items-center justify-between font-mono text-[11px] pt-1">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-blue-700 dark:text-blue-400 font-bold">
                    <span className="w-2.5 h-2.5 bg-blue-600 dark:bg-blue-500 inline-block" /> Sales
                  </span>
                  <span className="flex items-center gap-1 text-indigo-700 dark:text-indigo-400 font-bold">
                    <span className="w-2.5 h-2.5 bg-indigo-500 dark:bg-indigo-400 inline-block" /> Purchases
                  </span>
                </div>
                <span className="text-slate-500 text-[10px]">
                  Peak: ₹{maxTrendVal.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Tooltip Display Box */}
              <div className="min-h-[28px] p-1.5 border border-slate-900 dark:border-slate-700 bg-amber-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-center text-[11px]">
                {activeTooltip || 'Hover over any timeline column to inspect detailed numbers'}
              </div>
            </div>
          )}
        </div>

        {/* Chart 2: Fast-Moving Medicines Velocity */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
          <div className="flex items-center justify-between border-b-1.5 border-slate-900 dark:border-slate-700 pb-2 mb-3">
            <h3 className="font-black text-slate-900 dark:text-white uppercase font-mono flex items-center gap-1.5 text-xs">
              <TrendingUp size={15} className="text-emerald-600 dark:text-emerald-400" />
              Fast-Moving Medicines Velocity ({rangeInfo.range_label})
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
                No medicine sales recorded in this period. Dispensed units will appear here automatically.
              </div>
            ) : (
              topSelling.map((prod: any, idx: number) => {
                const pct = Math.min(100, (prod.total_qty / topMaxQty) * 100);
                return (
                  <div
                    key={idx}
                    className="space-y-1 cursor-pointer group"
                    onMouseEnter={() =>
                      setActiveTooltip(
                        `${prod.product_name} | Qty Dispensed: ${prod.total_qty} units | Total Sales: ₹${prod.total_sales.toFixed(2)}`
                      )
                    }
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="font-bold text-slate-900 dark:text-white truncate max-w-[220px]">
                        {idx + 1}. {prod.product_name}
                      </span>
                      <span className="font-bold text-blue-700 dark:text-blue-400">
                        {prod.total_qty} Units (₹{prod.total_sales.toFixed(2)})
                      </span>
                    </div>
                    <div className="h-4 bg-slate-100 dark:bg-slate-800 border border-slate-900 dark:border-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 dark:bg-emerald-500 group-hover:bg-emerald-700 transition-all duration-300"
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

      {/* Two-Column Section: Top Customers & Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
        {/* Customer-wise Sales Distribution */}
        <div className="bg-white dark:bg-slate-900 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card overflow-hidden">
          <div className="px-4 py-2.5 border-b-1.5 border-slate-900 dark:border-slate-700 flex items-center justify-between bg-slate-200 dark:bg-slate-800">
            <h3 className="font-black text-slate-900 dark:text-white uppercase font-mono flex items-center gap-1.5">
              <Users size={15} className="text-blue-600 dark:text-blue-400" />
              Top Customer Distribution ({rangeInfo.range_label})
            </h3>
            <button
              onClick={() => setActiveTab('customers')}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline font-mono text-[11px] cursor-pointer"
            >
              All Customers &rarr;
            </button>
          </div>
          <div className="p-3 font-mono space-y-2.5">
            {customerDistribution.length === 0 ? (
              <div className="py-6 text-center text-slate-400 font-mono">
                No customer transactions recorded in this period.
              </div>
            ) : (
              customerDistribution.map((cust: any, idx: number) => {
                const custPct = (cust.total_amount / custMaxAmount) * 100;
                return (
                  <div
                    key={idx}
                    className="space-y-1 cursor-pointer"
                    onMouseEnter={() =>
                      setActiveTooltip(
                        `${cust.customer_name} | Invoices: ${cust.invoice_count} | Total Amount: ₹${cust.total_amount.toFixed(2)}`
                      )
                    }
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <div className="flex justify-between text-[11px]">
                      <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                        {idx + 1}. {cust.customer_name}
                      </span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold">
                        ₹{cust.total_amount.toFixed(2)} ({cust.invoice_count} bills)
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 border border-slate-900 dark:border-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-300"
                        style={{ width: `${custPct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Expense Category Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card overflow-hidden">
          <div className="px-4 py-2.5 border-b-1.5 border-slate-900 dark:border-slate-700 flex items-center justify-between bg-slate-200 dark:bg-slate-800">
            <h3 className="font-black text-slate-900 dark:text-white uppercase font-mono flex items-center gap-1.5">
              <PieChart size={15} className="text-amber-600 dark:text-amber-400" />
              Operating Expenses ({rangeInfo.range_label})
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
                No business expenses booked in this period. Total: ₹0.00
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
