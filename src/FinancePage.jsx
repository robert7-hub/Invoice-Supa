import React, { useState, useMemo, useCallback } from 'react';
import {
  Plus, Trash2, Edit, ChevronLeft, X, Check,
  Wallet, TrendingUp, TrendingDown, PiggyBank, Target, DollarSign,
  ShoppingCart, Car, Heart, Wrench, Repeat, Music2, Shield, Utensils,
  MoreVertical, Filter, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 'gear', name: 'Gear / Equipment', icon: 'Music2', color: '#6366f1' },
  { id: 'insurance_equip', name: 'Equipment Insurance', icon: 'Shield', color: '#8b5cf6' },
  { id: 'food', name: 'Food', icon: 'Utensils', color: '#f59e0b' },
  { id: 'transport', name: 'Transport', icon: 'Car', color: '#3b82f6' },
  { id: 'insurance_life', name: 'Life Insurance', icon: 'Heart', color: '#ec4899' },
  { id: 'subscriptions', name: 'Subscriptions', icon: 'Repeat', color: '#14b8a6' },
  { id: 'maintenance', name: 'Maintenance', icon: 'Wrench', color: '#f97316' },
  { id: 'other', name: 'Other', icon: 'ShoppingCart', color: '#6b7280' },
];

const ICON_MAP = { Music2, Shield, Utensils, Car, Heart, Repeat, Wrench, ShoppingCart, Target, Wallet, DollarSign, PiggyBank };

const ICON_OPTIONS = [
  { name: 'Music2', label: 'Music' }, { name: 'Shield', label: 'Shield' },
  { name: 'Utensils', label: 'Food' }, { name: 'Car', label: 'Car' },
  { name: 'Heart', label: 'Heart' }, { name: 'Repeat', label: 'Repeat' },
  { name: 'Wrench', label: 'Tool' }, { name: 'ShoppingCart', label: 'Cart' },
  { name: 'Target', label: 'Target' }, { name: 'Wallet', label: 'Wallet' },
  { name: 'DollarSign', label: 'Dollar' }, { name: 'PiggyBank', label: 'Savings' },
];

const COLOR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#f59e0b', '#3b82f6', '#ec4899',
  '#14b8a6', '#f97316', '#6b7280', '#ef4444', '#10b981',
  '#06b6d4', '#a855f7',
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ============================================================================
// HELPERS
// ============================================================================

const generateId = () => Math.random().toString(36).slice(2, 11);

const formatCurrency = (amount) =>
  `R${Number(amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatCompact = (amount) => {
  const v = Number(amount || 0);
  if (Math.abs(v) >= 1_000_000) return `R${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R${(v / 1_000).toFixed(1)}K`;
  return formatCurrency(v);
};

const today = () => new Date().toISOString().split('T')[0];

const getMonthYear = (dateStr) => {
  const d = new Date(dateStr);
  return { month: d.getMonth(), year: d.getFullYear() };
};

const calculateDocumentTotal = (doc, taxRate = 0) => {
  const items = doc.items || [];
  const subtotal = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0);
  const itemDiscount = items.reduce((s, i) => {
    const sub = (Number(i.qty) || 0) * (Number(i.rate) || 0);
    if (i.discountAmount > 0) {
      return s + (i.discountType === 'percentage' ? sub * (i.discountAmount / 100) : i.discountAmount);
    }
    return s;
  }, 0);
  const afterItemDisc = subtotal - itemDiscount;
  const overallDisc = doc.overallDiscountType === 'percentage'
    ? afterItemDisc * ((doc.overallDiscount || 0) / 100)
    : (doc.overallDiscount || 0);
  const taxEnabled = doc.taxEnabled !== false;
  const tax = taxEnabled
    ? items.reduce((s, i) => {
        const sub = (Number(i.qty) || 0) * (Number(i.rate) || 0);
        let discSub = sub;
        if (i.discountAmount > 0) discSub = i.discountType === 'percentage' ? sub * (1 - i.discountAmount / 100) : sub - i.discountAmount;
        return s + (i.taxable !== false ? discSub * (taxRate / 100) : 0);
      }, 0)
    : 0;
  return Math.max(0, afterItemDisc - Math.min(overallDisc, afterItemDisc) + tax);
};

// ============================================================================
// STORAGE HELPERS
// ============================================================================

const FINANCE_KEYS = {
  expenses: 'invoiceapp_expenses',
  pockets: 'invoiceapp_pockets',
  budgets: 'invoiceapp_budgets',
  categories: 'invoiceapp_expense_categories',
  manualIncome: 'invoiceapp_manual_income',
};

const loadFinanceData = () => {
  const load = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  };
  return {
    expenses: load(FINANCE_KEYS.expenses, []),
    pockets: load(FINANCE_KEYS.pockets, []),
    budgets: load(FINANCE_KEYS.budgets, []),
    categories: load(FINANCE_KEYS.categories, null),
    manualIncome: load(FINANCE_KEYS.manualIncome, []),
  };
};

const saveFinance = (key, value) => {
  localStorage.setItem(FINANCE_KEYS[key], JSON.stringify(value));
};

// ============================================================================
// SHARED UI
// ============================================================================

const FormInput = ({ label, type = 'text', value, onChange, placeholder, multiline, rows = 3, theme }) => (
  <div className="space-y-1">
    <label className={`text-[11px] font-medium sm:text-sm ${theme.textSecondary}`}>{label}</label>
    {multiline ? (
      <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className={`w-full px-3 py-2 border ${theme.inputBg} ${theme.inputBorder} rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-slate-400 shadow-sm resize-none sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm ${theme.textPrimary}`} />
    ) : (
      <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full px-3 py-2 border ${theme.inputBg} ${theme.inputBorder} rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-slate-400 shadow-sm sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm ${theme.textPrimary}`} />
    )}
  </div>
);

const CategoryIcon = ({ iconName, color, size = 16 }) => {
  const Icon = ICON_MAP[iconName] || ShoppingCart;
  return (
    <div className="flex items-center justify-center rounded-lg" style={{ width: size + 12, height: size + 12, background: `${color}18` }}>
      <Icon size={size} style={{ color }} />
    </div>
  );
};

const ProgressBar = ({ value, max, color = '#3b82f6', height = 8 }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: `${color}15` }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
};

// ============================================================================
// FINANCE PAGE
// ============================================================================

