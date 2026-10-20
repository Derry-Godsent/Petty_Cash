import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Transaction, AppSettings } from '../types';

interface PettyCashDB extends DBSchema {
  transactions: {
    key: string;
    value: Transaction;
    indexes: { 'by-date': string; 'by-type': string };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
  metadata: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'petty-cash-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<PettyCashDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<PettyCashDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<PettyCashDB>(DB_NAME, DB_VERSION, {
    upgrade(db: any) {
      // Transactions store
      if (!db.objectStoreNames.contains('transactions')) {
        const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
        txStore.createIndex('by-date', 'date');
        txStore.createIndex('by-type', 'type');
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }

      // Metadata store
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

// Transactions
export async function getAllTransactions(): Promise<Transaction[]> {
  const db = await getDB();
  return db.getAll('transactions');
}

export async function addTransaction(transaction: Transaction): Promise<void> {
  const db = await getDB();
  await db.put('transactions', transaction);
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('transactions', id);
}

export async function clearAllTransactions(): Promise<void> {
  const db = await getDB();
  await db.clear('transactions');
}

// Settings
export async function getSettings(): Promise<AppSettings | null> {
  const db = await getDB();
  const result = await db.get('settings', 'app-settings');
  return result || null;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', { ...settings, id: 'app-settings' } as any);
}

// Metadata
export async function getLastBackupDate(): Promise<string | null> {
  const db = await getDB();
  const result = await db.get('metadata', 'last-backup');
  return result?.value || null;
}

export async function setLastBackupDate(date: string): Promise<void> {
  const db = await getDB();
  await db.put('metadata', { key: 'last-backup', value: date });
}

// Export all data
export async function exportAllData(): Promise<string> {
  const transactions = await getAllTransactions();
  const settings = await getSettings();
  
  const exportData = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    transactions,
    settings,
  };

  return JSON.stringify(exportData, null, 2);
}

// Import all data
export async function importAllData(jsonString: string): Promise<void> {
  const data = JSON.parse(jsonString);
  const db = await getDB();

  // Clear existing data
  await db.clear('transactions');
  
  // Import transactions
  if (data.transactions && Array.isArray(data.transactions)) {
    const txStore = db.transaction('transactions', 'readwrite').store;
    await Promise.all(data.transactions.map((t: Transaction) => txStore.put(t)));
  }

  // Import settings
  if (data.settings) {
    await db.put('settings', { ...data.settings, id: 'app-settings' });
  }

  // Update last backup date
  await setLastBackupDate(new Date().toISOString());
}

// Check if backup is needed (every 7 days)
export async function shouldRemindBackup(): Promise<boolean> {
  const lastBackup = await getLastBackupDate();
  if (!lastBackup) return true;

  const daysSinceBackup = (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceBackup >= 7;
}
