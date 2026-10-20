import { format, parseISO } from 'date-fns';
import { formatCurrency } from '../utils/report';
import { Transaction } from '../types';
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  currentBalance: number;
}

export default function Dashboard({ transactions, currentBalance }: DashboardProps) {
  const today = new Date();
  const startOfWeekDate = new Date(today);
  startOfWeekDate.setDate(today.getDate() - today.getDay() + 1);
  const endOfWeekDate = new Date(startOfWeekDate);
  endOfWeekDate.setDate(startOfWeekDate.getDate() + 6);

  const thisWeekTransactions = transactions.filter((t) => {
    const tDate = parseISO(t.date);
    return tDate >= startOfWeekDate && tDate <= endOfWeekDate;
  });

  const weekIncome = thisWeekTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const weekExpense = thisWeekTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const recentTransactions = [...transactions]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Balance Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-white shadow-lg">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-8" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-slate-300" />
            <span className="text-slate-300 text-xs font-medium uppercase tracking-wider">Cash Balance</span>
          </div>
          <div className="text-3xl font-bold tracking-tight mt-1">{formatCurrency(currentBalance)}</div>
          <div className="flex items-center gap-1.5 mt-3 text-slate-400 text-xs">
            <Calendar className="w-3 h-3" />
            <span>This week: {format(startOfWeekDate, 'MMM dd')} - {format(endOfWeekDate, 'MMM dd')}</span>
          </div>
        </div>
      </div>

      {/* Week Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium">Week Income</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(weekIncome)}</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium">Week Spent</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(weekExpense)}</p>
        </div>
      </div>

      {/* All-time Stats */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">All Time</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Total Received</p>
            <p className="text-base font-bold text-gray-900">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Total Spent</p>
            <p className="text-base font-bold text-gray-900">{formatCurrency(totalExpense)}</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {recentTransactions.length === 0 ? (
            <div className="px-5 pb-8 pt-2 text-center">
              <p className="text-sm text-gray-500 font-medium">No transactions yet</p>
            </div>
          ) : (
            recentTransactions.map((t) => (
              <div key={t.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{t.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {format(parseISO(t.date), 'MMM dd')} | {t.category}
                  </p>
                </div>
                <span
                  className={`font-semibold text-sm shrink-0 ${
                    t.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
