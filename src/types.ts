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

export const EXPENSE_CATEGORIES = [
  'Office Supplies',
  'Transport',
  'Meals & Refreshments',
  'Utilities',
  'Maintenance',
  'Stationery',
  'Courier/Postage',
  'Miscellaneous',
];

export const INCOME_CATEGORIES = [
  'Cash Advance',
  'Refund',
  'Reimbursement',
  'Other Income',
];
