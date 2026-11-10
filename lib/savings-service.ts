import {
  SavingsGoal,
  SavingsTransaction,
  SavingsSettings,
  SavingsAnalyticsSummary,
  AISavingsInsight,
  MonthlySavingsRecord,
  SavingsCategoryBreakdown,
} from './types';

export const DEFAULT_SAVINGS_SETTINGS: SavingsSettings = {
  currency: '₹',
  monthlyTarget: 1000,
  emergencyFundMonths: 3,
};

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹)' },
  { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (¥)' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar (C$)' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (A$)' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham (AED)' },
];

export const TRANSACTION_CATEGORIES = [
  { id: 'pocket_money', name: 'Pocket Money / Allowance' },
  { id: 'leftover', name: 'Saved from Daily Expenses' },
  { id: 'gift', name: 'Gift from Elders / Festival' },
  { id: 'cashback', name: 'Cashback & Rewards' },
  { id: 'snacks', name: 'Snacks, Food & Tea' },
  { id: 'stationery', name: 'Books & Stationery' },
  { id: 'recharge', name: 'Mobile Recharge & Data' },
  { id: 'outings', name: 'Outing & Friends' },
  { id: 'gadget_purchase', name: 'Gadgets & Tech' },
  { id: 'personal_treat', name: 'Clothes & Personal Treat' },
  { id: 'transfer', name: 'Moved Between Jars' },
  { id: 'other', name: 'Other Savings / Expense' },
];

export const SAVINGS_CATEGORIES = TRANSACTION_CATEGORIES.map((c) => c.name);

export const GOAL_CATEGORIES: { id: SavingsGoal['category']; name: string; label: string; icon: string; defaultColor: string }[] = [
  { id: 'tech', name: 'Gadget / Phone / Earbuds', label: 'Gadget / Phone / Earbuds', icon: 'Laptop', defaultColor: 'indigo' },
  { id: 'lifestyle', name: 'Clothes & Shoes', label: 'Clothes & Shoes', icon: 'Sparkles', defaultColor: 'rose' },
  { id: 'education', name: 'Books & Courses', label: 'Books & Courses', icon: 'GraduationCap', defaultColor: 'teal' },
  { id: 'vacation', name: 'Trip with Friends', label: 'Trip with Friends', icon: 'Plane', defaultColor: 'sky' },
  { id: 'emergency', name: 'Emergency Cash Fund', label: 'Emergency Cash Fund', icon: 'Shield', defaultColor: 'emerald' },
  { id: 'vehicle', name: 'Bike / Scooter / Commute', label: 'Bike / Scooter / Commute', icon: 'Car', defaultColor: 'amber' },
  { id: 'home', name: 'Gift for Parents / Family', label: 'Gift for Parents / Family', icon: 'Home', defaultColor: 'purple' },
  { id: 'investment', name: 'Future Investment', label: 'Future Investment', icon: 'TrendingUp', defaultColor: 'blue' },
  { id: 'custom', name: 'Custom Wishlist Jar', label: 'Custom Wishlist Jar', icon: 'Target', defaultColor: 'zinc' },
];

