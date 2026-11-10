import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { db, collection, getDocs, deleteDoc, doc } from '@/lib/firebase';
import { PushSubscriptionRecord } from '@/lib/notification-types';

// Default development VAPID keys if not set in environment
const DEFAULT_VAPID_PUBLIC =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BI_qQp-qG7T_g6B9-N6s4fLq2L8y6b7h9J7y4f3N1k0z8X5v2W1a9C8b7D6e5F4g3H2j1K0l9Z8x7C6v5B4n3M2=';
const DEFAULT_VAPID_PRIVATE =
  process.env.VAPID_PRIVATE_KEY || 'k7L9y2M4n6B8v0X2z4C6b8V0x2Z4c6B8v0X2z4C6b8U=';

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@lifeos.app';

try {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC,
    process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE
  );
} catch (e) {
  console.warn('WebPush VAPID configuration notice:', e);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, notification } = body;

    if (!userId || !notification) {
      return NextResponse.json({ error: 'Missing userId or notification' }, { status: 400 });
    }

    // Retrieve user's push subscriptions from Firestore
    const subColRef = collection(db, 'users', userId, 'pushSubscriptions');
    const snap = await getDocs(subColRef);

    if (snap.empty) {
      return NextResponse.json({
        success: true,
        deliveredCount: 0,
        message: 'No push subscriptions found for this user',
      });
    }

    const payload = JSON.stringify({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      category: notification.category,
      priority: notification.priority,
      deepLink: notification.deepLink || '/',
      timestamp: Date.now(),
    });

    let deliveredCount = 0;
    const errors: string[] = [];

    // Attempt push delivery to all registered endpoints for this user
    for (const d of snap.docs) {
      const subRecord = d.data() as PushSubscriptionRecord;
      if (!subRecord.endpoint || !subRecord.keys?.p256dh || !subRecord.keys?.auth) {
        continue;
      }

      const pushSubscription = {
        endpoint: subRecord.endpoint,
        keys: {
          p256dh: subRecord.keys.p256dh,
          auth: subRecord.keys.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload, {
          TTL: 60 * 60 * 24, // 24 hours
        });
        deliveredCount++;
      } catch (err: any) {
        // If expired or gone (410 / 404), clean up the invalid subscription record
        if (err.statusCode === 410 || err.statusCode === 404) {
          try {
            await deleteDoc(doc(db, 'users', userId, 'pushSubscriptions', d.id));
          } catch {}
        } else {
          errors.push(err.message || String(err));
        }
      }
    }

    return NextResponse.json({
      success: true,
      deliveredCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Push delivery route error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error delivering push' },
      { status: 500 }
    );
  }
}
