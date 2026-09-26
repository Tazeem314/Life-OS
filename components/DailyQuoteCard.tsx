'use client';

import React, { useState } from 'react';
import { Quote, Sparkles, Copy, Check, RefreshCw } from 'lucide-react';
import { DailyQuote, getDailyQuoteForDate, getRandomQuoteExcept } from '@/lib/daily-quotes';

interface DailyQuoteCardProps {
  todayKey: string;
}

export function DailyQuoteCard({ todayKey }: DailyQuoteCardProps) {
  const [customQuote, setCustomQuote] = useState<DailyQuote | null>(null);
  const [prevTodayKey, setPrevTodayKey] = useState(todayKey);
  const [copied, setCopied] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  // If the date changes, reset any manually shuffled quote back to that day's quote
  if (prevTodayKey !== todayKey) {
    setPrevTodayKey(todayKey);
    setCustomQuote(null);
  }

  const currentQuote = customQuote ?? getDailyQuoteForDate(todayKey);

  const handleShuffle = () => {
    setIsRotating(true);
    const nextQuote = getRandomQuoteExcept(currentQuote.id);
    setCustomQuote(nextQuote);
    setTimeout(() => setIsRotating(false), 300);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`"${currentQuote.quote}" — ${currentQuote.author}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-sky-50/90 via-sky-50/40 to-indigo-50/30 dark:from-sky-950/40 dark:via-sky-950/20 dark:to-indigo-950/20 border border-sky-200/70 dark:border-sky-800/60 p-3.5 sm:p-5 shadow-2xs transition-all">
      <div className="flex flex-col gap-3">
        {/* Top bar: Badge & controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="flex items-center justify-center w-5 h-5 rounded-md bg-sky-500 text-white shrink-0 shadow-2xs">
              <Sparkles className="w-3 h-3 stroke-[2.5]" />
            </span>
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300 truncate">
              Daily Wisdom · {currentQuote.theme}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 min-h-[32px] sm:min-h-[28px] rounded-md text-xs font-medium text-sky-700 dark:text-sky-300 hover:bg-sky-200/50 dark:hover:bg-sky-900/50 active:scale-95 transition cursor-pointer"
              title="Copy quote"
              aria-label="Copy quote"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[11px] text-emerald-600 font-semibold hidden sm:inline">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[11px] hidden sm:inline">Copy</span>
                </>
              )}
            </button>
            <button
              onClick={handleShuffle}
              className="flex items-center gap-1 px-2 py-1 min-h-[32px] sm:min-h-[28px] rounded-md text-xs font-medium text-sky-700 dark:text-sky-300 hover:bg-sky-200/50 dark:hover:bg-sky-900/50 active:scale-95 transition cursor-pointer"
              title="Next inspiring quote"
              aria-label="Next quote"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
              <span className="text-[11px] hidden sm:inline">Inspire</span>
            </button>
          </div>
        </div>

        {/* Quote body */}
        <div className="relative pl-6 sm:pl-7">
          <Quote className="absolute left-0 top-0.5 w-4 h-4 sm:w-5 sm:h-5 text-sky-400 dark:text-sky-500 opacity-60" />
          <p className="text-xs sm:text-sm font-medium leading-relaxed text-zinc-800 dark:text-zinc-200 italic">
            &ldquo;{currentQuote.quote}&rdquo;
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              — {currentQuote.author}
            </span>
            {currentQuote.title && (
              <>
                <span className="text-zinc-400 dark:text-zinc-500">·</span>
                <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                  {currentQuote.title}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
