'use client';

import React, { useState, useMemo } from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import {
  NotificationCategory,
  NotificationRecord,
  ReminderDefinition,
} from '@/lib/notification-types';
import { formatNotificationTime } from '@/lib/notification-service';
import {
  Bell,
  CheckSquare,
  Sparkles,
  Calendar,
  Target,
  Bot,
  Info,
  CheckCheck,
  Trash2,
  Clock,
  Search,
  Plus,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Settings,
  AlertCircle,
  Inbox,
  Filter,
} from 'lucide-react';
import { ReminderModal } from './ReminderModal';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';

const CATEGORY_TABS: { id: 'all' | 'unread' | NotificationCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'habits', label: 'Habits' },
  { id: 'routines', label: 'Routines' },
  { id: 'goals_savings', label: 'Goals & Wealth' },
  { id: 'custom', label: 'Custom' },
  { id: 'ai_briefing', label: 'AI Briefings' },
  { id: 'system', label: 'System' },
];

const CATEGORY_ICONS: Record<NotificationCategory, React.ComponentType<{ className?: string }>> = {
  tasks: CheckSquare,
  habits: Sparkles,
  routines: Calendar,
  goals_savings: Target,
  custom: Bell,
  ai_briefing: Bot,
  system: Info,
};

export function NotificationCenterView() {
  const {
    notifications,
    unreadNotificationsCount,
    customReminders,
    aiBriefings,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllReadNotifications,
    clearAllNotifications,
    exportNotificationsBackup,
    isDeletingNotifications,
    snoozeNotification,
    updateReminder,
    deleteReminder,
    generateAIDailyBriefing,
    setActiveTab,
  } = useLifeOS();

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | NotificationCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderDefinition | null>(null);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [snoozeMenuOpenId, setSnoozeMenuOpenId] = useState<string | null>(null);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    secondaryAction?: { label: string; onClick: () => void };
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    onConfirm: () => {},
  });

  const latestBriefing = aiBriefings && aiBriefings.length > 0 ? aiBriefings[0] : null;

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Category filter
      if (activeFilter === 'unread' && n.read) return false;
      if (activeFilter !== 'all' && activeFilter !== 'unread' && n.category !== activeFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = n.title.toLowerCase().includes(query);
        const matchMessage = n.message.toLowerCase().includes(query);
        if (!matchTitle && !matchMessage) return false;
      }

      return true;
    });
  }, [notifications, activeFilter, searchQuery]);

  const handleGenerateBriefing = async () => {
    setIsGeneratingBriefing(true);
    await generateAIDailyBriefing(true);
    setIsGeneratingBriefing(false);
  };

  const handleOpenDeepLink = (notif: NotificationRecord) => {
    markNotificationAsRead(notif.id);
    if (notif.deepLink) {
      if (notif.deepLink.includes('tab=todos')) setActiveTab('todos');
      else if (notif.deepLink.includes('tab=habits')) setActiveTab('habits');
      else if (notif.deepLink.includes('tab=goals')) setActiveTab('goals');
      else if (notif.deepLink.includes('tab=savings')) setActiveTab('savings');
      else if (notif.deepLink.includes('tab=sleep')) setActiveTab('sleep');
      else setActiveTab('dashboard');
    }
  };

  const promptClearRead = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Clear Read Notifications?',
      message:
        'This will permanently remove all read notification records. Your underlying tasks, habits, and goals are never affected.',
      confirmText: 'Clear Read Notifications',
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        void clearAllReadNotifications();
      },
    });
  };

  const promptClearAll = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Clear All Notifications?',
      message:
        'This will permanently remove all notification records from your view and cloud storage. You can download a JSON backup before bulk cloud cleanup. Your underlying tasks, habits, and goals are never affected.',
      confirmText: 'Clear All Notifications',
      secondaryAction:
        notifications.length > 0
          ? {
              label: `Download JSON Backup (${notifications.length})`,
              onClick: () => exportNotificationsBackup(),
            }
          : undefined,
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        void clearAllNotifications();
      },
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Notification Center & Smart Reminders
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2.5">
            <span>Notifications & Briefings</span>
            {unreadNotificationsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold font-mono bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                {unreadNotificationsCount} unread
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
            Real-time activity ledger, context-aware reminders, and AI morning intelligence briefings.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* New Custom Reminder */}
          <button
            type="button"
            onClick={() => {
              setEditingReminder(null);
              setIsReminderModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 h-9 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-semibold shadow-xs transition active:scale-[0.98] cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Reminder</span>
          </button>

          {/* Mark All Read */}
          {unreadNotificationsCount > 0 && (
            <button
              type="button"
              onClick={() => markAllNotificationsAsRead()}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium shadow-2xs transition cursor-pointer shrink-0"
            >
              <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
              <span>Mark All Read</span>
            </button>
          )}

          {/* Clear Read */}
          {notifications.some((n) => n.read) && (
            <button
              type="button"
              onClick={promptClearRead}
              disabled={isDeletingNotifications}
              title="Delete all read notifications"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium shadow-2xs transition cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeletingNotifications ? 'Clearing...' : 'Clear Read'}</span>
            </button>
          )}

          {/* Clear All */}
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={promptClearAll}
              disabled={isDeletingNotifications}
              title="Delete all notifications"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium shadow-2xs transition cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>{isDeletingNotifications ? 'Clearing...' : 'Delete All'}</span>
            </button>
          )}

          {/* Settings */}
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            title="Notification Settings"
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition shadow-2xs cursor-pointer shrink-0"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. AI Daily Briefing Hero Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">AI Daily Intelligence Briefing</h3>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                  Gemini 2.5
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Ground-truth synthesis of your scheduled tasks, habits, and momentum
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateBriefing}
            disabled={isGeneratingBriefing}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer self-start sm:self-auto disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-500 ${isGeneratingBriefing ? 'animate-spin' : ''}`} />
            <span>{isGeneratingBriefing ? 'Synthesizing...' : 'Refresh Briefing'}</span>
          </button>
        </div>

        {latestBriefing ? (
          <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 space-y-2.5">
            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
              {latestBriefing.summary}
            </p>

            {latestBriefing.keyPriorities && latestBriefing.keyPriorities.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {latestBriefing.keyPriorities.map((p, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-[11px] font-medium text-zinc-800 dark:text-zinc-200"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                    <span>{p}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
            <span>No morning briefing generated yet for today. Tap &ldquo;Refresh Briefing&rdquo; to analyze your day.</span>
          </div>
        )}
      </div>

      {/* 3. Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                    : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search alerts..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs focus:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-500 text-zinc-900 dark:text-zinc-100"
          />
        </div>
      </div>

      {/* 4. Notifications List */}
      <div className="space-y-2">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mb-3">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">No Notifications Found</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
              {searchQuery
                ? 'No alerts match your search query. Try clearing the search filter.'
                : 'Your inbox is clear. Scheduled task reminders and habit check-ins will appear here.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const Icon = CATEGORY_ICONS[notif.category] || Bell;
            return (
              <div
                key={notif.id}
                className={`group p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  !notif.read
                    ? 'bg-sky-50/40 dark:bg-sky-950/20 border-sky-200/80 dark:border-sky-900/60 shadow-2xs'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      !notif.read
                        ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300'
                        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                        {notif.title}
                      </span>
                      <span className="text-[10px] font-mono uppercase text-zinc-400 dark:text-zinc-500">
                        · {notif.category.replace('_', ' ')}
                      </span>
                      {notif.priority === 'urgent' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                          Urgent
                        </span>
                      )}
                      {notif.deliveryStatus === 'pushed' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Pushed
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="flex items-center gap-3 pt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                      <span className="font-mono">{formatNotificationTime(notif.createdAt)}</span>
                      {notif.snoozeUntil && (
                        <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Snoozed until {new Date(notif.snoozeUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {notif.deepLink && (
                    <button
                      type="button"
                      onClick={() => handleOpenDeepLink(notif)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-sky-600 dark:hover:text-sky-400 text-xs font-semibold transition cursor-pointer"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}

                  {/* Snooze Popover */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setSnoozeMenuOpenId(snoozeMenuOpenId === notif.id ? null : notif.id)
                      }
                      title="Snooze reminder"
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </button>

                    {snoozeMenuOpenId === notif.id && (
                      <div className="absolute right-0 bottom-full mb-1.5 w-36 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl z-20 py-1 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            snoozeNotification(notif.id, 10);
                            setSnoozeMenuOpenId(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        >
                          Snooze 10m
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            snoozeNotification(notif.id, 30);
                            setSnoozeMenuOpenId(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        >
                          Snooze 30m
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            snoozeNotification(notif.id, 60);
                            setSnoozeMenuOpenId(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        >
                          Snooze 1 hour
                        </button>
                      </div>
                    )}
                  </div>

                  {!notif.read && (
                    <button
                      type="button"
                      onClick={() => markNotificationAsRead(notif.id)}
                      title="Mark as read"
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-sky-600 transition cursor-pointer"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => deleteNotification(notif.id)}
                    title="Delete notification"
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-rose-500 hover:border-rose-200 dark:hover:border-rose-900 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Custom Scheduled Reminders Section */}
      <div className="pt-6 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">
              Custom Scheduled Reminders
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Active recurring schedules and standalone personal alarms
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingReminder(null);
              setIsReminderModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Reminder</span>
          </button>
        </div>

        {customReminders.length === 0 ? (
          <div className="p-6 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
            No custom reminders configured. Create one above to receive recurring daily or weekly alarms.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {customReminders.map((rem) => (
              <div
                key={rem.id}
                className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{rem.title}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rem.enabled}
                        onChange={(e) => updateReminder(rem.id, { enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-zinc-200 peer-focus:outline-hidden rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-sky-600" />
                    </label>
                  </div>
                  {rem.message && <p className="text-[11px] text-zinc-500 line-clamp-2">{rem.message}</p>}
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
                  <div className="flex items-center gap-1.5 font-mono">
                    <Clock className="w-3 h-3 text-sky-500" />
                    <span>{rem.targetTime}</span>
                    <span className="capitalize">({rem.recurring})</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingReminder(rem);
                        setIsReminderModalOpen(true);
                      }}
                      className="p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteReminder(rem.id)}
                      className="p-1 text-zinc-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reminder Modal */}
      <ReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        reminderToEdit={editingReminder}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        isDestructive={true}
        isLoading={isDeletingNotifications}
        secondaryAction={confirmDialog.secondaryAction}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
