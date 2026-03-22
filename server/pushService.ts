/**
 * Web Push Notification Service
 * Sends push notifications to subscribed browsers (tenant-scoped)
 */

import webpush from "web-push";

const VAPID_PUBLIC = "BN_VRMNof7tvLBE3u4-dJdq7ZBSOHUqrexcuD2Tf81rQe4t1GSkbUNzRGU9DyoXObqFwUa2ef1w4AWhteWalk08";
const VAPID_PRIVATE = "SYAn5KRDjhIDKcIb7WJr3kgr_LDsLKQYWEIHmcgfnjY";
const VAPID_EMAIL = "mailto:admin@barmagly.tech";

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);

interface SubscriptionRecord {
  sub: webpush.PushSubscription;
  tenantId: number;
}

// In-memory subscription store (keyed by endpoint)
const subscriptions = new Map<string, SubscriptionRecord>();

export const pushService = {
  /** Public VAPID key for the browser to use when subscribing */
  publicKey: VAPID_PUBLIC,

  /** Save a push subscription received from the browser */
  subscribe(sub: webpush.PushSubscription, tenantId: number) {
    if (!tenantId) return;
    subscriptions.set(sub.endpoint, { sub, tenantId });
    console.log(`[Push] Subscription saved for tenant ${tenantId}. Total: ${subscriptions.size}`);
  },

  /** Remove a subscription (when browser unsubscribes) */
  unsubscribe(endpoint: string) {
    subscriptions.delete(endpoint);
  },

  /** Send a push payload to all subscribed browsers of a specific tenant */
  async broadcast(payload: object, tenantId?: number) {
    if (subscriptions.size === 0) return;
    const msg = JSON.stringify(payload);
    const failed: string[] = [];

    const recipients = Array.from(subscriptions.values()).filter(record => {
      // If tenantId is provided, filter by it. Otherwise, broadcast to all (admin alerts?)
      return !tenantId || record.tenantId === tenantId;
    });

    if (recipients.length === 0) return;

    await Promise.allSettled(
      recipients.map(async (record) => {
        try {
          await webpush.sendNotification(record.sub, msg);
        } catch (err: any) {
          // 410 Gone = subscription expired/removed by browser
          if (err.statusCode === 410 || err.statusCode === 404) {
            failed.push(record.sub.endpoint);
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
  async notifyIncomingCall(phoneNumber: string, tenantId?: number, customerName?: string, address?: string) {
    let body = phoneNumber;
    if (customerName) body += ` — ${customerName}`;
    if (address) body += `\n📍 ${address}`;

    await this.broadcast({
      type: "incoming_call",
      title: `📞 Incoming Call`,
      body: body,
      data: { type: "incoming_call", phoneNumber },
    }, tenantId);
  },

  /** Push: new online order notification */
  async notifyNewOrder(orderNumber: string, total: string | number, tenantId?: number) {
    await this.broadcast({
      type: "new_online_order",
      title: "🛒 New Online Order",
      body: `Order #${orderNumber} — CHF ${Number(total).toFixed(2)}`,
      data: { type: "new_online_order", orderNumber },
    }, tenantId);
  },
};
