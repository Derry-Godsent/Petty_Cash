import { Transaction, WeeklyReport } from '../types';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO, format } from 'date-fns';

export const generateWeeklyReport = (transactions: Transaction[], weekOffset: number = 0): WeeklyReport => {
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + weekOffset * 7);

  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

  const weekTransactions = transactions.filter(t => {
    const transactionDate = parseISO(t.date);
    return isWithinInterval(transactionDate, { start: weekStart, end: weekEnd });
  });

  const totalIncome = weekTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = weekTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    startDate: format(weekStart, 'yyyy-MM-dd'),
    endDate: format(weekEnd, 'yyyy-MM-dd'),
    transactions: weekTransactions,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense
  };
};

export const formatCurrency = (amount: number): string => {
  return `GH₵${amount.toFixed(2)}`;
};

export const formatWhatsAppMessage = (report: WeeklyReport, recipientName: string, senderName: string): string => {
  const startDate = format(parseISO(report.startDate), 'MMM dd');
  const endDate = format(parseISO(report.endDate), 'MMM dd, yyyy');

  let message = `*Petty Cash Report*\n`;
  message += `Period: ${startDate} - ${endDate}\n`;
  if (senderName) message += `From: ${senderName}\n`;
  if (recipientName) message += `To: ${recipientName}\n`;
  message += `\n`;
  message += `*Summary:*\n`;
  message += `Income: ${formatCurrency(report.totalIncome)}\n`;
  message += `Expense: ${formatCurrency(report.totalExpense)}\n`;
  message += `Balance: ${formatCurrency(report.balance)}\n\n`;

  if (report.transactions.length > 0) {
    message += `*Transactions:*\n`;
    report.transactions.forEach(t => {
      const date = format(parseISO(t.date), 'MMM dd');
      const sign = t.type === 'income' ? '+' : '-';
      message += `${date}: ${t.description} (${t.category}) ${sign}${formatCurrency(t.amount)}\n`;
      if (t.notes) message += `  Note: ${t.notes}\n`;
    });
  }

  return message;
};

export const openWhatsApp = (phoneNumber: string, message: string): void => {
  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  window.open(url, '_blank');
};
