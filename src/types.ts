export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  user_id: string;
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
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  senderName: string;
  companyName: string;
  teamCode: string;
}

export const EXPENSE_CATEGORIES = [
  'Transport / Fuel',
  'Marketing Materials',
  'Printing & Stationery',
  'Cleaning Supplies',
  'Laundry Supplies',
  'Fumigation Chemicals',
  'Equipment Rental',
  'Equipment Maintenance',
  'Protective Gear',
  'Staff Meals',
  'Communication / Airtime',
  'Courier / Delivery',
  'Advertising',
  'Client Entertainment',
  'Miscellaneous',
];

export const INCOME_CATEGORIES = [
  'Cash Advance',
  'Petty Cash Top-up',
  'Refund',
  'Reimbursement',
  'Other Income',
];
