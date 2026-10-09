'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Moon,
  Sun,
  Star,
  Clock,
  Activity,
  Plus,
  Minus,
  Check,
} from 'lucide-react';
import {
  SleepLog,
  SleepQuality,
  WakeMood,
} from '@/lib/types';
import {
  calculateSleepDuration,
  formatDurationHoursMinutes,
  calculateSleepEfficiency,
  SLEEP_FACTORS,
  QUALITY_LABELS,
  MOOD_LABELS,
} from '@/lib/sleep-service';
import { getTodayKey } from '@/lib/date-utils';

interface SleepLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (log: Omit<SleepLog, 'id' | 'createdAt' | 'updatedAt'>) => Promise<any>;
  initialLog?: SleepLog | null;
  targetBedtime?: string;
  targetWakeTime?: string;
}

interface SleepLogFormInnerProps {
  onClose: () => void;
  onSave: (log: Omit<SleepLog, 'id' | 'createdAt' | 'updatedAt'>) => Promise<any>;
  initialLog?: SleepLog | null;
  targetBedtime: string;
  targetWakeTime: string;
}

function SleepLogFormInner({
  onClose,
  onSave,
  initialLog,
  targetBedtime,
  targetWakeTime,
}: SleepLogFormInnerProps) {
  const [date, setDate] = useState<string>(initialLog?.date || getTodayKey());
  const [bedtime, setBedtime] = useState<string>(initialLog?.bedtime || targetBedtime);
  const [wakeTime, setWakeTime] = useState<string>(initialLog?.wakeTime || targetWakeTime);
  const [qualityRating, setQualityRating] = useState<SleepQuality>(initialLog?.qualityRating || 4);
  const [wakeMood, setWakeMood] = useState<WakeMood>(initialLog?.wakeMood || 'refreshed');
  const [selectedFactors, setSelectedFactors] = useState<string[]>(initialLog?.factors || []);
  const [awakeningsCount, setAwakeningsCount] = useState<number>(initialLog?.awakeningsCount || 0);
  const [timeToFallAsleepMinutes, setTimeToFallAsleepMinutes] = useState<number>(
    initialLog?.timeToFallAsleepMinutes || 15
  );
  const [notes, setNotes] = useState<string>(initialLog?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const durationMinutes = calculateSleepDuration(bedtime, wakeTime);
  const efficiencyScore = calculateSleepEfficiency(durationMinutes, awakeningsCount, timeToFallAsleepMinutes);

  const toggleFactor = (factorId: string) => {
    setSelectedFactors((prev) =>
      prev.includes(factorId) ? prev.filter((id) => id !== factorId) : [...prev, factorId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSave({
        date,
        bedtime,
        wakeTime,
        durationMinutes,
        qualityRating,
        wakeMood,
        factors: selectedFactors,
        awakeningsCount,
        timeToFallAsleepMinutes,
        efficiencyScore,
        notes: notes.trim() || undefined,
        source: initialLog?.source || 'manual',
      });
      onClose();
    } catch (err) {
      console.error('Failed to save sleep log:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/50">
            <Moon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {initialLog ? 'Edit Sleep Record' : 'Log Night Sleep'}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Record duration, restoration quality, and sleep factors
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto flex-1">
        {/* Morning Date */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Sleep Date (Morning of Wakeup)
          </label>
          <input
            type="date"
            value={date}
            max={getTodayKey()}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Bedtime & Wake Time Grid */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/70 dark:border-zinc-800/80">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 font-medium mb-1.5">
              <Moon className="w-3.5 h-3.5 text-indigo-500" />
              <span>Bedtime</span>
            </div>
            <input
              type="time"
              value={bedtime}
              onChange={(e) => setBedtime(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 font-medium mb-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Wake Time</span>
            </div>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Calculated Summary Banner */}
          <div className="col-span-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Total Duration:</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                {formatDurationHoursMinutes(durationMinutes)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
              <Activity className="w-3 h-3 text-emerald-500" />
              <span>Efficiency: {efficiencyScore}%</span>
            </div>
          </div>
        </div>

        {/* Quality Rating */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Sleep Quality
            </label>
            <span className={`text-xs font-semibold ${QUALITY_LABELS[qualityRating].color}`}>
              {qualityRating}/5 · {QUALITY_LABELS[qualityRating].label}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {([1, 2, 3, 4, 5] as SleepQuality[]).map((rating) => {
              const isSelected = qualityRating === rating;
              const item = QUALITY_LABELS[rating];
              return (
                <button
                  type="button"
                  key={rating}
                  onClick={() => setQualityRating(rating)}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                      : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-0.5 mb-1">
                    <Star className={`w-3.5 h-3.5 ${isSelected ? 'fill-current text-white' : 'text-amber-400 fill-amber-400'}`} />
                    <span>{rating}</span>
                  </div>
                  <span className="text-[10px] truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Wake-Up Mood */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Morning Wake-Up Feeling
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {(Object.keys(MOOD_LABELS) as WakeMood[]).map((moodKey) => {
              const mood = MOOD_LABELS[moodKey];
              const isSelected = wakeMood === moodKey;
              return (
                <button
                  type="button"
                  key={moodKey}
                  onClick={() => setWakeMood(moodKey)}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs transition-all ${
                    isSelected
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold shadow-xs'
                      : 'bg-zinc-100 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-700'
                  }`}
                >
                  <span className="text-base mb-0.5">{mood.emoji}</span>
                  <span className="text-[10px] truncate">{mood.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Awakenings & Time to fall asleep */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Night Awakenings
            </label>
            <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden bg-white dark:bg-zinc-800">
              <button
                type="button"
                onClick={() => setAwakeningsCount((p) => Math.max(0, p - 1))}
                className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                aria-label="Decrease awakenings"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="flex-1 text-center font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                {awakeningsCount} {awakeningsCount === 1 ? 'time' : 'times'}
              </span>
              <button
                type="button"
                onClick={() => setAwakeningsCount((p) => Math.min(10, p + 1))}
                className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                aria-label="Increase awakenings"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Latency (Time to Fall Asleep)
            </label>
            <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden bg-white dark:bg-zinc-800">
              <button
                type="button"
                onClick={() => setTimeToFallAsleepMinutes((p) => Math.max(5, p - 5))}
                className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                aria-label="Decrease latency"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="flex-1 text-center font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                {timeToFallAsleepMinutes} mins
              </span>
              <button
                type="button"
                onClick={() => setTimeToFallAsleepMinutes((p) => Math.min(90, p + 5))}
                className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                aria-label="Increase latency"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Sleep Factors */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Sleep Factors & Evening Habits
          </label>
          <div className="flex flex-wrap gap-1.5">
            {SLEEP_FACTORS.map((factor) => {
              const isSelected = selectedFactors.includes(factor.id);
              const isPositive = factor.category === 'positive';
              return (
                <button
                  type="button"
                  key={factor.id}
                  onClick={() => toggleFactor(factor.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 border ${
                    isSelected
                      ? isPositive
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-semibold'
                        : 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 font-semibold'
                      : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                  <span>{factor.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Personal Sleep Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Felt unusually deep after evening walk & reading; woke up naturally 5 mins before alarm..."
            rows={2}
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 placeholder-zinc-400"
          />
        </div>

        {/* Footer Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-zinc-100 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5" />
                <span>{initialLog ? 'Save Changes' : 'Save Sleep Record'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export function SleepLogModal({
  isOpen,
  onClose,
  onSave,
  initialLog,
  targetBedtime = '23:00',
  targetWakeTime = '07:00',
}: SleepLogModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg my-auto"
        >
          <SleepLogFormInner
            key={initialLog ? initialLog.id : 'new'}
            onClose={onClose}
            onSave={onSave}
            initialLog={initialLog}
            targetBedtime={targetBedtime}
            targetWakeTime={targetWakeTime}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
