import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval, parseISO } from 'date-fns';
import { Transaction, WeeklyReport } from '../types';

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

export function formatWhatsAppMessage(report: WeeklyReport, bossName: string = ''): string {
  const dateRange = `${format(parseISO(report.startDate), 'MMM dd')} - ${format(parseISO(report.endDate), 'MMM dd, yyyy')}`;

  let message = `📊 *PETTY CASH WEEKLY REPORT*\n`;
  message += `📅 Period: ${dateRange}\n`;
  if (bossName) message += `👤 To: ${bossName}\n`;
  message += `\n`;
  message += `💰 *SUMMARY*\n`;
  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `✅ Total Received: ${formatCurrency(report.totalIncome)}\n`;
  message += `❌ Total Spent: ${formatCurrency(report.totalExpense)}\n`;
  message += `💵 Cash Balance: ${formatCurrency(report.balance)}\n`;
  message += `━━━━━━━━━━━━━━━━━━\n\n`;

  if (report.transactions.length > 0) {
    // Group by date
    const grouped: Record<string, Transaction[]> = {};
    report.transactions.forEach((t) => {
      const dateKey = t.date;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(t);
    });

    message += `📝 *TRANSACTIONS*\n`;
    message += `━━━━━━━━━━━━━━━━━━\n`;

    Object.keys(grouped)
      .sort()
      .forEach((dateKey) => {
        message += `\n📅 *${format(parseISO(dateKey), 'EEE, MMM dd')}*\n`;
        grouped[dateKey].forEach((t) => {
          const icon = t.type === 'income' ? '🟢' : '🔴';
          message += `${icon} ${t.description} - ${formatCurrency(t.amount)}\n`;
          message += `   📁 ${t.category}\n`;
          if (t.notes) message += `   📌 ${t.notes}\n`;
        });
      });
  } else {
    message += `📝 No transactions this week.\n`;
  }

  message += `\n━━━━━━━━━━━━━━━━━━\n`;
  message += `_Generated on ${format(new Date(), 'MMM dd, yyyy h:mm a')}_`;

  return message;
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getWeekDays(weekOffset: number = 0): string[] {
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + weekOffset * 7);

  const start = startOfWeek(targetDate, { weekStartsOn: 1 });
  const end = endOfWeek(targetDate, { weekStartsOn: 1 });

  return eachDayOfInterval({ start, end }).map((d) => format(d, 'yyyy-MM-dd'));
}

export function openWhatsApp(phoneNumber: string, message: string): void {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  window.open(url, '_blank');
}
