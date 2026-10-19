import { useState, useMemo, useEffect } from 'react';
import { Transaction, AppSettings } from './types';

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
import Dashboard from './components/Dashboard';
import AddTransaction from './components/AddTransaction';
import TransactionList from './components/TransactionList';
import WeeklyReportView from './components/WeeklyReportView';
import Settings from './components/Settings';

import { LayoutDashboard, PlusCircle, List, FileText, Settings as SettingsIcon } from 'lucide-react';

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
        // Don't block the UI on load error - user can still try to add data
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Refresh data when tab becomes visible (for multi-device sync)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userId) {
        getAllTransactions(userId).then(setTransactions).catch(console.error);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userId]);





  const currentBalance = useMemo(() => {
    return transactions.reduce((balance, t) => {
      return t.type === 'income' ? balance + t.amount : balance - t.amount;
    }, 0);
  }, [transactions]);

  const handleAddTransaction = async (data: Omit<Transaction, 'id' | 'createdAt' | 'user_id'>) => {
    try {
      const newTransaction: Transaction = {
        ...data,
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2),
        user_id: userId,
        createdAt: new Date().toISOString(),
      };
      
      await dbAddTransaction(newTransaction);
      
      // Refresh transactions from database to ensure consistency
      const updatedTransactions = await getAllTransactions(userId);
      setTransactions(updatedTransactions);
    } catch (error) {
      console.error('Failed to add transaction:', error);
      alert('Failed to add transaction. Please try again.');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await dbDeleteTransaction(id, userId);
      // Refresh from database
      const updatedTransactions = await getAllTransactions(userId);
      setTransactions(updatedTransactions);
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      alert('Failed to delete transaction. Please try again.');
    }
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-900 tracking-tight">Petty Cash</h1>
            {settings.companyName && (
              <p className="text-[11px] text-gray-500">{settings.companyName}</p>
            )}
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="w-10 h-10 bg-slate-800 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-transform"
          >
            <PlusCircle className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-3 pb-20">
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
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-lg mx-auto flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-2 transition-all ${
                activeTab === tab.id
                  ? 'text-slate-800'
                  : 'text-gray-400 active:text-gray-600'
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-all ${activeTab === tab.id ? 'bg-gray-100' : ''}`}>
                {tab.icon}
              </div>
              <span className="text-[10px] mt-0.5 font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Add Transaction Modal */}
      {showAddForm && (
        <AddTransaction onAdd={handleAddTransaction} onClose={() => setShowAddForm(false)} />
      )}
    </div>
  );
}
