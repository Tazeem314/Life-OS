'use client';

import React, { useState } from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import { ReminderDefinition, ReminderRecurrence } from '@/lib/notification-types';
import { X, Bell, Calendar, Clock, RotateCw, ExternalLink } from 'lucide-react';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminderToEdit?: ReminderDefinition | null;
}

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ReminderModal({ isOpen, onClose, reminderToEdit }: ReminderModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <ReminderForm
        key={reminderToEdit ? reminderToEdit.id : 'new-reminder'}
        reminderToEdit={reminderToEdit}
        onClose={onClose}
      />
    </div>
  );
}

function ReminderForm({
  reminderToEdit,
  onClose,
}: {
  reminderToEdit?: ReminderDefinition | null;
  onClose: () => void;
}) {
  const { createReminder, updateReminder, notificationSettings } = useLifeOS();

  const [title, setTitle] = useState(reminderToEdit?.title || '');
  const [message, setMessage] = useState(reminderToEdit?.message || '');
  const [targetDate, setTargetDate] = useState(
    reminderToEdit?.targetDate || new Date().toISOString().slice(0, 10)
  );
  const [targetTime, setTargetTime] = useState(reminderToEdit?.targetTime || '09:00');
  const [recurring, setRecurring] = useState<ReminderRecurrence>(
    reminderToEdit?.recurring || 'none'
  );
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>(
    reminderToEdit?.recurrenceDays || [1, 2, 3, 4, 5]
  );
  const [deepLink, setDeepLink] = useState(reminderToEdit?.deepLink || '/?tab=dashboard');
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (dayIndex: number) => {
    setRecurrenceDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex].sort()
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title for this reminder');
      return;
    }

    if (recurring === 'custom_days' && recurrenceDays.length === 0) {
      setError('Please choose at least one day for custom recurrence');
      return;
    }

    if (reminderToEdit) {
      updateReminder(reminderToEdit.id, {
        title: title.trim(),
        message: message.trim() || undefined,
        targetDate: recurring === 'none' ? targetDate : undefined,
        targetTime,
        recurring,
        recurrenceDays: recurring === 'custom_days' || recurring === 'weekly' ? recurrenceDays : undefined,
        deepLink,
        timeZone: notificationSettings.timeZone,
      });
    } else {
      createReminder({
        title: title.trim(),
        message: message.trim() || undefined,
        type: 'custom',
        targetDate: recurring === 'none' ? targetDate : undefined,
        targetTime,
        recurring,
        recurrenceDays: recurring === 'custom_days' || recurring === 'weekly' ? recurrenceDays : undefined,
        deepLink,
        timeZone: notificationSettings.timeZone,
        enabled: true,
      });
    }

    onClose();
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
              {reminderToEdit ? 'Edit Custom Reminder' : 'New Custom Reminder'}
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Set personal alerts with intelligent push scheduling
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && (
          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
            Reminder Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Call Financial Advisor, Drink 1L Water..."
            className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-500 text-zinc-900 dark:text-zinc-100"
            required
          />
        </div>

        {/* Message */}
        <div>
          <label className="block font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
            Optional Note / Description
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder="Add context or link details..."
            className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-500 text-zinc-900 dark:text-zinc-100"
          />
        </div>

        {/* Schedule Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-zinc-800 dark:text-zinc-200 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-500" />
              <span>Time</span>
            </label>
            <input
              type="time"
              value={targetTime}
              onChange={(e) => setTargetTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-500 text-zinc-900 dark:text-zinc-100 font-mono"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-800 dark:text-zinc-200 mb-1 flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5 text-sky-500" />
              <span>Recurrence</span>
            </label>
            <select
              value={recurring}
              onChange={(e) => setRecurring(e.target.value as ReminderRecurrence)}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-500 text-zinc-900 dark:text-zinc-100"
            >
              <option value="none">One-time only</option>
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays (Mon-Fri)</option>
              <option value="weekly">Weekly</option>
              <option value="custom_days">Custom Days</option>
            </select>
          </div>
        </div>

        {/* Date input if one-time */}
        {recurring === 'none' && (
          <div>
            <label className="block font-semibold text-zinc-800 dark:text-zinc-200 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-500" />
              <span>Target Date</span>
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-500 text-zinc-900 dark:text-zinc-100 font-mono"
              required
            />
          </div>
        )}

        {/* Days selector if custom_days or weekly */}
        {(recurring === 'custom_days' || recurring === 'weekly') && (
          <div>
            <label className="block font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
              Select Active Days
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {DAYS_SHORT.map((day, idx) => {
                const isSelected = recurrenceDays.includes(idx);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={`px-2.5 py-1.5 rounded-md font-semibold text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Deep Link Navigation */}
        <div>
          <label className="block font-semibold text-zinc-800 dark:text-zinc-200 mb-1 flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            <span>Opens Screen</span>
          </label>
          <select
            value={deepLink}
            onChange={(e) => setDeepLink(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-500 text-zinc-900 dark:text-zinc-100"
          >
            <option value="/?tab=dashboard">Dashboard</option>
            <option value="/?tab=todos">To-Dos & Tasks</option>
            <option value="/?tab=habits">Habits Tracker</option>
            <option value="/?tab=goals">Goals & Roadmaps</option>
            <option value="/?tab=savings">Savings & Wealth</option>
            <option value="/?tab=sleep">Sleep & Circadian Tracker</option>
            <option value="/?tab=notifications">Notifications Center</option>
          </select>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-semibold shadow-xs transition cursor-pointer"
          >
            {reminderToEdit ? 'Save Changes' : 'Create Reminder'}
          </button>
        </div>
      </form>
    </div>
  );
}
