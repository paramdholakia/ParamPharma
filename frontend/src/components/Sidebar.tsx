import React from 'react';
import {
  LayoutDashboard, Users, Truck, Pill, ShoppingCart, PackagePlus,
  Boxes, FileSpreadsheet, ClipboardList, RotateCcw, CornerUpLeft,
  BookOpen, BookMarked, CreditCard, Receipt, FileText,
  TrendingUp, BarChart3, Settings, ChevronLeft, ChevronRight, HelpCircle
} from 'lucide-react';

export type NavItem =
  | 'dashboard'
  | 'customers'
  | 'suppliers'
  | 'products'
  | 'sales-billing'
  | 'purchase-billing'
  | 'inventory'
  | 'sales-register'
  | 'purchase-register'
  | 'sales-returns'
  | 'purchase-returns'
  | 'customer-ledger'
  | 'supplier-ledger'
  | 'payments'
  | 'expenses'
  | 'gst-reports'
  | 'profit-loss'
  | 'business-reports'
  | 'settings';

interface SidebarProps {
  activeTab: NavItem;
  setActiveTab: (tab: NavItem) => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  onOpenTutorial: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  onOpenTutorial
}) => {
  const navItems = [
    { id: 'dashboard' as NavItem, label: 'Dashboard', icon: LayoutDashboard, group: 'CORE' },
    { id: 'sales-billing' as NavItem, label: 'Sales Billing', icon: ShoppingCart, group: 'OPERATIONS', highlight: true },
    { id: 'purchase-billing' as NavItem, label: 'Purchase Billing', icon: PackagePlus, group: 'OPERATIONS' },
    { id: 'inventory' as NavItem, label: 'Inventory & Expiry', icon: Boxes, group: 'OPERATIONS' },
    { id: 'products' as NavItem, label: 'Product Master', icon: Pill, group: 'DIRECTORY' },
    { id: 'customers' as NavItem, label: 'Customers', icon: Users, group: 'DIRECTORY' },
    { id: 'suppliers' as NavItem, label: 'Suppliers', icon: Truck, group: 'DIRECTORY' },
    { id: 'sales-register' as NavItem, label: 'Sales Register', icon: FileSpreadsheet, group: 'REGISTERS' },
    { id: 'purchase-register' as NavItem, label: 'Purchase Register', icon: ClipboardList, group: 'REGISTERS' },
    { id: 'sales-returns' as NavItem, label: 'Sales Returns (CN)', icon: RotateCcw, group: 'RETURNS' },
    { id: 'purchase-returns' as NavItem, label: 'Purchase Returns (DN)', icon: CornerUpLeft, group: 'RETURNS' },
    { id: 'customer-ledger' as NavItem, label: 'Customer Ledger', icon: BookOpen, group: 'FINANCIALS' },
    { id: 'supplier-ledger' as NavItem, label: 'Supplier Ledger', icon: BookMarked, group: 'FINANCIALS' },
    { id: 'payments' as NavItem, label: 'Payment Vouchers', icon: CreditCard, group: 'FINANCIALS' },
    { id: 'expenses' as NavItem, label: 'Business Expenses', icon: Receipt, group: 'FINANCIALS' },
    { id: 'gst-reports' as NavItem, label: 'GST Reports', icon: FileText, group: 'REPORTS' },
    { id: 'profit-loss' as NavItem, label: 'Profit & Loss', icon: TrendingUp, group: 'REPORTS', badge: 'FIFO' },
    { id: 'business-reports' as NavItem, label: 'Business Analytics', icon: BarChart3, group: 'REPORTS' },
    { id: 'settings' as NavItem, label: 'Settings & Backup', icon: Settings, group: 'SYSTEM' },
  ];

  return (
    <aside
      className={`bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-all duration-150 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-slate-800 bg-slate-950">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold text-white text-lg shadow-sm">
              P
            </div>
            <div className="leading-tight truncate">
              <span className="font-bold text-white tracking-wide text-sm block">PARAM PHARMA</span>
              <span className="text-[10px] text-blue-400 font-medium">WHOLESALE ERP</span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 mx-auto rounded bg-blue-600 flex items-center justify-center font-bold text-white text-lg">
            P
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav List with Slim Scrollbar */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-2.5 py-2 rounded text-xs font-medium transition text-left group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : item.highlight
                  ? 'text-blue-300 hover:bg-slate-800 hover:text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon
                size={17}
                className={`shrink-0 ${
                  isActive ? 'text-white' : item.highlight ? 'text-blue-400' : 'text-slate-400 group-hover:text-white'
                }`}
              />
              {!collapsed && (
                <span className="truncate flex-1">{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-800 text-emerald-200 font-semibold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Tutorial Trigger Button */}
      <div className="px-2 py-1.5 border-t border-slate-800">
        <button
          onClick={onOpenTutorial}
          title={collapsed ? 'Software Walkthrough & Tutorial' : undefined}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs font-semibold bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 hover:text-white border border-indigo-800/60 transition cursor-pointer"
        >
          <HelpCircle size={15} className="shrink-0 text-indigo-400" />
          {!collapsed && <span className="truncate">Software Tutorial</span>}
        </button>
      </div>

      {/* Offline Status Footer */}
      <div className="p-2 border-t border-slate-800 bg-slate-950 text-[11px] text-slate-400 flex items-center justify-between">
        {!collapsed ? (
          <>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Offline Ready (WAL)
            </span>
            <span className="text-[10px] text-slate-500">v1.0</span>
          </>
        ) : (
          <span className="w-2 h-2 rounded-full bg-emerald-500 mx-auto" title="Offline Ready (WAL)"></span>
        )}
      </div>
    </aside>
  );
};
