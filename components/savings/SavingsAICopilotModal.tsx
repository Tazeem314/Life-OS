'use client';

import React, { useState } from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import { AISavingsInsight } from '@/lib/types';
import { generateLocalSavingsAdvice, formatCurrency } from '@/lib/savings-service';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  Target,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  Send,
} from 'lucide-react';

interface SavingsAICopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CopilotContentProps {
  onClose: () => void;
}

function CopilotContent({ onClose }: CopilotContentProps) {
  const { savingsGoals, savingsTransactions, savingsSettings } = useLifeOS();
  const cur = savingsSettings.currency || '₹';

  // Initialize immediately with local deterministic analysis
  const [insight, setInsight] = useState<AISavingsInsight>(() =>
    generateLocalSavingsAdvice(savingsGoals, savingsTransactions, savingsSettings)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');

  const fetchAdvice = async (question?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/savings/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals: savingsGoals,
          transactions: savingsTransactions,
          settings: savingsSettings,
          userQuestion: question || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setInsight(data);
      }
    } catch {
      // Keep current insight
    } finally {
      setIsLoading(false);
    }
  };

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim()) return;
    const q = userQuestion.trim();
    setUserQuestion('');
    fetchAdvice(q);
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                AI Savings Advisor & Wealth Copilot
              </h3>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                Real-time
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Data-driven financial health analysis grounded in your actual savings ledger
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => fetchAdvice()}
            disabled={isLoading}
            title="Refresh deep analysis"
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 text-xs">
        {/* Health Score & Headline Banner */}
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                  insight.healthStatus === 'Excellent'
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                    : insight.healthStatus === 'Good'
                    ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300'
                    : insight.healthStatus === 'Fair'
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                    : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                }`}
              >
                {insight.healthStatus} Financial Posture
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                Pace: {insight.monthlyRunwayOrGrowth}
              </span>
            </div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {insight.headline}
            </h4>
            <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed">
              {insight.summary}
            </p>
          </div>

          {/* Health Score Gauge */}
          <div className="flex items-center gap-3 self-center sm:self-auto shrink-0 bg-white dark:bg-zinc-900 px-4 py-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
            <div className="text-center">
              <div className="text-2xl font-black font-mono text-sky-600 dark:text-sky-400 tabular-nums">
                {insight.healthScore}
                <span className="text-xs text-zinc-400 font-normal">/100</span>
              </div>
              <div className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
                Savings Score
              </div>
            </div>
          </div>
        </div>

        {/* Goal-Specific Recommendations */}
        {insight.goalRecommendations && insight.goalRecommendations.length > 0 && (
          <div>
            <h5 className="font-bold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-1.5 text-xs">
              <Target className="w-3.5 h-3.5 text-sky-600" />
              <span>Strategic Goal Projections</span>
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {insight.goalRecommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {rec.goalName}
                      </span>
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                        {rec.projectedCompletion}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
                      {rec.advice}
                    </p>
                  </div>
                  {rec.recommendedMonthly > 0 && (
                    <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-400">
                      <span>Target Pace</span>
                      <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                        {formatCurrency(rec.recommendedMonthly, cur)}/mo
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actionable Tips */}
        {insight.actionableTips && insight.actionableTips.length > 0 && (
          <div>
            <h5 className="font-bold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-1.5 text-xs">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>High-Impact Action Steps</span>
            </h5>
            <div className="space-y-1.5">
              {insight.actionableTips.map((tip, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/60 dark:border-zinc-800/60 flex items-start gap-2.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-zinc-700 dark:text-zinc-300 text-xs leading-relaxed">
                    {tip}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interactive Question Input */}
        <div className="pt-2">
          <form onSubmit={handleAsk} className="relative">
            <input
              type="text"
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              placeholder="Ask advisor: e.g. 'Can I save $400 this month?' or 'How to hit my $10k target?'"
              className="w-full pl-3.5 pr-20 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-xs"
            />
            <button
              type="submit"
              disabled={!userQuestion.trim() || isLoading}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs flex items-center gap-1 disabled:opacity-40 transition-colors shadow-2xs"
            >
              <span>{isLoading ? 'Analyzing...' : 'Ask'}</span>
              <Send className="w-3 h-3" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export function SavingsAICopilotModal({ isOpen, onClose }: SavingsAICopilotModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Framer Motion Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Framer Motion Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 340 }}
            className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 sm:p-6 overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar z-10"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <CopilotContent onClose={onClose} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
