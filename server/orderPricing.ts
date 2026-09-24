/**
 * Server-side order pricing.
 *
 * The public ordering endpoints used to insert `subtotal`, `deliveryFee` and
 * `totalAmount` straight from the request body. Anyone could therefore place a
 * CHF 0.01 order for a CHF 60 basket - and once Stripe is live that is not a
 * reporting error, it is money.
 *
 * Everything a customer is charged is recomputed here from the tenant's own
 * `products` rows. The client's numbers are used for nothing except detecting
 * a mismatch worth logging.
 *
 * Modifier prices are reconstructed from the display strings the cart sends
 * ("Sauce: Garlic, Chili"), matched back against products.modifiers. A label
 * that cannot be matched is priced at zero rather than at whatever the client
 * claimed: unknown input must never be able to raise or lower a charge.
 */
import { pool } from "./db";

export interface IncomingItem {
  productId?: number | string;
  name?: string;
  productName?: string;
  quantity?: number | string;
  qty?: number | string;
  unitPrice?: number | string;
  estimatedPrice?: number | string;
  variant?: string | null;
  modifiers?: unknown;
  notes?: string | null;
}

export interface PricedItem {
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  variant: string | null;
  modifiers: string[];
  notes: string | null;
}

export interface PricedOrder {
  items: PricedItem[];
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  walletUsed: number;
  totalAmount: number;
  /** Set when the client's total disagreed with ours - worth logging. */
  mismatch: { clientTotal: number; serverTotal: number } | null;
}

export class PricingError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "PricingError";
  }
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

/** Round to rappen. Float arithmetic on money drifts otherwise. */
function money(n: number): number {
  return Math.round(n * 100) / 100;
}

function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (typeof v === "string" && v.trim()) return [v];
  return [];
}

function parseJson<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === "object") return v as T;
  try {
    return JSON.parse(String(v)) as T;
  } catch {
    return fallback;
  }
}

type ModifierGroup = { name?: string; options?: { label?: string; name?: string; price?: number }[] };
type Variant = { name?: string; sku?: string; price?: number };

/**
 * Price one modifier summary line against the product's own modifier groups.
 * Accepts "Group: A, B" and bare "A".
 */
function priceModifierLine(line: string, groups: ModifierGroup[]): number {
  const colon = line.indexOf(":");
  const groupName = colon >= 0 ? line.slice(0, colon).trim().toLowerCase() : null;
  const labelsRaw = colon >= 0 ? line.slice(colon + 1) : line;
  const labels = labelsRaw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

  // Prefer the named group; fall back to searching every group, so a renamed
  // group does not silently make paid extras free.
  const candidates = groupName
    ? groups.filter((g) => String(g.name ?? "").trim().toLowerCase() === groupName)
    : [];
  const searchIn = candidates.length ? candidates : groups;

  let sum = 0;
  for (const label of labels) {
    for (const g of searchIn) {
      const opt = (g.options ?? []).find(
        (o) => String(o.label ?? o.name ?? "").trim().toLowerCase() === label,
      );
      if (opt) {
        sum += num(opt.price, 0);
        break;
      }
    }
  }
  return sum;
}

/**
 * Recompute an order from the tenant's own product prices.
 *
 * Throws PricingError when a line references a product that does not belong to
 * this tenant, is inactive, or does not exist - an order we cannot price is an
 * order we must not take money for.
 */
