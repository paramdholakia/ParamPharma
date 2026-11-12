import React, { useEffect, useState } from 'react';
import { Receipt, Plus, Filter, Calendar } from 'lucide-react';
import { apiRequest } from '../api/client';
import { Modal } from '../components/Modal';
import { formatDate } from '../utils/date';

interface ExpensesProps {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const Expenses: React.FC<ExpensesProps> = ({ showToast }) => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<number | ''>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Add Expense Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    category_id: 1,
    amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    description: '',
    payment_mode: 'Cash',
    vendor_name: '',
    reference_no: '',
    notes: '',
  });

  // Custom Category Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      let endpoint = `/expenses?`;
      if (selectedCategory) endpoint += `&category_id=${selectedCategory}`;
      if (fromDate) endpoint += `&from_date=${fromDate}`;
      if (toDate) endpoint += `&to_date=${toDate}`;

      const res = await apiRequest(endpoint);
      setExpenses(res.expenses || []);
      setTotalAmount(res.total_amount || 0);
    } catch (err: any) {
      showToast(err.message || 'Error fetching expenses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const cats = await apiRequest('/expenses/categories');
      setCategories(cats || []);
      if (cats && cats.length > 0) {
        setFormData((prev) => ({ ...prev, category_id: cats[0].id }));
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [selectedCategory, fromDate, toDate]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0 || !formData.description.trim()) {
      showToast('Amount and description are required', 'error');
      return;
    }

    try {
      await apiRequest('/expenses', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      showToast('Expense recorded successfully', 'success');
      setIsModalOpen(false);
      setFormData({
        category_id: categories[0]?.id || 1,
        amount: 0,
        expense_date: new Date().toISOString().split('T')[0],
        description: '',
        payment_mode: 'Cash',
        vendor_name: '',
        reference_no: '',
        notes: '',
      });
      fetchExpenses();
    } catch (err: any) {
      showToast(err.message || 'Failed to save expense', 'error');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      await apiRequest('/expenses/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      showToast(`Category '${newCategoryName}' created`, 'success');
      setIsCategoryModalOpen(false);
      setNewCategoryName('');
      fetchCategories();
    } catch (err: any) {
      showToast(err.message || 'Error creating category', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white uppercase tracking-wide">Business Expense Register</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Track operating overheads, rent, transport, salaries, and utility expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-none text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            + Add Category
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-none text-xs font-bold hover:bg-black dark:hover:bg-slate-200 shadow-xs cursor-pointer border border-slate-900 dark:border-white uppercase tracking-wider"
          >
            <Plus size={14} />
            Add Expense Entry
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-3 rounded-none border border-slate-300 dark:border-slate-700 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : '')}
              className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none focus:ring-1 focus:ring-slate-900 outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="">All Categories (18+)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-none outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
            <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-none outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="font-bold text-slate-800 dark:text-slate-200">
          Total Overhead in Period: <span className="text-rose-600 dark:text-rose-400 text-sm font-mono font-bold">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-300 dark:border-slate-700 shadow-2xs overflow-x-auto text-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-300 dark:border-slate-700 text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Description / Narration</th>
              <th className="py-2.5 px-3">Vendor / Payee</th>
              <th className="py-2.5 px-3">Payment Mode</th>
              <th className="py-2.5 px-3 font-mono">Ref / Bill No</th>
              <th className="py-2.5 px-3 text-right font-bold">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400 dark:text-slate-500">
                  {loading ? 'Loading expenses...' : 'No business expenses recorded in this period.'}
                </td>
              </tr>
            ) : (
              expenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                  <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400">{formatDate(e.expense_date)}</td>
                  <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                    <span className="px-1.5 py-0.5 rounded-none text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold uppercase tracking-wider">
                      {e.category_name}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{e.description}</td>
                  <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{e.vendor_name || '-'}</td>
                  <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{e.payment_mode}</td>
                  <td className="py-2 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">{e.reference_no || '-'}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">₹{e.amount.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Daily Business Expense"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateExpense} className="space-y-3 text-xs text-slate-800 dark:text-slate-200">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Expense Category</label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: Number(e.target.value) })}
              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none focus:ring-1 focus:ring-slate-900 outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
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
              min="0.5"
              required
              value={formData.amount || ''}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              placeholder="e.g. 2500"
              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none focus:ring-1 focus:ring-slate-900 outline-hidden font-bold font-mono text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-900"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description / Particulars <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tempo freight charges for pharma consignment delivery"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none focus:ring-1 focus:ring-slate-900 outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
              <input
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none outline-hidden font-mono bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Payment Mode</label>
              <select
                value={formData.payment_mode}
                onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Vendor / Payee Name</label>
            <input
              type="text"
              placeholder="e.g. Patel Transporters"
              value={formData.vendor_name}
              onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Bill / Voucher / Receipt Number</label>
            <input
              type="text"
              placeholder="e.g. RCP-551"
              value={formData.reference_no}
              onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
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
              Save Expense
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Custom Category Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Add Custom Expense Category"
        maxWidth="max-w-xs"
      >
        <form onSubmit={handleCreateCategory} className="space-y-3 text-xs text-slate-800 dark:text-slate-200">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Category Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Generator Diesel"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none outline-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 rounded-none text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-none font-bold hover:bg-black dark:hover:bg-slate-200 uppercase tracking-wider"
            >
              Add
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
