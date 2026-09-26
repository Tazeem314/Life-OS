'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLifeOS } from '@/context/LifeOSContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useLifeOS();

  return (
    <div
      id="toast-container"
      className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-2"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          let Icon = CheckCircle2;
          let colorClass = 'border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100 dark:border-emerald-800/60';
          let iconColor = 'text-emerald-600 dark:text-emerald-400';

          if (toast.type === 'error') {
            Icon = AlertCircle;
            colorClass = 'border-rose-500/30 bg-rose-50 text-rose-900 dark:bg-rose-950/80 dark:text-rose-100 dark:border-rose-800/60';
            iconColor = 'text-rose-600 dark:text-rose-400';
          } else if (toast.type === 'warning') {
            Icon = AlertTriangle;
            colorClass = 'border-amber-500/30 bg-amber-50 text-amber-900 dark:bg-amber-950/80 dark:text-amber-100 dark:border-amber-800/60';
            iconColor = 'text-amber-600 dark:text-amber-400';
          } else if (toast.type === 'info') {
            Icon = Info;
            colorClass = 'border-sky-500/30 bg-sky-50 text-sky-900 dark:bg-sky-950/80 dark:text-sky-100 dark:border-sky-800/60';
            iconColor = 'text-sky-600 dark:text-sky-400';
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto rounded-xl border p-3.5 shadow-lg backdrop-blur-md flex items-start gap-3 ${colorClass}`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight">{toast.title}</p>
                {toast.message && (
                  <p className="text-xs opacity-90 mt-1 leading-snug break-words">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="opacity-70 hover:opacity-100 transition-opacity p-0.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
