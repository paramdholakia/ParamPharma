import React, { useEffect, useState } from 'react';
import { Truck, Search, Plus, Eye, Edit2 } from 'lucide-react';
import { apiRequest } from '../api/client';
import { Modal } from '../components/Modal';
import { formatDate } from '../utils/date';

interface SuppliersProps {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const Suppliers: React.FC<SuppliersProps> = ({ showToast }) => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Profile Modal State
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    supplier_name: '',
    contact_person: '',
    mobile: '',
    email: '',
    address: '',
    gstin: '',
    pan: '',
    dl_number: '',
    state: 'Gujarat',
    state_code: '24',
    city: 'Ahmedabad',
    opening_balance: 0,
    credit_terms_days: 30,
  });

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      let endpoint = `/suppliers?limit=200`;
      if (search.trim()) endpoint += `&search=${encodeURIComponent(search.trim())}`;
      const res = await apiRequest(endpoint);
      setSuppliers(res.suppliers || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch suppliers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => fetchSuppliers(), 250);
    return () => clearTimeout(delay);
  }, [search]);

  const openProfile = async (s: any) => {
    setSelectedSupplier(s);
    setProfileLoading(true);
    try {
      const data = await apiRequest(`/suppliers/${s.id}/profile`);
      setProfileData(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load supplier profile', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      supplier_name: '',
      contact_person: '',
      mobile: '',
      email: '',
      address: '',
      gstin: '',
      pan: '',
      dl_number: '',
      state: 'Gujarat',
      state_code: '24',
      city: 'Ahmedabad',
      opening_balance: 0,
      credit_terms_days: 30,
    });
    setIsFormOpen(true);
  };

  const openEditModal = (s: any) => {
    setEditingId(s.id);
    setFormData({
      supplier_name: s.supplier_name,
      contact_person: s.contact_person || '',
      mobile: s.mobile,
      email: s.email || '',
      address: s.address,
      gstin: s.gstin || '',
      pan: s.pan || '',
      dl_number: s.dl_number || '',
      state: s.state,
      state_code: s.state_code,
      city: s.city,
      opening_balance: s.opening_balance,
      credit_terms_days: s.credit_terms_days,
    });
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiRequest(`/suppliers/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        showToast('Supplier details updated', 'success');
      } else {
        await apiRequest('/suppliers', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        showToast('Supplier registered successfully', 'success');
      }
      setIsFormOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      showToast(err.message || 'Error saving supplier', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800">Supplier & Manufacturer Management</h2>
          <p className="text-xs text-slate-500">Pharma Companies, C&F Agents, and Super Distributors</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus size={14} />
          Register Supplier
        </button>
      </div>

      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-3 text-xs">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search suppliers by name, GSTIN, mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-hidden"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-x-auto text-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <th className="py-2.5 px-3">Supplier Name</th>
              <th className="py-2.5 px-3">Contact Person</th>
              <th className="py-2.5 px-3">Mobile & Email</th>
              <th className="py-2.5 px-3">GSTIN / DL</th>
              <th className="py-2.5 px-3">Location</th>
              <th className="py-2.5 px-3 text-right">Credit Terms</th>
              <th className="py-2.5 px-3 text-right">Payable Balance (₹)</th>
              <th className="py-2.5 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  {loading ? 'Searching suppliers...' : 'No suppliers registered.'}
                </td>
              </tr>
            ) : (
              suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    <div>{s.supplier_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{s.supplier_code}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">{s.contact_person || '-'}</td>
                  <td className="py-2.5 px-3 font-mono text-[11px]">
                    <div>{s.mobile}</div>
                    <div className="text-[10px] text-slate-400">{s.email || '-'}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px]">
                    <div>{s.gstin || 'URP'}</div>
                    <div className="text-[10px] text-slate-400">{s.dl_number || '-'}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {s.city}, {s.state} ({s.state_code})
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600">
                    {s.credit_terms_days} Days
                  </td>
                  <td className={`py-2.5 px-3 text-right font-bold ${s.current_balance > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                    ₹{s.current_balance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => openProfile(s)}
                        title="View Supplier Profile & Ledger"
                        className="p-1 rounded text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => openEditModal(s)}
                        title="Edit Supplier"
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

      {/* Supplier Profile Modal */}
      <Modal
        isOpen={!!selectedSupplier}
        onClose={() => setSelectedSupplier(null)}
        title={`Supplier Profile: ${selectedSupplier?.supplier_name || ''}`}
        maxWidth="max-w-4xl"
      >
        {profileLoading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Loading ledger and purchases...</div>
        ) : profileData ? (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Total Purchases</span>
                <span className="text-sm font-bold text-slate-800">₹{profileData.metrics?.total_purchases?.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Total Payments Made</span>
                <span className="text-sm font-bold text-emerald-700">₹{profileData.metrics?.total_paid?.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Outstanding Payable</span>
                <span className="text-sm font-bold text-rose-600">₹{profileData.metrics?.outstanding_payable?.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Credit Terms</span>
                <span className="text-sm font-bold text-slate-800">{profileData.metrics?.credit_terms}</span>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 mb-2">Supplier Account Statement / Ledger</h4>
              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-slate-100 sticky top-0 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-1.5 px-2">Date</th>
                      <th className="py-1.5 px-2">Ref Type</th>
                      <th className="py-1.5 px-2">Ref No</th>
                      <th className="py-1.5 px-2">Description</th>
                      <th className="py-1.5 px-2 text-right">Debit / Paid (₹)</th>
                      <th className="py-1.5 px-2 text-right">Credit / Bill (₹)</th>
                      <th className="py-1.5 px-2 text-right">Payable Balance (₹)</th>
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
                          <td className="py-1 px-2 text-right font-mono text-emerald-700">
                            {e.debit_amount > 0 ? e.debit_amount.toFixed(2) : '-'}
                          </td>
                          <td className="py-1 px-2 text-right font-mono text-slate-900">
                            {e.credit_amount > 0 ? e.credit_amount.toFixed(2) : '-'}
                          </td>
                          <td className="py-1 px-2 text-right font-mono font-bold text-rose-700">
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

      {/* Add / Edit Form */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingId ? 'Edit Supplier' : 'Register New Supplier'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">
                Supplier / Company Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-hidden font-medium"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-hidden"
              />
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
                placeholder="24AAACS1122N1Z9"
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
                Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
              <label className="block font-medium text-slate-700 mb-1">Credit Terms (Days)</label>
              <input
                type="number"
                min="0"
                value={formData.credit_terms_days}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setFormData({ ...formData, credit_terms_days: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-hidden"
              />
            </div>

            {!editingId && (
              <div>
                <label className="block font-medium text-slate-700 mb-1">Opening Payable (₹)</label>
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
              {editingId ? 'Update Supplier' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
