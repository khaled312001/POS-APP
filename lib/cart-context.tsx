import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from "react";

export interface CartItem {
  id: number;
  productId: number;
  name: string;
  price: number;
  quantity: number;
  modifiers?: { name: string; option: string; price: number }[];
  notes?: string;
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
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
  discount: number;
  setDiscount: (d: number) => void;
  taxRate: number;
  setTaxRate: (r: number) => void;
  tax: number;
  total: number;
  customerId: number | null;
  setCustomerId: (id: number | null) => void;
  tableNumber: string;
  setTableNumber: (t: string) => void;
  orderType: string;
  setOrderType: (t: string) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(10);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [tableNumber, setTableNumber] = useState("");
  const [orderType, setOrderType] = useState("dine_in");

  const addItem = useCallback((product: AddItemProps) => {
    setItems((prev) => {
      // Find if item with SAME productId and SAME variant/modifiers exists
      const variantName = product.variant?.name;
      const existing = prev.find((i) =>
        i.productId === product.id &&
        (variantName ? i.name.includes(variantName) : !i.name.includes("(")) &&
        JSON.stringify(i.modifiers || []) === JSON.stringify(product.modifiers || [])
      );

      if (existing) {
        return prev.map((i) =>
          i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }

      const itemName = variantName ? `${product.name} (${variantName})` : product.name;
      const itemPrice = product.variant ? product.variant.price : product.price;

      return [...prev, {
        id: Date.now(),
        productId: product.id,
        name: itemName,
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

  const clearCart = useCallback(() => {
    setItems([]);
    setDiscount(0);
    setCustomerId(null);
    setTableNumber("");
  }, []);

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items]);
  const tax = useMemo(() => ((subtotal - discount) * taxRate) / 100, [subtotal, discount, taxRate]);
  const total = useMemo(() => subtotal - discount + tax, [subtotal, discount, tax]);
  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  const value = useMemo(
    () => ({
      items, addItem, removeItem, updateQuantity, clearCart,
      subtotal, itemCount, discount, setDiscount, taxRate, setTaxRate,
      tax, total, customerId, setCustomerId, tableNumber, setTableNumber,
      orderType, setOrderType,
    }),
    [items, subtotal, itemCount, discount, taxRate, tax, total, customerId, tableNumber, orderType]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
