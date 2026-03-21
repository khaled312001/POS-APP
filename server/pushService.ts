/**
 * Web Push Notification Service
 * Sends push notifications to subscribed browsers for:
 *  - Incoming caller ID alerts
 *  - New online orders
 */

import webpush from "web-push";

const VAPID_PUBLIC  = "BN_VRMNof7tvLBE3u4-dJdq7ZBSOHUqrexcuD2Tf81rQe4t1GSkbUNzRGU9DyoXObqFwUa2ef1w4AWhteWalk08";
const VAPID_PRIVATE = "SYAn5KRDjhIDKcIb7WJr3kgr_LDsLKQYWEIHmcgfnjY";
const VAPID_EMAIL   = "mailto:admin@barmagly.tech";

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);

// In-memory subscription store (keyed by endpoint, so duplicate registrations are de-duped)
const subscriptions = new Map<string, webpush.PushSubscription>();

export const pushService = {
  /** Public VAPID key for the browser to use when subscribing */
  publicKey: VAPID_PUBLIC,

  /** Save a push subscription received from the browser */
  subscribe(sub: webpush.PushSubscription) {
    subscriptions.set(sub.endpoint, sub);
    console.log(`[Push] Subscription saved. Total: ${subscriptions.size}`);
  },

  /** Remove a subscription (when browser unsubscribes) */
  unsubscribe(endpoint: string) {
    subscriptions.delete(endpoint);
  },

  /** Send a push payload to all subscribed browsers */
  async broadcast(payload: object) {
    if (subscriptions.size === 0) return;
    const msg = JSON.stringify(payload);
    const failed: string[] = [];

    await Promise.allSettled(
      Array.from(subscriptions.values()).map(async (sub) => {
        try {
          await webpush.sendNotification(sub, msg);
        } catch (err: any) {
          // 410 Gone = subscription expired/removed by browser
          if (err.statusCode === 410 || err.statusCode === 404) {
            failed.push(sub.endpoint);
          } else {
            console.error("[Push] Send failed:", err.message);
          }
        }
      })
    );

    // Clean up expired subscriptions
    failed.forEach((ep) => subscriptions.delete(ep));
  },

  /** Push: incoming call notification */
  async notifyIncomingCall(phoneNumber: string, customerName?: string) {
    await this.broadcast({
      type: "incoming_call",
      title: `📞 Incoming Call`,
      body: customerName
        ? `${phoneNumber} — ${customerName}`
        : phoneNumber,
      data: { type: "incoming_call", phoneNumber },
    });
  },

  /** Push: new online order notification */
  async notifyNewOrder(orderNumber: string, total: string | number) {
    await this.broadcast({
      type: "new_online_order",
      title: "🛒 New Online Order",
      body: `Order #${orderNumber} — CHF ${Number(total).toFixed(2)}`,
      data: { type: "new_online_order", orderNumber },
    });
  },
};
