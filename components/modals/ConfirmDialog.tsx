'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl relative"
        >
          <button
            onClick={onCancel}
            className="absolute top-3.5 right-3.5 p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-3 sm:gap-4">
            <div
              className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${
                isDestructive
                  ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                  : 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            <div className="flex-1 pr-6 sm:pr-0">
              <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 sm:mt-2 leading-relaxed">
                {message}
              </p>

              <div className="flex items-center justify-end gap-2.5 mt-5 sm:mt-6">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 sm:flex-initial px-4 py-2.5 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition text-center cursor-pointer"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className={`flex-1 sm:flex-initial px-4 py-2.5 text-xs sm:text-sm font-semibold text-white rounded-xl shadow-xs transition text-center cursor-pointer ${
                    isDestructive
                      ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                      : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
                  }`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
