import React, { useEffect, useState, useRef } from 'react';
import {
  Settings as SettingsIcon, Save, Database, ShieldCheck,
  Download, RefreshCw, AlertTriangle, UploadCloud, FileUp, Cloud, Trash2
} from 'lucide-react';
import { apiRequest, uploadFileApi } from '../api/client';
import { formatDate } from '../utils/date';

interface SettingsProps {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const Settings: React.FC<SettingsProps> = ({ showToast }) => {
  const [company, setCompany] = useState<any>({
    company_name: '',
    legal_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    state_code: '',
    pincode: '',
    phone: '',
    email: '',
    upi_id: '',
    gstin: '',
    pan: '',
    dl_number_20b: '',
    dl_number_21b: '',
    bank_name: '',
    bank_account_no: '',
    bank_ifsc: '',
    bank_branch: '',
    invoice_prefix: '',
    financial_year: '',
    terms_conditions: '',
  });

  const [backups, setBackups] = useState<any[]>([]);
  const [cloudStatus, setCloudStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // File upload input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [compRes, backRes, cloudRes] = await Promise.all([
        apiRequest('/company'),
        apiRequest('/backup'),
        apiRequest('/cloud/status').catch(() => null)
      ]);
      setCompany(compRes);
      setBackups(backRes || []);
      setCloudStatus(cloudRes);
    } catch (err: any) {
      showToast(err.message || 'Error fetching settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleCloudSync = async () => {
    setSyncLoading(true);
    try {
      const res = await apiRequest('/cloud/sync-both', { method: 'POST' });
      showToast(`Two-Way Sync complete with MongoDB Atlas (${res.cluster})! Zero duplicates.`, 'success');
      fetchSettings();
    } catch (err: any) {
      showToast(err.message || 'Cloud sync failed', 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleCleanReset = async () => {
    if (!window.confirm("WARNING: This will wipe all test/dummy invoices, products, and parties from both SQLite and MongoDB Atlas for a completely fresh start. Invoices will start at 1. Proceed?")) return;
    setResetLoading(true);
    try {
      const res = await apiRequest('/cloud/clean-reset', { method: 'POST' });
      showToast(res.message || "Database reset to clean state!", 'success');
      fetchSettings();
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      showToast(err.message || 'Clean reset failed', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/company', {
        method: 'PUT',
        body: JSON.stringify(company),
      });
      showToast('Company profile and GST/DL credentials updated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error saving settings', 'error');
    }
  };

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    try {
      const res = await apiRequest('/backup', { method: 'POST' });
      showToast(`Hot transaction-safe backup created: ${res.filename}`, 'success');
      fetchSettings();
    } catch (err: any) {
      showToast(err.message || 'Backup creation failed', 'error');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    if (!window.confirm(`Are you sure you want to restore database from '${filename}'? Current data will be safely archived first.`)) {
      return;
    }

    try {
      await apiRequest('/backup/restore', {
        method: 'POST',
        body: JSON.stringify({ filename }),
      });
      showToast(`Database restored from ${filename}. Reloading...`, 'success');
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      showToast(err.message || 'Restore failed', 'error');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.db')) {
        showToast('Please select a valid SQLite .db file', 'error');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadAndRestore = async () => {
    if (!selectedFile) {
      showToast('Please select a .db backup file first', 'error');
      return;
    }

    if (!window.confirm(`Warning: Loading '${selectedFile.name}' will replace your active database with the uploaded backup. Proceed?`)) {
      return;
    }

    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await uploadFileApi('/backup/upload?restore_now=true', formData);
      showToast(res.message || 'Database restored successfully!', 'success');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      showToast(err.message || 'Failed to upload/restore backup file', 'error');
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white uppercase font-mono tracking-tight">
            Company Settings & Database Management
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Configure pharmaceutical identity, DL 20B/21B, GSTIN, Bank, and Full Database Backup/Restore
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
        {/* Company Profile Form */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-4 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
          <h3 className="font-black text-slate-900 dark:text-white mb-3 flex items-center gap-1.5 text-xs uppercase font-mono border-b-1.5 border-slate-900 dark:border-slate-700 pb-2">
            <ShieldCheck size={16} className="text-blue-600 dark:text-blue-400" />
            Distributor Credentials & Invoicing Profiles
          </h3>

          <form onSubmit={handleSaveCompany} className="space-y-3 font-mono">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Company Trading Name</label>
                <input
                  type="text"
                  required
                  value={company.company_name}
                  onChange={(e) => setCompany({ ...company, company_name: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Legal Entity Name</label>
                <input
                  type="text"
                  required
                  value={company.legal_name}
                  onChange={(e) => setCompany({ ...company, legal_name: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">GSTIN Number</label>
                <input
                  type="text"
                  required
                  value={company.gstin}
                  onChange={(e) => setCompany({ ...company, gstin: e.target.value.toUpperCase() })}
                  className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">PAN Number</label>
                <input
                  type="text"
                  required
                  value={company.pan}
                  onChange={(e) => setCompany({ ...company, pan: e.target.value.toUpperCase() })}
                  className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Drug License (20B)</label>
                <input
                  type="text"
                  required
                  value={company.dl_number_20b}
                  onChange={(e) => setCompany({ ...company, dl_number_20b: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Drug License (21B)</label>
                <input
                  type="text"
                  required
                  value={company.dl_number_21b}
                  onChange={(e) => setCompany({ ...company, dl_number_21b: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Registered Address</label>
                <input
                  type="text"
                  required
                  value={company.address_line1}
                  onChange={(e) => setCompany({ ...company, address_line1: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">City</label>
                <input
                  type="text"
                  required
                  value={company.city}
                  onChange={(e) => setCompany({ ...company, city: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">State & State Code</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={company.state}
                    onChange={(e) => setCompany({ ...company, state: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden"
                  />
                  <input
                    type="text"
                    required
                    value={company.state_code}
                    onChange={(e) => setCompany({ ...company, state_code: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Bank Name</label>
                <input
                  type="text"
                  required
                  value={company.bank_name}
                  onChange={(e) => setCompany({ ...company, bank_name: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Account Number</label>
                <input
                  type="text"
                  required
                  value={company.bank_account_no}
                  onChange={(e) => setCompany({ ...company, bank_account_no: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">IFSC Code</label>
                <input
                  type="text"
                  required
                  value={company.bank_ifsc}
                  onChange={(e) => setCompany({ ...company, bank_ifsc: e.target.value.toUpperCase() })}
                  className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Branch Name</label>
                <input
                  type="text"
                  required
                  value={company.bank_branch}
                  onChange={(e) => setCompany({ ...company, bank_branch: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Official Mobile Number</label>
                <input
                  type="text"
                  required
                  value={company.phone}
                  onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Primary UPI ID (for QR Code & Billing)</label>
                <input
                  type="text"
                  required
                  value={company.upi_id || ''}
                  onChange={(e) => setCompany({ ...company, upi_id: e.target.value })}
                  placeholder="e.g. aldholakia72@okicici"
                  className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 font-bold outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Official Email</label>
                <input
                  type="email"
                  required
                  value={company.email}
                  onChange={(e) => setCompany({ ...company, email: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 dark:text-slate-200 mb-1">Sales Invoice Prefix</label>
                <input
                  type="text"
                  required
                  value={company.invoice_prefix}
                  onChange={(e) => setCompany({ ...company, invoice_prefix: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-900 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold outline-hidden font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-900 dark:border-slate-700">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold border-1.5 border-slate-900 dark:border-slate-600 brutalist-btn cursor-pointer"
              >
                <Save size={14} />
                Save Distributor Settings
              </button>
            </div>
          </form>
        </div>

        {/* Database & Backup / Restore Column */}
        <div className="space-y-4">
          {/* Create Backup */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
            <h3 className="font-black text-slate-900 dark:text-white mb-2 flex items-center gap-1.5 text-xs uppercase font-mono">
              <Database size={16} className="text-emerald-600 dark:text-emerald-400" />
              1. Take Database Backup
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
              Creates a hot transaction-safe SQLite snapshot. Safe to run during live billing operations.
            </p>

            <button
              onClick={handleCreateBackup}
              disabled={backupLoading}
              className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-black border-1.5 border-slate-900 dark:border-slate-600 brutalist-btn flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download size={14} />
              {backupLoading ? 'Creating Snapshot...' : 'Take Hot Backup Now'}
            </button>
          </div>

          {/* Upload & Load / Restore Backup File */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
            <h3 className="font-black text-slate-900 dark:text-white mb-2 flex items-center gap-1.5 text-xs uppercase font-mono">
              <UploadCloud size={16} className="text-indigo-600 dark:text-indigo-400" />
              2. Load & Restore Backup File (.db)
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
              Upload any existing SQLite <code>.db</code> backup file from your computer to restore all bills, ledgers, and products.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              accept=".db"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 border-1.5 border-dashed border-slate-900 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileUp size={14} />
                <span>{selectedFile ? selectedFile.name : 'Select .db Backup File from Disk'}</span>
              </button>

              {selectedFile && (
                <div className="p-2 border border-slate-900 dark:border-slate-600 bg-amber-50 dark:bg-slate-800 text-[11px] font-mono flex items-center justify-between">
                  <span>Selected: <b>{selectedFile.name}</b> ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-rose-600 font-bold hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleUploadAndRestore}
                disabled={!selectedFile || uploadLoading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black border-1.5 border-slate-900 dark:border-slate-600 brutalist-btn flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <RefreshCw size={14} className={uploadLoading ? 'animate-spin' : ''} />
                <span>{uploadLoading ? 'Restoring Database...' : 'Upload & Restore Database'}</span>
              </button>
            </div>
          </div>

          {/* MongoDB Atlas Cloud Sync */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
            <h3 className="font-black text-slate-900 dark:text-white mb-2 flex items-center justify-between text-xs uppercase font-mono">
              <span className="flex items-center gap-1.5">
                <Cloud size={16} className="text-emerald-600 dark:text-emerald-400" />
                MongoDB Atlas Cloud Sync
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 border ${
                cloudStatus?.connected
                  ? 'border-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                  : 'border-slate-400 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {cloudStatus?.connected ? 'ONLINE' : 'OFFLINE'}
              </span>
            </h3>

            <div className="space-y-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-3 bg-slate-50 dark:bg-slate-800 p-2.5 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between">
                <span>Cluster:</span>
                <span className="font-bold text-slate-900 dark:text-white">ParamPharmaCluster</span>
              </div>
              <div className="flex justify-between">
                <span>Database:</span>
                <span className="font-bold text-slate-900 dark:text-white">param_pharma</span>
              </div>
              <div className="flex justify-between">
                <span>Region:</span>
                <span className="text-slate-700 dark:text-slate-300">AWS ap-south-1 (Mumbai)</span>
              </div>
              {cloudStatus?.connected && (
                <div className="flex justify-between">
                  <span>Latency:</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">{cloudStatus.latency_ms} ms</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleCloudSync}
                disabled={syncLoading}
                className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-black border-1.5 border-slate-900 dark:border-slate-600 brutalist-btn flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs"
              >
                <RefreshCw size={14} className={syncLoading ? 'animate-spin' : ''} />
                <span>{syncLoading ? 'Syncing Bidirectionally...' : 'Two-Way Sync (SQLite ⇄ Atlas Cloud)'}</span>
              </button>

              <button
                type="button"
                onClick={handleCleanReset}
                disabled={resetLoading}
                className="w-full py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 font-bold border border-rose-300 dark:border-rose-800 brutalist-btn flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-[11px]"
                title="Wipes dummy data from SQLite & Atlas for fresh data entry"
              >
                <Trash2 size={13} className={resetLoading ? 'animate-spin' : ''} />
                <span>{resetLoading ? 'Resetting Database...' : 'Clean Reset (Fresh Start)'}</span>
              </button>
            </div>
          </div>

          {/* Backup Snapshots List */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded border-1.5 border-slate-900 dark:border-slate-700 brutalist-card">
            <h4 className="font-black text-slate-900 dark:text-white mb-2 text-xs uppercase font-mono">
              Saved Local Snapshots
            </h4>
            <div className="space-y-2 max-h-52 overflow-y-auto font-mono">
              {backups.length === 0 ? (
                <div className="text-slate-400 dark:text-slate-500 py-3 text-center text-[11px]">No snapshot files found.</div>
              ) : (
                backups.map((b) => (
                  <div key={b.filename} className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-900 dark:border-slate-700 flex items-center justify-between text-[11px]">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-[10px] truncate max-w-[170px]">
                        {b.filename}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 text-[10px]">{b.created_at} &bull; {b.size_kb} KB</div>
                    </div>
                    <button
                      onClick={() => handleRestoreBackup(b.filename)}
                      className="px-2 py-0.5 border border-rose-900 bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold hover:bg-rose-100 text-[10px] brutalist-btn cursor-pointer"
                    >
                      Restore
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
