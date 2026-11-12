import React, { useEffect, useState } from 'react';
import {
  FileSpreadsheet, Download, Search, Printer, Calendar,
  MessageSquare, ChevronDown, ChevronRight, CheckCircle2, Clock
} from 'lucide-react';
import { apiRequest, downloadFile } from '../api/client';
import { formatDate } from '../utils/date';

interface SalesRegisterProps {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const SalesRegister: React.FC<SalesRegisterProps> = ({ showToast }) => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Tax type filter ("all", "gst", "non_gst")
  const [taxTypeFilter, setTaxTypeFilter] = useState<string>('all');

  // Expanded row id for inline detailed items inspection
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<number | null>(null);
  const [expandedItems, setExpandedItems] = useState<{ [id: number]: any[] }>({});
  const [loadingItems, setLoadingItems] = useState<number | null>(null);

  const fetchRegister = async () => {
    setLoading(true);
    try {
      let endpoint = `/registers/sales?`;
      if (fromDate) endpoint += `&from_date=${fromDate}`;
      if (toDate) endpoint += `&to_date=${toDate}`;
      if (taxTypeFilter !== 'all') endpoint += `&tax_type=${taxTypeFilter}`;
      const res = await apiRequest(endpoint);
      setInvoices(res.invoices || []);
      setSummary(res.summary || {});
    } catch (err: any) {
      showToast(err.message || 'Error loading sales register', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegister();
  }, [fromDate, toDate, taxTypeFilter]);

  const handleExportExcel = async () => {
    try {
      let endpoint = `/registers/sales/export-excel?`;
      if (fromDate) endpoint += `&from_date=${fromDate}`;
      if (toDate) endpoint += `&to_date=${toDate}`;
      await downloadFile(endpoint, 'Sales_Register.xlsx');
      showToast('Sales register exported to Excel', 'success');
    } catch (err: any) {
      showToast(err.message || 'Export failed', 'error');
    }
  };

  const handleDownloadPdf = async (invoice: any) => {
    try {
      await downloadFile(
        `/sales/${invoice.id}/pdf?include_qr=${invoice.include_upi_qr ?? true}`,
        `Invoice_${invoice.invoice_number.replace('/', '_')}.pdf`
      );
      showToast(`Downloaded PDF for ${invoice.invoice_number}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'PDF download failed', 'error');
    }
  };

  const handleDownloadExcel = async (invoice: any) => {
    try {
      await downloadFile(
        `/sales/${invoice.id}/excel`,
        `Invoice_${invoice.invoice_number.replace('/', '_')}.xlsx`
      );
      showToast(`Exported Excel for ${invoice.invoice_number}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Excel export failed', 'error');
    }
  };

  const handleSendWhatsApp = (inv: any) => {
    const text = `*PARAM PHARMA WHOLESALE TAX INVOICE*
--------------------------------
*Invoice No:* ${inv.invoice_number}
*Date:* ${formatDate(inv.invoice_date)}
*Customer:* ${inv.customer_name}
*Gross Taxable:* ₹${inv.total_taxable_amount.toFixed(2)}
*Total GST:* ₹${inv.total_gst_amount.toFixed(2)}
*Net Total Bill:* ₹${inv.net_invoice_amount.toFixed(2)}
*Payment Status:* ${inv.payment_status} (Balance: ₹${inv.balance_amount.toFixed(2)})

*UPI PAYMENT ADDRESS:*
UPI ID: *aldholakia72-1@okaxis*
Phone: *9429041051*
Exact Amount: ₹${inv.net_invoice_amount.toFixed(2)}

Thank you for choosing Param Pharma Wholesale!`;

    // Try finding customer mobile or prompt
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    showToast(`WhatsApp sharing opened for ${inv.invoice_number}`, 'info');
  };

  const toggleExpand = async (invoiceId: number) => {
    if (expandedInvoiceId === invoiceId) {
      setExpandedInvoiceId(null);
      return;
    }
    setExpandedInvoiceId(invoiceId);
    if (!expandedItems[invoiceId]) {
      setLoadingItems(invoiceId);
      try {
        const res = await apiRequest(`/sales/${invoiceId}`);
        setExpandedItems((prev) => ({ ...prev, [invoiceId]: res.items || [] }));
      } catch (e) {
        showToast('Failed to load invoice items', 'error');
      } finally {
        setLoadingItems(null);
      }
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(s) ||
      inv.customer_name.toLowerCase().includes(s) ||
      (inv.gstin && inv.gstin.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-3">
      {/* Header and Export Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase font-mono tracking-tight">
            Detailed Pharmaceutical Sales Register
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            GST Outward Supplies, Batch Tax Analysis, WhatsApp Dispatch & Ledger Postings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs border-1.5 border-slate-900 dark:border-slate-600 brutalist-btn cursor-pointer"
          >
            <Download size={13} />
            Export to Excel
          </button>
        </div>
      </div>

      {/* Date & Filter Ribbon */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar size={14} className="text-slate-500" />
          <span className="font-bold text-slate-700 dark:text-slate-300">From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2 py-1 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs outline-hidden"
          />
          <span className="font-bold text-slate-700 dark:text-slate-300 ml-1">To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2 py-1 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs outline-hidden"
          />
          <span className="font-bold text-slate-700 dark:text-slate-300 ml-1">Type:</span>
          <select
            value={taxTypeFilter}
            onChange={(e) => setTaxTypeFilter(e.target.value)}
            className="px-2 py-1 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-xs outline-hidden cursor-pointer"
          >
            <option value="all">All Invoices</option>
            <option value="gst">GST Tax Invoices Only</option>
            <option value="non_gst">Non-GST Retail Bills Only</option>
          </select>
          {(fromDate || toDate || taxTypeFilter !== 'all') && (
            <button
              onClick={() => { setFromDate(''); setToDate(''); setTaxTypeFilter('all'); }}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline ml-2 text-xs cursor-pointer"
            >
              Clear Filter
            </button>
          )}
        </div>

        <div className="relative min-w-[240px]">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice no, party, GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono outline-hidden"
          />
        </div>
      </div>

      {/* Register Table with Detailed Columns & Expandable Items */}
      <div className="bg-white dark:bg-slate-900 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card overflow-x-auto text-xs">
        <table className="w-full text-left border-collapse min-w-[1150px]">
          <thead>
            <tr className="bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-black border-b-1.5 border-slate-900 dark:border-slate-700 text-[11px] font-mono">
              <th className="py-2 px-2 w-6"></th>
              <th className="py-2.5 px-3">Invoice No</th>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Customer / Party Name</th>
              <th className="py-2.5 px-3">GSTIN</th>
              <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
              <th className="py-2.5 px-3 text-right">CGST (₹)</th>
              <th className="py-2.5 px-3 text-right">SGST (₹)</th>
              <th className="py-2.5 px-3 text-right">IGST (₹)</th>
              <th className="py-2.5 px-3 text-right font-black">Total Bill (₹)</th>
              <th className="py-2.5 px-3 text-right">Paid (₹)</th>
              <th className="py-2.5 px-3 text-right">Balance (₹)</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-12 text-center text-slate-400 font-mono">
                  {loading ? 'Loading detailed sales register...' : 'No sales invoices recorded in this period.'}
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => {
                const isExpanded = expandedInvoiceId === inv.id;
                const itemsList = expandedItems[inv.id] || [];
                return (
                  <React.Fragment key={inv.id}>
                    <tr className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 transition ${isExpanded ? 'bg-amber-50/50 dark:bg-slate-800' : ''}`}>
                      <td className="py-2 px-1 text-center">
                        <button
                          onClick={() => toggleExpand(inv.id)}
                          className="p-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                          title="Click to view line items"
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>
                      <td className="py-2 px-3 font-mono font-black text-blue-900 dark:text-blue-400">
                        <div>{inv.invoice_number}</div>
                        {inv.is_non_gst && (
                          <span className="inline-block text-[9px] px-1 py-0.2 bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-500 font-sans font-bold">
                            Non-GST
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {formatDate(inv.invoice_date)}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">{inv.customer_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{inv.customer_category}</div>
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {inv.gstin || 'URP'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        {inv.total_taxable_amount.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        {inv.cgst_amount > 0 ? inv.cgst_amount.toFixed(2) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        {inv.sgst_amount > 0 ? inv.sgst_amount.toFixed(2) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        {inv.igst_amount > 0 ? inv.igst_amount.toFixed(2) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                        {inv.net_invoice_amount.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                        {inv.paid_amount > 0 ? inv.paid_amount.toFixed(2) : '-'}
                      </td>
                      <td className={`py-2 px-3 text-right font-mono font-black ${inv.balance_amount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {inv.balance_amount.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 border text-[10px] font-bold font-mono ${
                          inv.payment_status === 'Paid'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-500'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-500'
                        }`}>
                          {inv.payment_status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleSendWhatsApp(inv)}
                            title="Share Invoice on WhatsApp"
                            className="p-1 border border-slate-900 dark:border-slate-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 brutalist-btn cursor-pointer"
                          >
                            <MessageSquare size={13} />
                          </button>
                          <button
                            onClick={() => handleDownloadPdf(inv)}
                            title="Download GST Invoice PDF"
                            className="p-1 border border-slate-900 dark:border-slate-600 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 brutalist-btn cursor-pointer"
                          >
                            <Printer size={13} />
                          </button>
                          <button
                            onClick={() => handleDownloadExcel(inv)}
                            title="Export Invoice to Excel (.xlsx)"
                            className="p-1 border border-slate-900 dark:border-slate-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 brutalist-btn cursor-pointer"
                          >
                            <FileSpreadsheet size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Line Items Preview */}
                    {isExpanded && (
                      <tr className="bg-slate-100/90 dark:bg-slate-950/80">
                        <td colSpan={14} className="py-3 px-6 border-b-2 border-slate-900 dark:border-slate-700">
                          {loadingItems === inv.id ? (
                            <div className="py-2 text-slate-500 font-mono text-center">Loading line items...</div>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="font-bold text-[11px] text-slate-800 dark:text-slate-200 font-mono flex items-center justify-between">
                                <span>INVOICE #{inv.invoice_number} BATCH ITEMS:</span>
                                <span>Payment Terms: {inv.payment_terms} | Mode: {inv.payment_mode}</span>
                              </div>
                              <table className="w-full text-left border border-slate-900 dark:border-slate-700 text-[11px] font-mono bg-white dark:bg-slate-900">
                                <thead>
                                  <tr className="bg-slate-200 dark:bg-slate-800 border-b border-slate-900 dark:border-slate-700 font-bold">
                                    <th className="py-1 px-2">Medicine Name</th>
                                    <th className="py-1 px-2">Batch</th>
                                    <th className="py-1 px-2">Expiry</th>
                                    <th className="py-1 px-2 text-right">MRP</th>
                                    <th className="py-1 px-2 text-right">PTR Rate</th>
                                    <th className="py-1 px-2 text-center">Qty</th>
                                    <th className="py-1 px-2 text-center">Free</th>
                                    <th className="py-1 px-2 text-center">GST%</th>
                                    <th className="py-1 px-2 text-right">Line Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                  {itemsList.map((item: any, iIdx: number) => (
                                    <tr key={iIdx}>
                                      <td className="py-1 px-2 font-bold text-slate-900 dark:text-white">
                                        {item.product_name}
                                      </td>
                                      <td className="py-1 px-2 text-blue-800 dark:text-blue-300 font-bold">
                                        {item.batch_number}
                                      </td>
                                      <td className="py-1 px-2">{formatDate(item.expiry_date)}</td>
                                      <td className="py-1 px-2 text-right">₹{item.mrp?.toFixed(2)}</td>
                                      <td className="py-1 px-2 text-right">₹{item.rate?.toFixed(2)}</td>
                                      <td className="py-1 px-2 text-center font-bold">{item.quantity}</td>
                                      <td className="py-1 px-2 text-center">{item.free_quantity || 0}</td>
                                      <td className="py-1 px-2 text-center">{item.gst_rate}%</td>
                                      <td className="py-1 px-2 text-right font-black">₹{item.total_amount?.toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
          {/* Summary Row */}
          {summary && invoices.length > 0 && (
            <tfoot>
              <tr className="bg-amber-100 dark:bg-slate-800 font-black border-t-2 border-slate-900 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs">
                <td colSpan={5} className="py-2.5 px-3">TOTAL ({summary.invoice_count} Bills)</td>
                <td className="py-2.5 px-3 text-right">₹{summary.total_taxable?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="py-2.5 px-3 text-right">₹{summary.total_cgst?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="py-2.5 px-3 text-right">₹{summary.total_sgst?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="py-2.5 px-3 text-right">₹{summary.total_igst?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="py-2.5 px-3 text-right text-blue-900 dark:text-blue-400">₹{summary.total_invoice?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400">₹{summary.total_paid?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="py-2.5 px-3 text-right text-rose-700 dark:text-rose-400">₹{summary.total_balance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
