import { supabase } from '../lib/supabase';
import { Transaction, AppSettings } from '../types';

export async function getAllTransactions(userId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addTransaction(transaction: Transaction): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .insert([transaction]);

  if (error) throw error;
}

export async function deleteTransaction(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function clearAllTransactions(userId: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}

export async function getSettings(userId: string): Promise<AppSettings | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows returned
    throw error;
  }
  
  return data ? {
    recipientName: data.recipient_name,
    recipientPhone: data.recipient_phone,
    senderName: data.sender_name,
    companyName: data.company_name,
  } : null;
}

export async function saveSettings(userId: string, settings: AppSettings): Promise<void> {
  const { error } = await supabase
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

  if (error) throw error;
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
  
  // Clear existing transactions
  await clearAllTransactions(userId);
  
  // Import transactions
  if (data.transactions && Array.isArray(data.transactions)) {
    const transactionsToInsert = data.transactions.map((t: any) => ({
      ...t,
      user_id: userId,
    }));
    
    const { error } = await supabase
      .from('transactions')
      .insert(transactionsToInsert);
    
    if (error) throw error;
  }

  // Import settings
  if (data.settings) {
    await saveSettings(userId, data.settings);
  }
}
