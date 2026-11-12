import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import type { NavItem } from './components/Sidebar';
import { Header } from './components/Header';
import { ToastContainer } from './components/Toast';
import type { ToastMessage } from './components/Toast';
import { SoftwareTutorialModal } from './components/SoftwareTutorialModal';

import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { Suppliers } from './pages/Suppliers';
import { Products } from './pages/Products';
import { SalesBilling } from './pages/SalesBilling';
import { PurchaseBilling } from './pages/PurchaseBilling';
import { Inventory } from './pages/Inventory';
import { SalesRegister } from './pages/SalesRegister';
import { PurchaseRegister } from './pages/PurchaseRegister';
import { SalesReturns } from './pages/SalesReturns';
import { PurchaseReturns } from './pages/PurchaseReturns';
import { CustomerLedger } from './pages/CustomerLedger';
import { SupplierLedger } from './pages/SupplierLedger';
import { Payments } from './pages/Payments';
import { Expenses } from './pages/Expenses';
import { GstReports } from './pages/GstReports';
import { ProfitLoss } from './pages/ProfitLoss';
import { BusinessReports } from './pages/BusinessReports';
import { Settings } from './pages/Settings';
import { apiRequest } from './api/client';

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

  // Poll dashboard alert indicators periodically
  useEffect(() => {
    const checkAlerts = async () => {
      try {
        const res = await apiRequest('/dashboard');
        if (res && res.kpis) {
          setNearExpiryCount(res.kpis.near_expiry_count || 0);
          setLowStockCount(res.kpis.low_stock_count || 0);
        }
      } catch {
        // silent background check
      }
    };
    checkAlerts();
    const interval = setInterval(checkAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-amber-300 selection:text-slate-900">
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

        {/* Dynamic Page Container */}
        <main className="flex-1 overflow-y-auto p-3 md:p-4 bg-slate-100 dark:bg-slate-950">
          <div className="max-w-7xl mx-auto">
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
