import { useState, useMemo, useEffect } from 'react';
import { Transaction, AppSettings } from './types';
import { parseSharedReport } from './utils/report';
import { 
  getAllTransactions, 
  addTransaction as dbAddTransaction, 
  deleteTransaction as dbDeleteTransaction,
  clearAllTransactions,
  getSettings,
  saveSettings,
  exportAllData,
  importAllData
} from './lib/database';
import { getUserId } from './lib/auth';
import { isSupabaseConfigured } from './lib/supabase';
import Dashboard from './components/Dashboard';
import AddTransaction from './components/AddTransaction';
import TransactionList from './components/TransactionList';
import WeeklyReportView from './components/WeeklyReportView';
import Settings from './components/Settings';
import BossView from './components/BossView';
import { LayoutDashboard, PlusCircle, List, FileText, Settings as SettingsIcon, AlertCircle } from 'lucide-react';

type Tab = 'dashboard' | 'transactions' | 'report' | 'settings';

const DEFAULT_SETTINGS: AppSettings = {
  recipientName: '',
  recipientPhone: '',
  senderName: '',
  companyName: '',
};

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showAddForm, setShowAddForm] = useState(false);
  const [sharedData, setSharedData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');

  // Load data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        const uid = getUserId();
        setUserId(uid);
        
        const [txData, settingsData] = await Promise.all([
          getAllTransactions(uid),
          getSettings(uid)
        ]);
        
        setTransactions(txData);
        if (settingsData) {
          setSettings(settingsData);
        }
      } catch (error) {
        console.error('Failed to load ', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Check for shared report in URL hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const data = parseSharedReport(hash);
      if (data) {
        setSharedData(data);
      }
    }
  }, []);

  // If viewing a shared report, show BossView
  if (sharedData) {
    return <BossView data={sharedData} />;
  }

  const currentBalance = useMemo(() => {
    return transactions.reduce((balance, t) => {
      return t.type === 'income' ? balance + t.amount : balance - t.amount;
    }, 0);
  }, [transactions]);

  const handleAddTransaction = async (data: Omit<Transaction, 'id' | 'createdAt' | 'user_id'>) => {
    const newTransaction: Transaction = {
      ...data,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2),
      user_id: userId,
      createdAt: new Date().toISOString(),
    };
    
    await dbAddTransaction(newTransaction);
    setTransactions((prev) => [...prev, newTransaction]);
  };

  const handleDeleteTransaction = async (id: string) => {
    await dbDeleteTransaction(id, userId);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    await saveSettings(userId, newSettings);
    setSettings(newSettings);
  };

  const handleExport = async () => {
    try {
      const jsonData = await exportAllData(userId);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `petty-cash-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to export data');
    }
  };

  const handleImport = async (jsonString: string) => {
    try {
      await importAllData(userId, jsonString);
      
      // Reload data
      const [txData, settingsData] = await Promise.all([
        getAllTransactions(userId),
        getSettings(userId)
      ]);
      
      setTransactions(txData);
      if (settingsData) {
        setSettings(settingsData);
      }
      
      alert('Data imported successfully!');
    } catch {
      alert('Invalid file format. Please use a valid JSON backup file.');
    }
  };

  const handleClearAll = async () => {
    await clearAllTransactions(userId);
    setTransactions([]);
    setSettings(DEFAULT_SETTINGS);
    await saveSettings(userId, DEFAULT_SETTINGS);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'transactions', label: 'History', icon: <List className="w-5 h-5" /> },
    { id: 'report', label: 'Report', icon: <FileText className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-5 h-5" /> },
  ];

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Setup Required</h1>
          </div>
          <div className="space-y-3 text-sm text-gray-600">
            <p>Supabase is not configured. To use this app, you need to:</p>
            <ol className="list-decimal list-inside space-y-2 pl-2">
              <li>Create a Supabase project at supabase.com</li>
              <li>Run the SQL setup script (see SUPABASE_SETUP.md)</li>
              <li>Create a .env file with your credentials:</li>
            </ol>
            <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs overflow-x-auto">
              <p>VITE_SUPABASE_URL=https://...supabase.co</p>
              <p>VITE_SUPABASE_ANON_KEY=eyJ...</p>
            </div>
            <p className="text-xs text-gray-500">See SUPABASE_SETUP.md for detailed instructions.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-gray-500 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100/50 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-5 py-3.5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Petty Cash</h1>
            {settings.companyName && (
              <p className="text-xs text-gray-500">{settings.companyName}</p>
            )}
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="w-11 h-11 bg-slate-800 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <PlusCircle className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-28">
        {activeTab === 'dashboard' && (
          <Dashboard transactions={transactions} currentBalance={currentBalance} />
        )}
        {activeTab === 'transactions' && (
          <TransactionList transactions={transactions} onDelete={handleDeleteTransaction} />
        )}
        {activeTab === 'report' && (
          <WeeklyReportView
            transactions={transactions}
            recipientPhone={settings.recipientPhone}
            recipientName={settings.recipientName}
            senderName={settings.senderName}
            companyName={settings.companyName}
          />
        )}
        {activeTab === 'settings' && (
          <Settings
            settings={settings}
            onSave={handleSaveSettings}
            onExport={handleExport}
            onImport={handleImport}
            onClearAll={handleClearAll}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100/50 z-40">
        <div className="max-w-lg mx-auto flex px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-3 transition-all ${
                activeTab === tab.id
                  ? 'text-slate-800'
                  : 'text-gray-400 active:text-gray-600'
              }`}
            >
              <div className={`p-1 rounded-lg transition-all ${activeTab === tab.id ? 'bg-gray-100' : ''}`}>
                {tab.icon}
              </div>
              <span className="text-[10px] mt-0.5 font-semibold">{tab.label}</span>
            </button>
          ))}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>

      {/* Add Transaction Modal */}
      {showAddForm && (
        <AddTransaction onAdd={handleAddTransaction} onClose={() => setShowAddForm(false)} />
      )}
    </div>
  );
}
