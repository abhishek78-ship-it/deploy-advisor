/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Send,
  Sparkles,
  MessageSquare,
  History,
  ChevronRight,
  Bell,
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, subDays } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Transaction, Budget, Category, ChatMessage } from './types';
import { getFinancialAdvice, getSpendingInsights } from './services/gemini';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Initial Mock Data
const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: '1', amount: 3500, category: 'Other', description: 'Monthly Salary', date: subDays(new Date(), 20).toISOString(), type: 'income' },
  { id: '2', amount: 45, category: 'Food', description: 'Grocery Store', date: subDays(new Date(), 2).toISOString(), type: 'expense' },
  { id: '3', amount: 120, category: 'Utilities', description: 'Electricity Bill', date: subDays(new Date(), 5).toISOString(), type: 'expense' },
  { id: '4', amount: 60, category: 'Entertainment', description: 'Movie Night', date: subDays(new Date(), 1).toISOString(), type: 'expense' },
  { id: '5', amount: 200, category: 'Shopping', description: 'New Shoes', date: subDays(new Date(), 10).toISOString(), type: 'expense' },
  { id: '6', amount: 30, category: 'Transport', description: 'Gas', date: subDays(new Date(), 3).toISOString(), type: 'expense' },
  { id: '7', amount: 1200, category: 'Housing', description: 'Rent Payment', date: subDays(new Date(), 18).toISOString(), type: 'expense' },
  { id: '8', amount: 450, category: 'Other', description: 'Freelance Project', date: subDays(new Date(), 8).toISOString(), type: 'income' },
  { id: '9', amount: 85, category: 'Utilities', description: 'Internet & Phone', date: subDays(new Date(), 4).toISOString(), type: 'expense' },
  { id: '10', amount: 12, category: 'Food', description: 'Coffee Shop', date: subDays(new Date(), 0).toISOString(), type: 'expense' },
  { id: '11', amount: 50, category: 'Other', description: 'Gym Membership', date: subDays(new Date(), 12).toISOString(), type: 'expense' },
  { id: '12', amount: 150, category: 'Shopping', description: 'Amazon Purchase', date: subDays(new Date(), 6).toISOString(), type: 'expense' },
  { id: '13', amount: 25, category: 'Transport', description: 'Uber Ride', date: subDays(new Date(), 1).toISOString(), type: 'expense' },
  { id: '14', amount: 75, category: 'Food', description: 'Restaurant Dinner', date: subDays(new Date(), 3).toISOString(), type: 'expense' },
];

