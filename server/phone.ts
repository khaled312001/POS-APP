/**
 * Arabic-Indic (٠-٩) and Persian/Extended Arabic-Indic (۰-۹) digits → ASCII.
 * Syrian keyboards type phone numbers and amounts with these; a bare
 * `replace(/\D/g, "")` would silently drop every digit of "٠٩٤٤١٢٣٤٥٦".
 */
export function asciiDigits(raw: unknown): string {
  return String(raw ?? "")
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06F0));
}

/**
 * One spelling per phone number for the markets where customers type local
 * numbers: Syria (0944 123 456, 944123456, 00963…, +963…) and Egypt
 * (010…, 0020…, +20…). Customer accounts, OTP codes and orders are keyed by
 * the phone string, so "0944123456" and "+963944123456" must be the same
 * customer. Numbers from every other country are returned exactly as typed,
 * so existing customers (e.g. Swiss stores) keep matching their records.
 */
export function canonicalPhone(raw: unknown): string {
  const typed = asciiDigits(raw).trim();
  let d = typed.replace(/\D/g, "");
  if (!d) return typed;
  if (d.startsWith("00")) d = d.slice(2);
  // Syria — mobiles are 9 digits starting with 9 after the country code
  // (operators 093–099). 090–092 are left alone: 091 is the Swiss Ticino
  // area code, and a Lugano landline must not turn into a Syrian mobile.
  if (/^09[3-9]\d{7}$/.test(d)) return "+963" + d.slice(1);
  if (/^9[3-9]\d{7}$/.test(d)) return "+963" + d;
  if (/^9639\d{8}$/.test(d)) return "+" + d;
  if (/^96309\d{8}$/.test(d)) return "+963" + d.slice(4);
  // Egypt — mobiles 01[0125] + 8 digits
  if (/^01[0125]\d{8}$/.test(d)) return "+20" + d.slice(1);
  if (/^201[0125]\d{8}$/.test(d)) return "+" + d;
  return typed;
}
