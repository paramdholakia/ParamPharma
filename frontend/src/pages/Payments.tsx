import React, { useEffect, useState } from 'react';
import { CreditCard, Plus, ArrowDownLeft, ArrowUpRight, Printer, Download, FileText, CheckCircle2, X } from 'lucide-react';
import { apiRequest, downloadFile, printPdf } from '../api/client';
import { Modal } from '../components/Modal';
import { formatDate } from '../utils/date';

interface PaymentsProps {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const Payments: React.FC<PaymentsProps> = ({ showToast }) => {
  const [activeTab, setActiveTab] = useState<'customer' | 'supplier'>('customer');
  const [customerPayments, setCustomerPayments] = useState<any[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New Payment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [partyId, setPartyId] = useState<number | ''>('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');
  const [referenceNo, setReferenceNo] = useState('');
  const [bankName, setBankName] = useState('');
  const [notes, setNotes] = useState('');

  // Last Created Voucher Banner (for instant Print & PDF)
  const [lastCreatedVoucher, setLastCreatedVoucher] = useState<{
    type: 'customer' | 'supplier';
    voucher: any;
  } | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const [cp, sp, custs, supps] = await Promise.all([
        apiRequest('/payments/customer?limit=100'),
        apiRequest('/payments/supplier?limit=100'),
        apiRequest('/customers?limit=250'),
        apiRequest('/suppliers?limit=250')
      ]);
      setCustomerPayments(cp || []);
      setSupplierPayments(sp || []);
      setCustomers(custs.customers || []);
      setSuppliers(supps.suppliers || []);
    } catch (err: any) {
      showToast(err.message || 'Error fetching payments', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyId || amount <= 0) {
      showToast('Select party and enter valid amount', 'error');
      return;
    }

    try {
      if (activeTab === 'customer') {
        const res = await apiRequest('/payments/customer', {
          method: 'POST',
          body: JSON.stringify({
            customer_id: Number(partyId),
            amount: Number(amount),
            payment_date: paymentDate,
            payment_mode: paymentMode,
            reference_no: referenceNo,
            bank_name: bankName,
            notes: notes
          })
        });
        showToast(`Customer receipt ${res.payment?.receipt_number || ''} created successfully!`, 'success');
        if (res.payment) {
          setLastCreatedVoucher({ type: 'customer', voucher: res.payment });
        }
      } else {
        const res = await apiRequest('/payments/supplier', {
          method: 'POST',
          body: JSON.stringify({
            supplier_id: Number(partyId),
            amount: Number(amount),
            payment_date: paymentDate,
            payment_mode: paymentMode,
            reference_no: referenceNo,
            bank_name: bankName,
            notes: notes
          })
        });
        showToast(`Supplier payment voucher ${res.payment?.voucher_number || ''} created successfully!`, 'success');
        if (res.payment) {
          setLastCreatedVoucher({ type: 'supplier', voucher: res.payment });
        }
      }

      setIsModalOpen(false);
      setPartyId('');
      setAmount(0);
      setReferenceNo('');
      setBankName('');
      setNotes('');
      fetchPayments();
    } catch (err: any) {
      showToast(err.message || 'Failed to record payment', 'error');
    }
  };

