'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Todo, Priority } from '@/lib/types';
import { getTodayKey } from '@/lib/date-utils';
import { X, Calendar, Clock, Flag, AlignLeft } from 'lucide-react';

interface TodoModalProps {
  isOpen: boolean;
  todoToEdit?: Todo | null;
  defaultDate?: string;
  onClose: () => void;
  onSave: (todoData: Omit<Todo, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => { success: boolean; error?: string };
}

interface FormInnerProps {
  todoToEdit?: Todo | null;
  defaultDate?: string;
  onClose: () => void;
  onSave: (todoData: Omit<Todo, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => { success: boolean; error?: string };
}

function TodoFormInner({ todoToEdit, defaultDate, onClose, onSave }: FormInnerProps) {
  const [title, setTitle] = useState(todoToEdit?.title || '');
  const [date, setDate] = useState(todoToEdit?.date || defaultDate || getTodayKey());
  const [priority, setPriority] = useState<Priority>(todoToEdit?.priority || 'medium');
  const [dueTime, setDueTime] = useState(todoToEdit?.dueTime || '');
  const [notes, setNotes] = useState(todoToEdit?.notes || '');
  const [errorMessage, setErrorMessage] = useState('');

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

    const res = onSave({
      title: title.trim(),
      date,
      priority,
      dueTime: dueTime || undefined,
      notes: notes.trim() || undefined,
      completed: todoToEdit ? todoToEdit.completed : false,
    });

    if (res.success) {
      onClose();
    } else if (res.error) {
      setErrorMessage(res.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto no-scrollbar"
      >
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {todoToEdit ? 'Edit Daily To-Do' : 'Add Daily To-Do'}
            </h2>
            <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Single-day task with priority and due time
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
              placeholder="e.g. Finish physics report, Buy printer ink..."
              className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              autoFocus
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                Date <span className="text-rose-500">*</span>
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

          {/* Notes */}
          <div>
            <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-zinc-400" />
              Notes / Sub-details (Optional)
            </label>
            <textarea
              rows={3}
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
              {todoToEdit ? 'Update Task' : 'Save To-Do'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export function TodoModal({ isOpen, todoToEdit, defaultDate, onClose, onSave }: TodoModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <TodoFormInner
        key={todoToEdit?.id || defaultDate || 'new'}
        todoToEdit={todoToEdit}
        defaultDate={defaultDate}
        onClose={onClose}
        onSave={onSave}
      />
    </AnimatePresence>
  );
}
