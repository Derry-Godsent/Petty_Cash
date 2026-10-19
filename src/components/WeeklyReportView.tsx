import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Transaction } from '../types';
import { generateWeeklyReport, formatWhatsAppMessage, formatCurrency, openWhatsApp } from '../utils/report';
import { Send, ChevronLeft, ChevronRight, MessageCircle, Copy, Check } from 'lucide-react';

interface WeeklyReportViewProps {
  transactions: Transaction[];
  bossPhone: string;
  bossName: string;
}

export default function WeeklyReportView({ transactions, bossPhone, bossName }: WeeklyReportViewProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [copied, setCopied] = useState(false);

  const report = generateWeeklyReport(transactions, weekOffset);
  const message = formatWhatsAppMessage(report, bossName);

  const getWeekLabel = () => {
    if (weekOffset === 0) return 'This Week';
    if (weekOffset === -1) return 'Last Week';
    if (weekOffset === 1) return 'Next Week';
    if (weekOffset < 0) return `${Math.abs(weekOffset)} Weeks Ago`;
    return `${weekOffset} Weeks Ahead`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = message;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendWhatsApp = () => {
    if (!bossPhone) {
      alert('Please set your boss\'s phone number in Settings first.');
      return;
    }
    openWhatsApp(bossPhone, message);
  };

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="font-semibold text-gray-800">{getWeekLabel()}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {format(parseISO(report.startDate), 'MMM dd')} - {format(parseISO(report.endDate), 'MMM dd')}
            </p>
          </div>
          <button
            onClick={() => setWeekOffset(weekOffset + 1)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Report Summary */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
        <h3 className="text-sm font-medium text-indigo-100 mb-3">Weekly Summary</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-indigo-200">Received</p>
            <p className="text-lg font-bold">{formatCurrency(report.totalIncome)}</p>
          </div>
          <div>
            <p className="text-xs text-indigo-200">Spent</p>
            <p className="text-lg font-bold">{formatCurrency(report.totalExpense)}</p>
          </div>
          <div>
            <p className="text-xs text-indigo-200">Balance</p>
            <p className="text-lg font-bold">{formatCurrency(report.balance)}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-white/20">
          <p className="text-xs text-indigo-200">
            {report.transactions.length} transaction{report.transactions.length !== 1 ? 's' : ''} this week
          </p>
        </div>
      </div>

      {/* Transaction Details */}
      {report.transactions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 text-sm">Transaction Details</h3>
          </div>
          <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto">
            {report.transactions.map((t) => (
              <div key={t.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      t.type === 'income' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <div>
                    <p className="text-sm text-gray-700">{t.description}</p>
                    <p className="text-xs text-gray-400">
                      {format(parseISO(t.date), 'EEE, MMM dd')} • {t.category}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-sm font-medium ${
                    t.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Message */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-sm">WhatsApp Preview</h3>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-500" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
        <div className="p-4 bg-gray-50">
          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
            {message}
          </pre>
        </div>
      </div>

      {/* Send Button */}
      <button
        onClick={handleSendWhatsApp}
        className="w-full py-4 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md"
      >
        <MessageCircle className="w-5 h-5" />
        Send via WhatsApp
      </button>

      {!bossPhone && (
        <p className="text-center text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
          ⚠️ Set your boss's phone number in Settings to send reports directly
        </p>
      )}
    </div>
  );
}
