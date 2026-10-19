import { format, parseISO } from 'date-fns';
import { formatCurrency } from '../utils/report';

interface SharedReportData {
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
}

interface BossViewProps {
  data: SharedReportData;
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
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white">
        <div className="max-w-lg mx-auto px-5 pt-8 pb-6">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-4">Petty Cash Report</p>
          
          <div className="space-y-1">
            {companyName && (
              <p className="text-slate-300 text-xs">{companyName}</p>
            )}
            {senderName && (
              <p className="text-slate-300 text-xs">Submitted by: {senderName}</p>
            )}
          </div>

          <p className="text-slate-300 text-xs mt-4">
            {format(parseISO(startDate), 'MMMM dd')} - {format(parseISO(endDate), 'MMMM dd, yyyy')}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 -mt-4 pb-8 space-y-4">
        {/* Summary Cards */}
        <div className="bg-white rounded-xl shadow-lg shadow-gray-200/50 border border-gray-100 p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Summary</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-green-700 font-semibold uppercase">Received</p>
              <p className="text-base font-bold text-green-800 mt-1">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-xs text-red-700 font-semibold uppercase">Spent</p>
              <p className="text-base font-bold text-red-800 mt-1">{formatCurrency(totalExpense)}</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-700 font-semibold uppercase">Balance</p>
              <p className="text-base font-bold text-slate-800 mt-1">{formatCurrency(balance)}</p>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-900">
              Transactions ({transactions.length})
            </h2>
          </div>
          
          {Object.keys(grouped).length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500">No transactions recorded this week.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {Object.keys(grouped).sort().map((dateKey) => (
                <div key={dateKey}>
                  <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100">
                    <p className="text-xs font-bold text-gray-700">
                      {format(parseISO(dateKey), 'EEEE, MMMM dd')}
                    </p>
                  </div>
                  {grouped[dateKey].map((t, idx) => (
                    <div key={idx} className="px-5 py-3.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{t.desc}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{t.cat}</p>
                        {t.note && <p className="text-xs text-gray-500 mt-0.5">{t.note}</p>}
                      </div>
                      <span className={`text-sm font-bold shrink-0 ${
                        t.type === 'income' ? 'text-green-600' : 'text-red-600'
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
          <p className="text-xs text-gray-500">
            Generated {format(parseISO(generatedAt), 'MMM dd, yyyy h:mm a')}
          </p>
          <p className="text-xs text-gray-400 mt-1">Petty Cash Tracker</p>
        </div>
      </div>
    </div>
  );
}
