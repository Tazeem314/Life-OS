'use client';

import React from 'react';
import { TimeRangeOption, DateRange } from '@/lib/types';
import { Calendar as CalendarIcon } from 'lucide-react';

interface TimeRangeSelectorProps {
  selectedRange: TimeRangeOption;
  onSelectRange: (range: TimeRangeOption) => void;
  customRange: DateRange;
  onCustomRangeChange: (range: DateRange) => void;
}

export function TimeRangeSelector({
  selectedRange,
  onSelectRange,
  customRange,
  onCustomRangeChange,
}: TimeRangeSelectorProps) {
  const options: { id: TimeRangeOption; label: string }[] = [
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
    { id: '3m', label: '3 Months' },
    { id: '6m', label: '6 Months' },
    { id: '1y', label: '1 Year' },
    { id: 'custom', label: 'Custom' },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      {/* Pill group */}
      <div className="inline-flex p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/70 dark:border-zinc-700/60 shadow-2xs overflow-x-auto no-scrollbar max-w-full">
        {options.map((opt) => {
          const isActive = selectedRange === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onSelectRange(opt.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white dark:bg-zinc-900 text-sky-600 dark:text-sky-400 shadow-xs border border-zinc-200/80 dark:border-zinc-700'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Custom date range inputs */}
      {selectedRange === 'custom' && (
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 text-xs bg-white dark:bg-zinc-900 p-2 sm:p-1.5 px-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs animate-in fade-in duration-150">
          <CalendarIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <input
            type="date"
            value={customRange.startDate}
            onChange={(e) => onCustomRangeChange({ ...customRange, startDate: e.target.value })}
            className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <span className="text-zinc-400">to</span>
          <input
            type="date"
            value={customRange.endDate}
            onChange={(e) => onCustomRangeChange({ ...customRange, endDate: e.target.value })}
            className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
      )}
    </div>
  );
}
