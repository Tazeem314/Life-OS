'use client';

import React from 'react';
import { SleepLog } from '@/lib/types';
import {
  formatDurationHoursMinutes,
  QUALITY_LABELS,
  MOOD_LABELS,
  SLEEP_FACTORS,
} from '@/lib/sleep-service';
import {
  Moon,
  Sun,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  Star,
  Activity,
  Plus,
} from 'lucide-react';

interface SleepHistoryListProps {
  logs: SleepLog[];
  onEdit: (log: SleepLog) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
}

export function SleepHistoryList({
  logs,
  onEdit,
  onDelete,
  onAddNew,
}: SleepHistoryListProps) {
  const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date));

  if (sortedLogs.length === 0) {
    return (
      <div className="text-center py-12 px-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 mx-auto flex items-center justify-center mb-3">
          <Moon className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          No Sleep Entries Yet
        </h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
          Start logging your nightly sleep or start an ambient night session to unlock sleep trends and habit correlations.
        </p>
        <button
          onClick={onAddNew}
          className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium inline-flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Log Night Sleep</span>
        </button>
      </div>
    );
  }

  // Map factor ID to readable label
  const factorMap = new Map(SLEEP_FACTORS.map((f) => [f.id, f]));

  return (
    <div className="space-y-3">
      {sortedLogs.map((log) => {
        const qualityInfo = QUALITY_LABELS[log.qualityRating];
        const moodInfo = log.wakeMood ? MOOD_LABELS[log.wakeMood] : null;
        const formattedDate = new Date(log.date + 'T12:00:00').toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });

        return (
          <div
            key={log.id}
            className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
          >
            {/* Left Info */}
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-2 text-xs">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                  {formattedDate}
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">·</span>
                <span className="font-mono text-zinc-600 dark:text-zinc-300 font-medium">
                  {log.bedtime} → {log.wakeTime}
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">·</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {formatDurationHoursMinutes(log.durationMinutes)}
                </span>

                {/* Efficiency */}
                {log.efficiencyScore && (
                  <span className="text-[11px] font-mono text-zinc-400">
                    ({log.efficiencyScore}% eff.)
                  </span>
                )}
              </div>

              {/* Quality & Mood & Factors */}
              <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
                {/* Quality star badge */}
                <div className={`flex items-center gap-1 text-[11px] font-semibold ${qualityInfo.color}`}>
                  <Star className="w-3 h-3 fill-current" />
                  <span>{qualityInfo.label} ({log.qualityRating}/5)</span>
                </div>

                {/* Mood badge */}
                {moodInfo && (
                  <>
                    <span className="text-zinc-300 dark:text-zinc-700">·</span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                      <span>{moodInfo.emoji}</span>
                      <span className="capitalize">{moodInfo.label}</span>
                    </span>
                  </>
                )}

                {/* Factors */}
                {log.factors && log.factors.length > 0 && (
                  <>
                    <span className="text-zinc-300 dark:text-zinc-700">·</span>
                    <div className="flex items-center flex-wrap gap-1">
                      {log.factors.map((fId) => {
                        const factor = factorMap.get(fId);
                        if (!factor) return null;
                        const isPos = factor.category === 'positive';
                        return (
                          <span
                            key={fId}
                            className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                              isPos
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {factor.label}
                          </span>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Personal notes */}
              {log.notes && (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic line-clamp-1 pt-0.5">
                  &ldquo;{log.notes}&rdquo;
                </p>
              )}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
              <button
                onClick={() => onEdit(log)}
                className="p-1.5 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Edit record"
                aria-label="Edit sleep entry"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(log.id)}
                className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Delete record"
                aria-label="Delete sleep entry"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
