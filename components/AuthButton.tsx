'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useLifeOS } from '@/context/LifeOSContext';
import { LogIn, LogOut, User as UserIcon, Cloud, Loader2, Check, Settings as SettingsIcon } from 'lucide-react';

export function AuthButton() {
  const { user, authLoading, loginWithGoogle, logout, setActiveTab, cloudDbName } = useLifeOS();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (authLoading) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 text-xs font-medium border border-zinc-200/60 dark:border-zinc-800">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500" />
        <span className="hidden xs:inline">Connecting...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <button
        onClick={loginWithGoogle}
        id="login-with-google-btn"
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 shadow-sm transition-all duration-150 text-xs font-medium cursor-pointer"
        title="Sign in with your Google account to sync your LifeOS data"
      >
        {/* Google G logo */}
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.78-2.1-6.73-4.96H1.24v3.13C3.26 21.36 7.34 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24 0-.75.13-1.52.38-2.24V6.63H1.24C.45 8.24 0 10.06 0 12s.45 3.76 1.24 5.37l4.03-3.13z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.24 6.63l4.03 3.13c.95-2.86 3.61-4.96 6.73-4.96z"
          />
        </svg>
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">Sign in</span>
        <span className="hidden sm:inline text-zinc-500 dark:text-zinc-400">with Gmail</span>
      </button>
    );
  }

  const displayName = user.displayName || user.email?.split('@')[0] || 'User';
  const email = user.email || '';
  const photoURL = user.photoURL;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        id="user-profile-menu-btn"
        className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-xl bg-zinc-100/90 dark:bg-zinc-800/90 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 border border-zinc-200/80 dark:border-zinc-700/80 transition cursor-pointer"
        aria-label="User profile menu"
      >
        {photoURL ? (
          <div className="relative w-6 h-6 rounded-full overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700">
            <Image
              src={photoURL}
              alt={displayName}
              fill
              sizes="24px"
              className="object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {displayName[0]?.toUpperCase() || 'U'}
          </div>
        )}
        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 max-w-[90px] truncate hidden xs:inline">
          {displayName}
        </span>
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Synced to LifeOS DB" />
      </button>

      {/* Dropdown Menu */}
      {menuOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3.5 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              {photoURL ? (
                <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700">
                  <Image
                    src={photoURL}
                    alt={displayName}
                    fill
                    sizes="36px"
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-sky-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {displayName[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {displayName}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                  {email}
                </p>
              </div>
            </div>

            {/* Cloud Status Badge */}
            <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/40 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              <Cloud className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">Life OS Cloud DB</span>
              <Check className="w-3 h-3 text-emerald-600 ml-auto shrink-0" />
            </div>
          </div>

          <div className="py-1">
            <button
              onClick={() => {
                setActiveTab('settings');
                setMenuOpen(false);
              }}
              className="w-full px-3.5 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 transition"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-zinc-400" />
              <span>LifeOS Settings & Storage</span>
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              className="w-full px-3.5 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
