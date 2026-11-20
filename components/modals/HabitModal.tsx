'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Habit, HabitFrequency } from '@/lib/types';
import { getTodayKey, DAYS_SHORT } from '@/lib/date-utils';
import { normalizeTimeHHMM } from '@/lib/reminder-engine';
import {
  X,
  Sparkles,
  BookOpen,
  Dumbbell,
  Code,
  Droplet,
  Heart,
  Smile,
  Zap,
  Coffee,
  Brain,
  CheckCircle2,
  Calendar,
  Clock,
  Palette,
  Tag,
  Trash2,
  Bell,
} from 'lucide-react';

export const HABIT_ICONS = [
  { name: 'sparkles', label: 'Sparkles', Icon: Sparkles },
  { name: 'book-open', label: 'Reading', Icon: BookOpen },
  { name: 'dumbbell', label: 'Exercise', Icon: Dumbbell },
  { name: 'code', label: 'Coding', Icon: Code },
  { name: 'droplet', label: 'Hydration', Icon: Droplet },
  { name: 'heart', label: 'Health', Icon: Heart },
  { name: 'smile', label: 'Mindset', Icon: Smile },
  { name: 'zap', label: 'Energy', Icon: Zap },
  { name: 'coffee', label: 'Morning', Icon: Coffee },
  { name: 'brain', label: 'Study', Icon: Brain },
];

export const HABIT_COLORS = [
  '#0284c7', // Sky
  '#2563eb', // Blue
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#e11d48', // Rose
  '#ea580c', // Orange
  '#d97706', // Amber
  '#16a34a', // Green
  '#0d9488', // Teal
  '#475569', // Slate
];

export const CATEGORIES = [
  'Mindfulness',
  'Health',
  'Productivity',
  'Growth',
  'Fitness',
  'Learning',
  'Wellness',
  'Lifestyle',
];

interface HabitModalProps {
  isOpen: boolean;
  habitToEdit?: Habit | null;
  onClose: () => void;
  onSave: (habitData: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) => { success: boolean; error?: string };
  onDelete?: (habit: Habit) => void;
}

interface HabitFormInnerProps {
  habitToEdit?: Habit | null;
  onClose: () => void;
  onSave: (habitData: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) => { success: boolean; error?: string };
  onDelete?: (habit: Habit) => void;
}

