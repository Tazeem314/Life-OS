'use client';

import React, { useState } from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import { SavingsGoal, SavingsTransaction } from '@/lib/types';
import { formatCurrency } from '@/lib/savings-service';
import { SavingsSummaryCards } from './SavingsSummaryCards';
import { SavingsGoalsSection } from './SavingsGoalsSection';
import { SavingsChartsSection } from './SavingsChartsSection';
import { SavingsTransactionsSection } from './SavingsTransactionsSection';
import { SavingsGoalModal } from './SavingsGoalModal';
import { SavingsTransactionModal } from './SavingsTransactionModal';
import { SavingsTransferModal } from './SavingsTransferModal';
import { SavingsAICopilotModal } from './SavingsAICopilotModal';
import { SavingsSettingsModal } from './SavingsSettingsModal';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import {
  PiggyBank,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Sparkles,
  Settings,
  Download,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export function SavingsView() {
  const {
    savingsGoals,
    savingsTransactions,
    savingsSettings,
    savingsAnalytics,
    deleteSavingsGoal,
    deleteSavingsTransaction,
  } = useLifeOS();
  const cur = savingsSettings.currency || '₹';

  // Modals state
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalType, setTxModalType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [txModalGoalId, setTxModalGoalId] = useState<string | null>(null);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferSourceGoalId, setTransferSourceGoalId] = useState<string | null>(null);

  const [isAIAdvisorOpen, setIsAIAdvisorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showCharts, setShowCharts] = useState(false);

  // Deletion confirm state
  const [deletingGoal, setDeletingGoal] = useState<SavingsGoal | null>(null);
  const [deletingTx, setDeletingTx] = useState<SavingsTransaction | null>(null);

  // Export handlers
  const handleExportCsv = () => {
    if (typeof window === 'undefined') return;
    const headers = ['Date', 'Type', 'Amount', 'Currency', 'Goal', 'Category', 'Notes'];
    const rows = (savingsTransactions || []).map((t) => {
      const goalObj = t.goalId ? savingsGoals.find((g) => g.id === t.goalId) : null;
      const goalName = goalObj ? goalObj.name : 'Piggy Bank';
      return [
        t.date,
        t.type,
        t.amount.toString(),
        cur,
        `"${goalName.replace(/"/g, '""')}"`,
        `"${(t.category || '').replace(/"/g, '""')}"`,
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `life_os_savings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJson = () => {
    if (typeof window === 'undefined') return;
    const backup = {
      exportDate: new Date().toISOString(),
      currency: cur,
      settings: savingsSettings,
      analytics: savingsAnalytics,
      goals: savingsGoals,
      transactions: savingsTransactions,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `life_os_savings_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header - Mobile Optimized with Clean Layout */}
      <div className="flex flex-col gap-3.5 pb-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Pocket Money & Savings
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
              <span>My Savings</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-xl">
              Track pocket money savings, wish targets, and everyday expenses with ease.
            </p>
          </div>

          {/* Quick Utility Actions: Settings & Export */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setIsAIAdvisorOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white text-xs font-semibold shadow-2xs transition active:scale-95 cursor-pointer touch-manipulation"
            >
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Smart Tips</span>
            </button>
            <button
              onClick={handleExportCsv}
              title="Download CSV Backup"
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition shadow-2xs cursor-pointer touch-manipulation active:scale-95"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              title="Change Currency & Goals"
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition shadow-2xs cursor-pointer touch-manipulation active:scale-95"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Primary Action Buttons - Big, Touch-Friendly, Mobile-First */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 pt-1">
          {/* Primary Action: Save Money */}
          <button
            onClick={() => {
              setTxModalType('deposit');
              setTxModalGoalId(null);
              setIsTxModalOpen(true);
            }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition active:scale-[0.98] cursor-pointer touch-manipulation"
          >
            <ArrowDownLeft className="w-4 h-4 stroke-[2.5] shrink-0" />
            <span>+ Save Money</span>
          </button>

          {/* Action: Spent / Withdraw */}
          <button
            onClick={() => {
              setTxModalType('withdrawal');
              setTxModalGoalId(null);
              setIsTxModalOpen(true);
            }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[46px] rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm font-semibold shadow-2xs transition active:scale-[0.98] cursor-pointer touch-manipulation"
          >
            <ArrowUpRight className="w-4 h-4 text-rose-500 stroke-[2.5] shrink-0" />
            <span>− Spent Money</span>
          </button>

          {/* Action: New Wish Jar */}
          <button
            onClick={() => {
              setEditingGoal(null);
              setIsGoalModalOpen(true);
            }}
            className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[46px] rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition active:scale-[0.98] cursor-pointer touch-manipulation"
          >
            <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
            <span>+ New Wishlist / Jar</span>
          </button>

          {/* Action: Move Funds */}
          <button
            onClick={() => {
              setTransferSourceGoalId(null);
              setIsTransferModalOpen(true);
            }}
            className="hidden sm:inline-flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[46px] rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition active:scale-[0.98] cursor-pointer touch-manipulation"
          >
            <ArrowRightLeft className="w-4 h-4 text-zinc-500 shrink-0" />
            <span>Move Money</span>
          </button>
        </div>
      </div>

      {/* Piggy Bank Loose Funds Banner */}
      {savingsAnalytics.generalSavings > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {formatCurrency(savingsAnalytics.generalSavings, cur)} in Piggy Bank
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Free pocket savings ready to put into a wishlist jar or use anytime.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setTransferSourceGoalId('general');
              setIsTransferModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold shrink-0 shadow-xs transition active:scale-[0.98] cursor-pointer touch-manipulation"
          >
            <span>Put into a Wish Jar</span>
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards - Friendly & Simple */}
      <SavingsSummaryCards />

      {/* Goals & Wishlist Jars Section */}
      <SavingsGoalsSection
        onOpenNewGoal={() => {
          setEditingGoal(null);
          setIsGoalModalOpen(true);
        }}
        onEditGoal={(goal) => {
          setEditingGoal(goal);
          setIsGoalModalOpen(true);
        }}
        onDeleteGoal={(goal) => setDeletingGoal(goal)}
        onAddFundsToGoal={(goal) => {
          setTxModalType('deposit');
          setTxModalGoalId(goal.id);
          setIsTxModalOpen(true);
        }}
        onTransfer={(sourceGoalId) => {
          setTransferSourceGoalId(sourceGoalId || null);
          setIsTransferModalOpen(true);
        }}
        onDepositGeneral={() => {
          setTxModalType('deposit');
          setTxModalGoalId(null);
          setIsTxModalOpen(true);
        }}
      />

      {/* Optional Toggle for Analytics & Charts */}
      <div className="pt-2">
        <button
          onClick={() => setShowCharts(!showCharts)}
          className="w-full flex items-center justify-between p-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/90 hover:bg-zinc-50 dark:hover:bg-zinc-850 transition cursor-pointer text-xs font-semibold text-zinc-700 dark:text-zinc-300 shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-500" />
            <span>Monthly Savings Trends & Breakdown</span>
          </div>
          <div className="flex items-center gap-1 text-zinc-400">
            <span className="text-[11px] font-normal">{showCharts ? 'Hide' : 'Show Details'}</span>
            {showCharts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showCharts && (
          <div className="mt-3">
            <SavingsChartsSection />
          </div>
        )}
      </div>

      {/* Transaction History & Ledger Section */}
      <SavingsTransactionsSection
        onOpenDeposit={() => {
          setTxModalType('deposit');
          setTxModalGoalId(null);
          setIsTxModalOpen(true);
        }}
        onOpenWithdrawal={() => {
          setTxModalType('withdrawal');
          setTxModalGoalId(null);
          setIsTxModalOpen(true);
        }}
        onOpenTransfer={() => {
          setTransferSourceGoalId(null);
          setIsTransferModalOpen(true);
        }}
        onDeleteTransaction={(tx) => setDeletingTx(tx)}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
      />

      {/* Modals */}
      <SavingsGoalModal
        isOpen={isGoalModalOpen}
        onClose={() => {
          setIsGoalModalOpen(false);
          setEditingGoal(null);
        }}
        goalToEdit={editingGoal}
      />

      <SavingsTransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        defaultType={txModalType}
        initialGoalId={txModalGoalId}
      />

      <SavingsTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setTransferSourceGoalId(null);
        }}
        initialSourceGoalId={transferSourceGoalId}
      />

      <SavingsAICopilotModal
        isOpen={isAIAdvisorOpen}
        onClose={() => setIsAIAdvisorOpen(false)}
      />

      <SavingsSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Deletion Dialog for Goal */}
      {deletingGoal && (
        <ConfirmDialog
          isOpen={!!deletingGoal}
          onCancel={() => setDeletingGoal(null)}
          title={`Delete "${deletingGoal.name}"?`}
          message={
            deletingGoal.currentAmount > 0
              ? `This wishlist jar has ${formatCurrency(deletingGoal.currentAmount, cur)} saved. If deleted, this money will return to your loose Piggy Bank.`
              : 'Are you sure you want to delete this wishlist jar?'
          }
          confirmText="Delete Jar"
          isDestructive
          onConfirm={() => {
            deleteSavingsGoal(deletingGoal.id, true);
            setDeletingGoal(null);
          }}
        />
      )}

      {/* Deletion Dialog for Transaction */}
      {deletingTx && (
        <ConfirmDialog
          isOpen={!!deletingTx}
          onCancel={() => setDeletingTx(null)}
          title="Delete Transaction?"
          message={`Are you sure you want to delete this ${deletingTx.type} of ${formatCurrency(deletingTx.amount, cur)}? Your savings balance will update automatically.`}
          confirmText="Delete"
          isDestructive
          onConfirm={() => {
            deleteSavingsTransaction(deletingTx.id);
            setDeletingTx(null);
          }}
        />
      )}
    </div>
  );
}
