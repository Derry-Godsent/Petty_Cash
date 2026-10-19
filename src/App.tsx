import { useState, useMemo, useEffect } from 'react';
import { Transaction, AppSettings } from './types';

import { 
  getTeamTransactions, 
  addTeamTransaction,
  deleteTeamTransaction,
  clearTeamTransactions,
  getSettings,
  saveSettings,
  subscribeToTeamTransactions,
  generateTeamCode
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
  recipientEmail: '',
  senderName: '',
  companyName: '',
  teamCode: '',
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
        
        const settingsData = await getSettings(uid);
        if (settingsData) {
          setSettings(settingsData);
          // If user has a team code, load team data
          if (settingsData.teamCode) {
            const txData = await getTeamTransactions(settingsData.teamCode);
            setTransactions(txData);
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Real-time subscription to team transactions
  useEffect(() => {
    if (settings.teamCode) {
      const unsubscribe = subscribeToTeamTransactions(settings.teamCode, (updatedTransactions) => {
        setTransactions(updatedTransactions);
      });
      return unsubscribe;
    }
  }, [settings.teamCode]);





  const currentBalance = useMemo(() => {
    return transactions.reduce((balance, t) => {
      return t.type === 'income' ? balance + t.amount : balance - t.amount;
    }, 0);
  }, [transactions]);

  const handleAddTransaction = async (data: Omit<Transaction, 'id' | 'createdAt' | 'user_id'>) => {
    if (!settings.teamCode) {
      alert('Please set up a team code in Settings first.');
      return;
    }
    try {
      await addTeamTransaction(settings.teamCode, data);
      // Real-time subscription will update the UI automatically
    } catch (error) {
      console.error('Failed to add transaction:', error);
      alert('Failed to add transaction. Please try again.');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!settings.teamCode) return;
    try {
      await deleteTeamTransaction(id, settings.teamCode);
      // Real-time subscription will update the UI automatically
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      alert('Failed to delete transaction. Please try again.');
    }
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    await saveSettings(userId, newSettings);
    setSettings(newSettings);
    
    // If team code changed, load team data
    if (newSettings.teamCode && newSettings.teamCode !== settings.teamCode) {
      const txData = await getTeamTransactions(newSettings.teamCode);
      setTransactions(txData);
    }
  };

  const handleExport = async () => {
    try {
      const exportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        transactions,
        settings,
      };
      const jsonData = JSON.stringify(exportData, null, 2);
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
      const data = JSON.parse(jsonString);
      if (data.settings) {
        await saveSettings(userId, data.settings);
        setSettings(data.settings);
      }
      if (data.transactions && Array.isArray(data.transactions) && settings.teamCode) {
        await clearTeamTransactions(settings.teamCode);
        for (const t of data.transactions) {
          await addTeamTransaction(settings.teamCode, {
            date: t.date,
            description: t.description,
            category: t.category,
            amount: t.amount,
            type: t.type,
            notes: t.notes,
          });
        }
      }
      
      alert('Data imported successfully!');
    } catch {
      alert('Invalid file format. Please use a valid JSON backup file.');
    }
  };

  const handleClearAll = async () => {
    if (settings.teamCode) {
      await clearTeamTransactions(settings.teamCode);
    }
    setTransactions([]);
  };

  const handleGenerateTeamCode = () => {
    const newCode = generateTeamCode();
    const newSettings = { ...settings, teamCode: newCode };
    handleSaveSettings(newSettings);
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
            onGenerateTeamCode={handleGenerateTeamCode}
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
