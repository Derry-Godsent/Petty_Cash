import { useState, useMemo, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Transaction, AppSettings } from './types';
import { parseSharedReport } from './utils/report';
import Dashboard from './components/Dashboard';
import AddTransaction from './components/AddTransaction';
import TransactionList from './components/TransactionList';
import WeeklyReportView from './components/WeeklyReportView';
import Settings from './components/Settings';
import BossView from './components/BossView';
import { LayoutDashboard, PlusCircle, List, FileText, Settings as SettingsIcon } from 'lucide-react';

type Tab = 'dashboard' | 'transactions' | 'report' | 'settings';

const DEFAULT_SETTINGS: AppSettings = {
  bossName: '',
  bossPhone: '',
  yourName: '',
  companyName: '',
};

export default function App() {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('petty-cash-transactions', []);
  const [settings, setSettings] = useLocalStorage<AppSettings>('petty-cash-settings', DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showAddForm, setShowAddForm] = useState(false);
  const [sharedData, setSharedData] = useState<any>(null);

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
      version: '2.0',
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
        setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      }
      alert('Data imported successfully!');
    } catch {
      alert('Invalid file format. Please use a valid JSON backup file.');
    }
  };

  const handleClearAll = () => {
    setTransactions([]);
    setSettings(DEFAULT_SETTINGS);
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
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100/50 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-5 py-3.5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-gray-900 tracking-tight">💰 Petty Cash</h1>
            {settings.companyName && (
              <p className="text-[11px] text-gray-400 font-medium">{settings.companyName}</p>
            )}
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 active:scale-95 transition-transform"
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
            bossPhone={settings.bossPhone}
            bossName={settings.bossName}
            senderName={settings.yourName}
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
                  ? 'text-emerald-600'
                  : 'text-gray-400 active:text-gray-600'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${activeTab === tab.id ? 'bg-emerald-50' : ''}`}>
                {tab.icon}
              </div>
              <span className="text-[10px] mt-0.5 font-semibold">{tab.label}</span>
            </button>
          ))}
        </div>
        {/* Safe area spacer for mobile */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>

      {/* Add Transaction Modal */}
      {showAddForm && (
        <AddTransaction onAdd={handleAddTransaction} onClose={() => setShowAddForm(false)} />
      )}
    </div>
  );
}