function HabitFormInner({ habitToEdit, onClose, onSave, onDelete }: HabitFormInnerProps) {
  const [name, setName] = useState(habitToEdit?.name || '');
  const [description, setDescription] = useState(habitToEdit?.description || '');
  const [icon, setIcon] = useState(habitToEdit?.icon || 'sparkles');
  const [color, setColor] = useState(habitToEdit?.color || '#0284c7');
  const [frequency, setFrequency] = useState<HabitFrequency>(habitToEdit?.frequency || 'daily');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    habitToEdit?.daysOfWeek || [0, 1, 2, 3, 4, 5, 6]
  );
  const [startDate, setStartDate] = useState(habitToEdit?.startDate || getTodayKey());
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(Boolean(habitToEdit?.reminderTime));
  const [reminderTime, setReminderTime] = useState(habitToEdit?.reminderTime || '');
  const [browserPerm, setBrowserPerm] = useState<string>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [category, setCategory] = useState(habitToEdit?.category || 'Productivity');
  const [errorMessage, setErrorMessage] = useState('');

  const handleFrequencyChange = (freq: HabitFrequency) => {
    setFrequency(freq);
    if (freq === 'daily') {
      setDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);
    } else if (freq === 'weekdays') {
      setDaysOfWeek([1, 2, 3, 4, 5]); // Mon-Fri
    }
  };

  const toggleDayOfWeek = (dayIndex: number) => {
    if (frequency !== 'weekly') return;
    if (daysOfWeek.includes(dayIndex)) {
      if (daysOfWeek.length === 1) {
        setErrorMessage('Select at least one day for weekly habit.');
        return;
      }
      setDaysOfWeek(daysOfWeek.filter((d) => d !== dayIndex));
    } else {
      setDaysOfWeek([...daysOfWeek, dayIndex].sort((a, b) => a - b));
    }
    setErrorMessage('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Please enter a habit title.');
      return;
    }
    if (frequency === 'weekly' && daysOfWeek.length === 0) {
      setErrorMessage('Please select at least one day for your weekly schedule.');
      return;
    }
    if (!startDate) {
      setErrorMessage('Please choose a start date.');
      return;
    }
    const normalizedReminder = reminderEnabled ? normalizeTimeHHMM(reminderTime) : null;
    if (reminderEnabled && !normalizedReminder) {
      setErrorMessage('Please choose a reminder time or turn off the daily reminder.');
      return;
    }

    const result = onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      icon,
      color,
      frequency,
      daysOfWeek,
      startDate,
      reminderTime: normalizedReminder || undefined,
      category,
      status: habitToEdit ? habitToEdit.status : 'active',
    });

    if (result.success) {
      onClose();
    } else if (result.error) {
      setErrorMessage(result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 340 }}
        className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto no-scrollbar z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {habitToEdit ? 'Edit Habit' : 'Create New Habit'}
            </h2>
            <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Set up a recurring routine to build lasting momentum
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {errorMessage && (
            <div className="p-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 rounded-xl">
              {errorMessage}
            </div>
          )}

          {/* Habit Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
              Habit Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="e.g. Read 20 mins, Workout, Practice coding..."
              className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
              Description / Motivation (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Chapter 4 of System Design, Drink 2L water..."
              className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
            />
          </div>

          {/* Category & Start Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
                <Tag className="w-3.5 h-3.5 text-zinc-400" />
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Frequency Selection */}
          <div>
            <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              Schedule Frequency
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['daily', 'weekdays', 'weekly'] as HabitFrequency[]).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => handleFrequencyChange(freq)}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border capitalize transition ${
                    frequency === freq
                      ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700 shadow-sm'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>

            {/* Custom Days of Week Selector for Weekly */}
            {frequency === 'weekly' && (
              <div className="mt-2.5 p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                  Choose specific days of the week:
                </p>
                <div className="flex items-center justify-between gap-1">
                  {DAYS_SHORT.map((dayName, idx) => {
                    const isSelected = daysOfWeek.includes(idx);
                    return (
                      <button
                        key={dayName}
                        type="button"
                        onClick={() => toggleDayOfWeek(idx)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                          isSelected
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-sky-400'
                        }`}
                      >
                        {dayName[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Optional Daily Reminder */}
          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition ${
                    reminderEnabled
                      ? 'bg-sky-100 text-sky-600 dark:bg-sky-950/70 dark:text-sky-400'
                      : 'bg-zinc-200/70 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <label
                    htmlFor="habit-reminder-toggle"
                    className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 cursor-pointer"
                  >
                    Daily Reminder (Optional)
                  </label>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    Notify on scheduled days if not yet completed
                  </p>
                </div>
              </div>

              <button
                id="habit-reminder-toggle"
                type="button"
                role="switch"
                aria-checked={reminderEnabled}
                aria-label="Enable daily reminder"
                onClick={() => {
                  const next = !reminderEnabled;
                  setReminderEnabled(next);
                  if (next && !reminderTime) {
                    setReminderTime('09:00');
                  }
                  if (next && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                    Notification.requestPermission()
                      .then((res) => setBrowserPerm(res))
                      .catch(() => {});
                  }
                  if (!next) {
                    setErrorMessage('');
                  }
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  reminderEnabled ? 'bg-sky-600' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                    reminderEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {reminderEnabled && (
              <div className="pt-2 border-t border-zinc-200/70 dark:border-zinc-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="habit-reminder-time"
                    className="text-xs font-medium text-zinc-600 dark:text-zinc-300 whitespace-nowrap"
                  >
                    Trigger Time
                  </label>
                  <input
                    id="habit-reminder-time"
                    type="time"
                    value={reminderTime}
                    onChange={(e) => {
                      setReminderTime(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {browserPerm === 'default' && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await Notification.requestPermission();
                        setBrowserPerm(res);
                      } catch {}
                    }}
                    className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline text-left sm:text-right cursor-pointer"
                  >
                    Enable browser alerts
                  </button>
                )}
                {browserPerm === 'granted' && (
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    In-app &amp; browser alerts active
                  </span>
                )}
                {browserPerm === 'denied' && (
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    In-app alerts active (browser blocked)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Icon & Color Customization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Icons */}
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                Icon
              </label>
              <div className="grid grid-cols-5 gap-1.5 p-2 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700">
                {HABIT_ICONS.map((ic) => {
                  const IconC = ic.Icon;
                  const isSelected = icon === ic.name;
                  return (
                    <button
                      key={ic.name}
                      type="button"
                      onClick={() => setIcon(ic.name)}
                      className={`p-1.5 rounded-lg flex items-center justify-center transition ${
                        isSelected
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-700'
                      }`}
                      title={ic.label}
                    >
                      <IconC className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Colors */}
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
                <Palette className="w-3.5 h-3.5 text-zinc-400" />
                Color
              </label>
              <div className="grid grid-cols-5 gap-1.5 p-2 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700">
                {HABIT_COLORS.map((c) => {
                  const isSelected = color === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-7 h-7 sm:w-6 sm:h-6 rounded-full mx-auto transition-transform hover:scale-110 active:scale-95 flex items-center justify-center"
                      style={{ backgroundColor: c }}
                      aria-label={`Select color ${c}`}
                    >
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div>
              {habitToEdit && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onDelete(habitToEdit);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition text-center cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-xl shadow-xs transition text-center cursor-pointer"
              >
                {habitToEdit ? 'Update Habit' : 'Create Habit'}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export function HabitModal({ isOpen, habitToEdit, onClose, onSave, onDelete }: HabitModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <HabitFormInner
          key={habitToEdit?.id || 'new'}
          habitToEdit={habitToEdit}
          onClose={onClose}
          onSave={onSave}
          onDelete={onDelete}
        />
      )}
    </AnimatePresence>
  );
}
