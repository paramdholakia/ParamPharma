import React, { useEffect, useState } from 'react';
import { ShoppingCart, PackagePlus, AlertTriangle, ShieldCheck, HelpCircle, Sun, Moon, Cloud, CloudOff } from 'lucide-react';
import type { NavItem } from './Sidebar';
import { apiRequest } from '../api/client';

interface HeaderProps {
  setActiveTab: (tab: NavItem) => void;
  nearExpiryCount: number;
  lowStockCount: number;
  onOpenTutorial: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  setActiveTab,
  nearExpiryCount,
  lowStockCount,
  onOpenTutorial,
  darkMode,
  setDarkMode,
}) => {
  const [cloudStatus, setCloudStatus] = useState<{ connected: boolean; cluster: string; latency_ms: number } | null>(null);

  useEffect(() => {
    apiRequest('/cloud/status')
      .then((res) => setCloudStatus(res))
      .catch(() => setCloudStatus({ connected: false, cluster: 'ParamPharmaCluster', latency_ms: 0 }));
  }, []);

  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b-2 border-slate-900 dark:border-slate-700 px-4 flex items-center justify-between shrink-0 transition-colors">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 font-mono">
          PARAM PHARMA
          <span className="text-[10px] font-bold px-2 py-0.5 border border-slate-900 dark:border-slate-500 bg-amber-200 dark:bg-amber-400 text-slate-900">
            FY 2026-27
          </span>
        </h1>
        <span className="hidden lg:inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 border-l border-slate-300 dark:border-slate-700 pl-3">
          <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
          <span>GSTIN Registered &bull; DL 20B/21B Active</span>
        </span>
        {cloudStatus && (
          <span
            className={`hidden xl:inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 border ${
              cloudStatus.connected
                ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                : 'border-slate-400 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title={`MongoDB Atlas: ${cloudStatus.cluster} | Latency: ${cloudStatus.latency_ms}ms`}
          >
            {cloudStatus.connected ? (
              <>
                <Cloud size={12} className="text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold">Atlas: Connected</span>
              </>
            ) : (
              <>
                <CloudOff size={12} />
                <span>Atlas: Offline</span>
              </>
            )}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold border-1.5 border-slate-900 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 brutalist-btn cursor-pointer"
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? (
            <>
              <Sun size={14} className="text-amber-400" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon size={14} className="text-slate-700" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>

        {/* Show Tutorial Button (Explicit User Action - Never pop up automatically on entry) */}
        <button
          onClick={onOpenTutorial}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold border-1.5 border-slate-900 dark:border-slate-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 brutalist-btn cursor-pointer"
          title="Interactive Software Tutorial & User Guide"
        >
          <HelpCircle size={14} className="text-indigo-600 dark:text-indigo-400" />
          <span className="hidden sm:inline">Tutorial</span>
        </button>

        {/* Expiry / Low stock Alert Pills */}
        {(nearExpiryCount > 0 || lowStockCount > 0) && (
          <button
            onClick={() => setActiveTab('inventory')}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold border-1.5 border-amber-600 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 brutalist-btn cursor-pointer"
            title="Click to view Expiry & Low Stock Alerts"
          >
            <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400" />
            <span>
              {nearExpiryCount > 0 && `${nearExpiryCount} Exp`}
              {nearExpiryCount > 0 && lowStockCount > 0 && ' | '}
              {lowStockCount > 0 && `${lowStockCount} Low`}
            </span>
          </button>
        )}

        {/* Quick Action: New Sales Invoice */}
        <button
          onClick={() => setActiveTab('sales-billing')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black border-1.5 border-slate-900 dark:border-slate-600 bg-blue-600 dark:bg-blue-500 text-white brutalist-btn cursor-pointer"
        >
          <ShoppingCart size={14} />
          <span>Billing [F2]</span>
        </button>

        {/* Quick Action: New Purchase Invoice */}
        <button
          onClick={() => setActiveTab('purchase-billing')}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border-1.5 border-slate-900 dark:border-slate-600 bg-slate-900 dark:bg-slate-700 text-white brutalist-btn cursor-pointer"
        >
          <PackagePlus size={14} />
          <span>Purchase Entry</span>
        </button>
      </div>
    </header>
  );
};
