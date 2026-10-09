'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Moon,
  Sun,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  Clock,
  Heart,
} from 'lucide-react';
import { ActiveSleepSession, SleepQuality, WakeMood } from '@/lib/types';
import { formatDurationHoursMinutes, MOOD_LABELS } from '@/lib/sleep-service';

interface ActiveSleepModalProps {
  session: ActiveSleepSession | null;
  isOpen: boolean;
  onClose: () => void;
  onCancelSession: () => void;
  onWakeUpAndLog: (
    quality: SleepQuality,
    factors: string[],
    notes: string,
    mood: WakeMood
  ) => Promise<any>;
}

export function ActiveSleepModal({
  session,
  isOpen,
  onClose,
  onCancelSession,
  onWakeUpAndLog,
}: ActiveSleepModalProps) {
  const [elapsedMinutes, setElapsedMinutes] = useState<number>(0);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [showWakePrompt, setShowWakePrompt] = useState<boolean>(false);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Rest'>('Inhale');
  const [isBreathingGuideActive, setIsBreathingGuideActive] = useState<boolean>(false);

  // Wake form states
  const [quality, setQuality] = useState<SleepQuality>(4);
  const [mood, setMood] = useState<WakeMood>('refreshed');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Live timer tick
  useEffect(() => {
    if (!isOpen || !session) return;

    const updateTimes = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      const start = new Date(session.startTime);
      const diffMs = Math.max(0, now.getTime() - start.getTime());
      setElapsedMinutes(Math.floor(diffMs / 60000));
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, [isOpen, session]);

  // Relaxing box breathwork cycle (4s Inhale, 4s Hold, 4s Exhale, 4s Rest)
  useEffect(() => {
    if (!isBreathingGuideActive) return;
    const phases: ('Inhale' | 'Hold' | 'Exhale' | 'Rest')[] = ['Inhale', 'Hold', 'Exhale', 'Rest'];
    let idx = 0;

    const breathInterval = setInterval(() => {
      idx = (idx + 1) % phases.length;
      setBreathPhase(phases[idx]);
    }, 4000);

    return () => clearInterval(breathInterval);
  }, [isBreathingGuideActive]);

  if (!isOpen || !session) return null;

  const handleWakeClick = () => {
    setShowWakePrompt(true);
  };

  const handleConfirmWake = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onWakeUpAndLog(quality, [], notes, mood);
      setShowWakePrompt(false);
      onClose();
    } catch (err) {
      console.error('Failed to log wake:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-zinc-950/90 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 text-white shadow-2xl overflow-hidden flex flex-col items-center justify-between min-h-[500px]"
        >
          {/* Subtle ambient gradient aura */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Bar */}
          <div className="w-full flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2 text-xs text-indigo-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span>Night Mode · Sleep Recording Active</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              aria-label="Minimize"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!showWakePrompt ? (
            <div className="my-auto text-center space-y-6 w-full relative z-10 py-6">
              {/* Moon Glow Icon */}
              <div className="mx-auto w-20 h-20 rounded-full bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center shadow-lg shadow-indigo-950/50">
                <Moon className="w-10 h-10 text-indigo-300" />
              </div>

              {/* Real-time Clock */}
              <div>
                <div className="text-4xl sm:text-5xl font-mono font-bold tracking-tight text-zinc-100">
                  {currentTimeStr || '--:--:--'}
                </div>
                <div className="text-xs text-zinc-400 mt-1 font-mono">
                  Started at {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Elapsed Duration Display */}
              <div className="p-3.5 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 max-w-xs mx-auto">
                <div className="text-[11px] text-zinc-400 font-medium">Resting For</div>
                <div className="text-2xl font-bold font-mono text-indigo-300 mt-0.5">
                  {formatDurationHoursMinutes(elapsedMinutes)}
                </div>
              </div>

              {/* Box Breathing Toggle & Bubble */}
              <div className="max-w-xs mx-auto">
                <button
                  type="button"
                  onClick={() => setIsBreathingGuideActive((p) => !p)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-xl border transition-all ${
                    isBreathingGuideActive
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                      : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {isBreathingGuideActive ? 'Hide Breathing Guide' : 'Wind-Down Breathwork'}
                </button>

                {isBreathingGuideActive && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-4 rounded-2xl bg-zinc-950/80 border border-indigo-900/50 text-center"
                  >
                    <div className="text-xs text-indigo-300 font-medium">Box Breathing (4-4-4-4)</div>
                    <div className="text-lg font-bold text-white mt-1 capitalize tracking-wide">
                      {breathPhase}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1">
                      Slow deliberate nasal breathing signals your parasympathetic nervous system to rest.
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          ) : (
            /* Morning Wake-Up Confirmation Screen */
            <div className="my-auto w-full max-w-sm space-y-5 text-center relative z-10 py-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Sun className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base font-semibold text-white">Good Morning!</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  You rested for <span className="font-semibold text-indigo-300 font-mono">{formatDurationHoursMinutes(elapsedMinutes)}</span>
                </p>
              </div>

              {/* Quality rating */}
              <div className="text-left">
                <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                  How was your sleep quality?
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {([1, 2, 3, 4, 5] as SleepQuality[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setQuality(r)}
                      className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                        quality === r
                          ? 'bg-indigo-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      {r}★
                    </button>
                  ))}
                </div>
              </div>

              {/* Mood on waking */}
              <div className="text-left">
                <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                  Morning feeling:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['energized', 'refreshed', 'groggy'] as WakeMood[]).map((mKey) => (
                    <button
                      key={mKey}
                      type="button"
                      onClick={() => setMood(mKey)}
                      className={`py-2 px-2 rounded-xl text-xs font-medium capitalize transition-all ${
                        mood === mKey
                          ? 'bg-zinc-100 text-zinc-900 font-bold'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      {MOOD_LABELS[mKey].emoji} {mKey}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brief morning note */}
              <input
                type="text"
                placeholder="Optional morning note..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Bottom Actions */}
          <div className="w-full flex items-center justify-between gap-3 pt-4 border-t border-zinc-800/80 relative z-10">
            {!showWakePrompt ? (
              <>
                <button
                  type="button"
                  onClick={onCancelSession}
                  className="text-xs text-zinc-500 hover:text-rose-400 transition-colors"
                >
                  Cancel Session
                </button>
                <button
                  type="button"
                  onClick={handleWakeClick}
                  className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                >
                  <Sun className="w-4 h-4" />
                  <span>I Woke Up</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowWakePrompt(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleConfirmWake}
                  className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save & Wake Up'}</span>
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
