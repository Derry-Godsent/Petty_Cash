import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Transaction, AppSettings } from '../types';

function getSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }
  return supabase;
}

// Map Transaction (camelCase) to DB row (snake_case)
function toDbRow(t: Transaction) {
  return {
    id: t.id,
    user_id: t.user_id,
    date: t.date,
    description: t.description,
    category: t.category,
    amount: t.amount,
    type: t.type,
    notes: t.notes || null,
    created_at: t.createdAt,
  };
}

// Map DB row (snake_case) to Transaction (camelCase)
function fromDbRow(row: any): Transaction {
  return {
    id: row.id,
    user_id: row.user_id,
    date: row.date,
    description: row.description,
    category: row.category,
    amount: parseFloat(row.amount),
    type: row.type,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

export async function getAllTransactions(userId: string): Promise<Transaction[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
  
  return (data || []).map(fromDbRow);
}

export async function addTransaction(transaction: Transaction): Promise<void> {
  const db = getSupabase();
  const { error } = await db
    .from('transactions')
    .insert([toDbRow(transaction)]);

  if (error) {
    console.error('Error adding transaction:', error);
    throw error;
  }
}

export async function deleteTransaction(id: string, userId: string): Promise<void> {
  const db = getSupabase();
  const { error } = await db
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
}

export async function clearAllTransactions(userId: string): Promise<void> {
  const db = getSupabase();
  const { error } = await db
    .from('transactions')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error clearing transactions:', error);
    throw error;
  }
}

export async function getSettings(userId: string): Promise<AppSettings | null> {
  const db = getSupabase();
  const { data, error } = await db
    .from('settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching settings:', error);
    return null;
  }
  
  if (!data) return null;
  
  return {
    recipientName: data.recipient_name || '',
    recipientPhone: data.recipient_phone || '',
    senderName: data.sender_name || '',
    companyName: data.company_name || '',
  };
}

export async function saveSettings(userId: string, settings: AppSettings): Promise<void> {
  const db = getSupabase();
  const { error } = await db
    .from('settings')
    .upsert({
      user_id: userId,
      recipient_name: settings.recipientName,
      recipient_phone: settings.recipientPhone,
      sender_name: settings.senderName,
      company_name: settings.companyName,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

export async function exportAllData(userId: string): Promise<string> {
  const transactions = await getAllTransactions(userId);
  const settings = await getSettings(userId);
  
  const exportData = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    transactions,
    settings,
  };

  return JSON.stringify(exportData, null, 2);
}

export async function importAllData(userId: string, jsonString: string): Promise<void> {
  const data = JSON.parse(jsonString);
  
  await clearAllTransactions(userId);
  
  if (data.transactions && Array.isArray(data.transactions)) {
    const db = getSupabase();
    const transactionsToInsert = data.transactions.map((t: any) => ({
      id: t.id,
      user_id: userId,
      date: t.date,
      description: t.description,
      category: t.category,
      amount: t.amount,
      type: t.type,
      notes: t.notes || null,
      created_at: t.createdAt || t.created_at,
    }));
    
    const { error } = await db
      .from('transactions')
      .insert(transactionsToInsert);
    
    if (error) {
      console.error('Error importing transactions:', error);
      throw error;
    }
  }

  if (data.settings) {
    await saveSettings(userId, data.settings);
  }
}
