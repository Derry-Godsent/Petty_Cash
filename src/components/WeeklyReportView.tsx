import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Transaction } from '../types';
import { generateWeeklyReport, formatWhatsAppMessage, formatCurrency, openWhatsApp, generateShareableLink } from '../utils/report';
import { ChevronLeft, ChevronRight, MessageCircle, Link2, Check, Copy, ExternalLink } from 'lucide-react';

interface WeeklyReportViewProps {
  transactions: Transaction[];
  bossPhone: string;
  bossName: string;
  senderName: string;
  companyName: string;
}

export default function WeeklyReportView({ transactions, bossPhone, bossName, senderName, companyName }: WeeklyReportViewProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [copied, setCopied] = useState<'link' | 'msg' | null>(null);
  const [showLink, setShowLink] = useState(false);

  const report = generateWeeklyReport(transactions, weekOffset);
  const shareLink = generateShareableLink(report, senderName, companyName);
  const message = formatWhatsAppMessage(report, bossName, senderName, shareLink);

  const getWeekLabel = () => {
    if (weekOffset === 0) return 'This Week';
    if (weekOffset === -1) return 'Last Week';
    if (weekOffset === 1) return 'Next Week';
    if (weekOffset < 0) return `${Math.abs(weekOffset)} Weeks Ago`;
    return `${weekOffset} Weeks Ahead`;
  };

  const handleCopy = async (text: string, type: 'link' | 'msg') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const handleSendWhatsApp = () => {
    if (!bossPhone) {
      alert('Please set your boss\'s WhatsApp number in Settings first.');
      return;
    }
    openWhatsApp(bossPhone, message);
  };

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex items-center justify-between">
        <button
          onClick={() => setWeekOffset(weekOffset - 1)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 active:bg-gray-100 text-gray-600 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="font-bold text-gray-800 text-sm">{getWeekLabel()}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {format(parseISO(report.startDate), 'MMM dd')} — {format(parseISO(report.endDate), 'MMM dd')}
          </p>
        </div>
        <button
          onClick={() => setWeekOffset(weekOffset + 1)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 active:bg-gray-100 text-gray-600 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Summary Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-600 p-5 text-white shadow-xl shadow-purple-500/20">
        <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full translate-y-8 -translate-x-8" />
        <div className="relative">
          <p className="text-xs text-purple-200 font-medium uppercase tracking-wider mb-3">Weekly Summary</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/15 rounded-xl p-3">
              <p className="text-[10px] text-purple-200">Received</p>
              <p className="text-sm font-bold mt-0.5">{formatCurrency(report.totalIncome)}</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3">
              <p className="text-[10px] text-purple-200">Spent</p>
              <p className="text-sm font-bold mt-0.5">{formatCurrency(report.totalExpense)}</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3">
              <p className="text-[10px] text-purple-200">Balance</p>
              <p className="text-sm font-bold mt-0.5">{formatCurrency(report.balance)}</p>
            </div>
          </div>
          <p className="text-xs text-purple-200 mt-3">
            {report.transactions.length} transaction{report.transactions.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Transaction Details */}
      {report.transactions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-gray-50">
            <h3 className="font-semibold text-gray-800 text-sm">Breakdown</h3>
          </div>
          <div className="divide-y divide-gray-50 max-h-52 overflow-y-auto">
            {report.transactions.map((t) => (
              <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${t.type === 'income' ? 'bg-green-500' : 'bg-red-400'}`} />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 truncate">{t.description}</p>
                    <p className="text-[11px] text-gray-400">
                      {format(parseISO(t.date), 'EEE dd')} · {t.category}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold shrink-0 ml-2 ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share Link Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => setShowLink(!showLink)}
          className="w-full px-5 py-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Link2 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-800">Shareable Report Link</p>
              <p className="text-[11px] text-gray-400">Send this link so your boss can view the report</p>
            </div>
          </div>
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showLink ? 'rotate-90' : ''}`} />
        </button>
        
        {showLink && (
          <div className="px-5 pb-4 space-y-3">
            <div className="bg-gray-50 rounded-xl p-3 break-all">
              <p className="text-xs text-gray-600 font-mono leading-relaxed">{shareLink}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleCopy(shareLink, 'link')}
                className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                {copied === 'link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied === 'link' ? 'Copied!' : 'Copy Link'}
              </button>
              <a
                href={shareLink}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-4 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 active:bg-gray-200 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Preview
              </a>
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp Message Preview */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-sm">WhatsApp Message</h3>
          <button
            onClick={() => handleCopy(message, 'msg')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs font-medium active:bg-gray-200 transition-colors"
          >
            {copied === 'msg' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            {copied === 'msg' ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="p-4 bg-[#ECE5DD] max-h-48 overflow-y-auto">
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{message}</pre>
          </div>
        </div>
      </div>

      {/* Send via WhatsApp Button */}
      <button
        onClick={handleSendWhatsApp}
        className="w-full py-4 bg-[#25D366] hover:bg-[#20BD5A] text-white font-bold rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-green-500/25 active:scale-[0.98]"
      >
        <MessageCircle className="w-5 h-5" />
        Send Report via WhatsApp
      </button>

      {!bossPhone && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <p className="text-xs text-amber-700">
            ⚠️ Set your boss's WhatsApp number in Settings to send directly
          </p>
        </div>
      )}
    </div>
  );
}
