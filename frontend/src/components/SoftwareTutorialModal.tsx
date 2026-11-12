import React, { useState } from 'react';
import {
  HelpCircle, ChevronRight, ChevronLeft, X, ShoppingCart,
  PackagePlus, Boxes, Pill, Users, Truck, FileSpreadsheet,
  TrendingUp, CreditCard, ShieldCheck, Database, ArrowRight,
  BookOpen, RotateCcw, AlertTriangle, CheckCircle2
} from 'lucide-react';
import type { NavItem } from './Sidebar';

interface SoftwareTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab: (tab: NavItem) => void;
}

interface TutorialStep {
  id: string;
  title: string;
  navTarget: NavItem;
  icon: any;
  color: string;
  summary: string;
  highlights: string[];
  pharmaceuticalTip: string;
  stepGuide: { stepNumber: string; action: string; detail: string }[];
}

export const SoftwareTutorialModal: React.FC<SoftwareTutorialModalProps> = ({
  isOpen,
  onClose,
  setActiveTab
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const tutorialSteps: TutorialStep[] = [
    {
      id: 'overview',
      title: '1. Wholesale Business Workflow Overview',
      navTarget: 'dashboard',
      icon: TrendingUp,
      color: 'blue',
      summary: 'Param Pharma is a centralized, offline-first Pharmaceutical Wholesale Management System designed for distributors in India. Every transaction updates inventory, customer accounts, and profit & loss automatically in real-time.',
      highlights: [
        'Centralized SQLite Database: Zero cloud dependencies, works 100% offline.',
        'ACID-compliant transactions: No data corruption during power cuts or system restarts.',
        'All Dashboard KPIs come from real database records (no fake or hardcoded values).'
      ],
      pharmaceuticalTip: 'Wholesale Rule: Never calculate profit as (Total Sales - Total Purchases). Unsold purchases remain in stock as assets. Real profit requires Cost of Goods Sold (COGS).',
      stepGuide: [
        { stepNumber: '1', action: 'Inward Purchases', detail: 'Receive medicine batches from manufacturers/C&F agents with purchase bills.' },
        { stepNumber: '2', action: 'Dispense via Sales Counter', detail: 'Bill medical stores, doctors, and hospitals using FEFO expiry recommendations.' },
        { stepNumber: '3', action: 'Settle Accounts', detail: 'Issue customer receipts & supplier vouchers to maintain ledger running balances.' },
        { stepNumber: '4', action: 'Review Profit & Taxes', detail: 'Inspect FIFO-costed Gross & Net Profit, and reconcile GST Outward vs Input Tax Credit.' }
      ]
    },
    {
      id: 'products',
      title: '2. Central Pharmaceutical Product Master',
      navTarget: 'products',
      icon: Pill,
      color: 'emerald',
      summary: 'Maintain a single product master for all medicines, syrups, injections, and ointments. Product information (generic salt, HSN, manufacturer, GST rate) is strictly separated from batch information.',
      highlights: [
        'Separates Product Master from Batch records: A medicine can have multiple batches with varying expiry dates and costs.',
        'Pre-configured GST tax rates: 0%, 5% (Insulin/Essential), 12% (Standard Formulations), 18% (Disinfectants/Devices).',
        'Built-in batch viewer: Inspect all active batches and total physical stock in strips/boxes/vials.'
      ],
      pharmaceuticalTip: 'Mandatory Compliance: Always specify the 8-digit HSN code (e.g., 30049099) and unit of measurement for valid GST invoices under Indian law.',
      stepGuide: [
        { stepNumber: '1', action: 'Open Product Master', detail: 'Click "Product Master" from sidebar or press the button below.' },
        { stepNumber: '2', action: 'Click Add Medicine', detail: 'Enter Brand Name, Generic Composition, Manufacturer, Packing, and default PTR/MRP.' },
        { stepNumber: '3', action: 'View Batches', detail: 'Click "View Batches" on any product row to see its active batches and quantities.' }
      ]
    },
    {
      id: 'customers',
      title: '3. Customer Management & Quick On-the-Fly Registration',
      navTarget: 'customers',
      icon: Users,
      color: 'indigo',
      summary: 'Manage all categories of pharmaceutical buyers: Chemists, Doctors, Medical Stores, Retailers, Wholesalers, Hospitals, and Nursing Homes. You can register new parties even while typing a sales bill!',
      highlights: [
        'Complete profiles with Drug License Numbers (20B/21B), GSTIN, and credit limits.',
        'Quick Customer [F3]: Create a new customer directly from the sales invoice screen without losing your entered items.',
        'Integrated Ledger & Sales History: View all previous bills, collections, and outstanding balance per party.'
      ],
      pharmaceuticalTip: 'Legal Requirement: Under the Drugs & Cosmetics Act, scheduled drugs can only be sold to parties holding a valid Drug License (DL) Number.',
      stepGuide: [
        { stepNumber: '1', action: 'Add or Search Customer', detail: 'Search by party name, mobile number, or GSTIN.' },
        { stepNumber: '2', action: 'Assign Credit Terms', detail: 'Set payment terms (e.g. 21 Days) and credit limits to prevent overdue debt exposure.' },
        { stepNumber: '3', action: 'Inspect Customer Ledger', detail: 'Click the Eye icon to view total lifetime sales, payments, and detailed account statement.' }
      ]
    },
    {
      id: 'purchases',
      title: '4. Purchase Billing & Multi-Batch Stock Inward',
      navTarget: 'purchase-billing',
      icon: PackagePlus,
      color: 'purple',
      summary: 'Inward consignments received from pharmaceutical manufacturers and C&F distributors. Entering a purchase invoice automatically creates or updates product batches, increases stock, and credits the supplier ledger.',
      highlights: [
        'Duplicate Bill Protection: Blocks accidentally entering the same supplier invoice number twice.',
        'Multi-Batch Inward: Enter batch numbers, manufacturing dates, and expiry dates per item.',
        'Scheme Free Units: Record free units received (e.g. 100 + 10 Free). Free units enter available inventory at zero cost, lowering average batch cost.'
      ],
      pharmaceuticalTip: 'Accounts Payable: Finalizing a purchase bill automatically credits the supplier ledger, creating an accounts payable record.',
      stepGuide: [
        { stepNumber: '1', action: 'Select Supplier', detail: 'Choose manufacturer or distributor from dropdown (credit terms load automatically).' },
        { stepNumber: '2', action: 'Enter Supplier Bill Number', detail: 'Type original supplier invoice number and purchase date.' },
        { stepNumber: '3', action: 'Add Medicines & Batches', detail: 'Specify batch number, expiry date, purchase rate, PTR, MRP, quantity, and scheme free units.' },
        { stepNumber: '4', action: 'Finalize Entry', detail: 'Click "Finalize Purchase & Inward Stock" to update inventory and supplier payable balance.' }
      ]
    },
    {
      id: 'sales',
      title: '5. Sales Billing Counter & FEFO Batch Engine (F2)',
      navTarget: 'sales-billing',
      icon: ShoppingCart,
      color: 'blue',
      summary: 'High-speed billing counter optimized for busy wholesale counters. Press F2 anytime to jump here. Features automated FEFO batch suggestion, scheme free units, GST math, and instant A4 PDF invoice printing.',
      highlights: [
        'FEFO Engine (First Expiry First Out): Suggests the batch with the earliest valid expiry date automatically.',
        'Expiry Violation Warning: Warns immediately if a user selects a batch with later expiry while an earlier batch is available.',
        'Pharmaceutical Scheme Billing: Supports 10+1 free, 20+2 free, etc. Free items are billed at ₹0 but deducted from inventory.',
        'Intra vs Inter-State GST: Applies CGST+SGST for local Gujarat parties; switches to IGST for out-of-state buyers (e.g. Maharashtra).'
      ],
      pharmaceuticalTip: 'Expiry Safety: The system strictly prevents dispensing expired drugs unless an authorized override checkbox is explicitly enabled.',
      stepGuide: [
        { stepNumber: '1', action: 'Press F2 to Start Bill', detail: 'Select customer from list or press F3 for Quick Customer Registration.' },
        { stepNumber: '2', action: 'Type Medicine Name', detail: 'Instant search brings up medicine; system auto-picks earliest expiry batch.' },
        { stepNumber: '3', action: 'Enter Quantity & Free Scheme', detail: 'Enter billed qty, scheme free qty (if applicable), and discount percentage.' },
        { stepNumber: '4', action: 'Choose Payment Mode', detail: 'Select Credit (adds to customer ledger) or Cash/Bank/UPI (records instant receipt).' },
        { stepNumber: '5', action: 'Finalize & Print Invoice', detail: 'Click to finalize: stock is deducted, ledger is posted, and A4 GST PDF invoice downloads.' }
      ]
    },
    {
      id: 'inventory',
      title: '6. Batch-wise Inventory & Expiry Alerts',
      navTarget: 'inventory',
      icon: Boxes,
      color: 'amber',
      summary: 'Track physical stock at batch level with automated expiry alerts categorized into: Already Expired, Within 30 Days, Within 60 Days, and Within 90 Days.',
      highlights: [
        'Automatic Alert Tabs: View near-expiry stock so you can liquidate or return goods to manufacturers in time.',
        'Physical Stock Adjustment: Increase or decrease batch quantities with audit reasons (Scrap Expired, Damage Write-off, Physical Audit).',
        'Excel Stock Valuation: Download complete stock valuation at purchase cost with one click.'
      ],
      pharmaceuticalTip: 'Loss Prevention: Check the "Expiring in <= 60 Days" tab every Monday to issue credit returns or promote priority FEFO sales.',
      stepGuide: [
        { stepNumber: '1', action: 'Review Expiry Alerts', detail: 'Click on the alert cards (Expired, <=30d, <=60d) to filter stock.' },
        { stepNumber: '2', action: 'Adjust Physical Stock', detail: 'Click "Adjust Stock" on any batch to write off breakage or record stock corrections.' },
        { stepNumber: '3', action: 'Export Valuation Report', detail: 'Click "Export Excel" to save a formatted spreadsheet with total inventory value.' }
      ]
    },
    {
      id: 'registers',
      title: '7. Dedicated Sales & Purchase Registers',
      navTarget: 'sales-register',
      icon: FileSpreadsheet,
      color: 'emerald',
      summary: 'Audit-ready registers recording every finalized sales invoice and purchase bill with taxable amount, CGST, SGST, IGST, total bill, paid amount, and outstanding balances.',
      highlights: [
        'Date range filtering: Daily, monthly, yearly, or custom date ranges.',
        'Instant search: Locate any bill by invoice number, party name, or GSTIN.',
        'Excel Export: Download audit-ready spreadsheets formatted with bold headers, currency formatting, and totals.'
      ],
      pharmaceuticalTip: 'Accounting Harmony: Use these registers for monthly GST reconciliation and CA audit submissions.',
      stepGuide: [
        { stepNumber: '1', action: 'Filter by Date', detail: 'Select From Date and To Date to view period transactions.' },
        { stepNumber: '2', action: 'Inspect Summary Row', detail: 'Footer calculates total taxable sales, total GST collected, and outstanding balance.' },
        { stepNumber: '3', action: 'Download Invoice PDF', detail: 'Click the Printer icon in any row to re-download the original tax invoice PDF.' }
      ]
    },
    {
      id: 'returns',
      title: '8. Returns Management & Inspection Approval (CN / DN)',
      navTarget: 'sales-returns',
      icon: RotateCcw,
      color: 'rose',
      summary: 'Dedicated return modules supporting expired, damaged, and patient-returned goods with Credit Notes (CN) and Debit Notes (DN).',
      highlights: [
        'Inspection-Gated Sales Returns: Returned goods do NOT re-enter sellable stock automatically. Quality inspection is required.',
        'Sellable vs Damaged: Only items marked "Sellable" are restored to active inventory upon approval.',
        'Debit Notes (Purchase Returns): Deduct stock immediately and reduce payable balance to the supplier.'
      ],
      pharmaceuticalTip: 'Inspection Protocol: Prevents counterfeit, adulterated, or expired medicine from accidentally returning to sellable inventory without pharmacist sign-off.',
      stepGuide: [
        { stepNumber: '1', action: 'Record Sales Return', detail: 'Select customer, original invoice number, and medicine batches.' },
        { stepNumber: '2', action: 'Inspect Returned Stock', detail: 'Mark condition as Sellable, Damaged, or Expired.' },
        { stepNumber: '3', action: 'Approve Inspection', detail: 'Click "Approve & Credit": Credit Note is posted to customer ledger and sellable stock is restored.' }
      ]
    },
    {
      id: 'ledgers',
      title: '9. Ledgers, Statements of Account & Payment Vouchers',
      navTarget: 'customer-ledger',
      icon: BookOpen,
      color: 'teal',
      summary: 'Double-entry transactional accounting tracking every customer and supplier. View running balances, print statements of account, and record payment collections or disbursements.',
      highlights: [
        'Customer Ledger: Debits increase customer debt (Sales Invoices). Credits decrease debt (Payments, Credit Notes).',
        'Supplier Ledger: Credits increase payable (Purchase Invoices). Debits decrease payable (Payments, Debit Notes).',
        'Payment Vouchers: Record Cash, Bank Transfer (NEFT/RTGS), UPI, and Cheque with UTR references.'
      ],
      pharmaceuticalTip: 'Aging Control: Regularly review customer closing balances to ensure parties remain within their approved credit periods (e.g. 21 days).',
      stepGuide: [
        { stepNumber: '1', action: 'Select Party', detail: 'Choose any customer or supplier from the dropdown to see their live statement.' },
        { stepNumber: '2', action: 'Record Payment', detail: 'Go to Payment Vouchers to record collection receipts or supplier payments.' },
        { stepNumber: '3', action: 'Verify Running Balance', detail: 'Check the balance column to confirm all debits and credits match payments.' }
      ]
    },
    {
      id: 'pnl',
      title: '10. Mathematically Accurate Profit & Loss (FIFO Costed)',
      navTarget: 'profit-loss',
      icon: TrendingUp,
      color: 'emerald',
      summary: 'Automated business profit calculation respecting standard accounting principles: Net Sales &minus; FIFO Cost of Goods Sold (COGS) &minus; Business Expenses = Net Profit.',
      highlights: [
        'FIFO Costing: Uses batch-specific purchase rates of medicines actually sold. Unsold stock is NOT counted as an expense.',
        'Operating Overhead Deduction: Deducts business expenses across 18 predefined categories (Salary, Rent, Transport, etc.).',
        'Product-wise Margins: Ranks every medicine by gross profit and displays profit margin percentage.'
      ],
      pharmaceuticalTip: 'GST Distinction: GST collected on sales is a government tax liability and is never treated as sales revenue. GST paid on purchases is an ITC asset, not an expense.',
      stepGuide: [
        { stepNumber: '1', action: 'Select Date Range', detail: 'Filter P&L by today, this month, or current financial year.' },
        { stepNumber: '2', action: 'Inspect Net Sales & COGS', detail: 'Review Net Sales Revenue, FIFO Cost of Goods Sold, and Gross Profit margin.' },
        { stepNumber: '3', action: 'Switch to Product Margins', detail: 'Click "Product-wise Margins" to identify your most profitable medicines.' }
      ]
    },
    {
      id: 'gst',
      title: '11. GST Reports & Input Tax Credit (ITC) Reconciliation',
      navTarget: 'gst-reports',
      icon: FileSpreadsheet,
      color: 'blue',
      summary: 'Track outward GST liability (GSTR-1) against eligible Input Tax Credit (ITC from purchases) to determine net payable tax or excess credit to carry forward.',
      highlights: [
        'Output Tax Breakdown: CGST, SGST, and IGST collected from sales.',
        'Input Tax Credit (ITC): Total GST paid on inward purchases eligible for credit offset.',
        'Net Tax Liability: Calculates actual cash payable to the government after adjusting ITC.'
      ],
      pharmaceuticalTip: 'Tax Filing: Use this report on the 10th and 20th of every month for filing GSTR-1 and GSTR-3B with your tax consultant.',
      stepGuide: [
        { stepNumber: '1', action: 'Select Month', detail: 'Choose the filing period to aggregate tax totals.' },
        { stepNumber: '2', action: 'Check Net Tax Liability', detail: 'Green indicates excess ITC carry forward; red indicates net payable tax.' }
      ]
    },
    {
      id: 'backup',
      title: '12. Offline Reliability, Settings & Hot Database Backups',
      navTarget: 'settings',
      icon: Database,
      color: 'purple',
      summary: 'Configure company information, Drug License numbers (20B, 21B), bank account details, and take hot crash-safe database backups with one click.',
      highlights: [
        'Online Hot SQLite Backups: Creates timestamped snapshots in backend/backups/ without locking or stopping billing.',
        'Pre-Restore Safety Snapshot: Automatically archives current data before restoring an older backup.',
        'Company Branding on Invoices: Updates company name, address, phone, GSTIN, DL, and bank IFSC on all A4 PDF invoices.'
      ],
      pharmaceuticalTip: 'Data Safety: Take a backup every evening before closing the counter. Backups take less than 1 second and require < 2MB disk space.',
      stepGuide: [
        { stepNumber: '1', action: 'Update Company Profile', detail: 'Set your Trading Name, Drug License numbers, and Bank IFSC code.' },
        { stepNumber: '2', action: 'Click Create Backup Now', detail: 'System takes a snapshot immediately without interrupting users.' },
        { stepNumber: '3', action: 'One-Click Restore', detail: 'Restore any previous database snapshot whenever needed.' }
      ]
    }
  ];

  const currentStep = tutorialSteps[currentStepIndex];
  const StepIcon = currentStep.icon;

  const handleNext = () => {
    if (currentStepIndex < tutorialSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleJumpToModule = (target: NavItem) => {
    setActiveTab(target);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
              <HelpCircle size={17} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Param Pharma ERP — Interactive Software Walkthrough</h2>
              <span className="text-[11px] text-slate-400">Step {currentStepIndex + 1} of {tutorialSteps.length} &bull; Complete Operations Guide</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white rounded-md p-1 hover:bg-slate-800 transition cursor-pointer"
            title="Close Tutorial (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body with Two Columns */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden text-xs">
          {/* Left Column: Table of Contents / Step Jump List */}
          <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-2 overflow-y-auto space-y-1 shrink-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1 block">
              Software Modules Tour
            </span>
            {tutorialSteps.map((step, idx) => {
              const Icon = step.icon;
              const isCurrent = idx === currentStepIndex;
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition cursor-pointer ${
                    isCurrent
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-200/70 font-medium'
                  }`}
                >
                  <Icon size={14} className={isCurrent ? 'text-white' : 'text-slate-500'} />
                  <span className="truncate flex-1 text-[11px]">{step.title}</span>
                </button>
              );
            })}

            {/* Keyboard Shortcuts Box */}
            <div className="mt-4 p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-[10px] space-y-1">
              <span className="font-bold text-blue-900 block">Keyboard Shortcuts Cheat Sheet:</span>
              <div className="flex justify-between text-slate-700">
                <span>Sales Billing:</span>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold">F2</kbd>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Quick Customer:</span>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold">F3</kbd>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Close Modals:</span>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold">Esc</kbd>
              </div>
            </div>
          </div>

          {/* Right Column: Step Content */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-white">
            {/* Step Title & Quick Jump Action */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                  <StepIcon size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{currentStep.title}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{currentStep.summary}</p>
                </div>
              </div>

              <button
                onClick={() => handleJumpToModule(currentStep.navTarget)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 shadow-xs transition cursor-pointer text-xs"
                title={`Open ${currentStep.title} in software`}
              >
                <span>Try Module</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* Key Capabilities */}
            <div className="space-y-1.5">
              <span className="font-bold text-slate-800 text-[11px] block">Key Capabilities:</span>
              <ul className="space-y-1.5">
                {currentStep.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-700 leading-relaxed text-xs">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Step-by-Step Practical Instructions */}
            <div className="space-y-2">
              <span className="font-bold text-slate-800 text-[11px] block">How to Use (Step-by-Step):</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentStep.stepGuide.map((s, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {s.stepNumber}
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 block text-xs">{s.action}</span>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{s.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pharmaceutical Wholesale Compliance Tip Callout */}
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-900 text-xs block">Pharmaceutical Wholesale Rule:</span>
                <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                  {currentStep.pharmaceuticalTip}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer with Stepper Controls */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-700 font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs"
          >
            <ChevronLeft size={14} />
            Previous Module
          </button>

          {/* Stepper Dots */}
          <div className="flex items-center gap-1.5">
            {tutorialSteps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStepIndex(i)}
                className={`w-2.5 h-2.5 rounded-full transition cursor-pointer ${
                  i === currentStepIndex ? 'bg-blue-600 w-5' : 'bg-slate-300 hover:bg-slate-400'
                }`}
                title={`Go to Step ${i + 1}`}
              />
            ))}
          </div>

          {currentStepIndex < tutorialSteps.length - 1 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-3.5 py-1.5 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition cursor-pointer text-xs"
            >
              Next Module
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={() => handleJumpToModule('sales-billing')}
              className="flex items-center gap-1 px-4 py-1.5 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700 transition cursor-pointer text-xs shadow-xs"
            >
              Start Billing Counter [F2]
              <ShoppingCart size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
