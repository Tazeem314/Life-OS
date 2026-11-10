'use client';

import React, { useState } from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import { formatCurrency, GOAL_COLORS } from '@/lib/savings-service';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
} from 'lucide-react';

export function SavingsChartsSection() {
  const { savingsAnalytics, savingsGoals, savingsSettings } = useLifeOS();
  const cur = savingsSettings.currency || '₹';
  const [chartTab, setChartTab] = useState<'monthly' | 'allocation'>('monthly');

  const records = savingsAnalytics.monthlyRecords || [];
  const maxMonthValue = Math.max(
    1,
    ...records.map((r) => Math.max(r.deposits, r.withdrawals))
  );

  // Capital distribution items
  const totalFunds = savingsAnalytics.totalSavings;
  const distributionItems = [
    {
      name: 'General Savings (Unallocated)',
      amount: savingsAnalytics.generalSavings,
      color: 'bg-zinc-500',
      percentage: totalFunds > 0 ? Math.round((savingsAnalytics.generalSavings / totalFunds) * 100) : 0,
    },
    ...savingsGoals.map((g) => {
      const colorCfg = GOAL_COLORS.find((c) => c.id === g.color) || GOAL_COLORS[0];
      return {
        name: g.name,
        amount: g.currentAmount || 0,
        color: colorCfg.bg,
        percentage: totalFunds > 0 ? Math.round(((g.currentAmount || 0) / totalFunds) * 100) : 0,
      };
    }),
  ];

  return (
    <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900/90 p-4 sm:p-5 shadow-xs">
      {/* Header and Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Savings Dynamics & Allocation</span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            6-month cashflow velocity and portfolio distribution
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-800/80 p-0.5 text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => setChartTab('monthly')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition ${
              chartTab === 'monthly'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Monthly Cashflow</span>
          </button>
          <button
            onClick={() => setChartTab('allocation')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition ${
              chartTab === 'allocation'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>Goal Allocation</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Monthly Cashflow Bar Chart */}
      {chartTab === 'monthly' && (
        <div>
          <div className="h-44 sm:h-52 w-full flex items-end justify-between gap-2 sm:gap-4 pt-6 pb-2 px-1 border-b border-zinc-100 dark:border-zinc-800/80">
            {records.map((r) => {
              const depHeight = Math.max(4, Math.round((r.deposits / maxMonthValue) * 100));
              const withHeight = Math.max(4, Math.round((r.withdrawals / maxMonthValue) * 100));
              const isNetPos = r.net >= 0;

              return (
                <div key={r.monthKey} className="flex-1 flex flex-col items-center h-full justify-end group">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none mb-1 text-center font-mono">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isNetPos
                          ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {isNetPos ? '+' : ''}
                      {formatCurrency(r.net, cur)}
                    </span>
                  </div>

                  {/* Dual Bar Column */}
                  <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-36">
                    {/* Deposits Bar */}
                    <div
                      className="w-2.5 sm:w-4 bg-emerald-500 hover:bg-emerald-400 rounded-t-sm transition-all"
                      style={{ height: `${r.deposits > 0 ? depHeight : 2}%` }}
                      title={`Deposits: ${formatCurrency(r.deposits, cur)}`}
                    />
                    {/* Withdrawals Bar */}
                    <div
                      className="w-2.5 sm:w-4 bg-rose-500 hover:bg-rose-400 rounded-t-sm transition-all"
                      style={{ height: `${r.withdrawals > 0 ? withHeight : 2}%` }}
                      title={`Withdrawals: ${formatCurrency(r.withdrawals, cur)}`}
                    />
                  </div>

                  {/* Month Label */}
                  <span className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-mono">
                    {r.monthName}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend and summary */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                <span>Deposits (Inflow)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
                <span>Withdrawals (Outflow)</span>
              </span>
            </div>

            <div className="font-mono text-[11px] text-zinc-600 dark:text-zinc-400 tabular-nums">
              <span>6-Month Net: </span>
              <span
                className={`font-bold ${
                  records.reduce((sum, r) => sum + r.net, 0) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatCurrency(records.reduce((sum, r) => sum + r.net, 0), cur)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Goal Allocation & Breakdown */}
      {chartTab === 'allocation' && (
        <div className="space-y-4">
          {/* Segmented Stacked Bar */}
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 mb-1.5">
              <span className="font-medium">Total Capital Portfolio:</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                {formatCurrency(totalFunds, cur)}
              </span>
            </div>

            <div className="w-full h-4 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex shadow-inner">
              {totalFunds === 0 ? (
                <div className="w-full h-full bg-zinc-200 dark:bg-zinc-700 text-[10px] text-center text-zinc-400 flex items-center justify-center">
                  No funds recorded yet
                </div>
              ) : (
                distributionItems
                  .filter((item) => item.amount > 0)
                  .map((item, idx) => (
                    <div
                      key={idx}
                      className={`h-full ${item.color} transition-all duration-300 first:rounded-l-full last:rounded-r-full`}
                      style={{ width: `${item.percentage}%` }}
                      title={`${item.name}: ${formatCurrency(item.amount, cur)} (${item.percentage}%)`}
                    />
                  ))
              )}
            </div>
          </div>

          {/* Allocation List Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
            {distributionItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800/80 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.color}`} />
                  <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                    {item.name}
                  </span>
                </div>
                <div className="text-right font-mono tabular-nums shrink-0">
                  <div className="font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(item.amount, cur)}
                  </div>
                  <div className="text-[10px] text-zinc-400">{item.percentage}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
