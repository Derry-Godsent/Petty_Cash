import { useState } from 'react';
import { Save, User, Phone, Download, Upload, Trash2 } from 'lucide-react';

interface SettingsProps {
  bossName: string;
  bossPhone: string;
  currency: string;
  onSave: (settings: { bossName: string; bossPhone: string; currency: string }) => void;
  onExport: () => void;
  onImport: (data: string) => void;
  onClearAll: () => void;
}

export default function Settings({
  bossName,
  bossPhone,
  currency,
  onSave,
  onExport,
  onImport,
  onClearAll,
}: SettingsProps) {
  const [name, setName] = useState(bossName);
  const [phone, setPhone] = useState(bossPhone);
  const [curr, setCurr] = useState(currency);
  const [saved, setSaved] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleSave = () => {
    onSave({ bossName: name, bossPhone: phone, currency: curr });
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
      {/* Boss Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-600" />
          Boss Details
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Boss Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., John Smith"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              <Phone className="w-3.5 h-3.5 inline mr-1" />
              WhatsApp Number (with country code)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g., 919876543210"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Include country code without + sign (e.g., 91 for India, 1 for US)
            </p>
          </div>
        </div>
      </div>

      {/* Currency */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">💱 Currency</h3>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Currency Symbol</label>
          <select
            value={curr}
            onChange={(e) => setCurr(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
          >
            <option value="₹">₹ INR (Indian Rupee)</option>
            <option value="$">$ USD (US Dollar)</option>
            <option value="€">€ EUR (Euro)</option>
            <option value="£">£ GBP (British Pound)</option>
            <option value="¥">¥ JPY (Japanese Yen)</option>
          </select>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className={`w-full py-3 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md ${
          saved
            ? 'bg-green-500 text-white'
            : 'bg-emerald-500 hover:bg-emerald-600 text-white'
        }`}
      >
        <Save className="w-4 h-4" />
        {saved ? 'Saved!' : 'Save Settings'}
      </button>

      {/* Data Management */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">📦 Data Management</h3>
        <div className="space-y-3">
          <button
            onClick={onExport}
            className="w-full py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Data (JSON)
          </button>
          <label className="w-full py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            Import Data (JSON)
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full py-2.5 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 flex items-center justify-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Data
          </button>
        </div>

        {showClearConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full">
              <h3 className="font-bold text-gray-800 mb-2">Clear All Data?</h3>
              <p className="text-sm text-gray-500 mb-4">
                This will permanently delete all transactions and settings. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onClearAll();
                    setShowClearConfirm(false);
                  }}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600"
                >
                  Delete All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* About */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center">
        <p className="text-sm text-gray-500">Petty Cash Tracker v1.0</p>
        <p className="text-xs text-gray-400 mt-1">Data stored locally in your browser</p>
      </div>
    </div>
  );
}