const INITIAL_BUDGETS: Budget[] = [
  { category: 'Food', limit: 500, spent: 320 },
  { category: 'Transport', limit: 200, spent: 150 },
  { category: 'Entertainment', limit: 150, spent: 120 },
  { category: 'Shopping', limit: 300, spent: 210 },
];

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'advisor'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [startingBalance, setStartingBalance] = useState<number>(1000);
  const [budgets, setBudgets] = useState<Budget[]>(INITIAL_BUDGETS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('expense');
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', content: "Hello! I'm FinAI, your personal finance advisor. How can I help you manage your money today?" }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Financial Calculations
  const summary = useMemo(() => {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      totalBalance: startingBalance + totalIncome - totalExpenses,
      totalIncome,
      totalExpenses,
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0
    };
  }, [transactions, startingBalance]);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        data[t.category] = (data[t.category] || 0) + t.amount;
      });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const chartData = useMemo(() => {
    // Last 7 days trend
    return Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayTransactions = transactions.filter(t => 
        format(new Date(t.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      return {
        name: format(date, 'MMM dd'),
        income: dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        expense: dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
      };
    });
  }, [transactions]);

  useEffect(() => {
    const fetchInsights = async () => {
      const text = await getSpendingInsights(transactions);
      // More robust parsing: split by lines, trim, and filter out empty or non-content lines
      const parsedInsights = text
        .split('\n')
        .map(line => line.trim().replace(/^[-*•\d.]+\s*/, '')) // Remove bullets, numbers, etc.
        .filter(line => line.length > 10); // Only keep substantial lines
      
      setInsights(parsedInsights.slice(0, 3));
    };
    fetchInsights();
  }, [transactions]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    const newUserMessage: ChatMessage = { role: 'user', content };
    setChatMessages(prev => [...prev, newUserMessage]);
    setIsChatLoading(true);

    const advice = await getFinancialAdvice(content, transactions, budgets, summary);
    setChatMessages(prev => [...prev, { role: 'model', content: advice }]);
    setIsChatLoading(false);
  };

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTransaction = { ...t, id: Math.random().toString(36).substr(2, 9) };
    setTransactions(prev => [newTransaction, ...prev]);
    
    // Update budget if it's an expense
    if (t.type === 'expense') {
      setBudgets(prev => prev.map(b => 
        b.category === t.category ? { ...b, spent: b.spent + t.amount } : b
      ));
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 font-sans">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-72 glass-card border-r-0 rounded-none flex-col z-20">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-600/30">
              <TrendingUp className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-display font-bold tracking-tight text-white">FinAI</h1>
          </div>
          
          <nav className="space-y-2">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
              { id: 'transactions', icon: Receipt, label: 'Transactions' },
              { id: 'advisor', icon: Sparkles, label: 'AI Advisor' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  activeTab === item.id 
                    ? "bg-brand-600/10 text-brand-400 border border-brand-500/20" 
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-transform duration-200 group-hover:scale-110",
                  activeTab === item.id ? "text-brand-400" : "text-slate-500"
                )} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        
        <div className="mt-auto p-6">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-brand-600/20 to-brand-900/20 border border-brand-500/10">
            <p className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-2">Pro Plan</p>
            <p className="text-sm text-slate-300 mb-4 leading-relaxed">Unlock advanced AI insights and multi-account sync.</p>
            <button className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-brand-600/20 active:scale-95">
              Upgrade Now
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Background Blobs */}
        <div className="absolute top-0 right-0 -z-10 w-[500px] h-[500px] bg-brand-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 -z-10 w-[400px] h-[400px] bg-indigo-600/10 blur-[120px] rounded-full" />

        <div className="max-w-6xl mx-auto p-6 md:p-10">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
                {activeTab === 'dashboard' && 'Financial Overview'}
                {activeTab === 'transactions' && 'Transactions'}
                {activeTab === 'advisor' && 'AI Financial Advisor'}
              </h2>
              <p className="text-slate-400 font-medium">Welcome back, Abhishek. Here's your status.</p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-brand-600/20"
              >
                <Plus className="w-4 h-4" />
                Add Transaction
              </button>
              <button className="p-2.5 rounded-xl bg-slate-900 border border-white/5 text-slate-400 hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-white">Abhishek</p>
                  <p className="text-xs text-slate-500">Premium User</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-brand-400 font-bold">
                  A
                </div>
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-4">
                  <button 
                    onClick={() => {
                      setModalType('income');
                      setIsAddModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-sm font-bold hover:bg-emerald-500/20 transition-all group"
                  >
                    <TrendingUp className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Add Income
                  </button>
                  <button 
                    onClick={() => {
                      setModalType('expense');
                      setIsAddModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-sm font-bold hover:bg-rose-500/20 transition-all group"
                  >
                    <TrendingDown className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Add Expense
                  </button>
                  <button 
                    onClick={() => setIsBalanceModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-2xl text-sm font-bold hover:bg-brand-500/20 transition-all group"
                  >
                    <Wallet className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Set Balance
                  </button>
                </div>

                {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Balance', value: summary.totalBalance, icon: Wallet, color: 'text-brand-400', trend: '+2.5%' },
                  { label: 'Monthly Income', value: summary.totalIncome, icon: TrendingUp, color: 'text-emerald-400', trend: '+12%' },
                  { label: 'Monthly Expenses', value: summary.totalExpenses, icon: TrendingDown, color: 'text-rose-400', trend: '-4%' },
                  { label: 'Savings Rate', value: summary.savingsRate, icon: PieChartIcon, color: 'text-blue-400', trend: '+0.5%', isPercent: true },
                ].map((stat, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-card glass-card-hover p-6 group"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className={cn("p-3 rounded-xl bg-slate-800/50 border border-white/5 group-hover:scale-110 transition-transform", stat.color)}>
                        <stat.icon className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                          stat.trend.startsWith('+') ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                        )}>
                          {stat.trend}
                        </span>
                        {stat.label === 'Total Balance' && (
                          <button 
                            onClick={() => setIsBalanceModalOpen(true)}
                            className="text-[10px] font-bold text-brand-400 hover:text-brand-300 uppercase tracking-widest flex items-center gap-1"
                          >
                            Edit Initial
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className="text-2xl font-display font-bold text-white">
                      {stat.isPercent ? `${stat.value.toFixed(1)}%` : `$${stat.value.toLocaleString()}`}
                    </p>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart */}
                <div className="lg:col-span-2 glass-card p-8">
                  <div className="flex items-center justify-between mb-10">
                    <h3 className="text-xl font-display font-bold text-white tracking-tight">Cash Flow Trend</h3>
                    <select className="bg-slate-800 border border-white/10 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none">
                      <option>Last 7 Days</option>
                      <option>Last 30 Days</option>
                    </select>
                  </div>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} 
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} 
                          tickFormatter={(val) => `$${val}`}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#0f172a', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)'
                          }}
                          itemStyle={{ fontWeight: 'bold' }}
                        />
                        <Area type="monotone" dataKey="income" stroke="#22c55e" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} />
                        <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* AI Insights */}
                <div className="glass-card p-8 bg-gradient-to-br from-brand-900/40 to-slate-950/40 relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-8">
                      <Sparkles className="text-brand-400" size={24} />
                      <h3 className="text-xl font-display font-bold text-white tracking-tight">AI Insights</h3>
                    </div>
                    <div className="space-y-6">
                      {insights.length > 0 ? (
                        insights.map((insight, i) => (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex gap-4 text-slate-300 text-sm leading-relaxed group"
                          >
                            <div className="mt-1.5 w-2 h-2 rounded-full bg-brand-500 shrink-0 shadow-[0_0_12px_rgba(34,197,94,0.6)] group-hover:scale-125 transition-transform" />
                            <p className="font-medium group-hover:text-white transition-colors">{insight}</p>
                          </motion.div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                          <div className="w-8 h-8 border-3 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Analyzing patterns...</p>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => setActiveTab('advisor')}
                      className="mt-10 w-full py-3 bg-white/5 hover:bg-white/10 text-brand-400 text-sm font-bold rounded-xl transition-all border border-brand-500/20 flex items-center justify-center gap-2 group"
                    >
                      Ask Advisor
                      <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>
                  {/* Decorative elements */}
                  <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-brand-800/20 rounded-full blur-3xl" />
                  <div className="absolute -left-10 -top-10 w-40 h-40 bg-brand-700/10 rounded-full blur-3xl" />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Budgets */}
                <div className="glass-card p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-display font-bold text-white tracking-tight">Budget Tracking</h3>
                    <button className="text-brand-400 text-xs font-bold uppercase tracking-widest hover:text-brand-300 transition-colors">Manage All</button>
                  </div>
                  <div className="space-y-8">
                    {budgets.map(budget => (
                      <div key={budget.category} className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="font-bold text-slate-200">{budget.category}</span>
                          <span className="text-slate-400 font-mono">${budget.spent} / ${budget.limit}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((budget.spent / budget.limit) * 100, 100)}%` }}
                            className={cn(
                              "h-full rounded-full shadow-[0_0_10px_rgba(var(--brand-500-rgb),0.3)]",
                              (budget.spent / budget.limit) > 0.9 ? "bg-rose-500" : "bg-brand-500"
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Spending by Category */}
                <div className="glass-card p-8">
                  <h3 className="text-xl font-display font-bold text-white tracking-tight mb-8">Spending Categories</h3>
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="h-64 w-full md:w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            innerRadius={70}
                            outerRadius={90}
                            paddingAngle={8}
                            dataKey="value"
                            stroke="none"
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#0f172a', 
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '12px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full md:w-1/2 space-y-4">
                      {categoryData.map((item, i) => (
                        <div key={item.name} className="flex items-center justify-between group cursor-default">
                          <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full shadow-lg" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                            <span className="text-slate-400 text-sm font-medium group-hover:text-slate-200 transition-colors">{item.name}</span>
                          </div>
                          <span className="text-white text-sm font-bold font-mono">${item.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'transactions' && (
            <motion.div 
              key="transactions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <header className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-display font-bold text-white tracking-tight">Transactions</h2>
                  <p className="text-slate-400 text-sm mt-1 font-medium">Manage and track your financial activities</p>
                </div>
                <div className="flex gap-3">
                  <button className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/10 transition-all flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" />
                    Export
                  </button>
                  <button 
                    onClick={() => setIsAddModalOpen(true)} 
                    className="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-400 transition-all shadow-[0_0_20px_rgba(var(--brand-500-rgb),0.3)] flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add New
                  </button>
                </div>
              </header>

              <div className="glass-card overflow-hidden border border-white/5">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/5">
                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {transactions.map((t) => (
                        <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-8 py-5 text-sm text-slate-400 font-medium">
                            {format(new Date(t.date), 'MMM dd, yyyy')}
                          </td>
                          <td className="px-8 py-5">
                            <div className="font-bold text-slate-200 group-hover:text-white transition-colors">{t.description}</div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-800/50 text-slate-300 border border-white/5">
                              {t.category}
                            </span>
                          </td>
                          <td className={cn(
                            "px-8 py-5 text-sm font-bold text-right font-mono",
                            t.type === 'income' ? "text-emerald-400" : "text-slate-200"
                          )}>
                            {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'advisor' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[calc(100vh-12rem)]">
              {/* Chat Area */}
              <motion.div 
                key="advisor"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="lg:col-span-3 flex flex-col glass-card overflow-hidden border border-white/5"
              >
                <header className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-500/20 rounded-2xl flex items-center justify-center text-brand-400 border border-brand-500/20">
                      <Sparkles size={24} />
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-lg text-white">FinAI Advisor</h2>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Always active</p>
                      </div>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors">
                    <History size={20} />
                  </button>
                </header>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin scrollbar-thumb-white/10">
                  {chatMessages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                      <div className="p-6 rounded-full bg-slate-900 border border-white/5">
                        <MessageSquare size={40} className="text-brand-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold">Start a conversation</h3>
                        <p className="text-slate-400 text-sm max-w-xs">Ask me anything about your spending, budgets, or financial goals.</p>
                      </div>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={cn(
                      "flex",
                      msg.role === 'user' ? "justify-end" : "justify-start"
                    )}>
                      <div className={cn(
                        "max-w-[85%] rounded-2xl p-5 text-sm leading-relaxed shadow-xl",
                        msg.role === 'user' 
                          ? "bg-brand-600 text-white rounded-tr-none" 
                          : "bg-slate-900/80 border border-white/10 text-slate-200 rounded-tl-none"
                      )}>
                        {msg.role === 'model' ? (
                          <div className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-li:my-1 prose-headings:text-white prose-strong:text-brand-400">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="font-medium">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 rounded-tl-none">
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                          <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-6 bg-white/[0.02] border-t border-white/5">
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = (e.target as any).message;
                      handleSendMessage(input.value);
                      input.value = '';
                    }}
                    className="relative"
                  >
                    <input 
                      name="message"
                      placeholder="Ask for financial advice..."
                      className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 pl-6 pr-16 text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all shadow-inner"
                    />
                    <button 
                      type="submit"
                      className="absolute right-2 top-2 bottom-2 px-4 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                    >
                      <Send size={18} />
                    </button>
                  </form>
                  <p className="text-[10px] text-slate-500 text-center mt-4 font-bold uppercase tracking-widest">
                    AI can make mistakes. Verify important financial decisions.
                  </p>
                </div>
              </motion.div>

              {/* Suggestions Sidebar */}
              <div className="hidden lg:flex flex-col gap-6">
                <div className="glass-card p-6 border border-white/5">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Quick Suggestions</h3>
                  <div className="space-y-3">
                    {[
                      "How can I save more this month?",
                      "Analyze my spending habits",
                      "Should I invest my savings?",
                      "Create a 50/30/20 budget"
                    ].map((suggestion, i) => (
                      <button 
                        key={i}
                        onClick={() => {
                          handleSendMessage(suggestion);
                        }}
                        className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/5 text-xs font-bold text-slate-300 hover:bg-white/10 hover:border-brand-500/30 transition-all group"
                      >
                        <span className="group-hover:text-brand-400 transition-colors">{suggestion}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-6 bg-gradient-to-br from-indigo-900/20 to-slate-950/20 border border-white/5">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Financial Health</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-bold text-white">Score</span>
                      <span className="text-2xl font-display font-bold text-emerald-400">742</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full w-[74.2%] bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">Your score is 12 points higher than last month.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </main>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass-card bg-slate-900/90 border border-white/10 shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-display font-bold text-white tracking-tight">Add Transaction</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  addTransaction({
                    amount: Number(formData.get('amount')),
                    description: formData.get('description') as string,
                    category: formData.get('category') as Category,
                    type: formData.get('type') as 'income' | 'expense',
                    date: new Date().toISOString(),
                  });
                  setIsAddModalOpen(false);
                }}
                className="space-y-6"
              >
                <div className="flex gap-2 p-1.5 bg-slate-950/50 rounded-2xl border border-white/5">
                  <label className="flex-1">
                    <input type="radio" name="type" value="expense" defaultChecked={modalType === 'expense'} className="sr-only peer" />
                    <div className="text-center py-2.5 rounded-xl text-xs font-bold cursor-pointer peer-checked:bg-white/10 peer-checked:text-white text-slate-500 transition-all uppercase tracking-widest">Expense</div>
                  </label>
                  <label className="flex-1">
                    <input type="radio" name="type" value="income" defaultChecked={modalType === 'income'} className="sr-only peer" />
                    <div className="text-center py-2.5 rounded-xl text-xs font-bold cursor-pointer peer-checked:bg-white/10 peer-checked:text-white text-slate-500 transition-all uppercase tracking-widest">Income</div>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Amount</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                    <input 
                      name="amount" 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      required 
                      className="w-full pl-10 pr-6 py-4 bg-slate-950/50 border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-brand-500 outline-none transition-all" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Description</label>
                  <input 
                    name="description" 
                    type="text" 
                    placeholder="What was this for?"
                    required 
                    className="w-full px-6 py-4 bg-slate-950/50 border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-brand-500 outline-none transition-all" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Category</label>
                  <select 
                    name="category" 
                    className="w-full px-6 py-4 bg-slate-950/50 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all appearance-none"
                  >
                    {['Housing', 'Food', 'Transport', 'Entertainment', 'Shopping', 'Utilities', 'Income', 'Other'].map(cat => (
                      <option key={cat} value={cat} className="bg-slate-900">{cat}</option>
                    ))}
                  </select>
                </div>

                <button 
                  type="submit" 
                  className="w-full py-4 bg-brand-500 text-white rounded-2xl font-bold hover:bg-brand-400 transition-all shadow-[0_0_20px_rgba(var(--brand-500-rgb),0.3)] mt-4"
                >
                  Save Transaction
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Set Initial Balance Modal */}
      <AnimatePresence>
        {isBalanceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBalanceModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass-card bg-slate-900/90 border border-white/10 shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-display font-bold text-white tracking-tight">Set Initial Balance</h3>
                <button onClick={() => setIsBalanceModalOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  setStartingBalance(Number(formData.get('balance')));
                  setIsBalanceModalOpen(false);
                }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Starting Balance</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                    <input 
                      name="balance" 
                      type="number" 
                      step="0.01" 
                      defaultValue={startingBalance}
                      required 
                      className="w-full pl-10 pr-6 py-4 bg-slate-950/50 border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-brand-500 outline-none transition-all" 
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 ml-1">This amount will be added to your total income minus expenses.</p>
                </div>

                <button 
                  type="submit" 
                  className="w-full py-4 bg-brand-500 text-white rounded-2xl font-bold hover:bg-brand-400 transition-all shadow-[0_0_20px_rgba(var(--brand-500-rgb),0.3)] mt-4"
                >
                  Update Balance
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all group",
        active 
          ? "bg-brand-500/20 text-brand-400 border border-brand-500/20 shadow-[0_0_15px_rgba(var(--brand-500-rgb),0.2)]" 
          : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
      )}
    >
      <div className={cn(
        "transition-transform group-hover:scale-110",
        active ? "text-brand-400" : "text-slate-500"
      )}>
        {icon}
      </div>
      {label}
    </button>
  );
}


