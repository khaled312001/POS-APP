import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from "react";

export interface CartItem {
  id: number;
  productId: number;
  name: string;
  /** Variant identity kept as data — never re-parsed out of `name`. */
  variantName?: string;
  price: number;
  quantity: number;
  modifiers?: { name: string; option: string; price: number }[];
  notes?: string;
}

// BUG-01: Date.now() collides when two items land in the same millisecond
// (fast tapping, barcode scanner bursts) — the duplicate id then makes
// updateQuantity/removeItem hit both rows. Monotonic counter guarantees
// uniqueness while keeping the id numeric.
let itemSeq = 0;
function nextItemId(): number {
  itemSeq = (itemSeq + 1) % 1000;
  return Date.now() * 1000 + itemSeq;
}

/** Stable identity for merging duplicates: product + variant + modifiers. */
function mergeKeyOf(
  productId: number,
  variantName: string | undefined,
  modifiers: { name: string; option: string; price: number }[] | undefined,
): string {
  const mods = (modifiers ?? [])
    .map((m) => `${m.name}:${m.option}:${m.price}`)
    .sort()
    .join("|");
  return `${productId}#${variantName ?? ""}#${mods}`;
}

interface AddItemProps {
  id: number;
  name: string;
  price: number;
  variant?: { name: string; price: number };
  modifiers?: { name: string; option: string; price: number }[];
}

interface CartContextValue {
  items: CartItem[];
  addItem: (product: AddItemProps) => void;
  removeItem: (itemId: number) => void; // Changed to itemId to be unique
  updateQuantity: (itemId: number, quantity: number) => void;
  updateItem: (itemId: number, updates: { name?: string; price?: number }) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
  discount: number;
  discountRate: number; // percentage 0-100, auto-applies to new items
  setDiscount: (d: number) => void; // accepts rate (percentage)
  taxRate: number;
  setTaxRate: (r: number) => void;
  tax: number;
  deliveryFee: number;
  setDeliveryFee: (f: number) => void;
  serviceFeeRate: number;
  setServiceFeeRate: (r: number) => void;
  serviceFee: number;
  minOrderAmount: number; // 0 = disabled; delivery-only when set
  setMinOrderAmount: (v: number) => void;
  minimumOrderSurcharge: number; // top-up added when a delivery cart is under minOrderAmount
  total: number;
  customerId: number | null;
  setCustomerId: (id: number | null) => void;
  tableNumber: string;
  setTableNumber: (t: string) => void;
  orderType: string;
  setOrderType: (t: string) => void;
  vehicleId: number | null;
  setVehicleId: (id: number | null) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [discountRate, setDiscountRate] = useState(0); // stored as percentage 0-100
  // Swiss standard VAT is 8.1% since 1 Jan 2024 (was 7.7%). Overridden per
  // branch from store settings; this is only the pre-load fallback.
  const [taxRate, setTaxRate] = useState(8.1);
  // BIZ-01: minimum-order top-up. 0 = disabled (the default for every tenant).
  // Only ever applies to delivery — never to dine-in or pickup.
  const [minOrderAmount, setMinOrderAmount] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [serviceFeeRate, setServiceFeeRate] = useState(0);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [tableNumber, setTableNumber] = useState("");
  const [orderType, setOrderType] = useState("dine_in");
  const [vehicleId, setVehicleId] = useState<number | null>(null);

  const addItem = useCallback((product: AddItemProps) => {
    setItems((prev) => {
      const variantName = product.variant?.name;
      // Match on real identity, not on parsing the display name — a product
      // whose own name contains "(" used to break the old string heuristic.
      const key = mergeKeyOf(product.id, variantName, product.modifiers);
      const existing = prev.find(
        (i) => mergeKeyOf(i.productId, i.variantName, i.modifiers) === key
      );

      if (existing) {
        return prev.map((i) =>
          i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }

      const itemName = variantName ? `${product.name} (${variantName})` : product.name;
      const itemPrice = product.variant ? product.variant.price : product.price;

      return [...prev, {
        id: nextItemId(),
        productId: product.id,
        name: itemName,
        variantName,
        price: itemPrice,
        quantity: 1,
        modifiers: product.modifiers
      }];
    });
  }, []);

  const removeItem = useCallback((itemId: number) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: number, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } else {
      setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, quantity } : i)));
    }
  }, []);

  const updateItem = useCallback((itemId: number, updates: { name?: string; price?: number }) => {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...updates } : i)));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setDiscountRate(0);
    setDeliveryFee(0);
    setCustomerId(null);
    setTableNumber("");
    setVehicleId(null);
  }, []);

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items]);
  // discount auto-scales with subtotal using the stored rate
  const discount = useMemo(() => (subtotal * discountRate) / 100, [subtotal, discountRate]);
  // Minimum-order top-up — delivery only, and only when the tenant configured
  // a threshold. Previously a hardcoded 20 CHF applied to every order type of
  // every tenant, so a 4.50 coffee was billed at 20.00.
  const minimumOrderSurcharge = useMemo(() => {
    if (minOrderAmount <= 0 || orderType !== "delivery" || items.length === 0) return 0;
    const net = subtotal - discount;
    return net < minOrderAmount ? minOrderAmount - net : 0;
  }, [minOrderAmount, orderType, items.length, subtotal, discount]);
  const tax = useMemo(() => ((subtotal - discount + minimumOrderSurcharge) * taxRate) / 100, [subtotal, discount, minimumOrderSurcharge, taxRate]);
  const serviceFee = useMemo(() => ((subtotal - discount + minimumOrderSurcharge) * serviceFeeRate) / 100, [subtotal, discount, minimumOrderSurcharge, serviceFeeRate]);
  const total = useMemo(() => subtotal - discount + minimumOrderSurcharge + tax + deliveryFee + serviceFee, [subtotal, discount, minimumOrderSurcharge, tax, deliveryFee, serviceFee]);
  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  // setDiscount accepts a rate percentage (0-100)
  const setDiscount = useCallback((rate: number) => setDiscountRate(rate), []);

  const value = useMemo(
    () => ({
      items, addItem, removeItem, updateQuantity, updateItem, clearCart,
      subtotal, itemCount, discount, discountRate, setDiscount, taxRate, setTaxRate,
      tax, deliveryFee, setDeliveryFee, serviceFeeRate, setServiceFeeRate, serviceFee,
      minOrderAmount, setMinOrderAmount, minimumOrderSurcharge, total,
      customerId, setCustomerId, tableNumber, setTableNumber, orderType, setOrderType, vehicleId, setVehicleId,
    }),
    [items, addItem, removeItem, updateQuantity, updateItem, clearCart, subtotal, itemCount, discount, discountRate, taxRate, tax, deliveryFee, serviceFeeRate, serviceFee, minOrderAmount, minimumOrderSurcharge, total, customerId, tableNumber, orderType, vehicleId]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
