'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Todo, Priority, TodoRecurrence, TodoTaskType, STUDY_DURATION_PRESETS } from '@/lib/types';
import { DAYS_SHORT, formatDisplayDate, getDayOfWeek, getTodayKey } from '@/lib/date-utils';
import { getRecurrenceSummaryText, normalizeTodoRecurrence } from '@/lib/todo-recurrence';
import { X, Calendar, Clock, Flag, AlignLeft, Repeat, GraduationCap, Hourglass } from 'lucide-react';

export const TODO_CATEGORIES = [
  'General',
  'Work',
  'Personal',
  'Study',
  'Health',
  'Finance',
  'Urgent',
] as const;

interface TodoModalProps {
  isOpen: boolean;
  todoToEdit?: Todo | null;
  defaultDate?: string;
  onClose: () => void;
  onSave: (
    todoData: Omit<Todo, 'id' | 'createdAt' | 'updatedAt' | 'order'>,
    editScope?: 'single' | 'series'
  ) => { success: boolean; error?: string };
}

interface FormInnerProps {
  todoToEdit?: Todo | null;
  defaultDate?: string;
  onClose: () => void;
  onSave: (
    todoData: Omit<Todo, 'id' | 'createdAt' | 'updatedAt' | 'order'>,
    editScope?: 'single' | 'series'
  ) => { success: boolean; error?: string };
}

