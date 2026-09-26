'use client';

import React, { useState } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Download, Share, PlusSquare, X, CheckCircle, Laptop, Smartphone } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'settings' | 'compact';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'navbar',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already installed in standalone window, render a subtle indicator or nothing in navbar
  if (isInstalled) {
    if (variant === 'settings') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200/60 dark:border-emerald-800/60">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          <span>LifeOS is installed as an app</span>
        </div>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      await install();
      setIsInstalling(false);
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      {variant === 'settings' ? (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50/50 dark:from-sky-950/30 dark:to-indigo-950/20 border border-sky-100 dark:border-sky-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Install LifeOS App
              </h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md">
              Install as a native app on your mobile phone, PC, or Mac for instant full-screen access and seamless offline productivity.
            </p>
          </div>
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            {isInstalling ? 'Installing...' : 'Install on this Device'}
          </button>
        </div>
      ) : variant === 'compact' ? (
        <button
          onClick={handleInstallClick}
          title="Install LifeOS as an App"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200/60 dark:border-sky-800/60 transition cursor-pointer ${className}`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>
      ) : (
        <button
          onClick={handleInstallClick}
          aria-label="Install LifeOS App"
          title="Install LifeOS as an App"
          className={`flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 sm:text-white bg-zinc-100 dark:bg-zinc-800 sm:bg-sky-600 sm:hover:bg-sky-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 transition-all shadow-xs cursor-pointer border border-zinc-200/60 dark:border-zinc-700/60 sm:border-transparent ${className}`}
        >
          <Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 sm:text-white" />
          <span className="hidden sm:inline">Install App</span>
        </button>
      )}

      {/* Installation Guide Dialog for iOS Safari & Desktop Manual Install */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950/80 flex items-center justify-center text-sky-600 dark:text-sky-400">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Install LifeOS
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Run standalone on mobile, laptop, or desktop
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isIOS ? (
              /* iOS Safari Instructions */
              <div className="space-y-3.5 text-xs text-zinc-600 dark:text-zinc-300">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  To install on iPhone or iPad:
                </p>
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                  <Share className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                  <span>
                    1. Tap the <strong>Share</strong> button in Safari toolbar (the square with an arrow pointing up).
                  </span>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                  <PlusSquare className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                  <span>
                    2. Scroll down and tap <strong>Add to Home Screen</strong>.
                  </span>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    3. Tap <strong>Add</strong> in the top right. LifeOS will appear on your home screen!
                  </span>
                </div>
              </div>
            ) : (
              /* Android & Desktop Chrome / Edge Instructions */
              <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-300">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  How to install on your device:
                </p>
                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-zinc-800 dark:text-zinc-200">
                    <Laptop className="w-4 h-4 text-sky-500" />
                    <span>On PC or Laptop (Chrome / Edge):</span>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 pl-6">
                    Look for the <strong>Install</strong> icon (computer with down arrow) in your browser address bar at the top right, or click the browser menu (⋮) &gt; <strong>Install LifeOS</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-zinc-800 dark:text-zinc-200">
                    <Smartphone className="w-4 h-4 text-sky-500" />
                    <span>On Android (Chrome / Brave):</span>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 pl-6">
                    Tap the browser menu (⋮) in the top right, then select <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                  </p>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowGuide(false)}
                className="w-full py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold text-xs transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
