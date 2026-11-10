# Implementation Plan: Life OS Advanced Notification, Smart Reminder & AI Briefing System

## 1. Executive Summary & Architecture Overview

The Life OS Notification, Smart Reminder & AI Briefing System provides an enterprise-grade, multi-channel notification architecture deeply integrated into Life OS. It bridges deterministic productivity data (tasks, habits, savings goals, sleep logs) with client-side reactive UI (Navbar bell, dropdown panel, full Notifications view) and trusted server-side scheduling (Next.js cron API route with VAPID Web Push delivery and Gemini 2.5 AI daily briefings).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            LIFE OS CLIENT VIEWPORT                          │
├──────────────────────────┬──────────────────────────────────────────────────┤
│ Fixed Desktop Sidebar    │ Top Navbar: [Brand] [Date] [Streak] [🔔 Bell] [Auth]│
│ - Dashboard, Habits,     ├──────────────────────────────────────────────────┤
│   Todos, Goals, Savings, │ Active View: Notifications Center or Modal       │
│   Sleep, Notifications   │ - Filter Tabs: All, Unread, Tasks, Habits, AI... │
│   Settings (Pref Tab)    │ - Live Items, Mark Read, Bulk Delete, Snooze     │
└────────────┬─────────────┴─────────────────────────┬────────────────────────┘
             │                                       │
             ▼                                       ▼
┌──────────────────────────┐          ┌───────────────────────────────────────┐
│ LifeOSContext & Service  │          │ Service Worker (public/sw.js)         │
│ - Real-time listeners    │          │ - 'push' event -> showNotification    │
│ - Heartbeat sync check   │          │ - 'notificationclick' -> focus tab    │
│ - Notification actions   │          └──────────────────▲────────────────────┘
└────────────┬─────────────┘                             │
             │                                           │ Web Push (VAPID)
             ▼                                           │
