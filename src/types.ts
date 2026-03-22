export type Category = 'Food' | 'Transport' | 'Entertainment' | 'Shopping' | 'Utilities' | 'Health' | 'Housing' | 'Other';

export interface Transaction {
  id: string;
  amount: number;
  category: Category;
  description: string;
  date: string;
  type: 'income' | 'expense';
}

export interface Budget {
  category: Category;
  limit: number;
  spent: number;
}

export interface FinancialSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  savingsRate: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}
