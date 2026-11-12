import React, { useState, useEffect, Suspense } from 'react';
import { Sidebar } from './components/Sidebar';
import type { NavItem } from './components/Sidebar';
import { Header } from './components/Header';
import { ToastContainer } from './components/Toast';
import type { ToastMessage } from './components/Toast';
import { SoftwareTutorialModal } from './components/SoftwareTutorialModal';
import { apiRequest } from './api/client';

// Route-level Code Splitting for Ultra-Fast Initial Load & Core 2 Duo Optimization (< 90 kB initial bundle)
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Customers = React.lazy(() => import('./pages/Customers').then(m => ({ default: m.Customers })));
const Suppliers = React.lazy(() => import('./pages/Suppliers').then(m => ({ default: m.Suppliers })));
const Products = React.lazy(() => import('./pages/Products').then(m => ({ default: m.Products })));
const SalesBilling = React.lazy(() => import('./pages/SalesBilling').then(m => ({ default: m.SalesBilling })));
const PurchaseBilling = React.lazy(() => import('./pages/PurchaseBilling').then(m => ({ default: m.PurchaseBilling })));
const Inventory = React.lazy(() => import('./pages/Inventory').then(m => ({ default: m.Inventory })));
const SalesRegister = React.lazy(() => import('./pages/SalesRegister').then(m => ({ default: m.SalesRegister })));
const PurchaseRegister = React.lazy(() => import('./pages/PurchaseRegister').then(m => ({ default: m.PurchaseRegister })));
const SalesReturns = React.lazy(() => import('./pages/SalesReturns').then(m => ({ default: m.SalesReturns })));
const PurchaseReturns = React.lazy(() => import('./pages/PurchaseReturns').then(m => ({ default: m.PurchaseReturns })));
const CustomerLedger = React.lazy(() => import('./pages/CustomerLedger').then(m => ({ default: m.CustomerLedger })));
const SupplierLedger = React.lazy(() => import('./pages/SupplierLedger').then(m => ({ default: m.SupplierLedger })));
const Payments = React.lazy(() => import('./pages/Payments').then(m => ({ default: m.Payments })));
const Expenses = React.lazy(() => import('./pages/Expenses').then(m => ({ default: m.Expenses })));
const GstReports = React.lazy(() => import('./pages/GstReports').then(m => ({ default: m.GstReports })));
const ProfitLoss = React.lazy(() => import('./pages/ProfitLoss').then(m => ({ default: m.ProfitLoss })));
const BusinessReports = React.lazy(() => import('./pages/BusinessReports').then(m => ({ default: m.BusinessReports })));
const Settings = React.lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));

// Ultra-lightweight Loading Skeleton (Zero layout shift, zero CPU spinning)
const PageSkeleton: React.FC = () => (
  <div className="w-full space-y-4 animate-pulse p-2">
    <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
      <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
      <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
      <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
    </div>
    <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded"></div>
  </div>
);

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavItem>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Dark Mode Theme State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('param_pharma_theme');
    return saved === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('param_pharma_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('param_pharma_theme', 'light');
    }
  }, [darkMode]);

  // Tutorial state: defaults to FALSE so it never interrupts on entry
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);

  const [nearExpiryCount, setNearExpiryCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Keyboard shortcut: F2 to jump to Sales Billing
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('sales-billing');
        showToast('Switched to Sales Billing Counter [F2]', 'info');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Event-driven alert indicator check (on initial load and when window regains focus)
  // Eliminates continuous 30-second setInterval polling to keep Intel Core 2 Duo CPU idle
  useEffect(() => {
    let isMounted = true;
    const checkAlerts = async () => {
      try {
        const res = await apiRequest('/dashboard');
        if (isMounted && res && res.kpis) {
          setNearExpiryCount(res.kpis.near_expiry_count || 0);
          setLowStockCount(res.kpis.low_stock_count || 0);
        }
      } catch {
        // silent background check
      }
    };
    checkAlerts();
    const handleFocus = () => {
      checkAlerts();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-amber-300 selection:text-slate-900 font-sans">
      {/* 19-Module Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        onOpenTutorial={() => setIsTutorialOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar */}
        <Header
          setActiveTab={setActiveTab}
          nearExpiryCount={nearExpiryCount}
          lowStockCount={lowStockCount}
          onOpenTutorial={() => setIsTutorialOpen(true)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />

        {/* Dynamic Page Container with Suspense Code-Splitting */}
        <main className="flex-1 overflow-y-auto p-3 md:p-4 bg-slate-100 dark:bg-slate-950">
          <div className="max-w-7xl mx-auto">
            <Suspense fallback={<PageSkeleton />}>
              {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} showToast={showToast} />}
              {activeTab === 'customers' && <Customers showToast={showToast} />}
              {activeTab === 'suppliers' && <Suppliers showToast={showToast} />}
              {activeTab === 'products' && <Products showToast={showToast} />}
              {activeTab === 'sales-billing' && <SalesBilling showToast={showToast} />}
              {activeTab === 'purchase-billing' && <PurchaseBilling showToast={showToast} />}
              {activeTab === 'inventory' && <Inventory showToast={showToast} />}
              {activeTab === 'sales-register' && <SalesRegister showToast={showToast} />}
              {activeTab === 'purchase-register' && <PurchaseRegister showToast={showToast} />}
              {activeTab === 'sales-returns' && <SalesReturns showToast={showToast} />}
              {activeTab === 'purchase-returns' && <PurchaseReturns showToast={showToast} />}
              {activeTab === 'customer-ledger' && <CustomerLedger showToast={showToast} />}
              {activeTab === 'supplier-ledger' && <SupplierLedger showToast={showToast} />}
              {activeTab === 'payments' && <Payments showToast={showToast} />}
              {activeTab === 'expenses' && <Expenses showToast={showToast} />}
              {activeTab === 'gst-reports' && <GstReports showToast={showToast} />}
              {activeTab === 'profit-loss' && <ProfitLoss showToast={showToast} />}
              {activeTab === 'business-reports' && <BusinessReports showToast={showToast} />}
              {activeTab === 'settings' && <Settings showToast={showToast} />}
            </Suspense>
          </div>
        </main>
      </div>

      {/* Interactive Software Walkthrough Tutorial Modal (Only shown on explicit button click) */}
      <SoftwareTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        setActiveTab={setActiveTab}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default App;
