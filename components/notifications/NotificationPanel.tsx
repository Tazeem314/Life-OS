'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLifeOS } from '@/context/LifeOSContext';
import { formatNotificationTime } from '@/lib/notification-service';
import { NotificationCategory, NotificationRecord } from '@/lib/notification-types';
import {
  CheckSquare,
  Sparkles,
  Calendar,
  Target,
  Bell,
  Bot,
  Info,
  CheckCheck,
  ExternalLink,
  Trash2,
  Settings,
  ChevronRight,
  Inbox,
} from 'lucide-react';

interface NotificationPanelProps {
  onClose: () => void;
}

const CATEGORY_ICONS: Record<NotificationCategory, React.ComponentType<{ className?: string }>> = {
  tasks: CheckSquare,
  habits: Sparkles,
  routines: Calendar,
  goals_savings: Target,
  custom: Bell,
  ai_briefing: Bot,
  system: Info,
};

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    setActiveTab,
  } = useLifeOS();

  const recentNotifications = notifications.slice(0, 8);

  const handleOpenDeepLink = (notif: NotificationRecord) => {
    markNotificationAsRead(notif.id);
    onClose();

    if (notif.deepLink) {
      if (notif.deepLink.includes('tab=todos')) setActiveTab('todos');
      else if (notif.deepLink.includes('tab=habits')) setActiveTab('habits');
      else if (notif.deepLink.includes('tab=goals')) setActiveTab('goals');
      else if (notif.deepLink.includes('tab=savings')) setActiveTab('savings');
      else if (notif.deepLink.includes('tab=sleep')) setActiveTab('sleep');
      else if (notif.deepLink.includes('tab=notifications')) setActiveTab('notifications');
      else setActiveTab('dashboard');
    }
  };

  const handleViewAll = () => {
    setActiveTab('notifications');
    onClose();
  };

  const handleOpenSettings = () => {
    setActiveTab('settings');
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      role="dialog"
      aria-label="Notification center preview"
      className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-14 sm:top-full mt-2 max-w-sm sm:w-96 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-2xl z-50 overflow-hidden flex flex-col text-xs"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-950/40">
        <div className="flex items-center gap-2">
          <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Notifications</span>
          {unreadNotificationsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
              {unreadNotificationsCount} new
            </span>
          )}
        </div>

        {unreadNotificationsCount > 0 && (
          <button
            type="button"
            onClick={() => markAllNotificationsAsRead()}
            className="flex items-center gap-1 text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
        {recentNotifications.length === 0 ? (
          <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mb-2.5">
              <Inbox className="w-5 h-5" />
            </div>
            <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">All caught up!</p>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              No new reminders or notifications right now.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {recentNotifications.map((n) => {
              const Icon = CATEGORY_ICONS[n.category] || Bell;
              return (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.18 }}
                  className={`group relative p-3 sm:p-3.5 transition flex items-start gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                    !n.read ? 'bg-sky-50/40 dark:bg-sky-950/20' : ''
                  }`}
                >
                  {/* Category Icon */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      !n.read
                        ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300'
                        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <p
                        className={`font-semibold truncate text-xs ${
                          !n.read ? 'text-zinc-950 dark:text-zinc-50' : 'text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {n.title}
                      </p>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0 font-mono">
                        {formatNotificationTime(n.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-2">
                      {n.deepLink && (
                        <button
                          type="button"
                          onClick={() => handleOpenDeepLink(n)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                        >
                          <span>Open item</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}

                      {!n.read && (
                        <button
                          type="button"
                          onClick={() => markNotificationAsRead(n.id)}
                          className="text-[10px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Delete / Dismiss */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(n.id);
                    }}
                    title="Delete notification"
                    className="absolute top-3 right-3 text-zinc-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition cursor-pointer p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Unread status dot */}
                  {!n.read && (
                    <span className="absolute left-1.5 top-5 w-1.5 h-1.5 rounded-full bg-sky-500 ring-2 ring-white dark:ring-zinc-900" />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
        <button
          type="button"
          onClick={handleViewAll}
          className="flex items-center gap-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:text-sky-600 dark:hover:text-sky-400 transition cursor-pointer"
        >
          <span>View all notifications</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleOpenSettings}
          title="Notification Settings"
          className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
