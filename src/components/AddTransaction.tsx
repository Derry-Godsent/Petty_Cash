import { useState } from 'react';
import { format } from 'date-fns';
import { Transaction, TransactionType, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types';
import { X } from 'lucide-react';

interface AddTransactionProps {
  onAdd: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'user_id'>) => void;
  onClose: () => void;
}

export default function AddTransaction({ onAdd, onClose }: AddTransactionProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !category) return;

    onAdd({
      date,
      description,
      category,
      amount: parseFloat(amount),
      type,
      notes: notes || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 pt-5 pb-3 border-b border-gray-100 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">New Transaction</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 active:bg-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => { setType('expense'); setCategory(''); }}
              className={`py-3 rounded-lg font-semibold text-sm transition-all ${
                type === 'expense'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => { setType('income'); setCategory(''); }}
              className={`py-3 rounded-lg font-semibold text-sm transition-all ${
                type === 'income'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              Income
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">GH₵</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-16 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none text-2xl font-bold text-gray-900 transition-all"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
              className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none text-gray-900 transition-all"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    category === cat
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none text-gray-900 transition-all"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details"
              rows={2}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none text-gray-900 resize-none transition-all"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!description || !amount || !category}
            className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-base transition-all shadow-lg active:scale-[0.98] disabled:bg-gray-300 disabled:shadow-none"
          >
            Add Transaction
          </button>
        </form>
      </div>
    </div>
  );
}
