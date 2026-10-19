import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { formatCurrency } from '../utils/report';
import { Transaction } from '../types';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  currentBalance: number;
}

export default function Dashboard({ transactions, currentBalance }: DashboardProps) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const thisWeekTransactions = transactions.filter((t) => {
    const tDate = parseISO(t.date);
    return tDate >= weekStart && tDate <= weekEnd;
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
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Wallet className="w-6 h-6" />
          <span className="text-emerald-100 text-sm font-medium">Current Cash Balance</span>
        </div>
        <div className="text-3xl font-bold">{formatCurrency(currentBalance)}</div>
        <div className="mt-3 text-emerald-100 text-sm">
          {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">This Week In</span>
          </div>
          <div className="text-lg font-bold text-green-600">{formatCurrency(weekIncome)}</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">This Week Out</span>
          </div>
          <div className="text-lg font-bold text-red-600">{formatCurrency(weekExpense)}</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ArrowUpRight className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Total Received</span>
          </div>
          <div className="text-lg font-bold text-blue-600">{formatCurrency(totalIncome)}</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ArrowDownRight className="w-4 h-4 text-orange-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Total Spent</span>
          </div>
          <div className="text-lg font-bold text-orange-600">{formatCurrency(totalExpense)}</div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Recent Transactions</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {recentTransactions.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p>No transactions yet</p>
              <p className="text-sm mt-1">Add your first transaction to get started</p>
            </div>
          ) : (
            recentTransactions.map((t) => (
              <div key={t.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      t.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                    }`}
                  >
                    {t.type === 'income' ? (
                      <ArrowUpRight className="w-4 h-4 text-green-600" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{t.description}</p>
                    <p className="text-xs text-gray-400">
                      {format(parseISO(t.date), 'MMM dd')} • {t.category}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-semibold text-sm ${
                    t.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {t.type === 'income' ? '+' : '-'}
                  {formatCurrency(t.amount)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
