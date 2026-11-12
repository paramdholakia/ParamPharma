import React, { useEffect, useState } from 'react';
import { Users, Search, Plus, Eye, Edit2, Phone, MapPin, ShieldCheck, CreditCard } from 'lucide-react';
import { apiRequest } from '../api/client';
import { Modal } from '../components/Modal';
import { formatDate } from '../utils/date';

interface CustomersProps {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const Customers: React.FC<CustomersProps> = ({ showToast }) => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [loading, setLoading] = useState(false);

  // Profile Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Add / Edit Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    party_name: '',
    customer_category: 'Chemist',
    doctor_name: '',
    store_name: '',
    contact_person: '',
    mobile: '',
    alt_mobile: '',
    email: '',
    billing_address: '',
    shipping_address: '',
    gstin: '',
    pan: '',
    dl_number: '',
    state: 'Gujarat',
    state_code: '24',
    city: 'Ahmedabad',
    opening_balance: 0,
    credit_limit: 50000,
    payment_terms_days: 21,
    notes: '',
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      let endpoint = `/customers?limit=200`;
      if (search.trim()) endpoint += `&search=${encodeURIComponent(search.trim())}`;
      if (categoryFilter !== 'All') endpoint += `&category=${encodeURIComponent(categoryFilter)}`;
      const res = await apiRequest(endpoint);
      setCustomers(res.customers || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCustomers();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search, categoryFilter]);

  const openProfile = async (customer: any) => {
    setSelectedCustomer(customer);
    setProfileLoading(true);
    try {
      const data = await apiRequest(`/customers/${customer.id}/profile`);
      setProfileData(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load customer profile', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      party_name: '',
      customer_category: 'Chemist',
      doctor_name: '',
      store_name: '',
      contact_person: '',
      mobile: '',
      alt_mobile: '',
      email: '',
      billing_address: '',
      shipping_address: '',
      gstin: '',
      pan: '',
      dl_number: '',
      state: 'Gujarat',
      state_code: '24',
      city: 'Ahmedabad',
      opening_balance: 0,
      credit_limit: 50000,
      payment_terms_days: 21,
      notes: '',
    });
    setIsFormOpen(true);
  };

  const openEditModal = (c: any) => {
    setEditingId(c.id);
    setFormData({
      party_name: c.party_name,
      customer_category: c.customer_category,
      doctor_name: c.doctor_name || '',
      store_name: c.store_name || '',
      contact_person: c.contact_person || '',
      mobile: c.mobile,
      alt_mobile: c.alt_mobile || '',
      email: c.email || '',
      billing_address: c.billing_address,
      shipping_address: c.shipping_address || '',
      gstin: c.gstin || '',
      pan: c.pan || '',
      dl_number: c.dl_number || '',
      state: c.state,
      state_code: c.state_code,
      city: c.city,
      opening_balance: c.opening_balance,
      credit_limit: c.credit_limit,
      payment_terms_days: c.payment_terms_days,
      notes: c.notes || '',
    });
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiRequest(`/customers/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        showToast('Customer profile updated', 'success');
      } else {
        await apiRequest('/customers', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        showToast('Customer registered successfully', 'success');
      }
      setIsFormOpen(false);
      fetchCustomers();
    } catch (err: any) {
      showToast(err.message || 'Error saving customer', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800">Customer & Party Management</h2>
          <p className="text-xs text-slate-500">Chemists, Doctors, Hospitals, and Wholesale Retailers</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus size={14} />
          Register Customer
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by party name, mobile, GSTIN, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-hidden"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-600">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-hidden bg-white"
          >
            <option value="All">All Categories</option>
            <option value="Chemist">Chemist</option>
            <option value="Doctor">Doctor</option>
            <option value="Medical Store">Medical Store</option>
            <option value="Retailer">Retailer</option>
            <option value="Wholesaler">Wholesaler</option>
            <option value="Distributor">Distributor</option>
            <option value="Hospital">Hospital</option>
            <option value="Clinic">Clinic</option>
            <option value="Nursing Home">Nursing Home</option>
          </select>
        </div>
      </div>

      {/* High-Density Customer Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-x-auto text-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <th className="py-2.5 px-3">Party Name</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Mobile</th>
              <th className="py-2.5 px-3">GSTIN / Drug Lic.</th>
              <th className="py-2.5 px-3">City & State</th>
              <th className="py-2.5 px-3 text-right">Credit Limit</th>
              <th className="py-2.5 px-3 text-right">Outstanding (₹)</th>
              <th className="py-2.5 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  {loading ? 'Searching customers...' : 'No customers found.'}
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    <div>{c.party_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{c.customer_code}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {c.customer_category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono">{c.mobile}</td>
                  <td className="py-2.5 px-3 font-mono text-[11px]">
                    <div>{c.gstin || 'URP'}</div>
                    <div className="text-[10px] text-slate-400">{c.dl_number || '-'}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {c.city}, {c.state} ({c.state_code})
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600">
                    ₹{c.credit_limit?.toLocaleString('en-IN')}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-bold ${c.current_balance > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                    ₹{c.current_balance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => openProfile(c)}
                        title="View Complete Customer Profile & Ledger"
                        className="p-1 rounded text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => openEditModal(c)}
                        title="Edit Customer Details"
                        className="p-1 rounded text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                      >
                        <Edit2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Customer Profile & Ledger Modal */}
      <Modal
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title={`Customer Profile: ${selectedCustomer?.party_name || ''}`}
        maxWidth="max-w-4xl"
      >
        {profileLoading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Loading ledger and transaction history...</div>
        ) : profileData ? (
          <div className="space-y-4 text-xs">
            {/* Top Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Total Sales Invoiced</span>
                <span className="text-sm font-bold text-slate-800">₹{profileData.metrics?.total_sales?.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Total Payments Received</span>
                <span className="text-sm font-bold text-emerald-700">₹{profileData.metrics?.total_received?.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Current Outstanding</span>
                <span className="text-sm font-bold text-rose-600">₹{profileData.metrics?.current_outstanding?.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Credit Limit & Terms</span>
                <span className="text-sm font-bold text-slate-800">
                  ₹{profileData.metrics?.credit_limit?.toLocaleString('en-IN')} ({selectedCustomer?.payment_terms_days}d)
                </span>
              </div>
            </div>

            {/* Profile Info Details */}
            <div className="p-3 bg-blue-50/50 rounded border border-blue-100 flex flex-wrap gap-4 text-[11px]">
              <div><b>Category:</b> {selectedCustomer?.customer_category}</div>
              <div><b>Mobile:</b> {selectedCustomer?.mobile}</div>
              <div><b>GSTIN:</b> {selectedCustomer?.gstin || 'Unregistered'}</div>
              <div><b>Drug Lic:</b> {selectedCustomer?.dl_number || 'N/A'}</div>
              <div><b>Address:</b> {selectedCustomer?.billing_address}, {selectedCustomer?.city}</div>
            </div>

            {/* Customer Ledger Tab */}
            <div>
              <h4 className="font-bold text-slate-800 mb-2">Recent Statement of Account / Ledger</h4>
              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-slate-100 sticky top-0 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-1.5 px-2">Date</th>
                      <th className="py-1.5 px-2">Ref Type</th>
                      <th className="py-1.5 px-2">Ref No</th>
                      <th className="py-1.5 px-2">Description</th>
                      <th className="py-1.5 px-2 text-right">Debit (₹)</th>
                      <th className="py-1.5 px-2 text-right">Credit (₹)</th>
                      <th className="py-1.5 px-2 text-right">Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {profileData.ledger?.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-slate-400">No ledger transactions yet.</td>
                      </tr>
                    ) : (
                      profileData.ledger?.map((e: any) => (
                        <tr key={e.id} className="hover:bg-slate-50">
                          <td className="py-1 px-2 font-mono">{formatDate(e.transaction_date)}</td>
                          <td className="py-1 px-2">{e.reference_type}</td>
                          <td className="py-1 px-2 font-mono">{e.reference_number}</td>
                          <td className="py-1 px-2 text-slate-600">{e.description}</td>
                          <td className="py-1 px-2 text-right font-mono text-slate-900">
                            {e.debit_amount > 0 ? e.debit_amount.toFixed(2) : '-'}
                          </td>
                          <td className="py-1 px-2 text-right font-mono text-emerald-700">
                            {e.credit_amount > 0 ? e.credit_amount.toFixed(2) : '-'}
                          </td>
                          <td className="py-1 px-2 text-right font-mono font-bold text-slate-800">
                            {e.running_balance.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingId ? 'Edit Customer' : 'Register New Customer'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">
                Customer / Party Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.party_name}
                onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-hidden font-medium"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Customer Category</label>
              <select
                value={formData.customer_category}
                onChange={(e) => setFormData({ ...formData, customer_category: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-hidden bg-white"
              >
                <option value="Chemist">Chemist</option>
                <option value="Doctor">Doctor</option>
                <option value="Medical Store">Medical Store</option>
                <option value="Retailer">Retailer</option>
                <option value="Wholesaler">Wholesaler</option>
                <option value="Distributor">Distributor</option>
                <option value="Hospital">Hospital</option>
                <option value="Clinic">Clinic</option>
                <option value="Nursing Home">Nursing Home</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">GST Number (GSTIN)</label>
              <input
                type="text"
                maxLength={15}
                placeholder="24AABCP1234F1Z5"
                value={formData.gstin}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  let stateCode = formData.state_code;
                  if (val.length >= 2 && !isNaN(Number(val.slice(0, 2)))) {
                    stateCode = val.slice(0, 2);
                  }
                  setFormData({ ...formData, gstin: val, state_code: stateCode });
                }}
                className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-hidden font-mono uppercase"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Drug License (DL) No.</label>
              <input
                type="text"
                value={formData.dl_number}
                onChange={(e) => setFormData({ ...formData, dl_number: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-hidden uppercase"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">
                Billing Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.billing_address}
                onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">State & Code</label>
              <div className="grid grid-cols-3 gap-1">
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="col-span-2 px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-hidden"
                />
                <input
                  type="text"
                  value={formData.state_code}
                  onChange={(e) => setFormData({ ...formData, state_code: e.target.value })}
                  className="px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-hidden text-center font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Credit Limit (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.credit_limit}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setFormData({ ...formData, credit_limit: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Credit Terms (Days)</label>
              <input
                type="number"
                min="0"
                value={formData.payment_terms_days}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setFormData({ ...formData, payment_terms_days: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-hidden"
              />
            </div>

            {!editingId && (
              <div>
                <label className="block font-medium text-slate-700 mb-1">Opening Balance (₹)</label>
                <input
                  type="number"
                  value={formData.opening_balance}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setFormData({ ...formData, opening_balance: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-hidden"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition cursor-pointer"
            >
              {editingId ? 'Update Customer' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
