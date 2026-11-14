'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Download, Loader2, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
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
  isLoading = false,
  secondaryAction,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={isLoading ? undefined : onCancel}
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl relative z-10"
            role="alertdialog"
            aria-modal="true"
          >
            <button
              onClick={onCancel}
              disabled={isLoading}
              aria-label="Close"
              className="absolute top-3.5 right-3.5 p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

                {secondaryAction && (
                  <button
                    type="button"
                    onClick={secondaryAction.onClick}
                    disabled={isLoading}
                    className="mt-3.5 w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-500" />
                    <span>{secondaryAction.label}</span>
                  </button>
                )}

                <div className="flex items-center justify-end gap-2.5 mt-5 sm:mt-6">
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="flex-1 sm:flex-initial px-4 py-2.5 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition text-center cursor-pointer disabled:opacity-50"
                  >
                    {cancelText}
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={isLoading}
                    className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white rounded-xl shadow-xs transition text-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                      isDestructive
                        ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                        : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
                    }`}
                  >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{confirmText}</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