export default function FinancePage({ data, save, theme }) {
  const [financeData, setFinanceData] = useState(loadFinanceData);
  const [subTab, setSubTab] = useState('overview');

  const reload = useCallback(() => setFinanceData(loadFinanceData()), []);

  const saveExpenses = useCallback((val) => { saveFinance('expenses', val); setFinanceData(p => ({ ...p, expenses: val })); }, []);
  const savePockets = useCallback((val) => { saveFinance('pockets', val); setFinanceData(p => ({ ...p, pockets: val })); }, []);
  const saveBudgets = useCallback((val) => { saveFinance('budgets', val); setFinanceData(p => ({ ...p, budgets: val })); }, []);
  const saveCategories = useCallback((val) => { saveFinance('categories', val); setFinanceData(p => ({ ...p, categories: val })); }, []);
  const saveManualIncome = useCallback((val) => { saveFinance('manualIncome', val); setFinanceData(p => ({ ...p, manualIncome: val })); }, []);
  const confirmDelete = useCallback((message, onConfirm) => {
    if (window.confirm(message)) onConfirm();
  }, []);

  const taxRate = data.settings?.taxRate || 15;
  const now = new Date();
  const cm = now.getMonth();
  const cy = now.getFullYear();

  const categories = financeData.categories || DEFAULT_EXPENSE_CATEGORIES;
  const sectionClass = 'space-y-2.5 sm:space-y-5';
  const actionButtonClass = `flex items-center gap-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-sm font-semibold`;
  const controlClass = `w-full sm:w-auto px-2.5 py-1.5 border ${theme.inputBorder} ${theme.inputBg} rounded-lg sm:rounded-xl text-[11px] sm:px-3 sm:py-2 sm:text-sm ${theme.textPrimary}`;

  // --- Derived Income Data ---
  const incomeData = useMemo(() => {
    const invoices = data.invoices || [];
    const manual = financeData.manualIncome || [];
    const paidInvoices = invoices.filter(i => i.status === 'paid');
    const outstandingInvoices = invoices.filter(i => i.status !== 'paid');

    const paidThisMonth = paidInvoices.filter(i => { const d = getMonthYear(i.date); return d.month === cm && d.year === cy; });
    const outstandingThisMonth = outstandingInvoices.filter(i => { const d = getMonthYear(i.date); return d.month === cm && d.year === cy; });
    const manualThisMonth = manual.filter(m => { const d = getMonthYear(m.date); return d.month === cm && d.year === cy; });

    const totalPaid = paidInvoices.reduce((s, i) => s + calculateDocumentTotal(i, taxRate), 0);
    const totalManual = manual.reduce((s, m) => s + Number(m.amount || 0), 0);
    const totalOutstanding = outstandingInvoices.reduce((s, i) => s + calculateDocumentTotal(i, taxRate), 0);
    const paidMonth = paidThisMonth.reduce((s, i) => s + calculateDocumentTotal(i, taxRate), 0);
    const manualMonth = manualThisMonth.reduce((s, m) => s + Number(m.amount || 0), 0);
    const outstandingMonth = outstandingThisMonth.reduce((s, i) => s + calculateDocumentTotal(i, taxRate), 0);

    // Monthly breakdown for chart (last 6 months)
    const monthly = [];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(cy, cm - i, 1);
      const mm = m.getMonth(), yy = m.getFullYear();
      const paid = paidInvoices.filter(inv => { const d = getMonthYear(inv.date); return d.month === mm && d.year === yy; })
        .reduce((s, inv) => s + calculateDocumentTotal(inv, taxRate), 0);
      const manualM = manual.filter(mi => { const d = getMonthYear(mi.date); return d.month === mm && d.year === yy; })
        .reduce((s, mi) => s + Number(mi.amount || 0), 0);
      monthly.push({ label: `${MONTHS[mm]} ${yy}`, income: paid + manualM, month: mm, year: yy });
    }

    return {
      totalPaid: totalPaid + totalManual, totalOutstanding,
      paidMonth: paidMonth + manualMonth, outstandingMonth,
      paidInvoices, outstandingInvoices, monthly,
      manualTotal: totalManual, manualMonth,
    };
  }, [data.invoices, financeData.manualIncome, taxRate, cm, cy]);

  // --- Derived Expense Data ---
  const expenseData = useMemo(() => {
    const all = financeData.expenses || [];
    const thisMonth = all.filter(e => { const d = getMonthYear(e.date); return d.month === cm && d.year === cy; });
    const totalMonth = thisMonth.reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalAll = all.reduce((s, e) => s + Number(e.amount || 0), 0);

    const byCategory = {};
    thisMonth.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount || 0);
    });

    // Monthly breakdown for chart (last 6 months)
    const monthly = [];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(cy, cm - i, 1);
      const mm = m.getMonth(), yy = m.getFullYear();
      const exp = all.filter(e => { const d = getMonthYear(e.date); return d.month === mm && d.year === yy; })
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      monthly.push({ label: `${MONTHS[mm]} ${yy}`, expenses: exp, month: mm, year: yy });
    }

    return { totalMonth, totalAll, byCategory, thisMonth, monthly };
  }, [financeData.expenses, cm, cy]);

  // --- Merged chart data for overview ---
  const chartData = useMemo(() => {
    return incomeData.monthly.map((m, idx) => ({
      label: m.label,
      income: m.income,
      expenses: expenseData.monthly[idx]?.expenses || 0,
    }));
  }, [incomeData.monthly, expenseData.monthly]);

  const netProfit = incomeData.paidMonth - expenseData.totalMonth;
  const totalSavings = (financeData.pockets || []).reduce((s, p) => s + Number(p.current || 0), 0);

  // ============================================================================
  // SUB-TAB: OVERVIEW DASHBOARD
  // ============================================================================

  const OverviewTab = () => {
    const pieData = categories
      .map(cat => ({ label: cat.name, value: expenseData.byCategory[cat.id] || 0, color: cat.color }))
      .filter(d => d.value > 0);

    const maxBar = Math.max(1, ...chartData.flatMap(d => [d.income, d.expenses]));

    return (
      <div className={sectionClass}>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-1.5 sm:gap-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 shadow-sm sm:rounded-2xl sm:p-4">
            <div className="mb-0.5 flex items-center gap-1 sm:mb-2 sm:gap-2"><TrendingUp size={11} className="text-emerald-600 sm:hidden" /><TrendingUp size={14} className="hidden text-emerald-600 sm:block" /><p className="text-[8px] font-semibold uppercase tracking-wide text-emerald-600 sm:text-xs">Income (Month)</p></div>
            <p className="text-[13px] font-bold text-emerald-700 sm:text-2xl">{formatCurrency(incomeData.paidMonth)}</p>
            <p className="mt-0.5 text-[9px] text-emerald-500 sm:text-xs">{formatCurrency(incomeData.outstandingMonth)} outstanding</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-2 shadow-sm sm:rounded-2xl sm:p-4">
            <div className="mb-0.5 flex items-center gap-1 sm:mb-2 sm:gap-2"><TrendingDown size={11} className="text-red-600 sm:hidden" /><TrendingDown size={14} className="hidden text-red-600 sm:block" /><p className="text-[8px] font-semibold uppercase tracking-wide text-red-600 sm:text-xs">Expenses (Month)</p></div>
            <p className="text-[13px] font-bold text-red-700 sm:text-2xl">{formatCurrency(expenseData.totalMonth)}</p>
            <p className="mt-0.5 text-[9px] text-red-400 sm:text-xs">{expenseData.thisMonth.length} transactions</p>
          </div>
          <div className={`${netProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'} border rounded-lg p-2 shadow-sm sm:rounded-2xl sm:p-4`}>
            <div className="mb-0.5 flex items-center gap-1 sm:mb-2 sm:gap-2"><DollarSign size={11} className={`${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'} sm:hidden`} /><DollarSign size={14} className={`${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'} hidden sm:block`} />
              <p className={`text-[8px] font-semibold uppercase tracking-wide sm:text-xs ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Net Profit</p></div>
            <p className={`text-[13px] font-bold sm:text-2xl ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatCurrency(netProfit)}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 shadow-sm sm:rounded-2xl sm:p-4">
            <div className="mb-0.5 flex items-center gap-1 sm:mb-2 sm:gap-2"><PiggyBank size={11} className="text-blue-600 sm:hidden" /><PiggyBank size={14} className="hidden text-blue-600 sm:block" /><p className="text-[8px] font-semibold uppercase tracking-wide text-blue-600 sm:text-xs">Total Savings</p></div>
            <p className="text-[13px] font-bold text-blue-700 sm:text-2xl">{formatCurrency(totalSavings)}</p>
            <p className="mt-0.5 text-[9px] text-blue-400 sm:text-xs">{(financeData.pockets || []).length} pockets</p>
          </div>
          <div className={`${theme.cardBg} border ${theme.border} rounded-lg p-2 shadow-sm sm:rounded-2xl sm:p-4`}>
            <div className="mb-0.5 flex items-center gap-1 sm:mb-2 sm:gap-2"><ArrowDownRight size={11} className="text-amber-500 sm:hidden" /><ArrowDownRight size={14} className="hidden text-amber-500 sm:block" /><p className={`text-[8px] font-semibold uppercase tracking-wide sm:text-xs ${theme.textMuted}`}>Outstanding</p></div>
            <p className={`text-[13px] font-bold sm:text-2xl ${theme.textPrimary}`}>{formatCurrency(incomeData.totalOutstanding)}</p>
            <p className={`mt-0.5 text-[9px] sm:text-xs ${theme.textMuted}`}>{incomeData.outstandingInvoices.length} invoices</p>
          </div>
          <div className={`${theme.cardBg} border ${theme.border} rounded-lg p-2 shadow-sm sm:rounded-2xl sm:p-4`}>
            <div className="mb-0.5 flex items-center gap-1 sm:mb-2 sm:gap-2"><ArrowUpRight size={11} className="text-emerald-500 sm:hidden" /><ArrowUpRight size={14} className="hidden text-emerald-500 sm:block" /><p className={`text-[8px] font-semibold uppercase tracking-wide sm:text-xs ${theme.textMuted}`}>Paid Invoices</p></div>
            <p className={`text-[13px] font-bold sm:text-2xl ${theme.textPrimary}`}>{formatCurrency(incomeData.totalPaid)}</p>
            <p className={`mt-0.5 text-[9px] sm:text-xs ${theme.textMuted}`}>{incomeData.paidInvoices.length} invoices</p>
          </div>
        </div>

        {/* Income vs Expenses Bar Chart */}
        <div className={`${theme.cardBg} border ${theme.border} rounded-lg shadow-sm overflow-hidden sm:rounded-2xl`}>
          <div className={`border-b px-2.5 py-1.5 sm:p-4 ${theme.border}`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-[11px] font-semibold sm:text-base ${theme.textPrimary}`}>Income vs Expenses (6 Months)</h3>
              <div className="flex gap-2 sm:hidden">
                <span className="flex items-center gap-1 text-[9px]"><span className="h-2 w-2 rounded-full bg-emerald-500" />Income</span>
                <span className="flex items-center gap-1 text-[9px]"><span className="h-2 w-2 rounded-full bg-red-400" />Expenses</span>
              </div>
            </div>
            <div className="mt-1.5 hidden gap-4 sm:flex sm:mt-2">
              <span className="flex items-center gap-1.5 text-xs"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Income</span>
              <span className="flex items-center gap-1.5 text-xs"><span className="h-2.5 w-2.5 rounded-full bg-red-400" />Expenses</span>
            </div>
          </div>
          <div className="px-2 py-1.5 sm:p-4">
            <div className="flex min-h-[150px] items-end gap-2 overflow-x-auto pb-1 sm:min-h-[210px] sm:gap-4 sm:pb-2">
              {chartData.map(d => (
                <div key={d.label} className="flex min-w-[40px] flex-1 flex-col items-center gap-1 sm:min-w-[90px] sm:gap-2">
                  <div className="flex h-[110px] w-full items-end justify-center gap-1 sm:h-[200px] sm:gap-1.5">
                    <div className="flex h-full flex-1 items-end"><div className="w-full rounded-t-lg bg-emerald-500" style={{ height: `${Math.max((d.income / maxBar) * 100, d.income > 0 ? 6 : 0)}%` }} title={`Income: ${formatCurrency(d.income)}`} /></div>
                    <div className="flex h-full flex-1 items-end"><div className="w-full rounded-t-lg bg-red-400" style={{ height: `${Math.max((d.expenses / maxBar) * 100, d.expenses > 0 ? 6 : 0)}%` }} title={`Expenses: ${formatCurrency(d.expenses)}`} /></div>
                  </div>
                  <p className={`text-[9px] font-medium sm:text-xs ${theme.textPrimary}`}>{d.label.split(' ')[0]}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Expense Category Pie */}
        {pieData.length > 0 && (
          <div className={`${theme.cardBg} border ${theme.border} rounded-xl shadow-sm overflow-hidden sm:rounded-2xl`}>
            <div className={`border-b px-2.5 py-1.5 sm:p-4 ${theme.border}`}>
              <h3 className={`text-[11px] font-semibold sm:text-base ${theme.textPrimary}`}>Expense Breakdown (This Month)</h3>
            </div>
            <div className="px-2.5 py-2 sm:p-4">
              <div className="grid gap-3 sm:grid-cols-[168px_1fr] sm:items-center md:grid-cols-[200px_1fr]">
                <div className="mx-auto">
                  <svg viewBox="0 0 200 200" className="h-[120px] w-[120px] -rotate-90 sm:h-[200px] sm:w-[200px]">
                    {(() => {
                      const total = pieData.reduce((s, d) => s + d.value, 0);
                      const r = 65, sw = 22, circ = 2 * Math.PI * r;
                      let offset = 0;
                      return pieData.map((d, i) => {
                        const dash = total > 0 ? (d.value / total) * circ : 0;
                        const el = <circle key={i} cx="100" cy="100" r={r} fill="none" stroke={d.color} strokeWidth={sw} strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset} strokeLinecap="round" />;
                        offset += dash;
                        return el;
                      });
                    })()}
                  </svg>
                </div>
                <div className="space-y-2">
                  {pieData.map(d => (
                    <div key={d.label} className={`flex items-center justify-between gap-3 rounded-lg border px-2.5 py-2 sm:rounded-xl sm:px-3 ${theme.border} ${theme.subtleBg}`}>
                      <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: d.color }} /><span className={`text-[13px] sm:text-sm ${theme.textPrimary}`}>{d.label}</span></div>
                      <span className={`text-[13px] font-semibold sm:text-sm ${theme.textPrimary}`}>{formatCurrency(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // SUB-TAB: EXPENSES
  // ============================================================================

  const ExpensesTab = () => {
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [filterMonth, setFilterMonth] = useState('all');
    const [filterCat, setFilterCat] = useState('all');

    const [form, setForm] = useState({ title: '', amount: '', category: 'other', date: today(), notes: '', type: 'variable' });

    const openAdd = () => { setEditItem(null); setForm({ title: '', amount: '', category: 'other', date: today(), notes: '', type: 'variable' }); setShowForm(true); };
    const openEdit = (item) => { setEditItem(item); setForm({ ...item }); setShowForm(true); };

    const handleSave = () => {
      const sanitizedTitle = String(form.title || '').trim();
      if (!sanitizedTitle) return;
      const entry = { ...form, title: sanitizedTitle, amount: Math.max(0, Number(form.amount) || 0), id: editItem?.id || generateId() };
      const updated = editItem
        ? (financeData.expenses || []).map(e => e.id === editItem.id ? entry : e)
        : [...(financeData.expenses || []), entry];
      saveExpenses(updated);
      setShowForm(false);
    };

    const handleDelete = (id) => {
      const expense = (financeData.expenses || []).find(e => e.id === id);
      const expenseLabel = expense?.title ? `expense "${expense.title}"` : 'this expense';
      confirmDelete(`Are you sure you want to delete ${expenseLabel}? This action cannot be undone.`, () => {
        saveExpenses((financeData.expenses || []).filter(e => e.id !== id));
      });
    };

    const filtered = useMemo(() => {
      let list = financeData.expenses || [];
      if (filterMonth !== 'all') {
        const [y, m] = filterMonth.split('-').map(Number);
        list = list.filter(e => { const d = getMonthYear(e.date); return d.month === m && d.year === y; });
      }
      if (filterCat !== 'all') list = list.filter(e => e.category === filterCat);
      return list.sort((a, b) => b.date.localeCompare(a.date));
    }, [financeData.expenses, filterMonth, filterCat]);

    const totalFiltered = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);

    const catTotals = useMemo(() => {
      const map = {};
      filtered.forEach(e => { map[e.category] = (map[e.category] || 0) + Number(e.amount || 0); });
      return map;
    }, [filtered]);

    const getCatName = (id) => categories.find(c => c.id === id)?.name || id;
    const getCat = (id) => categories.find(c => c.id === id) || categories[categories.length - 1];

    // Months for filter dropdown
    const monthOptions = useMemo(() => {
      const set = new Set();
      (financeData.expenses || []).forEach(e => {
        const d = getMonthYear(e.date);
        set.add(`${d.year}-${d.month}`);
      });
      return Array.from(set).sort().reverse().map(k => {
        const [y, m] = k.split('-').map(Number);
        return { value: k, label: `${MONTHS[m]} ${y}` };
      });
    }, [financeData.expenses]);

    return (
      <div className={sectionClass}>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div>
            <h2 className={`text-base font-bold sm:text-lg ${theme.textPrimary}`}>Expenses</h2>
            <p className={`text-xs sm:text-sm ${theme.textMuted}`}>Total: {formatCurrency(totalFiltered)} ({filtered.length} items)</p>
          </div>
          <button onClick={openAdd} className={`${actionButtonClass} ${theme.accent} ${theme.accentHover}`}><Plus size={15} /> Add Expense</button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className={controlClass}>
            <option value="all">All months</option>
            {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className={controlClass}>
            <option value="all">All categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Category totals */}
        {Object.keys(catTotals).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(catTotals).sort((a, b) => b[1] - a[1]).map(([catId, total]) => {
              const cat = getCat(catId);
              return (
                <div key={catId} className={`flex items-center gap-1.5 px-2 py-1 border ${theme.border} rounded-full ${theme.subtleBg} sm:gap-2 sm:px-3 sm:py-1.5`}>
                  <CategoryIcon iconName={cat.icon} color={cat.color} size={12} />
                  <span className={`text-xs font-medium ${theme.textPrimary}`}>{cat.name}</span>
                  <span className={`text-xs font-bold ${theme.textPrimary}`}>{formatCurrency(total)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* List */}
        <div className={`${theme.cardBg} border ${theme.border} rounded-xl overflow-hidden shadow-sm sm:rounded-2xl`}>
          {filtered.length === 0 ? (
            <div className={`p-8 text-center sm:p-12 ${theme.textMuted}`}>No expenses found. Add your first expense above.</div>
          ) : (
            <div className={`divide-y ${theme.border}`}>
              {filtered.map(exp => {
                const cat = getCat(exp.category);
                return (
                  <div key={exp.id} className={`flex items-center gap-2 px-2.5 py-2 sm:gap-4 sm:p-4 ${theme.tableRowHover}`}>
                    <CategoryIcon iconName={cat.icon} color={cat.color} size={16} />
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${theme.textPrimary} truncate`}>{exp.title}</p>
                      <p className={`text-xs ${theme.textMuted}`}>{cat.name} • {exp.date} • {exp.type || 'variable'}</p>
                      {exp.notes && <p className={`text-xs ${theme.textMuted} mt-0.5`}>{exp.notes}</p>}
                    </div>
                    <p className="whitespace-nowrap text-xs font-bold text-red-600 sm:text-sm">{formatCurrency(exp.amount)}</p>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(exp)} className={`p-1.5 ${theme.buttonHover} rounded-lg`}><Edit size={14} className={theme.iconColor} /></button>
                      <button onClick={() => handleDelete(exp.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={14} className="text-red-400" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expense Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto overscroll-y-contain" style={{ paddingBottom: 'max(140px, calc(env(safe-area-inset-bottom) + 130px))' }}>
            <div className={`${theme.modalBg} rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-xl border ${theme.border} flex flex-col max-h-[80vh] sm:max-h-[85vh] min-h-0 overflow-hidden`}>
              <div className={`p-4 sm:p-5 border-b ${theme.border} flex items-center justify-between shrink-0`}>
                <h3 className={`text-lg font-bold ${theme.textPrimary}`}>{editItem ? 'Edit Expense' : 'Add Expense'}</h3>
                <button onClick={() => setShowForm(false)} className={`p-1.5 ${theme.buttonHover} rounded-lg`}><X size={18} /></button>
              </div>
              <div className="p-4 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto flex-1 min-h-0 [&::-webkit-scrollbar]:hidden" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <FormInput label="Title" value={form.title} onChange={v => setForm({ ...form, title: v })} placeholder="e.g. New speaker cable" theme={theme} />
                <FormInput label="Amount (R)" type="number" value={form.amount} onChange={v => setForm({ ...form, amount: v })} theme={theme} />
                <div className="space-y-1.5">
                  <label className={`text-sm font-medium ${theme.textSecondary}`}>Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className={`w-full px-4 py-2.5 border ${theme.inputBg} ${theme.inputBorder} rounded-xl text-sm ${theme.textPrimary}`}>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <FormInput label="Date" type="date" value={form.date} onChange={v => setForm({ ...form, date: v })} theme={theme} />
                <div className="space-y-1.5">
                  <label className={`text-sm font-medium ${theme.textSecondary}`}>Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                    className={`w-full px-4 py-2.5 border ${theme.inputBg} ${theme.inputBorder} rounded-xl text-sm ${theme.textPrimary}`}>
                    <option value="fixed">Fixed</option>
                    <option value="variable">Variable</option>
                  </select>
                </div>
                <FormInput label="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} multiline rows={2} theme={theme} />
              </div>
              <div className={`p-4 sm:p-5 border-t ${theme.border} flex gap-3 shrink-0`}>
                <button onClick={() => setShowForm(false)} className={`flex-1 py-2.5 border ${theme.border} rounded-xl font-medium ${theme.textPrimary} ${theme.buttonHover}`}>Cancel</button>
                <button onClick={handleSave} className={`flex-1 py-2.5 ${theme.accent} rounded-xl font-semibold ${theme.accentHover}`}>Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // SUB-TAB: INCOME
  // ============================================================================

  const IncomeTab = () => {
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState({ title: '', amount: '', date: today(), source: '', notes: '' });

    const manualEntries = financeData.manualIncome || [];

    const openAdd = () => { setEditItem(null); setForm({ title: '', amount: '', date: today(), source: '', notes: '' }); setShowForm(true); };
    const openEdit = (item) => { setEditItem(item); setForm({ ...item }); setShowForm(true); };

    const handleSave = () => {
      const sanitizedTitle = String(form.title || '').trim();
      if (!sanitizedTitle) return;
      const entry = { ...form, title: sanitizedTitle, amount: Math.max(0, Number(form.amount) || 0), id: editItem?.id || generateId() };
      const updated = editItem
        ? manualEntries.map(e => e.id === editItem.id ? entry : e)
        : [...manualEntries, entry];
      saveManualIncome(updated);
      setShowForm(false);
    };

    const handleDelete = (id) => {
      const entry = manualEntries.find(e => e.id === id);
      const entryLabel = entry?.title ? `income entry "${entry.title}"` : 'this income entry';
      confirmDelete(`Are you sure you want to delete ${entryLabel}? This action cannot be undone.`, () => {
        saveManualIncome(manualEntries.filter(e => e.id !== id));
      });
    };

    const paidByMonth = useMemo(() => {
      const map = {};
      incomeData.paidInvoices.forEach(inv => {
        const d = getMonthYear(inv.date);
        const key = `${d.year}-${String(d.month).padStart(2, '0')}`;
        map[key] = (map[key] || 0) + calculateDocumentTotal(inv, taxRate);
      });
      manualEntries.forEach(m => {
        const d = getMonthYear(m.date);
        const key = `${d.year}-${String(d.month).padStart(2, '0')}`;
        map[key] = (map[key] || 0) + Number(m.amount || 0);
      });
      return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0])).map(([k, v]) => {
        const [y, m] = k.split('-').map(Number);
        return { label: `${MONTHS[m]} ${y}`, value: v };
      });
    }, [incomeData.paidInvoices, manualEntries, taxRate]);

    return (
      <div className={sectionClass}>
        {/* Income Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <h2 className={`text-base font-bold sm:text-lg ${theme.textPrimary}`}>Income</h2>
          <button onClick={openAdd} className={`${actionButtonClass} ${theme.accent} ${theme.accentHover}`}><Plus size={15} /> Add Income</button>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 shadow-sm sm:rounded-2xl sm:p-4">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-emerald-600 sm:text-xs">Actual Income</p>
            <p className="mt-1 text-sm font-bold text-emerald-700 sm:mt-2 sm:text-2xl">{formatCurrency(incomeData.totalPaid)}</p>
            <p className="mt-0.5 text-[10px] text-emerald-500 sm:text-xs">{incomeData.paidInvoices.length} invoices + {manualEntries.length} manual</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 shadow-sm sm:rounded-2xl sm:p-4">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-amber-600 sm:text-xs">Projected Income</p>
            <p className="mt-1 text-sm font-bold text-amber-700 sm:mt-2 sm:text-2xl">{formatCurrency(incomeData.totalOutstanding)}</p>
            <p className="mt-0.5 text-[10px] text-amber-500 sm:text-xs">{incomeData.outstandingInvoices.length} outstanding</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 shadow-sm sm:rounded-2xl sm:p-4">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-emerald-600 sm:text-xs">Paid (This Month)</p>
            <p className="mt-1 text-sm font-bold text-emerald-700 sm:mt-2 sm:text-2xl">{formatCurrency(incomeData.paidMonth)}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 shadow-sm sm:rounded-2xl sm:p-4">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-amber-600 sm:text-xs">Expected (This Month)</p>
            <p className="mt-1 text-sm font-bold text-amber-700 sm:mt-2 sm:text-2xl">{formatCurrency(incomeData.outstandingMonth)}</p>
          </div>
        </div>

        {/* Manual Income Entries */}
        <div className={`${theme.cardBg} border ${theme.border} rounded-2xl shadow-sm overflow-hidden`}>
          <div className={`px-3 py-2 sm:p-4 border-b ${theme.border}`}>
            <h3 className={`text-sm font-semibold sm:text-base ${theme.textPrimary}`}>Manual Income</h3>
          </div>
          <div className={`divide-y ${theme.border} max-h-80 overflow-y-auto`}>
            {manualEntries.length === 0 ? (
              <div className={`p-5 text-center text-sm sm:p-8 ${theme.textMuted}`}>No manual income added yet.</div>
            ) : manualEntries.sort((a, b) => b.date.localeCompare(a.date)).map(entry => (
              <div key={entry.id} className={`flex items-center gap-2 px-2.5 py-2 sm:gap-4 sm:p-4 ${theme.tableRowHover}`}>
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center sm:w-9 sm:h-9 sm:rounded-xl">
                  <DollarSign size={14} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${theme.textPrimary} truncate`}>{entry.title}</p>
                  <p className={`text-xs ${theme.textMuted}`}>{entry.source ? `${entry.source} • ` : ''}{entry.date}</p>
                  {entry.notes && <p className={`text-xs ${theme.textMuted} mt-0.5`}>{entry.notes}</p>}
                </div>
                <p className="whitespace-nowrap text-xs font-bold text-emerald-600 sm:text-sm">{formatCurrency(entry.amount)}</p>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(entry)} className={`p-1.5 ${theme.buttonHover} rounded-lg`}><Edit size={14} className={theme.iconColor} /></button>
                  <button onClick={() => handleDelete(entry.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={14} className="text-red-400" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Paid Invoice List */}
        <div className={`${theme.cardBg} border ${theme.border} rounded-2xl shadow-sm overflow-hidden`}>
          <div className={`px-3 py-2 sm:p-4 border-b ${theme.border}`}>
            <h3 className={`text-sm font-semibold sm:text-base ${theme.textPrimary}`}>Paid Invoices</h3>
          </div>
          <div className={`divide-y ${theme.border} max-h-80 overflow-y-auto`}>
            {incomeData.paidInvoices.length === 0 ? (
              <div className={`p-5 text-center text-sm sm:p-8 ${theme.textMuted}`}>No paid invoices yet.</div>
            ) : incomeData.paidInvoices.slice(0, 50).map(inv => {
              const cl = (data.clients || []).find(c => c.id === inv.clientId);
              return (
                <div key={inv.id} className={`flex items-center justify-between px-3 py-2 sm:p-4 ${theme.tableRowHover}`}>
                  <div>
                    <p className={`font-medium ${theme.textPrimary}`}>{inv.number}</p>
                    <p className={`text-xs ${theme.textMuted}`}>{cl?.name || 'Client'} • {inv.date}</p>
                  </div>
                  <p className="text-xs font-semibold text-emerald-600 sm:text-sm">{formatCurrency(calculateDocumentTotal(inv, taxRate))}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Income Breakdown */}
        <div className={`${theme.cardBg} border ${theme.border} rounded-2xl shadow-sm overflow-hidden`}>
          <div className={`px-3 py-2 sm:p-4 border-b ${theme.border}`}>
            <h3 className={`text-sm font-semibold sm:text-base ${theme.textPrimary}`}>Monthly Income</h3>
          </div>
          <div className="px-3 py-2 sm:p-4 space-y-2.5 sm:space-y-3">
            {paidByMonth.length === 0 ? (
              <div className={`py-6 text-center text-sm ${theme.textMuted}`}>No income data yet.</div>
            ) : paidByMonth.map(m => {
              const maxVal = Math.max(1, ...paidByMonth.map(x => x.value));
              return (
                <div key={m.label} className="space-y-1">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className={theme.textPrimary}>{m.label}</span>
                    <span className={`font-semibold ${theme.textPrimary}`}>{formatCurrency(m.value)}</span>
                  </div>
                  <ProgressBar value={m.value} max={maxVal} color="#10b981" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Outstanding Invoices */}
        <div className={`${theme.cardBg} border ${theme.border} rounded-2xl shadow-sm overflow-hidden`}>
          <div className={`px-3 py-2 sm:p-4 border-b ${theme.border}`}>
            <h3 className={`text-sm font-semibold sm:text-base ${theme.textPrimary}`}>Outstanding Invoices</h3>
          </div>
          <div className={`divide-y ${theme.border} max-h-64 overflow-y-auto`}>
            {incomeData.outstandingInvoices.length === 0 ? (
              <div className={`p-5 text-center text-sm sm:p-8 ${theme.textMuted}`}>All invoices are paid!</div>
            ) : incomeData.outstandingInvoices.slice(0, 50).map(inv => {
              const cl = (data.clients || []).find(c => c.id === inv.clientId);
              return (
                <div key={inv.id} className={`flex items-center justify-between px-3 py-2 sm:p-4 ${theme.tableRowHover}`}>
                  <div>
                    <p className={`font-medium ${theme.textPrimary}`}>{inv.number}</p>
                    <p className={`text-xs ${theme.textMuted}`}>{cl?.name || 'Client'} • {inv.date}</p>
                  </div>
                  <p className="text-xs font-semibold text-amber-600 sm:text-sm">{formatCurrency(calculateDocumentTotal(inv, taxRate))}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add/Edit Income Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto overscroll-y-contain" style={{ paddingBottom: 'max(140px, calc(env(safe-area-inset-bottom) + 130px))' }}>
            <div className={`${theme.modalBg} rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-xl border ${theme.border} flex flex-col max-h-[80vh] sm:max-h-[85vh] min-h-0 overflow-hidden`}>
              <div className={`p-4 sm:p-5 border-b ${theme.border} flex items-center justify-between shrink-0`}>
                <h3 className={`text-lg font-bold ${theme.textPrimary}`}>{editItem ? 'Edit Income' : 'Add Income'}</h3>
                <button onClick={() => setShowForm(false)} className={`p-1.5 ${theme.buttonHover} rounded-lg`}><X size={18} /></button>
              </div>
              <div className="p-4 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto flex-1 min-h-0 [&::-webkit-scrollbar]:hidden" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <FormInput label="Description" value={form.title} onChange={v => setForm({ ...form, title: v })} placeholder="e.g. Freelance gig, Cash payment" theme={theme} />
                <FormInput label="Amount (R)" type="number" value={form.amount} onChange={v => setForm({ ...form, amount: v })} theme={theme} />
                <FormInput label="Source" value={form.source} onChange={v => setForm({ ...form, source: v })} placeholder="e.g. Client name, Cash, EFT" theme={theme} />
                <FormInput label="Date" type="date" value={form.date} onChange={v => setForm({ ...form, date: v })} theme={theme} />
                <FormInput label="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} multiline rows={2} theme={theme} />
              </div>
              <div className={`p-4 sm:p-5 border-t ${theme.border} flex gap-3 shrink-0`}>
                <button onClick={() => setShowForm(false)} className={`flex-1 py-2.5 border ${theme.border} rounded-xl font-medium ${theme.textPrimary} ${theme.buttonHover}`}>Cancel</button>
                <button onClick={handleSave} className={`flex-1 py-2.5 ${theme.accent} rounded-xl font-semibold ${theme.accentHover}`}>Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // SUB-TAB: SAVINGS / POCKETS
  // ============================================================================

  const SavingsTab = () => {
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState({ name: '', target: '', current: '' });
    const [allocateId, setAllocateId] = useState(null);
    const [allocateAmount, setAllocateAmount] = useState('');

    const pockets = financeData.pockets || [];

    const openAdd = () => { setEditItem(null); setForm({ name: '', target: '', current: '' }); setShowForm(true); };
    const openEdit = (p) => { setEditItem(p); setForm({ name: p.name, target: p.target || '', current: p.current || '' }); setShowForm(true); };

    const handleSave = () => {
      const sanitizedName = String(form.name || '').trim();
      if (!sanitizedName) return;
      const entry = { name: sanitizedName, target: Math.max(0, Number(form.target) || 0), current: Math.max(0, Number(form.current) || 0), id: editItem?.id || generateId() };
      const updated = editItem ? pockets.map(p => p.id === editItem.id ? entry : p) : [...pockets, entry];
      savePockets(updated);
      setShowForm(false);
    };

    const handleDelete = (id) => {
      const pocket = pockets.find(p => p.id === id);
      const pocketLabel = pocket?.name ? `savings pocket "${pocket.name}"` : 'this savings pocket';
      confirmDelete(`Are you sure you want to delete ${pocketLabel}? This action cannot be undone.`, () => {
        savePockets(pockets.filter(p => p.id !== id));
      });
    };

    const handleAllocate = (id) => {
      const amt = Math.max(0, Number(allocateAmount) || 0);
      if (!amt) return;
      savePockets(pockets.map(p => p.id === id ? { ...p, current: (Number(p.current) || 0) + amt } : p));
      setAllocateId(null);
      setAllocateAmount('');
    };

    const tc = pockets.reduce((s, p) => s + Number(p.current || 0), 0);
    const colors = ['#6366f1', '#3b82f6', '#14b8a6', '#f59e0b', '#ec4899', '#f97316', '#8b5cf6', '#10b981'];

    return (
      <div className={sectionClass}>
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div>
            <h2 className={`text-base font-bold sm:text-lg ${theme.textPrimary}`}>Savings Pockets</h2>
            <p className={`text-xs sm:text-sm ${theme.textMuted}`}>Total saved: {formatCurrency(tc)} across {pockets.length} pockets</p>
          </div>
          <button onClick={openAdd} className={`${actionButtonClass} ${theme.accent} ${theme.accentHover}`}><Plus size={15} /> New Pocket</button>
        </div>

        {pockets.length === 0 ? (
          <div className={`${theme.cardBg} border ${theme.border} rounded-xl p-8 text-center sm:rounded-2xl sm:p-12 ${theme.textMuted}`}>No pockets yet. Create your first savings pocket!</div>
        ) : (
          <div className="grid gap-2 sm:gap-4 md:grid-cols-2">
            {pockets.map((p, idx) => {
              const pct = p.target > 0 ? Math.min((Number(p.current) / Number(p.target)) * 100, 100) : 0;
              const pctOfTotal = tc > 0 ? ((Number(p.current) / tc) * 100).toFixed(1) : '0.0';
              const col = colors[idx % colors.length];
              return (
                <div key={p.id} className={`${theme.cardBg} border ${theme.border} rounded-lg p-3 shadow-sm sm:rounded-2xl sm:p-5`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md sm:h-10 sm:w-10 sm:rounded-xl" style={{ background: `${col}15` }}>
                        <PiggyBank size={14} className="sm:hidden" style={{ color: col }} />
                        <PiggyBank size={18} className="hidden sm:block" style={{ color: col }} />
                      </div>
                      <div>
                        <p className={`font-semibold ${theme.textPrimary}`}>{p.name}</p>
                        <p className={`text-xs ${theme.textMuted}`}>{pctOfTotal}% of total</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(p)} className={`p-1.5 ${theme.buttonHover} rounded-lg`}><Edit size={14} className={theme.iconColor} /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={14} className="text-red-400" /></button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className={theme.textSecondary}>{formatCurrency(p.current)}</span>
                      {p.target > 0 && <span className={theme.textMuted}>of {formatCurrency(p.target)}</span>}
                    </div>
                    <ProgressBar value={Number(p.current)} max={Number(p.target) || Number(p.current) || 1} color={col} height={10} />
                    {p.target > 0 && <p className={`text-xs ${theme.textMuted} mt-1`}>{pct.toFixed(1)}% complete</p>}
                  </div>
                  {/* Allocate */}
                  <div className="mt-3">
                    {allocateId === p.id ? (
                      <div className="flex gap-2">
                        <input type="number" placeholder="Amount" value={allocateAmount} onChange={e => setAllocateAmount(e.target.value)}
                          className={`flex-1 px-3 py-2 border ${theme.inputBorder} ${theme.inputBg} rounded-lg text-[13px] sm:rounded-xl sm:text-sm ${theme.textPrimary}`} />
                        <button onClick={() => handleAllocate(p.id)} className={`px-3 py-2 ${theme.accent} rounded-lg text-[13px] font-semibold sm:rounded-xl sm:text-sm ${theme.accentHover}`}>Add</button>
                        <button onClick={() => { setAllocateId(null); setAllocateAmount(''); }} className={`px-3 py-2 border ${theme.border} rounded-lg text-[13px] sm:rounded-xl sm:text-sm ${theme.textPrimary}`}>X</button>
                      </div>
                    ) : (
                      <button onClick={() => setAllocateId(p.id)} className={`w-full py-2 border ${theme.border} rounded-lg text-[13px] font-medium sm:rounded-xl sm:text-sm ${theme.textSecondary} ${theme.buttonHover}`}>+ Allocate Funds</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pocket Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto overscroll-y-contain" style={{ paddingBottom: 'max(140px, calc(env(safe-area-inset-bottom) + 130px))' }}>
            <div className={`${theme.modalBg} rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-xl border ${theme.border} flex flex-col max-h-[80vh] sm:max-h-[85vh] min-h-0 overflow-hidden`}>
              <div className={`p-4 sm:p-5 border-b ${theme.border} flex items-center justify-between shrink-0`}>
                <h3 className={`text-lg font-bold ${theme.textPrimary}`}>{editItem ? 'Edit Pocket' : 'New Pocket'}</h3>
                <button onClick={() => setShowForm(false)} className={`p-1.5 ${theme.buttonHover} rounded-lg`}><X size={18} /></button>
              </div>
              <div className="p-4 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto flex-1 min-h-0 [&::-webkit-scrollbar]:hidden" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <FormInput label="Pocket Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="e.g. Emergency Fund" theme={theme} />
                <FormInput label="Target Amount (R)" type="number" value={form.target} onChange={v => setForm({ ...form, target: v })} placeholder="Optional" theme={theme} />
                <FormInput label="Current Amount (R)" type="number" value={form.current} onChange={v => setForm({ ...form, current: v })} theme={theme} />
              </div>
              <div className={`p-4 sm:p-5 border-t ${theme.border} flex gap-3 shrink-0`}>
                <button onClick={() => setShowForm(false)} className={`flex-1 py-2.5 border ${theme.border} rounded-xl font-medium ${theme.textPrimary} ${theme.buttonHover}`}>Cancel</button>
                <button onClick={handleSave} className={`flex-1 py-2.5 ${theme.accent} rounded-xl font-semibold ${theme.accentHover}`}>Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // SUB-TAB: BUDGET PLANNER
  // ============================================================================

  const BudgetTab = () => {
    const [selectedMonth, setSelectedMonth] = useState(`${cy}-${cm}`);
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [newCatIcon, setNewCatIcon] = useState('ShoppingCart');
    const [newCatColor, setNewCatColor] = useState('#6b7280');
    const budgets = financeData.budgets || [];

    const budgetForMonth = useMemo(() => budgets.find(b => b.monthKey === selectedMonth) || null, [budgets, selectedMonth]);

    const [form, setForm] = useState(() => {
      if (budgetForMonth) return { ...budgetForMonth };
      const catBudgets = {};
      categories.forEach(c => { catBudgets[c.id] = 0; });
      return { monthKey: selectedMonth, expectedIncome: 0, categories: catBudgets };
    });

    // Reset form when month changes
    const resetForm = useCallback((mk) => {
      const existing = budgets.find(b => b.monthKey === mk);
      if (existing) { setForm({ ...existing }); return; }
      const catBudgets = {};
      categories.forEach(c => { catBudgets[c.id] = 0; });
      setForm({ monthKey: mk, expectedIncome: 0, categories: catBudgets });
    }, [budgets, categories]);

    const handleMonthChange = (mk) => {
      setSelectedMonth(mk);
      resetForm(mk);
    };

    const handleSave = () => {
      const entry = { ...form, monthKey: selectedMonth, id: budgetForMonth?.id || generateId() };
      const updated = budgetForMonth
        ? budgets.map(b => b.id === budgetForMonth.id ? entry : b)
        : [...budgets, entry];
      saveBudgets(updated);
    };

    // Actual data for comparison
    const [selY, selM] = selectedMonth.split('-').map(Number);
    const actualExpenses = useMemo(() => {
      const map = {};
      (financeData.expenses || []).filter(e => {
        const d = getMonthYear(e.date);
        return d.month === selM && d.year === selY;
      }).forEach(e => { map[e.category] = (map[e.category] || 0) + Number(e.amount || 0); });
      return map;
    }, [financeData.expenses, selM, selY]);

    const actualIncome = useMemo(() => {
      return (data.invoices || []).filter(i => i.status === 'paid').filter(i => {
        const d = getMonthYear(i.date);
        return d.month === selM && d.year === selY;
      }).reduce((s, i) => s + calculateDocumentTotal(i, taxRate), 0);
    }, [data.invoices, taxRate, selM, selY]);

    const totalBudgeted = Object.values(form.categories || {}).reduce((s, v) => s + (Number(v) || 0), 0);
    const totalActual = Object.values(actualExpenses).reduce((s, v) => s + v, 0);

    // Month picker options (12 months back + 3 forward)
    const monthPickerOptions = useMemo(() => {
      const opts = [];
      for (let i = -12; i <= 3; i++) {
        const d = new Date(cy, cm + i, 1);
        opts.push({ value: `${d.getFullYear()}-${d.getMonth()}`, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` });
      }
      return opts;
    }, [cy, cm]);

    return (
      <div className={sectionClass}>
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <h2 className={`text-base font-bold sm:text-lg ${theme.textPrimary}`}>Budget Planner</h2>
          <div className="flex gap-2 sm:gap-3">
            <select value={selectedMonth} onChange={e => handleMonthChange(e.target.value)}
              className={controlClass}>
              {monthPickerOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button onClick={handleSave} className={`${actionButtonClass} ${theme.accent} ${theme.accentHover}`}><Check size={15} /> Save Budget</button>
          </div>
        </div>

        {/* Income comparison */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
          <div className={`${theme.cardBg} border ${theme.border} rounded-xl p-3.5 shadow-sm sm:rounded-2xl sm:p-4`}>
            <p className={`text-[10px] font-semibold uppercase tracking-wide sm:text-xs ${theme.textMuted}`}>Expected Income</p>
            <input type="number" value={form.expectedIncome} onChange={e => setForm({ ...form, expectedIncome: Number(e.target.value) || 0 })}
              className={`mt-2 w-full rounded-lg border px-3 py-2 text-base font-bold sm:rounded-xl sm:text-lg ${theme.inputBorder} ${theme.inputBg} ${theme.textPrimary}`} />
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 shadow-sm sm:rounded-2xl sm:p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 sm:text-xs">Actual Income</p>
            <p className="mt-1.5 text-lg font-bold text-emerald-700 sm:mt-2 sm:text-2xl">{formatCurrency(actualIncome)}</p>
            {form.expectedIncome > 0 && <p className={`mt-1 text-[11px] sm:text-xs ${actualIncome >= form.expectedIncome ? 'text-emerald-500' : 'text-amber-500'}`}>
              {((actualIncome / form.expectedIncome) * 100).toFixed(1)}% of expected
            </p>}
          </div>
          <div className={`${totalActual > totalBudgeted && totalBudgeted > 0 ? 'bg-red-50 border-red-200' : `${theme.cardBg} ${theme.border}`} border rounded-xl p-3.5 shadow-sm sm:rounded-2xl sm:p-4`}>
            <p className={`text-[10px] font-semibold uppercase tracking-wide sm:text-xs ${totalActual > totalBudgeted && totalBudgeted > 0 ? 'text-red-600' : theme.textMuted}`}>Budget Status</p>
            <p className={`mt-1.5 text-lg font-bold sm:mt-2 sm:text-2xl ${totalActual > totalBudgeted && totalBudgeted > 0 ? 'text-red-700' : theme.textPrimary}`}>{formatCurrency(totalActual)} / {formatCurrency(totalBudgeted)}</p>
          </div>
        </div>

        {/* Category budgets */}
        <div className={`${theme.cardBg} border ${theme.border} rounded-2xl shadow-sm overflow-hidden`}>
          <div className={`p-4 border-b ${theme.border} flex items-start justify-between`}>
            <div>
              <h3 className={`text-base font-semibold ${theme.textPrimary}`}>Category Budgets</h3>
              <p className={`text-sm ${theme.textMuted}`}>Set planned budget per category, then compare with actual spending</p>
            </div>
            <button onClick={() => setShowAddCategory(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 ${theme.accent} rounded-xl text-xs font-semibold ${theme.accentHover}`}>
              <Plus size={14} /> Add
            </button>
          </div>

          {/* Add category form */}
          {showAddCategory && (
            <div className={`p-4 border-b ${theme.border} space-y-3`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={`text-xs font-medium ${theme.textMuted}`}>Category Name</label>
                  <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="e.g. Marketing"
                    className={`w-full px-3 py-2 border ${theme.inputBorder} ${theme.inputBg} rounded-xl text-sm ${theme.textPrimary}`} />
                </div>
                <div className="space-y-1">
                  <label className={`text-xs font-medium ${theme.textMuted}`}>Icon</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ICON_OPTIONS.map(opt => {
                      const Icon = ICON_MAP[opt.name] || ShoppingCart;
                      return (
                        <button key={opt.name} onClick={() => setNewCatIcon(opt.name)} title={opt.label}
                          className={`p-1.5 rounded-lg border ${newCatIcon === opt.name ? 'border-blue-500 bg-blue-500/10' : `${theme.border} ${theme.buttonHover}`}`}>
                          <Icon size={14} className={newCatIcon === opt.name ? 'text-blue-500' : theme.textMuted} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className={`text-xs font-medium ${theme.textMuted}`}>Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map(c => (
                    <button key={c} onClick={() => setNewCatColor(c)}
                      className={`w-6 h-6 rounded-full ${newCatColor === c ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setShowAddCategory(false); setNewCatName(''); }}
                  className={`px-3 py-1.5 border ${theme.border} rounded-xl text-xs font-medium ${theme.textPrimary} ${theme.buttonHover}`}>Cancel</button>
                <button onClick={() => {
                  if (!newCatName.trim()) return;
                  const id = newCatName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
                  if (categories.find(c => c.id === id)) return;
                  const updated = [...categories, { id, name: newCatName.trim(), icon: newCatIcon, color: newCatColor }];
                  saveCategories(updated);
                  setNewCatName(''); setNewCatIcon('ShoppingCart'); setNewCatColor('#6b7280'); setShowAddCategory(false);
                }}
                  className={`px-4 py-1.5 ${theme.accent} rounded-xl text-xs font-semibold ${theme.accentHover}`}>Add Category</button>
              </div>
            </div>
          )}

          <div className={`divide-y ${theme.border}`}>
            {categories.map(cat => {
              const planned = Number(form.categories?.[cat.id]) || 0;
              const actual = actualExpenses[cat.id] || 0;
              const over = planned > 0 && actual > planned;
              const under = planned > 0 && actual <= planned;
              const isDefault = DEFAULT_EXPENSE_CATEGORIES.some(d => d.id === cat.id);
              return (
                <div key={cat.id} className="px-2.5 py-2 sm:p-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <CategoryIcon iconName={cat.icon} color={cat.color} size={16} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${theme.textPrimary}`}>{cat.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <input type="number" value={form.categories?.[cat.id] || ''} placeholder="0"
                          onChange={e => setForm({ ...form, categories: { ...(form.categories || {}), [cat.id]: Number(e.target.value) || 0 } })}
                          className={`w-20 rounded-md border px-1.5 py-0.5 text-[11px] sm:w-28 sm:rounded-lg sm:px-2 sm:py-1 sm:text-sm ${theme.inputBorder} ${theme.inputBg} ${theme.textPrimary}`} />
                        <span className={`text-xs ${theme.textMuted}`}>budgeted</span>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className={`text-sm font-semibold ${over ? 'text-red-600' : under ? 'text-emerald-600' : theme.textPrimary}`}>{formatCurrency(actual)}</p>
                        <p className={`text-xs ${over ? 'text-red-400' : under ? 'text-emerald-400' : theme.textMuted}`}>
                          {over ? 'Over budget' : under ? 'Under budget' : 'actual'}
                        </p>
                      </div>
                      {!isDefault && (
                        <button onClick={() => {
                          const categoryLabel = cat.name ? `custom category "${cat.name}"` : 'this custom category';
                          confirmDelete(`Are you sure you want to delete ${categoryLabel}? This action cannot be undone.`, () => {
                            const updated = categories.filter(c => c.id !== cat.id);
                            saveCategories(updated.length ? updated : null);
                            const newCats = { ...form.categories };
                            delete newCats[cat.id];
                            setForm({ ...form, categories: newCats });
                          });
                        }}
                          className="p-1.5 rounded-lg hover:bg-red-500/10" title="Remove category">
                          <Trash2 size={14} className="text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>
                  {planned > 0 && (
                    <div className="mt-2">
                      <ProgressBar value={actual} max={planned} color={over ? '#ef4444' : '#10b981'} height={6} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // SUB-TAB: REPORTS
  // ============================================================================

  const ReportsTab = () => {
    const [mode, setMode] = useState('year'); // 'year' | 'custom'
    const [selectedYear, setSelectedYear] = useState(cy);
    const [customFrom, setCustomFrom] = useState(`${cy}-01-01`);
    const [customTo, setCustomTo] = useState(`${cy}-12-31`);

    // Available years (scan invoices + expenses for years present)
    const availableYears = useMemo(() => {
      const yrs = new Set([cy]);
      (data.invoices || []).forEach(inv => { if (inv.date) yrs.add(new Date(inv.date).getFullYear()); });
      (financeData.expenses || []).forEach(e => { if (e.date) yrs.add(new Date(e.date).getFullYear()); });
      (financeData.manualIncome || []).forEach(m => { if (m.date) yrs.add(new Date(m.date).getFullYear()); });
      return [...yrs].sort((a, b) => b - a);
    }, [data.invoices, financeData.expenses, financeData.manualIncome, cy]);

    // Helper: get income for a month
    const getMonthIncome = (mm, yy) => {
      const inv = (data.invoices || []).filter(i => i.status === 'paid').filter(i => {
        const mk = getMonthYear(i.date);
        return mk.month === mm && mk.year === yy;
      }).reduce((s, i) => s + calculateDocumentTotal(i, taxRate), 0);
      const manual = (financeData.manualIncome || []).filter(m => {
        const mk = getMonthYear(m.date);
        return mk.month === mm && mk.year === yy;
      }).reduce((s, m) => s + Number(m.amount || 0), 0);
      return inv + manual;
    };

    // Helper: get expenses for a month
    const getMonthExpenses = (mm, yy) => {
      return (financeData.expenses || []).filter(e => {
        const mk = getMonthYear(e.date);
        return mk.month === mm && mk.year === yy;
      }).reduce((s, e) => s + Number(e.amount || 0), 0);
    };

    // Monthly summaries: full Jan-Dec for selected year
    const monthlySummaries = useMemo(() => {
      if (mode === 'custom') {
        const from = new Date(customFrom + 'T00:00:00');
        const to = new Date(customTo + 'T00:00:00');
        if (isNaN(from) || isNaN(to) || from > to) return [];
        const rows = [];
        let cur = new Date(from.getFullYear(), from.getMonth(), 1);
        const end = new Date(to.getFullYear(), to.getMonth(), 1);
        while (cur <= end) {
          const mm = cur.getMonth(), yy = cur.getFullYear();
          const income = getMonthIncome(mm, yy);
          const expenses = getMonthExpenses(mm, yy);
          rows.push({ label: `${MONTHS[mm]} ${yy}`, income, expenses, profit: income - expenses, month: mm, year: yy });
          cur.setMonth(cur.getMonth() + 1);
        }
        return rows;
      }
      // Year mode: Jan-Dec
      const rows = [];
      for (let mm = 0; mm < 12; mm++) {
        const income = getMonthIncome(mm, selectedYear);
        const expenses = getMonthExpenses(mm, selectedYear);
        rows.push({ label: `${MONTHS[mm]} ${selectedYear}`, income, expenses, profit: income - expenses, month: mm, year: selectedYear });
      }
      return rows;
    }, [mode, selectedYear, customFrom, customTo, data.invoices, financeData.expenses, financeData.manualIncome, taxRate]);

    // Totals row
    const totalsRow = useMemo(() => {
      const t = { income: 0, expenses: 0, profit: 0 };
      monthlySummaries.forEach(r => { t.income += r.income; t.expenses += r.expenses; t.profit += r.profit; });
      return t;
    }, [monthlySummaries]);

    // Top spending categories (scoped to selected period)
    const topCategories = useMemo(() => {
      const map = {};
      let filtered = financeData.expenses || [];
      if (mode === 'year') {
        filtered = filtered.filter(e => { const mk = getMonthYear(e.date); return mk.year === selectedYear; });
      } else {
        filtered = filtered.filter(e => e.date >= customFrom && e.date <= customTo);
      }
      filtered.forEach(e => { map[e.category] = (map[e.category] || 0) + Number(e.amount || 0); });
      return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([catId, total]) => {
          const cat = categories.find(c => c.id === catId) || { name: catId, color: '#6b7280', icon: 'ShoppingCart' };
          return { ...cat, total };
        });
    }, [financeData.expenses, categories, mode, selectedYear, customFrom, customTo]);

    const profitTrend = monthlySummaries.map(r => ({ label: r.label, value: r.profit }));
    const maxProfit = Math.max(1, ...profitTrend.map(r => Math.abs(r.value)));

    const periodLabel = mode === 'year' ? String(selectedYear) : `${customFrom} to ${customTo}`;

    return (
      <div className={sectionClass}>
        <div className="flex items-center justify-between gap-2">
          <h2 className={`text-sm font-bold sm:text-lg ${theme.textPrimary}`}>Financial Reports</h2>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button onClick={() => setMode('year')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm ${mode === 'year' ? theme.accent : `border ${theme.border} ${theme.textSecondary} ${theme.buttonHover}`}`}
              style={mode === 'year' ? { color: '#fff' } : undefined}>
              Yearly
            </button>
            <button onClick={() => setMode('custom')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm ${mode === 'custom' ? theme.accent : `border ${theme.border} ${theme.textSecondary} ${theme.buttonHover}`}`}
              style={mode === 'custom' ? { color: '#fff' } : undefined}>
              Custom
            </button>
          </div>
        </div>

        {/* Period selector */}
        <div className={`${theme.cardBg} border ${theme.border} rounded-lg p-2 sm:rounded-2xl sm:p-4 flex flex-wrap items-center gap-2 sm:gap-3`}>
          {mode === 'year' ? (
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedYear(y => y - 1)}
                className={`w-7 h-7 flex items-center justify-center rounded-md border text-sm sm:w-8 sm:h-8 sm:rounded-lg ${theme.border} ${theme.buttonHover} ${theme.textPrimary}`}>
                &lsaquo;
              </button>
              <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
                className={`px-2 py-1 rounded-md border text-[11px] font-medium sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm ${theme.inputBorder} ${theme.inputBg} ${theme.textPrimary}`}>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <button onClick={() => setSelectedYear(y => y + 1)}
                className={`w-7 h-7 flex items-center justify-center rounded-md border text-sm sm:w-8 sm:h-8 sm:rounded-lg ${theme.border} ${theme.buttonHover} ${theme.textPrimary}`}>
                &rsaquo;
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className={`text-sm ${theme.textSecondary}`}>From</label>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  className={`px-3 py-2 rounded-lg border text-[13px] sm:rounded-xl sm:text-sm ${theme.inputBorder} ${theme.inputBg} ${theme.textPrimary}`} />
              </div>
              <div className="flex items-center gap-2">
                <label className={`text-sm ${theme.textSecondary}`}>To</label>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  className={`px-3 py-2 rounded-lg border text-[13px] sm:rounded-xl sm:text-sm ${theme.inputBorder} ${theme.inputBg} ${theme.textPrimary}`} />
              </div>
            </div>
          )}
        </div>

        {/* Summary table */}
        <div className={`${theme.cardBg} border ${theme.border} rounded-lg shadow-sm overflow-hidden sm:rounded-2xl`}>
          <div className={`px-2.5 py-1.5 sm:p-4 border-b ${theme.border}`}>
            <h3 className={`text-xs font-semibold sm:text-base ${theme.textPrimary}`}>Monthly Financial Summary — {periodLabel}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={theme.tableHeaderBg}>
                <tr>
                  <th className={`px-1.5 py-1 text-left text-[10px] font-medium sm:px-4 sm:py-3 sm:text-sm ${theme.labelColor}`}>Period</th>
                  <th className={`px-1.5 py-1 text-right text-[10px] font-medium sm:px-4 sm:py-3 sm:text-sm ${theme.labelColor}`}>Income</th>
                  <th className={`px-1.5 py-1 text-right text-[10px] font-medium sm:px-4 sm:py-3 sm:text-sm ${theme.labelColor}`}>Expenses</th>
                  <th className={`px-1.5 py-1 text-right text-[10px] font-medium sm:px-4 sm:py-3 sm:text-sm ${theme.labelColor}`}>Net Profit</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme.border}`}>
                {monthlySummaries.map(r => (
                  <tr key={r.label} className={theme.tableRowHover}>
                    <td className={`px-1.5 py-[5px] text-[10px] font-medium sm:px-4 sm:py-3 sm:text-sm ${theme.textPrimary}`}>
                      <span className="sm:hidden">{r.label.split(' ')[0]}</span>
                      <span className="hidden sm:inline">{r.label}</span>
                    </td>
                    <td className="px-1.5 py-[5px] text-[10px] text-right text-emerald-600 sm:px-4 sm:py-3 sm:text-sm">{formatCurrency(r.income)}</td>
                    <td className="px-1.5 py-[5px] text-[10px] text-right text-red-500 sm:px-4 sm:py-3 sm:text-sm">{formatCurrency(r.expenses)}</td>
                    <td className={`px-1.5 py-[5px] text-[10px] text-right font-bold sm:px-4 sm:py-3 sm:text-sm ${r.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(r.profit)}</td>
                  </tr>
                ))}
                <tr className={`font-bold border-t-2 ${theme.border}`}>
                  <td className={`px-1.5 py-[5px] text-[10px] font-bold sm:px-4 sm:py-3 sm:text-sm ${theme.textPrimary}`}>Total</td>
                  <td className="px-1.5 py-[5px] text-[10px] text-right font-bold text-emerald-600 sm:px-4 sm:py-3 sm:text-sm">{formatCurrency(totalsRow.income)}</td>
                  <td className="px-1.5 py-[5px] text-[10px] text-right font-bold text-red-500 sm:px-4 sm:py-3 sm:text-sm">{formatCurrency(totalsRow.expenses)}</td>
                  <td className={`px-1.5 py-[5px] text-[10px] text-right font-bold sm:px-4 sm:py-3 sm:text-sm ${totalsRow.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(totalsRow.profit)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Profit Trend */}
        <div className={`${theme.cardBg} border ${theme.border} rounded-lg shadow-sm overflow-hidden sm:rounded-2xl`}>
          <div className={`px-2.5 py-1.5 sm:p-4 border-b ${theme.border}`}>
            <h3 className={`text-xs font-semibold sm:text-base ${theme.textPrimary}`}>Profit Trend — {periodLabel}</h3>
          </div>
          <div className="px-2 py-2 sm:p-4">
            <div className="flex min-h-[140px] items-end gap-1.5 overflow-x-auto pb-1 sm:min-h-[220px] sm:gap-3 sm:pb-2">
              {profitTrend.map(d => {
                const isPos = d.value >= 0;
                const barH = `${Math.max((Math.abs(d.value) / maxProfit) * 100, d.value !== 0 ? 6 : 0)}%`;
                return (
                  <div key={d.label} className="flex min-w-[28px] flex-1 flex-col items-center gap-1 sm:min-w-[60px] sm:gap-2">
                    <div className="flex h-[100px] w-full items-end justify-center sm:h-[180px]">
                      <div className={`w-full ${isPos ? 'rounded-t-lg' : 'rounded-b-lg'}`}
                        style={{ height: barH, background: isPos ? '#10b981' : '#ef4444' }}
                        title={`${d.label}: ${formatCurrency(d.value)}`} />
                    </div>
                    <p className={`text-[8px] font-medium sm:text-[10px] ${theme.textMuted}`}>{d.label.split(' ')[0]}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Spending Categories */}
        {topCategories.length > 0 && (
          <div className={`${theme.cardBg} border ${theme.border} rounded-2xl shadow-sm overflow-hidden`}>
            <div className={`px-2.5 py-1.5 sm:p-4 border-b ${theme.border}`}>
              <h3 className={`text-xs font-semibold sm:text-base ${theme.textPrimary}`}>Top Spending Categories — {periodLabel}</h3>
            </div>
            <div className="px-2.5 py-2 space-y-2 sm:p-4 sm:space-y-3">
              {topCategories.map(cat => {
                const maxCat = Math.max(1, ...topCategories.map(c => c.total));
                return (
                  <div key={cat.id || cat.name} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CategoryIcon iconName={cat.icon} color={cat.color} size={14} />
                        <span className={`text-[11px] font-medium sm:text-sm ${theme.textPrimary}`}>{cat.name}</span>
                      </div>
                      <span className={`text-[11px] font-bold sm:text-sm ${theme.textPrimary}`}>{formatCurrency(cat.total)}</span>
                    </div>
                    <ProgressBar value={cat.total} max={maxCat} color={cat.color} height={6} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // TAB NAVIGATION
  // ============================================================================

  const subTabs = [
    { id: 'overview', label: 'Overview', icon: Wallet },
    { id: 'expenses', label: 'Expenses', icon: ShoppingCart },
    { id: 'income', label: 'Income', icon: TrendingUp },
    { id: 'savings', label: 'Savings', icon: PiggyBank },
    { id: 'budget', label: 'Budget', icon: Target },
    { id: 'reports', label: 'Reports', icon: TrendingDown },
  ];

  const renderSubTab = () => {
    switch (subTab) {
      case 'overview': return <OverviewTab />;
      case 'expenses': return <ExpensesTab />;
      case 'income':   return <IncomeTab />;
      case 'savings':  return <SavingsTab />;
      case 'budget':   return <BudgetTab />;
      case 'reports':  return <ReportsTab />;
      default: return <OverviewTab />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with sub-tab navigation */}
      <div className={`border-b px-3 py-2.5 sm:p-4 lg:p-6 ${theme.border}`}>
        <h1 className={`mb-3 text-base font-bold sm:mb-4 sm:text-2xl ${theme.textPrimary}`}>Finance & Budgeting</h1>
        <div className="flex gap-1.5 sm:gap-3 overflow-x-auto pb-1 -mb-1">
          {subTabs.map(tab => (
            <button key={tab.id} onClick={() => setSubTab(tab.id)}
              className={`px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-base font-medium whitespace-nowrap transition-all ${
                subTab === tab.id ? theme.accent : `${theme.textSecondary} ${theme.buttonHover}`
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto px-2.5 pt-3 pb-3 phone-dock-scroll-space sm:p-4 lg:p-6 lg:pb-6">
        {renderSubTab()}
      </div>
    </div>
  );
}
