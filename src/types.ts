export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: TransactionType;
  notes?: string;
  createdAt: string;
}

export interface WeeklyReport {
  startDate: string;
  endDate: string;
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface AppSettings {
  bossName: string;
  bossPhone: string;
  yourName: string;
  companyName: string;
}

export const EXPENSE_CATEGORIES = [
  'Office Supplies',
  'Transport / Fuel',
  'Meals & Refreshments',
  'Utilities',
  'Maintenance & Repairs',
  'Stationery & Printing',
  'Courier / Delivery',
  'Cleaning',
  'Security',
  'Miscellaneous',
];

export const INCOME_CATEGORIES = [
  'Cash Advance',
  'Refund',
  'Reimbursement',
  'Petty Cash Top-up',
  'Other Income',
];