function TodoFormInner({ todoToEdit, defaultDate, onClose, onSave }: FormInnerProps) {
  const initialDate = todoToEdit?.date || defaultDate || getTodayKey();
  const initialRecurrence = normalizeTodoRecurrence(todoToEdit?.recurrence);

  const initialTaskType: TodoTaskType = todoToEdit?.taskType === 'study' ? 'study' : 'non_study';
  const initialEstMinutes = todoToEdit?.estimatedDurationMinutes;
  const isInitialPreset =
    initialEstMinutes !== undefined &&
    STUDY_DURATION_PRESETS.some((p) => p.minutes === initialEstMinutes);

  const [title, setTitle] = useState(todoToEdit?.title || '');
  const [date, setDate] = useState(initialDate);
  const [priority, setPriority] = useState<Priority>(todoToEdit?.priority || 'medium');
  const [category, setCategory] = useState<string>(todoToEdit?.category || 'General');
  const [taskType, setTaskType] = useState<TodoTaskType>(initialTaskType);
  const [durationMode, setDurationMode] = useState<'none' | 'preset' | 'custom'>(() => {
    if (!initialEstMinutes || initialEstMinutes <= 0) return 'none';
    return isInitialPreset ? 'preset' : 'custom';
  });
  const [presetMinutes, setPresetMinutes] = useState<number>(
    isInitialPreset && initialEstMinutes ? initialEstMinutes : 60
  );
  const [customMinutesInput, setCustomMinutesInput] = useState<string>(
    !isInitialPreset && initialEstMinutes && initialEstMinutes > 0
      ? String(initialEstMinutes)
      : ''
  );
  const [dueTime, setDueTime] = useState(todoToEdit?.dueTime || '');
  const [notes, setNotes] = useState(todoToEdit?.notes || '');
  const [recurrence, setRecurrence] = useState<TodoRecurrence>(initialRecurrence);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>(() => {
    if (todoToEdit?.recurrenceDays && todoToEdit.recurrenceDays.length > 0) {
      return todoToEdit.recurrenceDays;
    }
    if (initialRecurrence === 'weekdays') return [1, 2, 3, 4, 5];
    if (initialRecurrence === 'weekly') return [getDayOfWeek(initialDate)];
    return [];
  });
  const [editScope, setEditScope] = useState<'single' | 'series'>('single');
  const [errorMessage, setErrorMessage] = useState('');

  const isExistingSeries = Boolean(todoToEdit?.recurrenceSeriesId);

  const handleRecurrenceChange = (nextMode: TodoRecurrence) => {
    setRecurrence(nextMode);
    setErrorMessage('');
    if (nextMode === 'weekdays') {
      setRecurrenceDays([1, 2, 3, 4, 5]);
    } else if (nextMode === 'weekly') {
      setRecurrenceDays((prev) => (prev.length > 0 ? prev : [getDayOfWeek(date || getTodayKey())]));
    } else {
      setRecurrenceDays([]);
    }
  };

  const toggleDayOfWeek = (dayIdx: number) => {
    setRecurrenceDays((prev) => {
      if (prev.includes(dayIdx)) {
        if (prev.length === 1) return prev; // Keep at least one weekday selected
        return prev.filter((d) => d !== dayIdx);
      }
      return [...prev, dayIdx].sort((a, b) => a - b);
    });
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Please enter a task title.');
      return;
    }
    if (!date) {
      setErrorMessage('Please pick a date for this task.');
      return;
    }
    if ((recurrence === 'weekly' || recurrence === 'weekdays') && recurrenceDays.length === 0) {
      setErrorMessage('Please choose at least one weekday for recurring tasks.');
      return;
    }

    let resolvedEstimatedMinutes: number | undefined = undefined;
    if (taskType === 'study') {
      if (durationMode === 'preset') {
        resolvedEstimatedMinutes = presetMinutes;
      } else if (durationMode === 'custom') {
        const parsed = parseInt(customMinutesInput.trim(), 10);
        if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1440) {
          setErrorMessage('Please enter a valid custom study duration between 1 and 1440 minutes.');
          return;
        }
        resolvedEstimatedMinutes = parsed;
      }
    }

    const res = onSave(
      {
        title: title.trim(),
        date,
        priority,
        category: category || 'General',
        taskType,
        estimatedDurationMinutes: resolvedEstimatedMinutes,
        dueTime: dueTime || undefined,
        notes: notes.trim() || undefined,
        completed: todoToEdit ? todoToEdit.completed : false,
        recurrence: recurrence === 'none' ? undefined : recurrence,
        recurrenceDays:
          recurrence === 'weekdays' || recurrence === 'weekly'
            ? recurrenceDays
            : undefined,
        recurrenceStartDate:
          recurrence === 'none'
            ? undefined
            : todoToEdit?.recurrenceStartDate || date,
      },
      isExistingSeries ? editScope : 'single'
    );

    if (res.success) {
      onClose();
    } else if (res.error) {
      setErrorMessage(res.error);
    }
  };

  const recurrenceSummary =
    recurrence !== 'none'
      ? getRecurrenceSummaryText(recurrence, recurrenceDays, date)
      : null;

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
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto no-scrollbar z-10"
      >
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {todoToEdit ? 'Edit Daily To-Do' : 'Add Daily To-Do'}
            </h2>
            <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              One-off or recurring task with priority and schedule
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

        <form onSubmit={handleSubmit} className="mt-4 sm:mt-5 space-y-3.5 sm:space-y-4">
          {errorMessage && (
            <div className="p-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 rounded-xl">
              {errorMessage}
            </div>
          )}

          {/* Task Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="e.g. Review inbox, Submit weekly report..."
              className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              autoFocus
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                {recurrence !== 'none' ? 'Start Date' : 'Date'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                Due Time (Optional)
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Task Type & Optional Estimated Study Duration */}
          <div className="space-y-3 p-3 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-zinc-400" />
                Task Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTaskType('non_study');
                    setErrorMessage('');
                  }}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition ${
                    taskType === 'non_study'
                      ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs'
                      : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  Non-Study
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTaskType('study');
                    if (category === 'General') setCategory('Study');
                    setErrorMessage('');
                  }}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                    taskType === 'study'
                      ? 'border-sky-600 bg-sky-600 text-white shadow-xs'
                      : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Study Task</span>
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5">
                {taskType === 'study'
                  ? 'Study tasks link to Study Timer and count toward Study Analytics.'
                  : 'Non-Study tasks are excluded from study time planning & statistics.'}
              </p>
            </div>

            {taskType === 'study' && (
              <div className="pt-2 border-t border-zinc-200/70 dark:border-zinc-700/70 space-y-2">
                <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                  <Hourglass className="w-3.5 h-3.5 text-sky-500" />
                  Estimated Study Duration (Optional)
                </label>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDurationMode('none');
                      setErrorMessage('');
                    }}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition ${
                      durationMode === 'none'
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                        : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    None
                  </button>

                  {STUDY_DURATION_PRESETS.map((preset) => {
                    const isSelected = durationMode === 'preset' && presetMinutes === preset.minutes;
                    return (
                      <button
                        key={preset.minutes}
                        type="button"
                        onClick={() => {
                          setDurationMode('preset');
                          setPresetMinutes(preset.minutes);
                          setErrorMessage('');
                        }}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition font-mono tabular-nums ${
                          isSelected
                            ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                            : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      setDurationMode('custom');
                      setErrorMessage('');
                    }}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition ${
                      durationMode === 'custom'
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                        : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {durationMode === 'custom' && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      step={1}
                      value={customMinutesInput}
                      onChange={(e) => {
                        setCustomMinutesInput(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="Minutes (e.g. 75)"
                      className="w-40 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono tabular-nums text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">minutes</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recurrence Pattern */}
          <div>
            <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
              <Repeat className="w-3.5 h-3.5 text-zinc-400" />
              Repeat Schedule
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {(
                [
                  { id: 'none', label: 'One-time' },
                  { id: 'daily', label: 'Daily' },
                  { id: 'weekdays', label: 'Weekdays' },
                  { id: 'weekly', label: 'Specific Days' },
                ] as { id: TodoRecurrence; label: string }[]
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleRecurrenceChange(option.id)}
                  className={`py-2 px-2.5 text-xs font-semibold rounded-xl border transition text-center ${
                    recurrence === option.id
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-700 shadow-xs'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {recurrence === 'weekly' && (
              <div className="mt-2.5 p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                  Choose weekly days:
                </p>
                <div className="flex items-center justify-between gap-1">
                  {DAYS_SHORT.map((dayName, idx) => {
                    const isSelected = recurrenceDays.includes(idx);
                    return (
                      <button
                        key={dayName}
                        type="button"
                        onClick={() => toggleDayOfWeek(idx)}
                        aria-label={`Toggle ${dayName}`}
                        aria-pressed={isSelected}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-indigo-400'
                        }`}
                      >
                        {dayName[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {recurrenceSummary && (
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-2 flex items-center gap-1.5">
                <Repeat className="w-3 h-3 shrink-0" />
                <span>
                  Automatically creates tasks <strong>{recurrenceSummary}</strong> starting{' '}
                  {formatDisplayDate(date)}
                </span>
              </p>
            )}
          </div>

          {/* Series Edit Scope Selector when editing an existing recurring task */}
          {isExistingSeries && (
            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 rounded-xl">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-2">
                Recurring Task Edit Scope
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditScope('single')}
                  className={`py-1.5 px-2.5 text-xs font-semibold rounded-lg border transition ${
                    editScope === 'single'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  This task only
                </button>
                <button
                  type="button"
                  onClick={() => setEditScope('series')}
                  className={`py-1.5 px-2.5 text-xs font-semibold rounded-lg border transition ${
                    editScope === 'series'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  This &amp; future tasks
                </button>
              </div>
            </div>
          )}

          {/* Priority Selection */}
          <div>
            <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
              <Flag className="w-3.5 h-3.5 text-zinc-400" />
              Priority Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPriority('low')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                  priority === 'low'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700 shadow-sm'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Low
              </button>
              <button
                type="button"
                onClick={() => setPriority('medium')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                  priority === 'medium'
                    ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 shadow-sm'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Medium
              </button>
              <button
                type="button"
                onClick={() => setPriority('high')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                  priority === 'high'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700 shadow-sm'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                High
              </button>
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TODO_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${
                    category === cat
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-700'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-zinc-400" />
              Notes / Sub-details (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any helpful instructions, links, or notes..."
              className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-initial px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition text-center"
            >
              {todoToEdit
                ? 'Update Task'
                : recurrence !== 'none'
                  ? 'Schedule To-Dos'
                  : 'Save To-Do'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export function TodoModal({ isOpen, todoToEdit, defaultDate, onClose, onSave }: TodoModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <TodoFormInner
          key={todoToEdit?.id || defaultDate || 'new'}
          todoToEdit={todoToEdit}
          defaultDate={defaultDate}
          onClose={onClose}
          onSave={onSave}
        />
      )}
    </AnimatePresence>
  );
}