┌──────────────────────────┐          ┌──────────────────┴────────────────────┐
│ Cloud Firestore (Scoped) │          │ Next.js API Routes                    │
│ /users/{userId}/         │◀─────────┤ 1. /api/notifications/push (WebPush)  │
│  ├── notifications       │          │ 2. /api/cron/reminders (Scheduler)    │
│  ├── reminders           │          │ 3. /api/ai/daily-briefing (Gemini AI) │
│  ├── pushSubscriptions   │          └───────────────────────────────────────┘
│  ├── notificationSettings│
│  └── aiBriefings         │
└──────────────────────────┘
```

---

## 2. Core Modules & Technical Specifications

### A. Firestore Data Architecture & Security Rules

All notification, reminder, push subscription, and AI briefing documents are strictly user-scoped under `/users/{userId}/` with complete account isolation.

#### Data Models (`lib/notification-types.ts`):
1. **`NotificationRecord`**:
   - `id`: string (UUID or stable hash)
   - `userId`: string
   - `category`: `'tasks' | 'habits' | 'routines' | 'goals_savings' | 'custom' | 'ai_briefing' | 'system'`
   - `title`: string
   - `message`: string
   - `createdAt`: string (ISO)
   - `read`: boolean
   - `readAt`?: string
   - `priority`: `'low' | 'normal' | 'high' | 'urgent'`
   - `relatedType`?: `'todo' | 'habit' | 'goal' | 'savings' | 'sleep' | 'routine'`
   - `relatedId`?: string
   - `deepLink`?: string (e.g., `/?tab=todos`, `/?tab=habits`)
   - `idempotencyKey`: string (prevents duplicate generation)
   - `deliveryStatus`: `'created' | 'pushed' | 'push_failed' | 'in_app_only'`
   - `snoozeUntil`?: string

2. **`ReminderDefinition`**:
   - `id`: string
   - `userId`: string
   - `title`: string
   - `message`?: string
   - `type`: `'task' | 'habit' | 'morning_routine' | 'evening_routine' | 'weekly_review' | 'custom'`
   - `targetDate`?: string (YYYY-MM-DD)
   - `targetTime`?: string (HH:mm)
   - `timeZone`: string
   - `recurring`: `'none' | 'daily' | 'weekdays' | 'weekly' | 'custom_days'`
   - `recurrenceDays`?: number[] (0-6)
   - `enabled`: boolean
   - `lastTriggeredDate`?: string
   - `lastTriggeredOccurrence`?: string

3. **`NotificationSettings`**:
   - `inAppEnabled`: boolean (default: `true`)
   - `pushEnabled`: boolean (default: `false` until granted)
   - `timeZone`: string (default: user detected browser time zone)
   - `categories`: Record<NotificationCategory, boolean>
   - `quietHours`: { enabled: boolean; start: string (e.g., "22:00"); end: string (e.g., "07:00") }
   - `morningBriefingTime`: string (e.g., "08:00")
   - `eveningReviewTime`: string (e.g., "20:00")
   - `weeklyReviewDay`: number (0-6, default: 0 for Sunday)
   - `weeklyReviewTime`: string (e.g., "18:00")
   - `leadTimeMinutes`: number (default: 15)
   - `aiBriefingEnabled`: boolean (default: `true`)

4. **`PushSubscriptionRecord`**:
   - `id`: string
   - `userId`: string
   - `endpoint`: string
   - `keys`: { p256dh: string; auth: string }
   - `userAgent`: string
   - `createdAt`: string
   - `lastUsedAt`: string

#### Firestore Security Hardening (`firestore.rules`):
Add explicit rules under `match /users/{userId}`:
```cel
match /notifications/{notificationId} {
  allow read, write: if isOwner(userId);
}
match /reminders/{reminderId} {
  allow read, write: if isOwner(userId);
}
match /pushSubscriptions/{subscriptionId} {
  allow read, write: if isOwner(userId);
}
match /notificationSettings/{settingsId} {
  allow read, write: if isOwner(userId);
}
match /aiBriefings/{briefingId} {
  allow read, write: if isOwner(userId);
}
```

---

### B. User Interface Components

1. **Header Bell & Notification Badge (`components/notifications/NotificationBell.tsx`)**:
   - Mounts smoothly in `Navbar.tsx` alongside streak and theme toggles.
   - Shows badge with unread count (`9+` when count > 9).
   - Toggles responsive popover dropdown panel.
   - Keyboard accessible (`Escape` closes, `Tab` navigates).

2. **Dropdown Notification Panel (`components/notifications/NotificationPanel.tsx`)**:
   - Displays recent 5-10 notifications with category icon, timestamp, read status dot, and action link.
   - Quick actions: "Mark all as read", "Settings", and "View all notifications" (switches to `notifications` tab).
   - Instant individual dismiss and mark read.

3. **Full Notification Center View (`components/notifications/NotificationCenterView.tsx`)**:
   - Accessible via Sidebar item `Notifications` and deep link `/?tab=notifications`.
   - Category filter tabs: All, Unread, Tasks, Habits, Routines, Goals & Savings, AI Briefings, System.
   - Live search input filtering title and message.
   - Bulk actions: "Mark filtered as read", "Clear all read notifications" (with confirmation dialog).
   - Snooze modal support (10m, 30m, 1h, tomorrow morning).
   - Retention policy notice (30-day automatic prune).

4. **Notification Settings View (`components/notifications/NotificationSettingsView.tsx` or Settings Tab)**:
   - Dedicated "Notifications" tab in the existing `SettingsView.tsx`.
   - Browser push status indicator: Granted, Denied, Default with explicit "Enable Push Notifications" button.
   - Category toggles with clear descriptions.
   - Quiet hours time picker (10 PM to 7 AM default).
   - Preferred time zone selector.
   - Test notification trigger button to verify push delivery in real time.

5. **Custom Reminder Modal (`components/notifications/ReminderModal.tsx`)**:
   - Allows creating and editing custom one-off or recurring reminders with deep links.

---

### C. Smart Reminder Engine & Context-Aware Logic (`lib/reminder-engine.ts`)

Pure, deterministic rule-based evaluation:
1. **Task Reminders**:
   - Detects upcoming due dates based on `leadTimeMinutes`.
   - Detects overdue tasks without alert storming (max 1 overdue alert per day per task).
   - Validates that task is not completed, archived, or deleted before reminder dispatch.
2. **Habit Reminders**:
   - Checks habit scheduled days (`daysOfWeek`) and target time (`timeOfDay` or reminder time).
   - Checks if habit is already completed for the local date before sending.
   - Suppresses reminder if completed.
3. **Daily & Weekly Routines**:
   - Morning planning reminder at `morningBriefingTime`.
   - Evening reflection reminder at `eveningReviewTime`.
   - Weekly goal review on `weeklyReviewDay` at `weeklyReviewTime`.
4. **Quiet Hours & Idempotency**:
   - If current time is within user's quiet hours, suppresses push delivery (or creates in-app record for later).
   - Occurrence hash: `${userId}_${type}_${recordId}_${dateKey}` ensures identical reminder cannot fire twice on the same day.

---

### D. Web Push & Service Worker Integration

1. **`web-push` Server Library**:
   - Install `web-push` and `@types/web-push`.
   - VAPID keys generated; public key exposed as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, private key as server secret `VAPID_PRIVATE_KEY`.
2. **Service Worker (`public/sw.js`)**:
   - Extend existing PWA service worker with:
     ```js
     self.addEventListener('push', (event) => {
       const data = event.data ? event.data.json() : {};
       event.waitUntil(
         self.registration.showNotification(data.title || 'Life OS Reminder', {
           body: data.message,
           icon: '/pwa-192x192.png',
           badge: '/icon.svg',
           data: { url: data.deepLink || '/' },
           tag: data.id || 'lifeos-notification',
         })
       );
     });

     self.addEventListener('notificationclick', (event) => {
       event.notification.close();
       const url = event.notification.data?.url || '/';
       event.waitUntil(
         clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
           for (const client of clientList) {
             if (client.url.includes(self.location.origin) && 'focus' in client) {
               client.navigate(url);
               return client.focus();
             }
           }
           if (clients.openWindow) return clients.openWindow(url);
         })
       );
     });
     ```
3. **Push API Endpoint (`app/api/notifications/push/route.ts`)**:
   - Accepts push payload, verifies user authentication token, retrieves user's active push subscriptions from Firestore, and executes `webpush.sendNotification`.
   - If endpoint returns `410 Gone` or `404 Not Found`, automatically deactivates/deletes stale subscription.

---

### E. Scheduler & Heartbeat Sync (`app/api/cron/reminders/route.ts`)

1. **Dual-Trigger Architecture**:
   - **External Server Cron**: `/api/cron/reminders` endpoint secured with `Authorization: Bearer process.env.CRON_SECRET` for Vercel Cron or Google Cloud Scheduler.
   - **Client Heartbeat Sync**: When the user opens or interacts with Life OS, `LifeOSContext` triggers an opportunistic client-assisted check to evaluate pending reminders and deliver in-app notifications and push notifications immediately.
2. **Transaction & Claim Safe**:
   - Queries due reminders within a 15-minute window.
   - Records occurrence log to guarantee zero duplicate pushes even with concurrent triggers.

---

### F. Gemini AI Daily Briefing Engine (`app/api/ai/daily-briefing/route.ts`)

1. **Server-Side Generation**:
   - Retrieves authenticated user's current day state: tasks due today, high-priority items, scheduled habits, active goals, recent sleep score.
   - Formulates deterministic briefing stats:
     - `totalTasksToday`, `completedTasks`, `scheduledHabitsToday`, `completedHabits`, `activeStreakDays`.
2. **Gemini 2.5 Flash SDK Prompt**:
   - Uses `@google/genai` TypeScript SDK on server with `process.env.GEMINI_API_KEY`.
   - System instruction: Produce an executive, calm, 2-3 sentence morning briefing tailored strictly to the deterministic stats. Strictly forbidden to invent nonexistent tasks, goals, or fake numbers.
3. **Graceful Fallback**:
   - Deterministic template fallback if Gemini is offline or rate-limited:
     `"Good morning! You have {X} tasks scheduled today and {Y} habits. Start with your top priority to maintain your {Z}-day streak."`
4. **On-Demand & Scheduled**:
   - Available via morning routine reminder and via an instant "Generate Today's Briefing" button in the Notification Center.

---

## 3. Step-by-Step Implementation Sequence

1. **Phase 1: Dependencies & Types**:
   - Install `web-push` and `@types/web-push`.
   - Create `lib/notification-types.ts` defining all interfaces.
   - Add notification collections to `firestore.rules`.
2. **Phase 2: Core Notification Service & Storage**:
   - Create `lib/notification-service.ts` with Firestore CRUD, unread counter query, retention cleaner, and local-storage offline fallback.
   - Extend `context/LifeOSContext.tsx` to subscribe to user's notifications and notification settings, handle account switching, and expose notification state & dispatch methods.
3. **Phase 3: Header Bell & UI Components**:
   - Build `components/notifications/NotificationBell.tsx` with live unread badge.
   - Build `components/notifications/NotificationPanel.tsx` (dropdown).
   - Integrate into `components/Navbar.tsx`.
   - Add `notifications` to `components/Sidebar.tsx` and `components/MobileNav.tsx`.
   - Build `components/notifications/NotificationCenterView.tsx` with search, filters, and batch controls.
   - Mount in `app/page.tsx` tab router.
4. **Phase 4: Reminder Engine & Custom Reminders**:
   - Build `lib/reminder-engine.ts` (deterministic task/habit/routine/quiet-hours evaluator).
   - Build `components/notifications/ReminderModal.tsx`.
   - Add notification preferences tab in `components/SettingsView.tsx`.
5. **Phase 5: Push Service & Service Worker**:
   - Update `public/sw.js` with `push` and `notificationclick` listeners.
   - Build `lib/web-push-client.ts` (subscription creation with VAPID key).
   - Build `app/api/notifications/push/route.ts` and `app/api/cron/reminders/route.ts`.
6. **Phase 6: AI Daily Briefing Engine**:
   - Build `app/api/ai/daily-briefing/route.ts` using `@google/genai`.
   - Integrate briefing card into `NotificationCenterView.tsx` and morning routine reminder.
7. **Phase 7: Validation & Compilation**:
   - Run `lint_applet` and `compile_applet`.
   - Verify dev server returns 200 OK.
   - Document required environment variables (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`).

---

## 4. Security & Account Isolation Verification

- Strict user scoping: No collection queries outside `/users/{auth.uid}/`.
- Client logout cleans all state listeners and resets notification memory.
- All server endpoints validate Firebase Auth ID token or server CRON_SECRET.
- Push credentials and Gemini API keys remain strictly server-side.
