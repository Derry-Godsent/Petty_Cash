import { useState } from 'react';
import { AppSettings } from '../types';
import { Save, Download, Upload, Trash2, Database } from 'lucide-react';

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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900 text-sm">Your Details</h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Your Name</label>
            <input
              type="text"
              value={form.senderName}
              onChange={(e) => setForm({ ...form, senderName: e.target.value })}
              placeholder="Enter your name"
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none text-sm transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Company / Department</label>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              placeholder="Enter company name"
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none text-sm transition-all"
            />
          </div>
        </div>
      </div>

      {/* Recipient Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900 text-sm">Report Recipient</h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Recipient Name</label>
            <input
              type="text"
              value={form.recipientName}
              onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
              placeholder="Enter recipient name"
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none text-sm transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">WhatsApp Number</label>
            <input
              type="tel"
              value={form.recipientPhone}
              onChange={(e) => setForm({ ...form, recipientPhone: e.target.value })}
              placeholder="e.g., 233241234567"
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none text-sm transition-all"
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Include country code without + (e.g., 233 for Ghana)
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className={`w-full py-4 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] ${
          saved
            ? 'bg-green-600 text-white shadow-green-600/25'
            : 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-800/25'
        }`}
      >
        <Save className="w-4 h-4" />
        {saved ? 'Saved' : 'Save Settings'}
      </button>

      {/* Data Management */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-gray-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Data Storage</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Data is stored locally in your browser. Export regularly to back up your records.
          </p>
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
            className="w-full py-3 border border-red-200 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 active:bg-red-100 flex items-center justify-center gap-2 transition-colors"
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
                className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-bold active:bg-red-700"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-xs text-gray-500">Petty Cash Tracker v2.0</p>
        <p className="text-xs text-gray-400 mt-0.5">Data stored locally on your device</p>
      </div>
    </div>
  );
}
