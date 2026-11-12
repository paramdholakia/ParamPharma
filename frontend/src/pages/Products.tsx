import React, { useEffect, useState } from 'react';
import { Pill, Search, Plus, Edit2, Layers, AlertTriangle, Trash2 } from 'lucide-react';
import { apiRequest } from '../api/client';
import { Modal } from '../components/Modal';
import { formatDate } from '../utils/date';

interface ProductsProps {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const Products: React.FC<ProductsProps> = ({ showToast }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Batch Viewer Modal
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productBatches, setProductBatches] = useState<any[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);

  // Add / Edit Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    medicine_name: '',
    generic_name: '',
    brand_name: '',
    manufacturer: '',
    hsn_code: '30049099',
    packing: '10x10 Tablets',
    unit: 'BOX',
    mrp: 0,
    ptr: 0,
    pts: 0,
    gst_rate: 12.0,
    min_stock_level: 10,
    reorder_level: 20,
    product_description: '',
    status: 'Active',
  });

  // Delete Confirmation Modal
  const [productToDelete, setProductToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let endpoint = `/products?limit=250`;
      if (search.trim()) endpoint += `&search=${encodeURIComponent(search.trim())}`;
      const res = await apiRequest(endpoint);
      setProducts(res.products || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch products', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => fetchProducts(), 250);
    return () => clearTimeout(delay);
  }, [search]);

  const viewBatches = async (p: any) => {
    setSelectedProduct(p);
    setBatchesLoading(true);
    try {
      const batches = await apiRequest(`/products/${p.id}/batches`);
      setProductBatches(batches || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load batches', 'error');
    } finally {
      setBatchesLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      medicine_name: '',
      generic_name: '',
      brand_name: '',
      manufacturer: '',
      hsn_code: '30049099',
      packing: '10x10 Tablets',
      unit: 'BOX',
      mrp: 0,
      ptr: 0,
      pts: 0,
      gst_rate: 12.0,
      min_stock_level: 10,
      reorder_level: 20,
      product_description: '',
      status: 'Active',
    });
    setIsFormOpen(true);
  };

  const openEditModal = (p: any) => {
    setEditingId(p.id);
    setFormData({
      medicine_name: p.medicine_name,
      generic_name: p.generic_name || '',
      brand_name: p.brand_name || '',
      manufacturer: p.manufacturer,
      hsn_code: p.hsn_code,
      packing: p.packing,
      unit: p.unit,
      mrp: p.mrp,
      ptr: p.ptr,
      pts: p.pts,
      gst_rate: p.gst_rate,
      min_stock_level: p.min_stock_level,
      reorder_level: p.reorder_level,
      product_description: p.product_description || '',
      status: p.status,
    });
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.medicine_name.trim()) {
      showToast('Please enter Medicine Name', 'error');
      return;
    }
    if (!formData.manufacturer.trim()) {
      showToast('Please enter Manufacturer Name', 'error');
      return;
    }

    const cleanPayload = {
      ...formData,
      medicine_name: formData.medicine_name.trim(),
      generic_name: (formData.generic_name || '').trim(),
      brand_name: (formData.brand_name || '').trim(),
      manufacturer: formData.manufacturer.trim(),
      hsn_code: (formData.hsn_code || '30049099').trim(),
      packing: (formData.packing || '10x10 Tablets').trim(),
      unit: (formData.unit || 'BOX').trim().toUpperCase(),
      mrp: Math.max(0, Number(formData.mrp) || 0),
      ptr: Math.max(0, Number(formData.ptr) || 0),
      pts: Math.max(0, Number(formData.pts) || 0),
      gst_rate: Number(formData.gst_rate) || 12.0,
      min_stock_level: Math.max(0, Math.round(Number(formData.min_stock_level) || 0)),
      reorder_level: Math.max(0, Math.round(Number(formData.reorder_level) || 0)),
      product_description: (formData.product_description || '').trim(),
      status: formData.status || 'Active'
    };

    try {
      if (editingId) {
        await apiRequest(`/products/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(cleanPayload),
        });
        showToast('Product updated successfully', 'success');
      } else {
        await apiRequest('/products', {
          method: 'POST',
          body: JSON.stringify(cleanPayload),
        });
        showToast('Product added to master catalog', 'success');
      }
      setIsFormOpen(false);
      fetchProducts();
    } catch (err: any) {
      showToast(err.message || 'Error saving product', 'error');
    }
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setDeleting(true);
    try {
      await apiRequest(`/products/${productToDelete.id}`, {
        method: 'DELETE',
      });
      showToast(`Product '${productToDelete.medicine_name}' deleted successfully`, 'success');
      setProductToDelete(null);
      fetchProducts();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete product', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase font-mono tracking-tight">
            Pharmaceutical Product Master Catalog
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Central Medicine Directory with HSN, Tax Slabs, Stock Limits & Batch Feeds
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs border-1.5 border-slate-900 dark:border-slate-600 brutalist-btn cursor-pointer self-start sm:self-auto"
        >
          <Plus size={14} />
          Add Medicine / Product
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-2.5 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card flex items-center gap-3 text-xs">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by medicine name, generic formula, manufacturer, HSN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs outline-hidden"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card overflow-x-auto text-xs">
        <table className="w-full text-left border-collapse min-w-[950px]">
          <thead>
            <tr className="bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-black border-b-1.5 border-slate-900 dark:border-slate-700 text-[11px] font-mono">
              <th className="py-2.5 px-3">Medicine Name</th>
              <th className="py-2.5 px-3">Manufacturer</th>
              <th className="py-2.5 px-3">Packing / Unit</th>
              <th className="py-2.5 px-3">HSN Code</th>
              <th className="py-2.5 px-3 text-right">MRP (₹)</th>
              <th className="py-2.5 px-3 text-right">PTR (₹)</th>
              <th className="py-2.5 px-3 text-center">GST%</th>
              <th className="py-2.5 px-3 text-right">Available Stock</th>
              <th className="py-2.5 px-3 text-center">Batches</th>
              <th className="py-2.5 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {products.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400 font-mono">
                  {loading ? 'Searching medicines catalog...' : 'No products found.'}
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-900 dark:text-white">{p.medicine_name}</div>
                    <div className="text-[10px] text-slate-500 italic truncate max-w-xs">{p.generic_name || '-'}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{p.manufacturer}</td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-mono">
                    {p.packing} ({p.unit})
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">{p.hsn_code}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                    {p.mrp.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                    {p.ptr.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-1.5 py-0.5 border border-blue-500 bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300 text-[10px] font-bold font-mono">
                      {p.gst_rate}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black">
                    <span className={p.is_low_stock ? 'text-amber-600 flex items-center justify-end gap-1' : 'text-slate-900 dark:text-white'}>
                      {p.is_low_stock && <AlertTriangle size={12} />}
                      {p.total_available_stock} {p.unit}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => viewBatches(p)}
                      className="px-2 py-0.5 border border-slate-900 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-[10px] font-bold brutalist-btn cursor-pointer inline-flex items-center gap-1"
                    >
                      <Layers size={11} />
                      Batches
                    </button>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => openEditModal(p)}
                        title="Edit Medicine"
                        className="p-1 border border-slate-900 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 brutalist-btn cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => setProductToDelete(p)}
                        title="Delete Medicine"
                        className="p-1 border border-rose-900 dark:border-rose-600 bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-rose-100 brutalist-btn cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <Modal
          isOpen={!!productToDelete}
          onClose={() => setProductToDelete(null)}
          title="Confirm Delete Medicine"
          maxWidth="max-w-md"
        >
          <div className="space-y-3 text-xs">
            <p className="text-slate-700 dark:text-slate-300">
              Are you sure you want to delete <b className="text-slate-900 dark:text-white">{productToDelete.medicine_name}</b>?
            </p>
            {productToDelete.total_available_stock > 0 && (
              <div className="p-2 border border-amber-600 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-bold flex items-center gap-1.5">
                <AlertTriangle size={14} className="shrink-0" />
                <span>Notice: Product currently has {productToDelete.total_available_stock} units in stock. You must write-off or sell stock before deletion.</span>
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-900 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-3 py-1.5 border border-slate-900 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold brutalist-btn cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteProduct}
                disabled={deleting}
                className="px-3 py-1.5 border border-rose-900 bg-rose-600 hover:bg-rose-700 text-white font-black brutalist-btn cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Medicine'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Batch Viewer Modal */}
      <Modal
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        title={`Batches for: ${selectedProduct?.medicine_name || ''}`}
        maxWidth="max-w-3xl"
      >
        {batchesLoading ? (
          <div className="p-8 text-center text-slate-500 font-mono text-xs">Loading batch inventory...</div>
        ) : (
          <div className="space-y-3 text-xs">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 border border-slate-900 dark:border-slate-700 flex flex-wrap justify-between text-[11px] font-mono">
              <span>Mfr: <b>{selectedProduct?.manufacturer}</b></span>
              <span>Pack: <b>{selectedProduct?.packing}</b></span>
              <span>HSN: <b>{selectedProduct?.hsn_code}</b></span>
              <span>GST: <b>{selectedProduct?.gst_rate}%</b></span>
            </div>

            <div className="border border-slate-900 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-black border-b border-slate-900 dark:border-slate-700 font-mono">
                  <tr>
                    <th className="py-2 px-2.5">Batch No</th>
                    <th className="py-2 px-2.5">Expiry Date</th>
                    <th className="py-2 px-2.5 text-right">Purchase Rate (₹)</th>
                    <th className="py-2 px-2.5 text-right">MRP (₹)</th>
                    <th className="py-2 px-2.5 text-right">PTR (₹)</th>
                    <th className="py-2 px-2.5 text-right">Available Qty</th>
                    <th className="py-2 px-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                  {productBatches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        No batch inventory inwarded yet. Create a purchase entry to add batches.
                      </td>
                    </tr>
                  ) : (
                    productBatches.map((b) => {
                      const isExpired = new Date(b.expiry_date) < new Date();
                      return (
                        <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                          <td className="py-2 px-2.5 font-bold text-slate-900 dark:text-white">{b.batch_number}</td>
                          <td className="py-2 px-2.5">{formatDate(b.expiry_date)}</td>
                          <td className="py-2 px-2.5 text-right">{b.purchase_rate.toFixed(2)}</td>
                          <td className="py-2 px-2.5 text-right">{b.mrp.toFixed(2)}</td>
                          <td className="py-2 px-2.5 text-right">{b.ptr.toFixed(2)}</td>
                          <td className="py-2 px-2.5 text-right font-black text-blue-700 dark:text-blue-400">{b.available_qty}</td>
                          <td className="py-2 px-2.5 text-center">
                            {isExpired ? (
                              <span className="px-1.5 py-0.2 border border-rose-600 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 text-[10px] font-bold">
                                EXPIRED
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 border border-emerald-600 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold">
                                ACTIVE (FEFO)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Add / Edit Form */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingId ? 'Edit Medicine' : 'Add New Medicine'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">
                Medicine / Product Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Augmentin 625 Duo Tablet"
                value={formData.medicine_name}
                onChange={(e) => setFormData({ ...formData, medicine_name: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:ring-1 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Generic Name / Composition</label>
              <input
                type="text"
                placeholder="e.g. Amoxicillin 500mg + Potassium Clavulanate 125mg"
                value={formData.generic_name}
                onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">
                Manufacturer Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. GlaxoSmithKline"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Brand Name</label>
              <input
                type="text"
                placeholder="e.g. Augmentin"
                value={formData.brand_name}
                onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Packing</label>
              <input
                type="text"
                placeholder="e.g. 10x10 Tablets / 100ml Syrup"
                value={formData.packing}
                onChange={(e) => setFormData({ ...formData, packing: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Unit of Measurement</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-hidden"
              >
                <option value="STRIP">STRIP</option>
                <option value="BOX">BOX</option>
                <option value="BOTTLE">BOTTLE</option>
                <option value="VIAL">VIAL</option>
                <option value="AMP">AMP</option>
                <option value="TUBE">TUBE</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">HSN Code</label>
              <input
                type="text"
                value={formData.hsn_code}
                onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">GST Rate (%)</label>
              <select
                value={formData.gst_rate}
                onChange={(e) => setFormData({ ...formData, gst_rate: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold outline-hidden"
              >
                <option value={0}>0% (Exempt)</option>
                <option value={5}>5% (Essential Drugs, Insulin)</option>
                <option value={12}>12% (Standard Formulations)</option>
                <option value={18}>18% (Disinfectants & Devices)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Default MRP (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.mrp}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setFormData({ ...formData, mrp: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Price to Retailer - PTR (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.ptr}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setFormData({ ...formData, ptr: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Minimum Stock Alert Level</label>
              <input
                type="number"
                min="0"
                value={formData.min_stock_level}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setFormData({ ...formData, min_stock_level: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Reorder Level</label>
              <input
                type="number"
                min="0"
                value={formData.reorder_level}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setFormData({ ...formData, reorder_level: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-900 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-3 py-1.5 border border-slate-900 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold brutalist-btn cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 text-white font-bold border border-slate-900 dark:border-slate-600 brutalist-btn cursor-pointer hover:bg-blue-700"
            >
              {editingId ? 'Update Medicine' : 'Save Medicine'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
