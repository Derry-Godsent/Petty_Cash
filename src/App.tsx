import { useState, useMemo } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Transaction } from './types';
import Dashboard from './components/Dashboard';
import AddTransaction from './components/AddTransaction';
import TransactionList from './components/TransactionList';
import WeeklyReportView from './components/WeeklyReportView';
import Settings from './components/Settings';
import { LayoutDashboard, PlusCircle, List, FileText, Settings as SettingsIcon } from 'lucide-react';

type Tab = 'dashboard' | 'transactions' | 'report' | 'settings';

interface AppSettings {
  bossName: string;
  bossPhone: string;
  currency: string;
}

export default function App() {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('petty-cash-transactions', []);
  const [settings, setSettings] = useLocalStorage<AppSettings>('petty-cash-settings', {
    bossName: '',
    bossPhone: '',
    currency: '₹',
  });
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showAddForm, setShowAddForm] = useState(false);

  const currentBalance = useMemo(() => {
    return transactions.reduce((balance, t) => {
      return t.type === 'income' ? balance + t.amount : balance - t.amount;
    }, 0);
  }, [transactions]);

  const handleAddTransaction = (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTransaction: Transaction = {
      ...data,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2),
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [...prev, newTransaction]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
  };

  const handleExport = () => {
    const data = {
      transactions,
      settings,
      exportDate: new Date().toISOString(),
      version: '1.0',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `petty-cash-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      if (data.transactions && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
      }
      if (data.settings) {
        setSettings(data.settings);
      }
      alert('Data imported successfully!');
    } catch {
      alert('Invalid file format. Please use a valid JSON backup file.');
    }
  };

  const handleClearAll = () => {
    setTransactions([]);
    setSettings({ bossName: '', bossPhone: '', currency: '₹' });
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'transactions', label: 'History', icon: <List className="w-5 h-5" /> },
    { id: 'report', label: 'Report', icon: <FileText className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-800">💰 Petty Cash</h1>
            <p className="text-xs text-gray-400">Track • Report • Share</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="w-10 h-10 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
          >
            <PlusCircle className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-24">
        {activeTab === 'dashboard' && (
          <Dashboard transactions={transactions} currentBalance={currentBalance} />
        )}
        {activeTab === 'transactions' && (
          <TransactionList transactions={transactions} onDelete={handleDeleteTransaction} />
        )}
        {activeTab === 'report' && (
          <WeeklyReportView
            transactions={transactions}
            bossPhone={settings.bossPhone}
            bossName={settings.bossName}
          />
        )}
        {activeTab === 'settings' && (
          <Settings
            bossName={settings.bossName}
            bossPhone={settings.bossPhone}
            currency={settings.currency}
            onSave={handleSaveSettings}
            onExport={handleExport}
            onImport={handleImport}
            onClearAll={handleClearAll}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40">
        <div className="max-w-lg mx-auto flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-2.5 transition-colors ${
                activeTab === tab.id
                  ? 'text-emerald-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.icon}
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
