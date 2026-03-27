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

// Swiss landline area codes (3-digit format 0XX)
const SWISS_AREA_CODES = [
  '044', '043', '022', '021', '026', '027', '031', '032', '033', '034',
  '041', '052', '055', '056', '061', '062', '071', '081', '091',
  '058', '076', '077', '078', '079',
];

/**
 * Detect if a number looks like a Swiss landline stored WITHOUT area code.
 * These are typically 7-digit numbers (e.g. 3716640 stored for Zurich 0443716640).
 */
function isSwissSubscriberOnly(digits: string): boolean {
  return /^\d{7}$/.test(digits) && !digits.startsWith('0');
}

/**
 * Detect if a number is a Swiss landline WITH area code (10 digits starting 0[^7]).
 * Swiss mobiles start with 07x — those are NOT treated this way.
 */
function isSwissLandlineWithAreaCode(digits: string): boolean {
  return /^0[^7]\d{8}$/.test(digits);
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

  // ── Swiss area-code stripping ──────────────────────────────────────────────
  // Case 1: Incoming is full landline (e.g. 0443716640) → also search for the
  //         7-digit subscriber number (3716640) in case it was stored without area code.
  if (isSwissLandlineWithAreaCode(normalized)) {
    const subscriberOnly = normalized.slice(3); // strip 3-char area code (0XX)
    variants.add(subscriberOnly);               // e.g. "3716640"
  }

  // Case 2: Stored number is 7 digits (no area code, e.g. "3716640") → also
  //         search with all common Swiss area codes prepended, so an incoming
  //         "0443716640" will match the stored "3716640".
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (isSwissSubscriberOnly(digitsOnly)) {
    for (const areaCode of SWISS_AREA_CODES) {
      variants.add(areaCode + digitsOnly);      // e.g. "0443716640"
      variants.add('+41' + areaCode.slice(1) + digitsOnly); // e.g. "+41443716640"
    }
  }

  return Array.from(variants).filter(v => v.length >= 6);
}
