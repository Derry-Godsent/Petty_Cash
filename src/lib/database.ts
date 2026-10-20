import { configurationError, supabase } from './supabase';
import { Transaction, AppSettings } from '../types';

export type TransactionInput = Omit<Transaction, 'id' | 'createdAt' | 'user_id'>;
export interface Cashbook { id: string; role: 'owner' | 'viewer'; viewerKeyHash?: string; settings: AppSettings; transactions: Transaction[] }
export const DEFAULT_SETTINGS: AppSettings = {
  recipientName: '', recipientPhone: '', recipientEmail: '', senderName: '', companyName: '',
};

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  if (configurationError) throw new Error(configurationError);
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
  return data as T;
}

const mapRow = (row: any): Transaction => ({
  id: row.id, user_id: '', date: row.date, description: row.description,
  category: row.category, amount: Number(row.amount), type: row.type,
  notes: row.notes || undefined, createdAt: row.created_at,
});
const mapBook = (data: any): Cashbook => {
  if (!data || !['owner', 'viewer'].includes(data.role)) throw new Error('Invalid cashbook response. Check your database setup.');
  return { id: data.id, role: data.role, viewerKeyHash: data.viewer_key_hash || undefined, settings: { ...DEFAULT_SETTINGS, ...data.settings }, transactions: (data.transactions || []).map(mapRow) };
};

export async function openCashbook(token: string): Promise<Cashbook> {
  return mapBook(await rpc('pc_open', { p_token: token }));
}
export async function createCashbook(token: string, viewerToken: string): Promise<Cashbook> {
  return mapBook(await rpc('pc_create', { p_owner_token: token, p_viewer_token: viewerToken }));
}
export async function addTransaction(token: string, transaction: TransactionInput, id: string): Promise<Transaction> {
  validateTransaction(transaction);
  return mapRow(await rpc('pc_add', { p_token: token, p_transaction: { ...transaction, id } }));
}
export async function deleteTransaction(token: string, id: string): Promise<void> {
  await rpc('pc_delete', { p_token: token, p_id: id });
}
export async function saveSettings(token: string, settings: AppSettings): Promise<void> {
  await rpc('pc_save_settings', { p_token: token, p_settings: settings });
}
export async function clearCashbook(token: string): Promise<void> {
  await rpc('pc_clear', { p_token: token });
}
export async function replaceViewerLink(token: string, viewerToken: string): Promise<void> {
  await rpc('pc_replace_viewer', { p_token: token, p_viewer_token: viewerToken });
}

export function validateTransaction(transaction: TransactionInput) {
  if (!transaction || !Number.isFinite(transaction.amount) || transaction.amount <= 0 || transaction.amount > 99999999.99) throw new Error('Enter an amount greater than zero and no more than 99,999,999.99.');
  if (typeof transaction.description !== 'string' || !transaction.description.trim() || transaction.description.length > 1000 || typeof transaction.category !== 'string' || !transaction.category.trim() || transaction.category.length > 200) throw new Error('Description and category are required (maximum 1,000 and 200 characters).');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(transaction.date) || Number.isNaN(Date.parse(transaction.date)) || new Date(transaction.date).toISOString().slice(0, 10) !== transaction.date) throw new Error('Choose a valid date.');
  if (!['income', 'expense'].includes(transaction.type)) throw new Error('Choose income or expense.');
  if (transaction.notes !== undefined && (typeof transaction.notes !== 'string' || transaction.notes.length > 10000)) throw new Error('Notes must be text, up to 10,000 characters.');
}
