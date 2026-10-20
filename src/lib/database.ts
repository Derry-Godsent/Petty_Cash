import { supabase } from './supabase';
import { Transaction, AppSettings } from '../types';

// Generate unique user ID
export const getUserId = (): string => {
  let userId = localStorage.getItem('petty_cash_user_id');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('petty_cash_user_id', userId);
  }
  return userId;
};

// Transactions
export const getTransactions = async (userId: string): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<void> => {
  const { error } = await supabase
    .from('transactions')
    .insert([{
      ...transaction,
      created_at: new Date().toISOString()
    }]);

  if (error) throw error;
};

export const deleteTransaction = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Settings
export const getSettings = async (userId: string): Promise<AppSettings | null> => {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows
    throw error;
  }

  return {
    recipientName: data.recipient_name || '',
    recipientPhone: data.recipient_phone || '',
    recipientEmail: data.recipient_email || '',
    senderName: data.sender_name || '',
    companyName: data.company_name || '',
    teamCode: data.team_code || '',
  };
};

export const saveSettings = async (userId: string, settings: AppSettings): Promise<void> => {
  const { error } = await supabase
    .from('settings')
    .upsert({
      user_id: userId,
      recipient_name: settings.recipientName,
      recipient_phone: settings.recipientPhone,
      recipient_email: settings.recipientEmail,
      sender_name: settings.senderName,
      company_name: settings.companyName,
      team_code: settings.teamCode,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });

  if (error) throw error;
};

// Team functions
export const getTeamTransactions = async (teamCode: string): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('team_code', teamCode)
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const addTeamTransaction = async (teamCode: string, transaction: Omit<Transaction, 'id' | 'createdAt' | 'user_id'>): Promise<void> => {
  const { error } = await supabase
    .from('transactions')
    .insert([{
      ...transaction,
      team_code: teamCode,
      created_at: new Date().toISOString()
    }]);

  if (error) throw error;
};

export const deleteTeamTransaction = async (id: string, teamCode: string): Promise<void> => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('team_code', teamCode);

  if (error) throw error;
};

export const generateTeamCode = (): string => {
  return 'TEAM-' + Math.random().toString(36).substr(2, 6).toUpperCase();
};

// Real-time subscription
export const subscribeToTeamTransactions = (teamCode: string, callback: (transactions: Transaction[]) => void) => {
  const channel = supabase
    .channel(`team:${teamCode}`)
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'transactions', filter: `team_code=eq.${teamCode}` },
      async () => {
        const transactions = await getTeamTransactions(teamCode);
        callback(transactions);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
