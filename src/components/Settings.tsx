import { useState } from 'react';
import { AppSettings } from '../types';
import { Save, User, Phone, Download, Upload, Trash2, Building2, ShieldCheck } from 'lucide-react';

interface SettingsProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onExport: () => void;
  onImport: (content: string) => void;
  onClearAll: () => void;
}

export default function Settings({ settings, onSave, onExport, onImport, onClearAll }: SettingsProps) {
  const [form, setForm] = useState<AppSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleSave = () => {
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      onImport(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Your Details */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <User className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-800 text-sm">Your Details</h3>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Your Name</label>
            <input
              type="text"
              value={form.yourName}
              onChange={(e) => setForm({ ...form, yourName: e.target.value })}
              placeholder="e.g., Kwame Asante"
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Company / Department</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                placeholder="e.g., Accra Office"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Boss Details */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-800 text-sm">Boss Details</h3>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Boss Name</label>
            <input
              type="text"
              value={form.bossName}
              onChange={(e) => setForm({ ...form, bossName: e.target.value })}
              placeholder="e.g., Mr. Mensah"
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              <Phone className="w-3 h-3 inline mr-1" />
              WhatsApp Number
            </label>
            <input
              type="tel"
              value={form.bossPhone}
              onChange={(e) => setForm({ ...form, bossPhone: e.target.value })}
              placeholder="e.g., 233241234567"
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all"
            />
            <p className="text-[11px] text-gray-400 mt-1.5">
              Include country code without + (e.g., 233 for Ghana, 234 for Nigeria)
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className={`w-full py-4 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] ${
          saved
            ? 'bg-green-500 text-white shadow-green-500/25'
            : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/25'
        }`}
      >
        <Save className="w-4 h-4" />
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>

      {/* Data Management */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-800 text-sm">📦 Data</h3>
        </div>
        <div className="p-5 space-y-2.5">
          <button
            onClick={onExport}
            className="w-full py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Backup
          </button>
          <label className="w-full py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 flex items-center justify-center gap-2 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            Import Backup
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full py-3 border border-red-200 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 active:bg-red-100 flex items-center justify-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Data
          </button>
        </div>
      </div>

      {/* Clear Confirm Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowClearConfirm(false)} />
          <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-6 shadow-2xl">
            <h3 className="font-bold text-gray-900 text-lg">Delete Everything?</h3>
            <p className="text-sm text-gray-500 mt-2">
              This will permanently delete all transactions and settings. This cannot be undone.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 active:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => { onClearAll(); setShowClearConfirm(false); }}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-bold active:bg-red-600"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-xs text-gray-400">Petty Cash Tracker v2.0</p>
        <p className="text-[10px] text-gray-300 mt-0.5">Data stored locally on your device</p>
      </div>
    </div>
  );
}
