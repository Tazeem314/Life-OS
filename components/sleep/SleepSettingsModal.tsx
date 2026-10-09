'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Moon, Sun, Clock, Bell, Sliders } from 'lucide-react';
import { SleepSettings } from '@/lib/types';
import { DEFAULT_SLEEP_SETTINGS } from '@/lib/sleep-service';

interface SleepSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SleepSettings;
  onSave: (newSettings: Partial<SleepSettings>) => void;
}

export function SleepSettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
}: SleepSettingsModalProps) {
  const [targetHours, setTargetHours] = useState<number>(
    settings.targetHours || DEFAULT_SLEEP_SETTINGS.targetHours
  );
  const [targetBedtime, setTargetBedtime] = useState<string>(
    settings.targetBedtime || DEFAULT_SLEEP_SETTINGS.targetBedtime
  );
  const [targetWakeTime, setTargetWakeTime] = useState<string>(
    settings.targetWakeTime || DEFAULT_SLEEP_SETTINGS.targetWakeTime
  );
  const [windDownReminder, setWindDownReminder] = useState<boolean>(
    settings.windDownReminder ?? DEFAULT_SLEEP_SETTINGS.windDownReminder
  );
  const [windDownMinutesBefore, setWindDownMinutesBefore] = useState<number>(
    settings.windDownMinutesBefore || 30
  );

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      targetHours,
      targetBedtime,
      targetWakeTime,
      windDownReminder,
      windDownMinutesBefore,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Sleep Targets & Routine
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-5 space-y-4">
            {/* Target Hours Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Target Sleep Duration
                </label>
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {targetHours} hours / night
                </span>
              </div>
              <input
                type="range"
                min="6"
                max="10"
                step="0.5"
                value={targetHours}
                onChange={(e) => setTargetHours(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono mt-1">
                <span>6.0h (Minimum)</span>
                <span>8.0h (Recommended)</span>
                <span>10.0h (Athletic)</span>
              </div>
            </div>

            {/* Target Bedtime & Wake Time */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Target Bedtime
                </label>
                <input
                  type="time"
                  value={targetBedtime}
                  onChange={(e) => setTargetBedtime(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Target Wakeup
                </label>
                <input
                  type="time"
                  value={targetWakeTime}
                  onChange={(e) => setTargetWakeTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Wind-down reminder */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 block">
                    Wind-Down Routine Alert
                  </span>
                  <span className="text-[11px] text-zinc-400 block mt-0.5">
                    Prepare for sleep 30 minutes before bedtime
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={windDownReminder}
                  onChange={(e) => setWindDownReminder(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded-sm"
                />
              </label>
            </div>

            {/* Save Buttons */}
            <div className="pt-3 flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all shadow-xs"
              >
                Save Targets
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
