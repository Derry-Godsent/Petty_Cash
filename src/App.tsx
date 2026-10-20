import { useState, useEffect, useMemo } from 'react';
import { Transaction, AppSettings } from './types';
import { 
  getTransactions, 
  addTransaction, 
  deleteTransaction, 
  getSettings, 
  saveSettings,
  getTeamTransactions,
  addTeamTransaction,
  deleteTeamTransaction,
  subscribeToTeamTransactions,
  generateTeamCode
} from './lib/database';
import { getUserId } from './lib/database';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import WeeklyReportView from './components/WeeklyReportView';
import Settings from './components/Settings';
import AddTransaction from './components/AddTransaction';
import { LayoutDashboard, List, FileText, Settings as SettingsIcon, Plus } from 'lucide-react';

type Tab = 'dashboard' | 'transactions' | 'report' | 'settings';

const DEFAULT_SETTINGS: AppSettings = {
  recipientName: '',
  recipientPhone: '',
  recipientEmail: '',
  senderName: '',
  companyName: '',
  teamCode: '',
};

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const userId = getUserId();
        const savedSettings = await getSettings(userId);
        
        if (savedSettings) {
          setSettings(savedSettings);
          
          // Load transactions based on team code
          if (savedSettings.teamCode) {
            const teamTransactions = await getTeamTransactions(savedSettings.teamCode);
            setTransactions(teamTransactions);
            
            // Subscribe to real-time updates
            const unsubscribe = subscribeToTeamTransactions(savedSettings.teamCode, (updatedTransactions) => {
              setTransactions(updatedTransactions);
            });
            
            return () => unsubscribe();
          } else {
            // Load personal transactions
            const personalTransactions = await getTransactions(userId);
            setTransactions(personalTransactions);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleAddTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'user_id'>) => {
    try {
      const userId = getUserId();
      
      if (settings.teamCode) {
        // Add to team transactions
        await addTeamTransaction(settings.teamCode, transaction);
      } else {
        // Add to personal transactions
        await addTransaction({
          ...transaction,
          user_id: userId,
        });
      }
      
      // Refresh transactions
      if (settings.teamCode) {
        const updatedTransactions = await getTeamTransactions(settings.teamCode);
        setTransactions(updatedTransactions);
      } else {
        const updatedTransactions = await getTransactions(userId);
        setTransactions(updatedTransactions);
      }
      
      setShowAddModal(false);
    } catch (error: any) {
      console.error('Error adding transaction:', error);
      const errorMessage = error?.message || 'Unknown error';
      alert(`Failed to add transaction: ${errorMessage}\n\nPlease check:\n1. Database migration was run\n2. All required columns exist in transactions table\n3. RLS policies are set up`);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      if (settings.teamCode) {
        await deleteTeamTransaction(id, settings.teamCode);
      } else {
        await deleteTransaction(id);
      }
      
      // Refresh transactions
      const userId = getUserId();
      if (settings.teamCode) {
        const updatedTransactions = await getTeamTransactions(settings.teamCode);
        setTransactions(updatedTransactions);
      } else {
        const updatedTransactions = await getTransactions(userId);
        setTransactions(updatedTransactions);
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction. Please try again.');
    }
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    try {
      const userId = getUserId();
      console.log('Attempting to save settings for user:', userId);
      await saveSettings(userId, newSettings);
      console.log('Settings saved successfully');
      setSettings(newSettings);
      
      // Reload transactions if team code changed
      if (newSettings.teamCode && newSettings.teamCode !== settings.teamCode) {
        const teamTransactions = await getTeamTransactions(newSettings.teamCode);
        setTransactions(teamTransactions);
      } else if (!newSettings.teamCode && settings.teamCode) {
        // Switched from team to personal
        const personalTransactions = await getTransactions(userId);
        setTransactions(personalTransactions);
      }
    } catch (error: any) {
      console.error('Error saving settings:', error);
      const errorMessage = error?.message || 'Unknown error';
      alert(`Failed to save settings: ${errorMessage}\n\nPlease check:\n1. Database migration was run\n2. Columns exist in settings table\n3. RLS policies are set up`);
    }
  };

  const handleGenerateTeamCode = () => {
    const newCode = generateTeamCode();
    setSettings({ ...settings, teamCode: newCode });
  };

  const handleExport = () => {
    const data = {
      settings,
      transactions,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `petty-cash-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (content: string) => {
    try {
      const data = JSON.parse(content);
      if (data.settings) {
        await handleSaveSettings(data.settings);
      }
      if (data.transactions && Array.isArray(data.transactions)) {
        const userId = getUserId();
        for (const transaction of data.transactions) {
          await addTransaction({
            ...transaction,
            user_id: userId,
          });
        }
        const updatedTransactions = await getTransactions(userId);
        setTransactions(updatedTransactions);
      }
      alert('Data imported successfully!');
    } catch (error) {
      console.error('Error importing data:', error);
      alert('Failed to import data. Please check the file format.');
    }
  };

  const handleClearAll = async () => {
    try {
      // Delete all transactions
      for (const transaction of transactions) {
        await deleteTransaction(transaction.id);
      }
      // Reset settings
      await handleSaveSettings(DEFAULT_SETTINGS);
      setTransactions([]);
      setSettings(DEFAULT_SETTINGS);
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Failed to clear data. Please try again.');
    }
  };

  const currentBalance = useMemo(() => {
    return transactions.reduce((balance, t) => {
      return t.type === 'income' ? balance + t.amount : balance - t.amount;
    }, 0);
  }, [transactions]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
            onClick={() => setShowAddModal(true)}
            className="w-10 h-10 bg-slate-800 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5" />
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
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 flex flex-col items-center py-2 transition-all ${
              activeTab === 'dashboard' ? 'text-slate-800' : 'text-gray-400'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-gray-100' : ''}`}>
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 font-medium">Home</span>
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 flex flex-col items-center py-2 transition-all ${
              activeTab === 'transactions' ? 'text-slate-800' : 'text-gray-400'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-all ${activeTab === 'transactions' ? 'bg-gray-100' : ''}`}>
              <List className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 font-medium">History</span>
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`flex-1 flex flex-col items-center py-2 transition-all ${
              activeTab === 'report' ? 'text-slate-800' : 'text-gray-400'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-all ${activeTab === 'report' ? 'bg-gray-100' : ''}`}>
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 font-medium">Report</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 flex flex-col items-center py-2 transition-all ${
              activeTab === 'settings' ? 'text-slate-800' : 'text-gray-400'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-all ${activeTab === 'settings' ? 'bg-gray-100' : ''}`}>
              <SettingsIcon className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 font-medium">Settings</span>
          </button>
        </div>
      </nav>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <AddTransaction
          onAdd={handleAddTransaction}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

export default App;
