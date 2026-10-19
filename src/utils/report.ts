import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval, parseISO } from 'date-fns';
import { Transaction, WeeklyReport } from '../types';

export const CURRENCY = 'GH₵';

export function generateWeeklyReport(transactions: Transaction[], weekOffset: number = 0): WeeklyReport {
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + weekOffset * 7);

  const startDate = startOfWeek(targetDate, { weekStartsOn: 1 });
  const endDate = endOfWeek(targetDate, { weekStartsOn: 1 });

  const weekTransactions = transactions.filter((t) => {
    const tDate = parseISO(t.date);
    return isWithinInterval(tDate, { start: startDate, end: endDate });
  });

  const totalIncome = weekTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = weekTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    transactions: weekTransactions.sort((a, b) => a.date.localeCompare(b.date)),
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  };
}

export function formatCurrency(amount: number): string {
  return `${CURRENCY}${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generateShareableLink(report: WeeklyReport, senderName: string, companyName: string): string {
  const shareData = {
    s: senderName,
    c: companyName,
    sd: report.startDate,
    ed: report.endDate,
    ti: report.totalIncome,
    te: report.totalExpense,
    b: report.balance,
    t: report.transactions.map((t) => ({
      d: t.date,
      desc: t.description,
      cat: t.category,
      amt: t.amount,
      type: t.type,
      note: t.notes || '',
    })),
    gen: new Date().toISOString(),
  };

  const encoded = btoa(encodeURIComponent(JSON.stringify(shareData)));
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#report=${encoded}`;
}

export function parseSharedReport(hash: string): any | null {
  try {
    const match = hash.match(/report=(.+)/);
    if (!match) return null;
    const decoded = JSON.parse(decodeURIComponent(atob(match[1])));
    return decoded;
  } catch {
    return null;
  }
}

export function formatWhatsAppMessage(
  report: WeeklyReport,
  bossName: string,
  senderName: string,
  shareLink: string
): string {
  const dateRange = `${format(parseISO(report.startDate), 'MMM dd')} - ${format(parseISO(report.endDate), 'MMM dd, yyyy')}`;

  let message = `📊 *PETTY CASH WEEKLY REPORT*\n`;
  message += `📅 ${dateRange}\n`;
  if (senderName) message += `👤 From: ${senderName}\n`;
  if (bossName) message += `📩 To: ${bossName}\n`;
  message += `\n`;
  message += `💰 *SUMMARY*\n`;
  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `✅ Received: ${formatCurrency(report.totalIncome)}\n`;
  message += `❌ Spent: ${formatCurrency(report.totalExpense)}\n`;
  message += `💵 Cash Balance: ${formatCurrency(report.balance)}\n`;
  message += `━━━━━━━━━━━━━━━━━━\n\n`;

  if (report.transactions.length > 0) {
    const grouped: Record<string, typeof report.transactions> = {};
    report.transactions.forEach((t) => {
      if (!grouped[t.date]) grouped[t.date] = [];
      grouped[t.date].push(t);
    });

    message += `📝 *TRANSACTIONS*\n`;
    message += `━━━━━━━━━━━━━━━━━━\n`;

    Object.keys(grouped)
      .sort()
      .forEach((dateKey) => {
        message += `\n📅 *${format(parseISO(dateKey), 'EEE, MMM dd')}*\n`;
        grouped[dateKey].forEach((t) => {
          const icon = t.type === 'income' ? '🟢' : '🔴';
          message += `${icon} ${t.description}\n`;
          message += `   ${formatCurrency(t.amount)} • ${t.category}\n`;
          if (t.notes) message += `   📌 ${t.notes}\n`;
        });
      });
  } else {
    message += `📝 No transactions this week.\n`;
  }

  message += `\n━━━━━━━━━━━━━━━━━━\n`;
  message += `🔗 *View Full Report:*\n${shareLink}\n`;
  message += `\n_Generated ${format(new Date(), 'MMM dd, yyyy h:mm a')}_`;

  return message;
}

export function openWhatsApp(phoneNumber: string, message: string): void {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  window.open(url, '_blank');
}
