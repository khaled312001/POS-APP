type AnyOrderItem = Record<string, any>;

export function normalizeOrderItems<T extends AnyOrderItem = AnyOrderItem>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed as T[] : [];
    } catch {
      return [];
    }
  }

  return [];
}

export function cloneOrderItems<T extends AnyOrderItem = AnyOrderItem>(value: unknown): T[] {
  return normalizeOrderItems<T>(value).map((item) => ({ ...item })) as T[];
}
