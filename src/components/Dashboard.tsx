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
      {/* Hero Balance Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-6 text-white shadow-xl shadow-emerald-500/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-8 -translate-x-8" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-emerald-100" />
            <span className="text-emerald-100 text-xs font-medium uppercase tracking-wider">Cash on Hand</span>
          </div>
          <div className="text-3xl font-extrabold tracking-tight mt-1">{formatCurrency(currentBalance)}</div>
          <div className="flex items-center gap-1.5 mt-3 text-emerald-100 text-xs">
            <Calendar className="w-3 h-3" />
            <span>This week: {format(startOfWeekDate, 'MMM dd')} - {format(endOfWeekDate, 'MMM dd')}</span>
          </div>
        </div>
      </div>

      {/* Week Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/80">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Week Income</p>
          <p className="text-lg font-bold text-gray-800 mt-0.5">{formatCurrency(weekIncome)}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/80">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Week Spent</p>
          <p className="text-lg font-bold text-gray-800 mt-0.5">{formatCurrency(weekExpense)}</p>
        </div>
      </div>

      {/* All-time Stats */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100/80">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">All Time</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Received</p>
              <p className="text-base font-bold text-gray-800">{formatCurrency(totalIncome)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs text-gray-400 text-right">Total Spent</p>
              <p className="text-base font-bold text-gray-800">{formatCurrency(totalExpense)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold text-gray-800">Recent Activity</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {recentTransactions.length === 0 ? (
            <div className="px-5 pb-8 pt-2 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📝</span>
              </div>
              <p className="text-sm text-gray-500 font-medium">No transactions yet</p>
              <p className="text-xs text-gray-400 mt-1">Tap + to add your first entry</p>
            </div>
          ) : (
            recentTransactions.map((t) => (
              <div key={t.id} className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      t.type === 'income' ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    {t.type === 'income' ? (
                      <ArrowUpRight className="w-4 h-4 text-green-600" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{t.description}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {format(parseISO(t.date), 'MMM dd')} · {t.category}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-bold text-sm shrink-0 ml-3 ${
                    t.type === 'income' ? 'text-green-600' : 'text-red-500'
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
