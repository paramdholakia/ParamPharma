import React, { useState } from 'react';
import { Modal } from './Modal';
import { apiRequest } from '../api/client';

interface QuickCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: (newCustomer: any) => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const QuickCustomerModal: React.FC<QuickCustomerModalProps> = ({
  isOpen,
  onClose,
  onCustomerCreated,
  showToast
}) => {
  const [formData, setFormData] = useState({
    party_name: '',
    customer_category: 'Chemist',
    contact_person: '',
    mobile: '',
    email: '',
    billing_address: '',
    gstin: '',
    pan: '',
    dl_number: '',
    state: 'Gujarat',
    state_code: '24',
    city: 'Ahmedabad',
    opening_balance: 0,
    credit_limit: 50000,
    payment_terms_days: 21,
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.party_name.trim() || !formData.mobile.trim() || !formData.billing_address.trim()) {
      showToast('Party Name, Mobile and Billing Address are mandatory', 'error');
      return;
    }

    setLoading(true);
    try {
      const created = await apiRequest('/customers', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      showToast(`Customer '${created.party_name}' registered successfully`, 'success');
      onCustomerCreated(created);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to create customer', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register New Customer / Party" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block font-medium text-slate-700 mb-1">
              Customer / Party Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Shree Ganesh Medical Store"
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
              placeholder="10-digit mobile"
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
              placeholder="e.g. 24AABCP1234F1Z5"
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
              placeholder="e.g. GJ-AHM-20B-12345"
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
              placeholder="Shop number, Street, Area"
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
                placeholder="State"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="col-span-2 px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-hidden"
              />
              <input
                type="text"
                placeholder="Code"
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
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition cursor-pointer"
          >
            {loading ? 'Saving...' : 'Save Customer'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
