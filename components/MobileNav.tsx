'use client';

import React from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import { ActiveTab } from '@/lib/types';
import {
  LayoutDashboard,
  Sparkles,
  CheckSquare,
  Calendar,
  TrendingUp,
  Settings,
} from 'lucide-react';

export function MobileNav() {
  const { activeTab, setActiveTab } = useLifeOS();

  const tabs: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Today', icon: LayoutDashboard },
    { id: 'habits', label: 'Habits', icon: Sparkles },
    { id: 'todos', label: 'To-Do', icon: CheckSquare },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav
      role="navigation"
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800/80 px-1 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg select-none"
    >
      <div className="grid grid-cols-6 items-center gap-0.5 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-2xl transition-all duration-150 active:scale-90 relative ${
                isActive
                  ? 'text-sky-600 dark:text-sky-400 font-bold bg-sky-50/70 dark:bg-sky-950/50'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.25]' : 'stroke-[1.75]'}`} />
              <span className="text-[10px] mt-0.5 truncate tracking-tight">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-sky-600 dark:bg-sky-400" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

