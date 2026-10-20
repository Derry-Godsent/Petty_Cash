import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Transaction } from '../types';
import { generateWeeklyReport, formatWhatsAppMessage, formatCurrency, openWhatsApp } from '../utils/report';
import { ChevronLeft, ChevronRight, MessageCircle, Check, Copy } from 'lucide-react';

interface WeeklyReportViewProps {
  transactions: Transaction[];
  recipientPhone: string;
  recipientName: string;
  senderName: string;
}

export default function WeeklyReportView({ transactions, recipientPhone, recipientName, senderName }: WeeklyReportViewProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [copied, setCopied] = useState(false);

  const report = generateWeeklyReport(transactions, weekOffset);
  const message = formatWhatsAppMessage(report, recipientName, senderName);

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
    if (!recipientPhone) {
      alert('Please set the recipient phone number in Settings.');
      return;
    }
    openWhatsApp(recipientPhone, message);
  };

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-center justify-between">
        <button
          onClick={() => setWeekOffset(weekOffset - 1)}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-50 active:bg-gray-100 text-gray-600 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="font-bold text-gray-900 text-sm">{getWeekLabel()}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {format(parseISO(report.startDate), 'MMM dd')} - {format(parseISO(report.endDate), 'MMM dd')}
          </p>
        </div>
        <button
          onClick={() => setWeekOffset(weekOffset + 1)}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-50 active:bg-gray-100 text-gray-600 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Summary Card */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 p-5 text-white shadow-lg">
        <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-8 -translate-x-8" />
        <div className="relative">
          <p className="text-xs text-slate-300 font-medium uppercase tracking-wider mb-3">Weekly Summary</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="report-summary-cell bg-white/10 rounded-lg p-2 sm:p-3">
              <p className="text-xs text-slate-300">Received</p>
              <p className="report-summary-amount font-bold mt-0.5">{formatCurrency(report.totalIncome)}</p>
            </div>
            <div className="report-summary-cell bg-white/10 rounded-lg p-2 sm:p-3">
              <p className="text-xs text-slate-300">Spent</p>
              <p className="report-summary-amount font-bold mt-0.5">{formatCurrency(report.totalExpense)}</p>
            </div>
            <div className="report-summary-cell bg-white/10 rounded-lg p-2 sm:p-3">
              <p className="text-xs text-slate-300">Balance</p>
              <p className="report-summary-amount font-bold mt-0.5">{formatCurrency(report.balance)}</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-3">
            {report.transactions.length} transaction{report.transactions.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Transaction Details */}
      {report.transactions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-gray-50">
            <h3 className="font-semibold text-gray-900 text-sm">Breakdown</h3>
          </div>
          <div className="divide-y divide-gray-50 max-h-52 overflow-y-auto">
            {report.transactions.map((t) => (
              <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-gray-900 truncate">{t.description}</p>
                  <p className="text-xs text-gray-500">
                    {format(parseISO(t.date), 'EEE dd')} | {t.category}
                  </p>
                </div>
                <span className={`text-sm font-bold shrink-0 ml-2 ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WhatsApp Message Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">WhatsApp Message</h3>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs font-medium active:bg-gray-200 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="p-4 bg-gray-50 max-h-48 overflow-y-auto">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{message}</pre>
          </div>
        </div>
      </div>

      {/* Send via WhatsApp Button */}
      <button
        onClick={handleSendWhatsApp}
        className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-lg active:scale-[0.98]"
      >
        <MessageCircle className="w-5 h-5" />
        Send Report via WhatsApp
      </button>
    </div>
  );
}