export const GOAL_COLORS = [
  { id: 'emerald', label: 'Emerald Green', bg: 'bg-emerald-500', lightBg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  { id: 'sky', label: 'Sky Blue', bg: 'bg-sky-500', lightBg: 'bg-sky-50 dark:bg-sky-950/40', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800' },
  { id: 'indigo', label: 'Indigo Purple', bg: 'bg-indigo-500', lightBg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
  { id: 'amber', label: 'Amber Gold', bg: 'bg-amber-500', lightBg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  { id: 'rose', label: 'Rose Pink', bg: 'bg-rose-500', lightBg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
  { id: 'purple', label: 'Deep Purple', bg: 'bg-purple-500', lightBg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  { id: 'teal', label: 'Teal Cyan', bg: 'bg-teal-500', lightBg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800' },
  { id: 'blue', label: 'Ocean Blue', bg: 'bg-blue-500', lightBg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
];

/**
 * Format currency with international / Indian Rupee number formatting
 */
export function formatCurrency(amount: number, currency: string = '₹'): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const isNegative = safeAmount < 0;
  const absAmount = Math.abs(safeAmount);

  const locale = currency === '₹' ? 'en-IN' : 'en-US';
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(absAmount);

  return `${isNegative ? '-' : ''}${currency}${formatted}`;
}

/**
 * Calculate full analytics summary from current goals and transactions
 */
export function calculateSavingsAnalytics(
  goals: SavingsGoal[],
  transactions: SavingsTransaction[],
  settings: SavingsSettings = DEFAULT_SAVINGS_SETTINGS
): SavingsAnalyticsSummary {
  const safeGoals = Array.isArray(goals) ? goals : [];
  const safeTx = Array.isArray(transactions) ? transactions : [];

  let totalDeposits = 0;
  let totalWithdrawals = 0;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  let thisMonthDeposits = 0;
  let thisMonthWithdrawals = 0;

  // Monthly buckets: last 6 calendar months
  const monthsMap = new Map<string, { deposits: number; withdrawals: number; name: string }>();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const name = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    monthsMap.set(key, { deposits: 0, withdrawals: 0, name });
  }

  // Category map
  const categoryMap = new Map<string, { deposits: number; withdrawals: number }>();

  // Process all transactions
  for (const t of safeTx) {
    const amt = Number(t.amount) || 0;
    if (amt <= 0) continue;

    if (t.type === 'deposit') {
      totalDeposits += amt;
      if (t.date.startsWith(currentMonthKey)) {
        thisMonthDeposits += amt;
      }
      const tMonthKey = t.date.slice(0, 7);
      if (monthsMap.has(tMonthKey)) {
        monthsMap.get(tMonthKey)!.deposits += amt;
      }
      const cat = t.category || 'Other';
      if (!categoryMap.has(cat)) categoryMap.set(cat, { deposits: 0, withdrawals: 0 });
      categoryMap.get(cat)!.deposits += amt;
    } else if (t.type === 'withdrawal') {
      totalWithdrawals += amt;
      if (t.date.startsWith(currentMonthKey)) {
        thisMonthWithdrawals += amt;
      }
      const tMonthKey = t.date.slice(0, 7);
      if (monthsMap.has(tMonthKey)) {
        monthsMap.get(tMonthKey)!.withdrawals += amt;
      }
      const cat = t.category || 'Other';
      if (!categoryMap.has(cat)) categoryMap.set(cat, { deposits: 0, withdrawals: 0 });
      categoryMap.get(cat)!.withdrawals += amt;
    }
    // transfers do not affect overall totalDeposits or totalWithdrawals
  }

  const totalSavings = Math.max(0, totalDeposits - totalWithdrawals);
  const thisMonthNet = thisMonthDeposits - thisMonthWithdrawals;
  const monthlySavingsRate = thisMonthDeposits > 0
    ? Math.max(0, Math.min(100, Math.round((thisMonthNet / thisMonthDeposits) * 100)))
    : 0;

  // Allocated savings = sum of goal current amounts
  const allocatedSavings = safeGoals.reduce((sum, g) => sum + (Number(g.currentAmount) || 0), 0);
  const generalSavings = Math.max(0, totalSavings - allocatedSavings);

  // Active vs completed goals
  const activeGoals = safeGoals.filter((g) => g.status === 'active');
  const completedGoals = safeGoals.filter((g) => g.status === 'completed' || (g.targetAmount > 0 && g.currentAmount >= g.targetAmount));

  let totalProgressSum = 0;
  if (activeGoals.length > 0) {
    for (const g of activeGoals) {
      const p = g.targetAmount > 0 ? Math.min(100, ((g.currentAmount || 0) / g.targetAmount) * 100) : 0;
      totalProgressSum += p;
    }
  }
  const overallGoalProgress = activeGoals.length > 0 ? Math.round(totalProgressSum / activeGoals.length) : 0;

  // Monthly records formatted
  let runningCumulative = 0;
  const monthlyRecords: MonthlySavingsRecord[] = [];
  Array.from(monthsMap.entries()).forEach(([monthKey, val]) => {
    const net = val.deposits - val.withdrawals;
    runningCumulative = Math.max(0, runningCumulative + net);
    monthlyRecords.push({
      monthKey,
      monthName: val.name,
      deposits: Math.round(val.deposits),
      withdrawals: Math.round(val.withdrawals),
      net: Math.round(net),
      cumulativeSavings: Math.round(runningCumulative),
    });
  });

  // Category breakdown formatted
  const totalVolume = totalDeposits + totalWithdrawals;
  const categoryBreakdown: SavingsCategoryBreakdown[] = Array.from(categoryMap.entries())
    .map(([category, val]) => {
      const catTotal = val.deposits + val.withdrawals;
      return {
        category,
        deposits: Math.round(val.deposits),
        withdrawals: Math.round(val.withdrawals),
        total: Math.round(catTotal),
        percentage: totalVolume > 0 ? Math.round((catTotal / totalVolume) * 100) : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    totalSavings,
    totalDeposits,
    totalWithdrawals,
    allocatedSavings,
    generalSavings,
    thisMonthDeposits,
    thisMonthWithdrawals,
    thisMonthNet,
    monthlySavingsRate,
    activeGoalsCount: activeGoals.length,
    completedGoalsCount: completedGoals.length,
    overallGoalProgress,
    monthlyRecords,
    categoryBreakdown,
  };
}

/**
 * High-precision local fallback financial analysis when Gemini API is unavailable or offline
 */
export function generateLocalSavingsAdvice(
  goals: SavingsGoal[],
  transactions: SavingsTransaction[],
  settings: SavingsSettings = DEFAULT_SAVINGS_SETTINGS
): AISavingsInsight {
  const analytics = calculateSavingsAnalytics(goals, transactions, settings);
  const cur = settings.currency || '₹';

  let healthScore = 70;
  let healthStatus: AISavingsInsight['healthStatus'] = 'Good';

  if (analytics.totalSavings > 10000 && analytics.monthlySavingsRate >= 30) {
    healthScore = 92;
    healthStatus = 'Excellent';
  } else if (analytics.totalSavings > 2500 && analytics.monthlySavingsRate >= 15) {
    healthScore = 80;
    healthStatus = 'Good';
  } else if (analytics.totalSavings > 500) {
    healthScore = 65;
    healthStatus = 'Fair';
  } else {
    healthScore = 48;
    healthStatus = 'Needs Attention';
  }

  const headline = analytics.thisMonthNet >= 0
    ? `Strong savings momentum with ${formatCurrency(analytics.thisMonthNet, cur)} net growth this month.`
    : `Monthly outlays exceeded deposits by ${formatCurrency(Math.abs(analytics.thisMonthNet), cur)}.`;

  const summary = `You currently hold ${formatCurrency(analytics.totalSavings, cur)} across all savings (${formatCurrency(analytics.allocatedSavings, cur)} allocated to wish targets and ${formatCurrency(analytics.generalSavings, cur)} in unallocated Piggy Bank).`;

  const monthlyRunwayOrGrowth = analytics.thisMonthNet >= 0
    ? `+${formatCurrency(analytics.thisMonthNet, cur)} / month saved`
    : `-${formatCurrency(Math.abs(analytics.thisMonthNet), cur)} net spent this month`;

  const goalRecommendations = (goals || []).map((goal) => {
    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
    let monthsLeft = 6;
    if (goal.targetDate) {
      const nowMs = Date.now();
      const targetMs = new Date(goal.targetDate).getTime();
      const diffMonths = Math.max(1, Math.round((targetMs - nowMs) / (1000 * 60 * 60 * 24 * 30)));
      monthsLeft = diffMonths;
    }
    const recommendedMonthly = Math.round(remaining / monthsLeft);

    let advice = 'Maintain consistent contributions to keep on track.';
    if (goal.currentAmount >= goal.targetAmount) {
      advice = 'Target fully achieved! Consider reallocating surplus or establishing a new milestone.';
    } else if (goal.category === 'emergency') {
      advice = 'High priority. Aim to fund at least 3 months of essential buffer before discretionary targets.';
    } else if (monthsLeft <= 2 && remaining > 0) {
      advice = `Deadline approaching in ~${monthsLeft} months. Recommended allocation: ${formatCurrency(recommendedMonthly, cur)}/mo.`;
    }

    return {
      goalId: goal.id,
      goalName: goal.name,
      recommendedMonthly,
      projectedCompletion: goal.currentAmount >= goal.targetAmount ? 'Achieved' : `~${monthsLeft} months`,
      advice,
    };
  });

  const actionableTips: string[] = [
    analytics.generalSavings > 200
      ? `You have ${formatCurrency(analytics.generalSavings, cur)} unallocated in your Piggy Bank. Consider assigning portions to your active wishlist targets!`
      : 'Whenever you get pocket money or cash gifts from elders, set aside a small fraction right away into your Piggy Bank.',
    'Keep an Emergency Cash fund jar so you never have to touch your dream purchases for unexpected needs.',
    'Small habits add up: saving even ₹50 or ₹100 from daily snacks quickly builds into real independence.',
  ];

  return {
    headline,
    summary,
    healthScore,
    healthStatus,
    monthlyRunwayOrGrowth,
    goalRecommendations,
    actionableTips,
  };
}

/**
 * Export transactions to standard CSV
 */
export function exportSavingsToCSV(
  transactions: SavingsTransaction[],
  goals: SavingsGoal[],
  currency: string = '₹'
): string {
  const goalMap = new Map<string, string>();
  for (const g of goals) {
    goalMap.set(g.id, g.name);
  }

  const headers = ['Date', 'Type', `Amount (${currency})`, 'Goal / Destination', 'Category', 'Notes', 'Created At'];
  const rows = transactions.map((t) => {
    let goalName = 'General Savings';
    if (t.goalId && goalMap.has(t.goalId)) {
      goalName = goalMap.get(t.goalId)!;
    } else if (t.type === 'transfer' && t.destinationGoalId && goalMap.has(t.destinationGoalId)) {
      goalName = `Transfer -> ${goalMap.get(t.destinationGoalId)}`;
    }

    const cleanNote = (t.notes || '').replace(/"/g, '""');
    return [
      t.date,
      t.type.toUpperCase(),
      t.amount.toFixed(2),
      `"${goalName}"`,
      `"${t.category || 'General'}"`,
      `"${cleanNote}"`,
      t.createdAt,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Export full savings dataset to JSON
 */
export function exportSavingsToJSON(
  goals: SavingsGoal[],
  transactions: SavingsTransaction[],
  settings: SavingsSettings
): string {
  return JSON.stringify(
    {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings,
      goals,
      transactions,
    },
    null,
    2
  );
}