  const handlePrintVoucher = async (payment: any, type: 'customer' | 'supplier' = activeTab) => {
    try {
      const endpoint = type === 'customer'
        ? `/payments/customer/${payment.id}/pdf`
        : `/payments/supplier/${payment.id}/pdf`;
      await printPdf(endpoint);
      showToast(`Opened ${type === 'customer' ? 'Receipt Voucher' : 'Payment Voucher'} for printing`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Print voucher failed', 'error');
    }
  };

  const handleDownloadVoucherPdf = async (payment: any, type: 'customer' | 'supplier' = activeTab) => {
    try {
      if (type === 'customer') {
        const safeNum = (payment.receipt_number || `Receipt_${payment.id}`).replace(/\//g, '_');
        await downloadFile(`/payments/customer/${payment.id}/pdf`, `Receipt_${safeNum}.pdf`);
        showToast(`Downloaded Official Receipt ${payment.receipt_number}`, 'success');
      } else {
        const safeNum = (payment.voucher_number || `Voucher_${payment.id}`).replace(/\//g, '_');
        await downloadFile(`/payments/supplier/${payment.id}/pdf`, `Voucher_${safeNum}.pdf`);
        showToast(`Downloaded Payment Voucher ${payment.voucher_number}`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Voucher download failed', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white uppercase tracking-wide">Payment Management & Vouchers</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Record customer collections (Receipts) and supplier disbursements (Payment Vouchers)</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-none text-xs font-bold hover:bg-black dark:hover:bg-slate-200 shadow-xs cursor-pointer border border-slate-900 dark:border-white uppercase tracking-wider self-start sm:self-auto"
        >
          <Plus size={14} />
          {activeTab === 'customer' ? 'New Customer Receipt' : 'New Supplier Voucher'}
        </button>
      </div>

      {/* Immediate Print & PDF Voucher Alert Banner */}
      {lastCreatedVoucher && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-600 dark:border-emerald-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {lastCreatedVoucher.type === 'customer' ? 'Customer Receipt Voucher Created' : 'Supplier Disbursement Voucher Created'}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300">
                Voucher Ref:{' '}
                <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300">
                  {lastCreatedVoucher.type === 'customer' ? lastCreatedVoucher.voucher.receipt_number : lastCreatedVoucher.voucher.voucher_number}
                </span>{' '}
                | Party:{' '}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {lastCreatedVoucher.type === 'customer' ? lastCreatedVoucher.voucher.customer_name : lastCreatedVoucher.voucher.supplier_name}
                </span>{' '}
                | Amount: <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">Rs. {Number(lastCreatedVoucher.voucher.amount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => handlePrintVoucher(lastCreatedVoucher.voucher, lastCreatedVoucher.type)}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider border border-emerald-900 brutalist-btn cursor-pointer shadow-xs"
              title="Print Voucher Immediately (Opens 1-Click Print Dialog)"
            >
              <Printer size={13} />
              <span>Print Voucher</span>
            </button>
            <button
              onClick={() => handleDownloadVoucherPdf(lastCreatedVoucher.voucher, lastCreatedVoucher.type)}
              className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-xs uppercase tracking-wider border border-slate-400 dark:border-slate-600 brutalist-btn cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
              title="Download PDF Voucher to Disk"
            >
              <Download size={13} />
              <span>PDF</span>
            </button>
            <button
              onClick={() => setLastCreatedVoucher(null)}
              className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer ml-1"
              title="Dismiss banner"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      <div className="flex border-b border-slate-300 dark:border-slate-700 gap-2 text-xs">
        <button
          onClick={() => setActiveTab('customer')}
          className={`flex items-center gap-1.5 px-3 py-2 font-bold border-b-2 transition cursor-pointer uppercase tracking-wider text-[11px] ${
            activeTab === 'customer' ? 'border-emerald-600 dark:border-emerald-400 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ArrowDownLeft size={14} />
          Customer Receipts (Collections)
        </button>
        <button
          onClick={() => setActiveTab('supplier')}
          className={`flex items-center gap-1.5 px-3 py-2 font-bold border-b-2 transition cursor-pointer uppercase tracking-wider text-[11px] ${
            activeTab === 'supplier' ? 'border-blue-600 dark:border-blue-400 text-blue-700 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ArrowUpRight size={14} />
          Supplier Payment Vouchers (Disbursements)
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-300 dark:border-slate-700 shadow-2xs overflow-x-auto text-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-300 dark:border-slate-700 text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-3">Voucher / Receipt No</th>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">{activeTab === 'customer' ? 'Customer Name' : 'Supplier Name'}</th>
              <th className="py-2.5 px-3">Payment Mode</th>
              <th className="py-2.5 px-3">Reference / UTR No</th>
              <th className="py-2.5 px-3">Bank Details</th>
              <th className="py-2.5 px-3 text-right font-bold">Amount (Rs.)</th>
              <th className="py-2.5 px-3">Notes</th>
              <th className="py-2.5 px-3 text-center">Print / Download</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {(activeTab === 'customer' ? customerPayments : supplierPayments).length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-slate-400 dark:text-slate-500">
                  No payment vouchers found in this category.
                </td>
              </tr>
            ) : (
              (activeTab === 'customer' ? customerPayments : supplierPayments).map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                  <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                    {activeTab === 'customer' ? p.receipt_number : p.voucher_number}
                  </td>
                  <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">{formatDate(p.payment_date)}</td>
                  <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">
                    {activeTab === 'customer' ? p.customer_name : p.supplier_name}
                  </td>
                  <td className="py-2 px-3">
                    <span className="px-1.5 py-0.5 rounded-none text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                      {p.payment_mode}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">{p.reference_no || '-'}</td>
                  <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{p.bank_name || '-'}</td>
                  <td className={`py-2 px-3 text-right font-mono font-bold text-sm ${
                    activeTab === 'customer' ? 'text-emerald-700 dark:text-emerald-400' : 'text-blue-700 dark:text-blue-400'
                  }`}>
                    Rs. {Number(p.amount || 0).toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-slate-500 dark:text-slate-400 text-[11px]">{p.notes || '-'}</td>
                  <td className="py-2 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handlePrintVoucher(p, activeTab)}
                        title={activeTab === 'customer' ? 'Print Official Receipt Voucher' : 'Print Official Payment Voucher'}
                        className="px-2 py-1 border border-slate-900 dark:border-slate-600 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-950 brutalist-btn cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider shadow-2xs"
                      >
                        <Printer size={12} />
                        <span>Print</span>
                      </button>
                      <button
                        onClick={() => handleDownloadVoucherPdf(p, activeTab)}
                        title="Download PDF File"
                        className="p-1 border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 brutalist-btn cursor-pointer inline-flex items-center"
                      >
                        <Download size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={activeTab === 'customer' ? 'Record Customer Receipt Voucher' : 'Record Supplier Payment Voucher'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreatePayment} className="space-y-3 text-xs text-slate-800 dark:text-slate-200">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Select {activeTab === 'customer' ? 'Customer' : 'Supplier'} <span className="text-rose-500">*</span>
            </label>
            <select
              value={partyId}
              required
              onChange={(e) => setPartyId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none focus:ring-1 focus:ring-slate-900 outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="">-- Choose Party --</option>
              {activeTab === 'customer'
                ? customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.party_name} (Outstanding: ₹{c.current_balance})
                    </option>
                  ))
                : suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.supplier_name} (Payable: ₹{s.current_balance})
                    </option>
                  ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              required
              value={amount || ''}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="e.g. 15000"
              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none focus:ring-1 focus:ring-slate-900 outline-hidden font-bold font-mono text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none outline-hidden font-mono bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Reference / UTR / Cheque Number</label>
            <input
              type="text"
              placeholder="e.g. UTR88192384"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Bank Name</label>
            <input
              type="text"
              placeholder="e.g. HDFC Bank / SBI"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Notes / Narration</label>
            <input
              type="text"
              placeholder="Payment description..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer uppercase tracking-wider font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-none font-bold hover:bg-black dark:hover:bg-slate-200 cursor-pointer uppercase tracking-wider"
            >
              Save Voucher & Post to Ledger
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