export async function repriceOrder(opts: {
  tenantId: number;
  items: IncomingItem[];
  clientSubtotal?: unknown;
  clientDeliveryFee?: unknown;
  clientTotal?: unknown;
  discountAmount?: number;
  walletUsed?: number;
  orderType?: string;
}): Promise<PricedOrder> {
  const { tenantId } = opts;
  const incoming = Array.isArray(opts.items) ? opts.items : [];
  if (!incoming.length) throw new PricingError("Order has no items");

  const ids = Array.from(
    new Set(
      incoming
        .map((i) => Number.parseInt(String(i.productId ?? ""), 10))
        .filter((n) => Number.isFinite(n)),
    ),
  );
  if (!ids.length) throw new PricingError("No valid productId on any line");

  const placeholders = ids.map(() => "?").join(",");
  const [rows]: any = await pool.query(
    `SELECT id, name, price, is_active, modifiers, variants, tenant_id
       FROM products
      WHERE id IN (${placeholders}) AND tenant_id = ?`,
    [...ids, tenantId],
  );
  const byId = new Map<number, any>();
  for (const r of rows as any[]) byId.set(Number(r.id), r);

  const priced: PricedItem[] = [];
  let subtotal = 0;

  for (const line of incoming) {
    const pid = Number.parseInt(String(line.productId ?? ""), 10);
    const product = byId.get(pid);
    if (!product) {
      throw new PricingError(`Product ${line.productId} is not available in this store`);
    }
    if (product.is_active === 0 || product.is_active === false) {
      throw new PricingError(`"${product.name}" is no longer available`);
    }

    const qty = Math.max(1, Math.floor(num(line.quantity ?? line.qty, 1)));
    if (qty > 999) throw new PricingError("Quantity is unreasonably large");

    const variants = parseJson<Variant[]>(product.variants, []) ?? [];
    const groups = parseJson<ModifierGroup[]>(product.modifiers, []) ?? [];

    // A chosen size overrides the base price; an unknown size is an error
    // rather than a silent fallback to the (cheaper) base price.
    let base = num(product.price, 0);
    const wantedVariant = line.variant ? String(line.variant).trim().toLowerCase() : null;
    if (wantedVariant) {
      const v = variants.find((x) => String(x.name ?? "").trim().toLowerCase() === wantedVariant);
      if (!v) throw new PricingError(`Unknown option "${line.variant}" for ${product.name}`);
      base = num(v.price, base);
    } else if (variants.length > 0) {
      // Sized products must state their size; otherwise the smallest price
      // could be used to order the largest item.
      const cheapest = Math.min(...variants.map((v) => num(v.price, base)));
      base = Number.isFinite(cheapest) ? cheapest : base;
    }

    const modLines = asArray(line.modifiers);
    const modTotal = modLines.reduce((s, m) => s + priceModifierLine(m, groups), 0);

    const unitPrice = money(base + modTotal);
    const total = money(unitPrice * qty);
    subtotal += total;

    priced.push({
      productId: pid,
      name: String(line.name ?? line.productName ?? product.name),
      quantity: qty,
      unitPrice,
      total,
      variant: line.variant ? String(line.variant) : null,
      modifiers: modLines,
      notes: line.notes ? String(line.notes) : null,
    });
  }

  subtotal = money(subtotal);

  // ── delivery fee ─────────────────────────────────────────────────────────
  // Resolved against the tenant's configured zones. The client may pick which
  // zone applies, but not invent a fee.
  let deliveryFee = 0;
  if ((opts.orderType ?? "delivery") === "delivery") {
    const requested = num(opts.clientDeliveryFee, NaN);
    const [zoneRows]: any = await pool.query(
      `SELECT delivery_fee, min_order_amount FROM delivery_zones WHERE tenant_id = ? AND is_active = 1`,
      [tenantId],
    );
    const allowed = (zoneRows as any[]).map((z) => money(num(z.delivery_fee, 0)));

    const [branchRows]: any = await pool.query(
      `SELECT delivery_fee, currency FROM branches WHERE tenant_id = ? LIMIT 1`,
      [tenantId],
    );
    const branchFee = money(num(branchRows?.[0]?.delivery_fee, 0));
    const zoneFees = allowed.slice();
    if (!allowed.includes(branchFee)) allowed.push(branchFee);

    deliveryFee =
      Number.isFinite(requested) && allowed.includes(money(requested))
        ? money(requested)
        : branchFee;

    // Zone minimum order. Applied conservatively: only when the chosen fee
    // identifies zones (it is not also the store's default fee) and EVERY
    // active zone charging that fee has a minimum the basket does not reach —
    // an ambiguous match never blocks an order.
    if (deliveryFee !== branchFee && zoneFees.includes(deliveryFee)) {
      const matching = (zoneRows as any[]).filter((z) => money(num(z.delivery_fee, 0)) === deliveryFee);
      const minimums = matching.map((z) => money(num(z.min_order_amount, 0)));
      if (minimums.length && minimums.every((m) => m > 0 && subtotal < m)) {
        const need = Math.min(...minimums);
        const currency = String(branchRows?.[0]?.currency || "CHF").toUpperCase();
        const en = `The minimum order for this delivery area is ${need} ${currency}`;
        throw new PricingError(currency === "SYP" ? `الحد الأدنى للطلب لمنطقة التوصيل هذه هو ${need} ل.س / ${en}` : en);
      }
    }
  }

  // Discounts only ever come from a server-validated promo, and can never
  // exceed the basket.
  const discountAmount = Math.min(money(Math.max(0, num(opts.discountAmount, 0))), subtotal);
  const walletUsed = Math.max(0, money(num(opts.walletUsed, 0)));

  const gross = money(subtotal - discountAmount + deliveryFee);
  const totalAmount = money(Math.max(0, gross - walletUsed));

  const clientTotal = num(opts.clientTotal, NaN);
  const mismatch =
    Number.isFinite(clientTotal) && Math.abs(clientTotal - totalAmount) > 0.01
      ? { clientTotal: money(clientTotal), serverTotal: totalAmount }
      : null;

  if (mismatch) {
    console.warn(
      `[pricing] tenant ${tenantId}: client said ${mismatch.clientTotal}, ` +
        `server priced ${mismatch.serverTotal}. Using the server total.`,
    );
  }

  return { items: priced, subtotal, deliveryFee, discountAmount, walletUsed, totalAmount, mismatch };
}
