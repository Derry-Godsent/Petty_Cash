import { useState, useEffect, useMemo } from 'react';
import { Transaction, AppSettings } from './types';
import {
  openCashbook, createCashbook, addTransaction, deleteTransaction, saveSettings,
  clearCashbook, replaceViewerLink, validateTransaction, DEFAULT_SETTINGS,
} from './lib/database';
import { AccessLink, readAccess, rememberAccess, newToken, tokenHash } from './lib/access';
import ShareLinks from './components/ShareLinks';
import Notifications from './components/Notifications';
import { useRef } from 'react';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import WeeklyReportView from './components/WeeklyReportView';
import Settings from './components/Settings';
import AddTransaction from './components/AddTransaction';
import { LayoutDashboard, List, FileText, Settings as SettingsIcon, Plus } from 'lucide-react';

type Tab = 'dashboard' | 'transactions' | 'report' | 'settings';

function App() {
  const [initial] = useState(() => {
    try { return { access: readAccess(), error: '' }; }
    catch (error) { return { access: null, error: error instanceof Error ? error.message : 'Invalid access link.' }; }
  });
  const [access, setAccess] = useState<AccessLink | null>(initial.access);
  const [role, setRole] = useState<'owner' | 'viewer'>('viewer');
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(Boolean(initial.access));
  const [loadError, setLoadError] = useState(initial.error);
  const [syncError, setSyncError] = useState('');
  const [reload, setReload] = useState(0);
  const [creating, setCreating] = useState(false);
  const [pastedLink, setPastedLink] = useState('');
  const creationKeys = useRef<AccessLink | null>(null);
  const pendingAdd = useRef<{ input: string; id: string } | null>(null);
  const mutation = useRef(0);
  const pendingWrites = useRef(0);
  const isOwner = role === 'owner';

  useEffect(() => {
    const followLink = () => {
      if (!new URLSearchParams(window.location.hash.slice(1)).has('access')) return;
      try {
        const next = readAccess();
        if (next) { setRole('viewer'); setShowAddModal(false); setLoading(true); setAccess(next); setActiveTab('dashboard'); }
      } catch (error) { setLoadError(error instanceof Error ? error.message : 'Invalid link.'); }
    };
    window.addEventListener('hashchange', followLink);
    return () => window.removeEventListener('hashchange', followLink);
  }, []);

  useEffect(() => {
    if (!access) return;
    let cancelled = false;
    let request = 0;
    let first = true;
    setLoading(true); setLoadError(''); setShowAddModal(false);
    const refresh = async () => {
      if (pendingWrites.current || document.hidden) return;
      const current = ++request;
      const version = mutation.current;
      try {
        const book = await openCashbook(access.token);
        const staleViewer = book.role === 'owner' && access.viewerToken && book.viewerKeyHash && await tokenHash(access.viewerToken) !== book.viewerKeyHash;
        if (cancelled || current !== request || version !== mutation.current) return;
        if (staleViewer) {
          const next = { token: access.token };
          rememberAccess(next); setAccess(next);
        }
        setRole(book.role);
        setTransactions(book.transactions);
        setSettings(previous => JSON.stringify(previous) === JSON.stringify(book.settings) ? previous : book.settings);
        setSyncError('');
        setLoading(false); first = false;
      } catch (error) {
        if (cancelled || current !== request) return;
        const message = error instanceof Error ? error.message : 'Could not sync your cashbook.';
        if (first || (error as { code?: string }).code === '42501') setLoadError(message);
        else setSyncError('Not synced: ' + message + ' Reconnecting automatically.');
        setLoading(false);
      }
    };
    void refresh();
    const visibleRefresh = () => { if (!document.hidden) void refresh(); };
    window.addEventListener('focus', visibleRefresh);
    window.addEventListener('online', visibleRefresh);
    document.addEventListener('visibilitychange', visibleRefresh);
    const timer = window.setInterval(visibleRefresh, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', visibleRefresh);
      window.removeEventListener('online', visibleRefresh);
      document.removeEventListener('visibilitychange', visibleRefresh);
    };
  }, [access, reload]);

  const ownerToken = () => {
    if (!access || !isOwner) throw new Error('This cashbook is view-only.');
    return access.token;
  };
  const write = async <T,>(operation: () => Promise<T>): Promise<T> => {
    mutation.current++; pendingWrites.current++;
    try { return await operation(); }
    finally { mutation.current++; pendingWrites.current--; }
  };
  const create = async () => {
    if (creating) return;
    setCreating(true); setLoadError('');
    // Reuse these keys on retry if the server saved but the response was lost.
    creationKeys.current ||= { token: newToken(), viewerToken: newToken() };
    try {
      const keys = creationKeys.current;
      await createCashbook(keys.token, keys.viewerToken!);
      rememberAccess(keys); setAccess(keys); setActiveTab('settings');
    } catch (error) { setLoadError(error instanceof Error ? error.message : 'Could not create cashbook.'); }
    finally { setCreating(false); }
  };
  const openPastedLink = () => {
    try {
      const url = new URL(pastedLink);
      if (!new URLSearchParams(url.hash.slice(1)).has('access')) throw new Error('Paste the full private cashbook link.');
      window.location.hash = url.hash;
      const next = readAccess();
      if (next) { setLoadError(''); setRole('viewer'); setShowAddModal(false); setLoading(true); setAccess(next); setActiveTab('dashboard'); }
    } catch (error) { setLoadError(error instanceof Error ? error.message : 'Invalid private link.'); }
  };

  const handleAddTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'user_id'>) => {
    await write(async () => {
      const input = JSON.stringify(transaction);
      if (pendingAdd.current?.input !== input) pendingAdd.current = { input, id: crypto.randomUUID() };
      const saved = await addTransaction(ownerToken(), transaction, pendingAdd.current.id);
      pendingAdd.current = null;
      setTransactions(previous => [saved, ...previous.filter(row => row.id !== saved.id)]);
    });
  };
  const handleDeleteTransaction = async (id: string) => {
    await write(async () => {
      await deleteTransaction(ownerToken(), id);
      setTransactions(previous => previous.filter(row => row.id !== id));
    });
  };
  const handleSaveSettings = async (newSettings: AppSettings) => {
    await write(async () => {
      await saveSettings(ownerToken(), newSettings);
      setSettings(newSettings);
    });
  };
  const handleReplaceViewer = async () => {
    const token = ownerToken();
    const viewerToken = newToken();
    await replaceViewerLink(token, viewerToken);
    const next = { token, viewerToken };
    rememberAccess(next); setAccess(next);
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
    ownerToken();
    const data = JSON.parse(content);
    if (!data || !Array.isArray(data.transactions)) throw new Error('Choose a valid Petty Cash backup.');
    data.transactions.forEach(validateTransaction);
    const importedSettings = data.settings ? Object.fromEntries(
      Object.keys(DEFAULT_SETTINGS).map(key => [key, typeof data.settings[key] === 'string' ? data.settings[key] : ''])
    ) as unknown as AppSettings : settings;
    await write(async () => {
      await saveSettings(ownerToken(), importedSettings);
      setSettings(importedSettings);
      let added = 0;
      try {
        for (const row of data.transactions) {
          const transaction = { date: row.date, description: row.description.trim(), category: row.category.trim(), amount: row.amount, type: row.type, notes: row.notes };
          const saved = await addTransaction(ownerToken(), transaction, crypto.randomUUID());
          setTransactions(previous => [saved, ...previous.filter(t => t.id !== saved.id)]);
          added++;
        }
      } catch (error) {
        throw new Error(`Import stopped after ${added} transactions. Already imported rows were kept; do not re-import the full file. ${error instanceof Error ? error.message : ''}`);
      }
    });
  };
  const handleClearAll = async () => {
    await write(async () => {
      await clearCashbook(ownerToken());
      setTransactions([]); setSettings(DEFAULT_SETTINGS);
    });
  };

  const currentBalance = useMemo(() => {
    return transactions.reduce((balance, t) => {
      return t.type === 'income' ? balance + t.amount : balance - t.amount;
    }, 0);
  }, [transactions]);

  if (!access) return (
    <div className="app-shell flex items-center justify-center bg-gray-50 p-5">
      <div className="max-w-md w-full space-y-5">
        <h1 className="text-2xl font-bold text-gray-900">Petty Cash</h1>
        {loadError && <p role="alert" className="text-sm text-red-700 break-words">{loadError}</p>}
        <button disabled={creating} onClick={create} className="w-full py-4 bg-slate-800 text-white rounded-xl font-semibold">{creating ? 'Creating…' : 'Create cashbook'}</button>
        <label htmlFor="existing-link" className="block text-sm font-semibold">Existing cashbook</label>
        <input id="existing-link" type="url" value={pastedLink} onChange={event => setPastedLink(event.target.value)} placeholder="Private access link" className="w-full border border-gray-200 rounded-xl p-3" />
        <button disabled={!pastedLink.trim() || creating} onClick={openPastedLink} className="w-full py-3 border border-gray-300 rounded-xl font-semibold">Open cashbook</button>
      </div>
    </div>
  );

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

  if (loadError) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="max-w-md space-y-4">
        <h1 className="text-xl font-bold">Unable to connect</h1>
        <p role="alert" className="text-sm text-gray-600 break-words">{loadError}</p>
        <button className="px-5 py-3 bg-slate-800 text-white rounded-xl" onClick={() => setReload(value => value + 1)}>Reconnect</button>
      </div>
    </div>
  );

  return (
    <div className="app-shell bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-900 tracking-tight">Petty Cash</h1>
            {settings.companyName && (
              <p className="text-[11px] text-gray-500">{settings.companyName}</p>
            )}
          </div>
          {!isOwner && <span className="text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg px-3 py-2">View only</span>}
          {isOwner && <button
            aria-label="Add transaction"
            onClick={() => setShowAddModal(true)}
            className="w-10 h-10 bg-slate-800 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5" />
          </button>}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-3 app-content">
        {syncError && <p role="status" className="text-xs text-amber-800 bg-amber-50 rounded-xl p-3 mb-3">{syncError}</p>}
        {activeTab === 'dashboard' && (
          <>
            <Notifications token={access.token} />
            <Dashboard transactions={transactions} currentBalance={currentBalance} />
          </>
        )}
        {activeTab === 'transactions' && (
          <TransactionList transactions={transactions} onDelete={isOwner ? handleDeleteTransaction : undefined} />
        )}
        {activeTab === 'report' && (
          <WeeklyReportView
            transactions={transactions}
            recipientPhone={settings.recipientPhone}
            recipientName={settings.recipientName}
            senderName={settings.senderName}
          />
        )}
        {activeTab === 'settings' && isOwner && (
          <div className="space-y-4">
          <ShareLinks access={access} onReplaceViewer={handleReplaceViewer} />
          <Settings
            settings={settings}
            onSave={handleSaveSettings}
            onExport={handleExport}
            onImport={handleImport}
            onClearAll={handleClearAll}
          />
          </div>
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
          {isOwner && <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 flex flex-col items-center py-2 transition-all ${
              activeTab === 'settings' ? 'text-slate-800' : 'text-gray-400'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-all ${activeTab === 'settings' ? 'bg-gray-100' : ''}`}>
              <SettingsIcon className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 font-medium">Settings</span>
          </button>}
        </div>
      </nav>

      {/* Add Transaction Modal */}
      {showAddModal && isOwner && (
        <AddTransaction
          onAdd={handleAddTransaction}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

export default App;
