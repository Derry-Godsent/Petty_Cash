import { format, parseISO } from 'date-fns';
import { formatCurrency } from '../utils/report';
import { FileText, ArrowUpRight, ArrowDownRight, Calendar, User, Building2, Wallet } from 'lucide-react';

interface BossViewProps {
  data: {
    s: string;
    c: string;
    sd: string;
    ed: string;
    ti: number;
    te: number;
    b: number;
    t: Array<{
      d: string;
      desc: string;
      cat: string;
      amt: number;
      type: string;
      note: string;
    }>;
    gen: string;
  };
}

export default function BossView({ data }: BossViewProps) {
  const { s: senderName, c: companyName, sd: startDate, ed: endDate, ti: totalIncome, te: totalExpense, b: balance, t: transactions, gen: generatedAt } = data;

  // Group transactions by date
  const grouped: Record<string, typeof transactions> = {};
  transactions.forEach((t) => {
    if (!grouped[t.d]) grouped[t.d] = [];
    grouped[t.d].push(t);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 text-white">
        <div className="max-w-lg mx-auto px-5 pt-8 pb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-emerald-100">Petty Cash Report</span>
          </div>
          
          <div className="space-y-1">
            {companyName && (
              <div className="flex items-center gap-1.5 text-emerald-100 text-xs">
                <Building2 className="w-3 h-3" />
                <span>{companyName}</span>
              </div>
            )}
            {senderName && (
              <div className="flex items-center gap-1.5 text-emerald-100 text-xs">
                <User className="w-3 h-3" />
                <span>Submitted by: {senderName}</span>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-emerald-100 text-xs">
            <Calendar className="w-3 h-3" />
            <span>{format(parseISO(startDate), 'MMMM dd')} — {format(parseISO(endDate), 'MMMM dd, yyyy')}</span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 -mt-4 pb-8 space-y-4">
        {/* Summary Cards */}
        <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-gray-800">Summary</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <p className="text-[10px] text-green-600 font-semibold uppercase">Received</p>
              <p className="text-base font-extrabold text-green-700 mt-1">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-xl">
              <p className="text-[10px] text-red-500 font-semibold uppercase">Spent</p>
              <p className="text-base font-extrabold text-red-600 mt-1">{formatCurrency(totalExpense)}</p>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-xl">
              <p className="text-[10px] text-emerald-600 font-semibold uppercase">Balance</p>
              <p className="text-base font-extrabold text-emerald-700 mt-1">{formatCurrency(balance)}</p>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-800">
              Transactions ({transactions.length})
            </h2>
          </div>
          
          {Object.keys(grouped).length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-400">No transactions recorded this week.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {Object.keys(grouped).sort().map((dateKey) => (
                <div key={dateKey}>
                  <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100">
                    <p className="text-xs font-bold text-gray-600">
                      {format(parseISO(dateKey), 'EEEE, MMMM dd')}
                    </p>
                  </div>
                  {grouped[dateKey].map((t, idx) => (
                    <div key={idx} className="px-5 py-3.5 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        t.type === 'income' ? 'bg-green-50' : 'bg-red-50'
                      }`}>
                        {t.type === 'income' ? (
                          <ArrowUpRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{t.desc}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{t.cat}</p>
                        {t.note && <p className="text-[11px] text-gray-400 mt-0.5">📌 {t.note}</p>}
                      </div>
                      <span className={`text-sm font-bold shrink-0 ${
                        t.type === 'income' ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amt)}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pt-2 pb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full shadow-sm border border-gray-100">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-gray-400 font-medium">
              Generated {format(parseISO(generatedAt), 'MMM dd, yyyy h:mm a')}
            </span>
          </div>
          <p className="text-[10px] text-gray-300 mt-3">Petty Cash Tracker</p>
        </div>
      </div>
    </div>
  );
}
