'use client';

import React, { useState, useEffect } from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import {
  Bell,
  Clock,
  Shield,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Send,
  VolumeX,
  Volume2,
} from 'lucide-react';
import { urlBase64ToUint8Array, triggerWebPushNotification } from '@/lib/notification-service';
import { syncPushSubscriptionToCloud, deletePushSubscriptionFromCloud } from '@/lib/firestore-service';
import { PushSubscriptionRecord } from '@/lib/notification-types';

export function NotificationSettingsView() {
  const {
    notificationSettings,
    updateNotificationSettings,
    user,
    showToast,
    dispatchNotification,
  } = useLifeOS();

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isTestingPush, setIsTestingPush] = useState(false);

  const handleEnablePush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      showToast({
        type: 'warning',
        title: 'Push Not Supported',
        message: 'Your browser or device does not support the Web Push API.',
      });
      return;
    }

    try {
      setIsSubscribing(true);
      const perm = await Notification.requestPermission();
      setPermissionStatus(perm);

      if (perm !== 'granted') {
        showToast({
          type: 'warning',
          title: 'Permission Denied',
          message: 'Push permission was denied. You can re-enable it in your browser address bar settings.',
        });
        updateNotificationSettings({ pushEnabled: false });
        return;
      }

      // Ready service worker
      const reg = await navigator.serviceWorker.ready;
      if (!reg) {
        throw new Error('Service worker not registered or ready.');
      }

      // Check existing or create new push subscription
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const vapidPublicKey =
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
          'BI_qQp-qG7T_g6B9-N6s4fLq2L8y6b7h9J7y4f3N1k0z8X5v2W1a9C8b7D6e5F4g3H2j1K0l9Z8x7C6v5B4n3M2=';

        const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey as unknown as BufferSource,
        });
      }

      // Save subscription in Firestore if user is authenticated
      if (user && sub) {
        const subJson = sub.toJSON();
        if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
          const record: PushSubscriptionRecord = {
            id: 'sub_' + Math.abs(hashCode(subJson.endpoint)),
            userId: user.uid,
            endpoint: subJson.endpoint,
            keys: {
              p256dh: subJson.keys.p256dh,
              auth: subJson.keys.auth,
            },
            userAgent: navigator.userAgent,
            createdAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
          };
          await syncPushSubscriptionToCloud(user.uid, record);
        }
      }

      updateNotificationSettings({ pushEnabled: true });
      showToast({
        type: 'success',
        title: 'Push Notifications Enabled',
        message: 'Life OS will now deliver timely reminders even when the tab is inactive.',
      });
    } catch (err: any) {
      console.error('Error enabling push:', err);
      showToast({
        type: 'error',
        title: 'Subscription Error',
        message: err?.message || 'Failed to initialize push subscription.',
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDisablePush = async () => {
    try {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
        }
      }
      updateNotificationSettings({ pushEnabled: false });
      showToast({
        type: 'info',
        title: 'Push Notifications Disabled',
        message: 'Push reminders have been turned off for this browser.',
      });
    } catch (e) {
      console.warn('Error disabling push:', e);
    }
  };

  const handleSendTestNotification = async () => {
    setIsTestingPush(true);
    const testNotif = {
      category: 'system' as const,
      title: 'Life OS Test Notification',
      message: 'Your notification system and smart reminders are fully operational!',
      priority: 'high' as const,
      deepLink: '/?tab=notifications',
      read: false,
    };

    // 1. In-app dispatch
    dispatchNotification(testNotif);

    // 2. Real push attempt if enabled
    if (user && notificationSettings.pushEnabled) {
      const res = await triggerWebPushNotification(user.uid, {
        id: 'test_' + Date.now(),
        userId: user.uid,
        createdAt: new Date().toISOString(),
        deliveryStatus: 'created',
        ...testNotif,
      });

      if (res.success) {
        showToast({
          type: 'success',
          title: 'Push Dispatched',
          message: 'Test notification sent to your browser service worker.',
        });
      } else {
        showToast({
          type: 'info',
          title: 'In-App Alert Logged',
          message: 'In-app notification created. (Push service: ' + (res.error || 'simulated') + ')',
        });
      }
    } else {
      showToast({
        type: 'success',
        title: 'In-App Notification Created',
        message: 'Check your notification bell in the top navbar.',
      });
    }
    setIsTestingPush(false);
  };

  return (
    <div className="space-y-6 text-xs max-w-4xl">
      {/* 1. Delivery Channels */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
              Delivery Channels & Push Subscriptions
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Control browser alerts and in-app notification badges
            </p>
          </div>
        </div>

        {/* In-app Toggle */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="font-semibold text-zinc-800 dark:text-zinc-200">In-App Notification Center</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Show unread badge on header bell and maintain notification history
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notificationSettings.inAppEnabled}
              onChange={(e) => updateNotificationSettings({ inAppEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-hidden rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600" />
          </label>
        </div>

        {/* Browser Push Status Card */}
        <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/70 dark:border-zinc-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            {permissionStatus === 'granted' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            ) : permissionStatus === 'denied' ? (
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            ) : (
              <Bell className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                Browser Push Status:{' '}
                <span className="font-mono uppercase text-[11px] text-zinc-500 dark:text-zinc-400">
                  {permissionStatus}
                </span>
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                {permissionStatus === 'granted'
                  ? 'Your browser is authorized to receive push notifications via Service Worker.'
                  : permissionStatus === 'denied'
                  ? 'Notifications are blocked in your browser. Tap the padlock/settings in your URL bar to allow.'
                  : 'Requires explicit user permission to deliver background push alerts.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {permissionStatus !== 'granted' || !notificationSettings.pushEnabled ? (
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={isSubscribing}
                className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isSubscribing ? 'Registering...' : 'Enable Push Notifications'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDisablePush}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium text-xs transition cursor-pointer"
              >
                Unsubscribe
              </button>
            )}

            <button
              type="button"
              onClick={handleSendTestNotification}
              disabled={isTestingPush}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium text-xs shadow-2xs transition cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3 h-3 text-sky-500" />
              <span>{isTestingPush ? 'Sending...' : 'Test Alert'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Notification Categories */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-3">
        <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Category Preferences</h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Customize which reminders you want to receive
            </p>
          </div>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {[
            {
              id: 'tasks',
              label: 'Tasks & Deadlines',
              desc: 'Upcoming due times and once-daily overdue task alerts',
            },
            {
              id: 'habits',
              label: 'Habits & Streaks',
              desc: 'Check-in reminders on scheduled days before streaks expire',
            },
            {
              id: 'routines',
              label: 'Daily & Weekly Routines',
              desc: 'Morning kick-off, evening reflections, and weekly strategy reviews',
            },
            {
              id: 'goals_savings',
              label: 'Goals & Wealth Tracking',
              desc: 'Target completion dates and progress milestone check-ins',
            },
            {
              id: 'custom',
              label: 'Custom User Reminders',
              desc: 'Personal reminders and recurring custom alerts',
            },
            {
              id: 'ai_briefing',
              label: 'AI Daily Briefings',
              desc: 'Daily intelligent morning summary generated from real Life OS data',
            },
            {
              id: 'system',
              label: 'System & Sync Notices',
              desc: 'Important cloud sync notices and network status updates',
            },
          ].map((cat) => (
            <div key={cat.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="font-semibold text-zinc-800 dark:text-zinc-200">{cat.label}</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{cat.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    notificationSettings.categories[cat.id as keyof typeof notificationSettings.categories]
                  }
                  onChange={(e) =>
                    updateNotificationSettings({
                      categories: {
                        ...notificationSettings.categories,
                        [cat.id]: e.target.checked,
                      },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-hidden rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600" />
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Quiet Hours & Schedule Timings */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Quiet Hours & Routine Hours</h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Prevent interruptions during sleep and set standard kick-off times
            </p>
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/70 dark:border-zinc-800/70 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {notificationSettings.quietHours.enabled ? (
                <VolumeX className="w-4 h-4 text-amber-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-zinc-400" />
              )}
              <div>
                <p className="font-semibold text-zinc-800 dark:text-zinc-200">Quiet Hours Protection</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Mute all non-urgent push alerts during this time window
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.quietHours.enabled}
                onChange={(e) =>
                  updateNotificationSettings({
                    quietHours: {
                      ...notificationSettings.quietHours,
                      enabled: e.target.checked,
                    },
                  })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-hidden rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600" />
            </label>
          </div>

          {notificationSettings.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Start (Bedtime)
                </label>
                <input
                  type="time"
                  value={notificationSettings.quietHours.start}
                  onChange={(e) =>
                    updateNotificationSettings({
                      quietHours: {
                        ...notificationSettings.quietHours,
                        start: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  End (Wakeup)
                </label>
                <input
                  type="time"
                  value={notificationSettings.quietHours.end}
                  onChange={(e) =>
                    updateNotificationSettings({
                      quietHours: {
                        ...notificationSettings.quietHours,
                        end: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-mono text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Timings Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Morning Briefing Time
            </label>
            <input
              type="time"
              value={notificationSettings.morningBriefingTime}
              onChange={(e) => updateNotificationSettings({ morningBriefingTime: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Evening Review Time
            </label>
            <input
              type="time"
              value={notificationSettings.eveningReviewTime}
              onChange={(e) => updateNotificationSettings({ eveningReviewTime: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Time Zone
            </label>
            <input
              type="text"
              value={notificationSettings.timeZone}
              onChange={(e) => updateNotificationSettings({ timeZone: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono text-xs"
              placeholder="e.g., America/New_York"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}
