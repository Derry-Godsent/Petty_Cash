import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/report';
import { Trash2, Search, X, Calendar, Tag, FileText } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

export default function TransactionList({ transactions, onDelete }: TransactionListProps) {
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const filtered = transactions
    .filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  const hasActiveFilters = filterType !== 'all' || searchQuery !== '';

  const handleDelete = (id: string) => {
    if (confirm('Delete this transaction?')) {
      onDelete(id);
      setSelectedTransaction(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search transactions"
          className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none text-sm shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-gray-100"
          >
            <X className="w-3 h-3 text-gray-500" />
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'income', 'expense'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              filterType === t
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        {hasActiveFilters && (
          <button
            onClick={() => { setFilterType('all'); setSearchQuery(''); }}
            className="px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap bg-gray-100 text-gray-500"
          >
            Clear
          </button>
        )}
      </div>

      {/* Count */}
      <p className="text-xs text-gray-500 font-medium px-1">
        {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Transaction List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">No transactions found</p>
          </div>
        ) : (
          filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTransaction(t)}
              className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 active:bg-gray-50 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{t.description}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">
                    {format(parseISO(t.date), 'MMM dd')}
                  </span>
                  <span className="text-xs text-gray-300">|</span>
                  <span className="text-xs text-gray-500 truncate">{t.category}</span>
                </div>
                {t.notes && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate italic">{t.notes}</p>
                )}
              </div>
              <span
                className={`font-bold text-sm shrink-0 ${
                  t.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
              </span>
            </button>
          ))
        )}
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setSelectedTransaction(null)} 
          />
          <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl animate-slide-up max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white px-5 pt-4 pb-3 border-b border-gray-200 z-10 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Transaction Details</h2>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-bold text-xl transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-5">
              {/* Amount Display */}
              <div className={`text-center py-6 rounded-xl ${
                selectedTransaction.type === 'income' ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  {selectedTransaction.type === 'income' ? 'Income' : 'Expense'}
                </p>
                <p className={`text-3xl font-bold ${
                  selectedTransaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {selectedTransaction.type === 'income' ? '+' : '-'}{formatCurrency(selectedTransaction.amount)}
                </p>
              </div>

              {/* Details */}
              <div className="space-y-4">
                {/* Description */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</p>
                  <p className="text-base text-gray-900">{selectedTransaction.description}</p>
                </div>

                {/* Category */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <Tag className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</p>
                    <p className="text-sm text-gray-900 mt-0.5">{selectedTransaction.category}</p>
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</p>
                    <p className="text-sm text-gray-900 mt-0.5">
                      {format(parseISO(selectedTransaction.date), 'EEEE, MMMM dd, yyyy')}
                    </p>
                  </div>
                </div>

                {/* Notes */}
                {selectedTransaction.notes && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</p>
                      <p className="text-sm text-gray-900 mt-0.5 whitespace-pre-wrap">{selectedTransaction.notes}</p>
                    </div>
                  </div>
                )}

                {/* Created */}
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    Added {format(parseISO(selectedTransaction.createdAt), 'MMM dd, yyyy h:mm a')}
                  </p>
                </div>
              </div>

              {/* Delete Button */}
              <button
                onClick={() => handleDelete(selectedTransaction.id)}
                className="w-full py-3.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors active:bg-red-200"
              >
                <Trash2 className="w-4 h-4" />
                Delete Transaction
              </button>

              {/* Close Button */}
              <button
                onClick={() => setSelectedTransaction(null)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors active:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
