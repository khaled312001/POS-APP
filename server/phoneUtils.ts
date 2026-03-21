export function normalizePhone(phone: string): string {
  // Strip all non-digit chars except leading +
  let cleaned = phone.replace(/[\s\-\(\)\.\/]/g, '');

  if (cleaned.startsWith('+41')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('0041')) {
    cleaned = '0' + cleaned.slice(4);
  }

  // Other international numbers: keep as-is
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // Add Swiss leading 0 if 9-digit local number
  if (!cleaned.startsWith('0') && cleaned.length >= 9 && cleaned.length <= 10) {
    cleaned = '0' + cleaned;
  }

  return cleaned;
}

export function phonesMatch(phone1: string, phone2: string): boolean {
  return normalizePhone(phone1) === normalizePhone(phone2);
}

/**
 * Extract only the digit characters from a phone number.
 * Used for last-N-digit matching in SQL.
 */
export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Return the last N significant digits of a phone number.
 * For Swiss mobile 0762147117 → last 8 → "62147117"
 * For +41762147117 → last 8 → "62147117"
 * Both produce the same suffix, enabling format-agnostic matching.
 */
export function lastNDigits(phone: string, n = 8): string {
  return digitsOnly(phone).slice(-n);
}

export function getPhoneSearchVariants(search: string): string[] {
  const cleaned = search.replace(/[\s\-\(\)\.\/]/g, '');
  const variants = new Set<string>();

  variants.add(cleaned);

  const normalized = normalizePhone(cleaned);
  variants.add(normalized);

  // Strip leading + and country code to get the pure local digits
  let baseNumber = normalized;
  if (baseNumber.startsWith('0')) {
    baseNumber = baseNumber.slice(1);          // Swiss local: remove leading 0
  } else if (baseNumber.startsWith('+')) {
    baseNumber = baseNumber.slice(1);          // Remove + for searching
    // If it starts with 41 (Switzerland), also add the 0-prefixed local
    if (baseNumber.startsWith('41') && baseNumber.length === 11) {
      variants.add('0' + baseNumber.slice(2)); // +41762147117 → 0762147117
    }
  }

  if (baseNumber.length >= 8) {
    variants.add('+41' + baseNumber);          // Swiss international format
    variants.add('0041' + baseNumber);         // Swiss dial-out format
    variants.add('0' + baseNumber);            // Swiss local format
    variants.add(baseNumber);                  // Bare digits (no prefix)
  }

  return Array.from(variants).filter(v => v.length >= 6);
}
