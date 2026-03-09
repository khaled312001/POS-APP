export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  if (cleaned.startsWith('+41')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('0041')) {
    cleaned = '0' + cleaned.slice(4);
  }

  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  if (!cleaned.startsWith('0') && cleaned.length >= 9 && cleaned.length <= 10) {
    cleaned = '0' + cleaned;
  }

  return cleaned;
}

export function phonesMatch(phone1: string, phone2: string): boolean {
  return normalizePhone(phone1) === normalizePhone(phone2);
}

export function getPhoneSearchVariants(search: string): string[] {
  const cleaned = search.replace(/[\s\-\(\)\.]/g, '');
  const variants = new Set<string>();

  variants.add(cleaned);

  const normalized = normalizePhone(cleaned);
  variants.add(normalized);

  let baseNumber = normalized;
  if (baseNumber.startsWith('0')) {
    baseNumber = baseNumber.slice(1);
  }

  if (baseNumber.length >= 8) {
    variants.add('+41' + baseNumber);
    variants.add('0041' + baseNumber);
    variants.add('0' + baseNumber);
  }

  return Array.from(variants).filter(v => v.length >= 4);
}
