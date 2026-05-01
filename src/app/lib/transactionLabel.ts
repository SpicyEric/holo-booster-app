// Maps raw point_transactions.description values (often produced by DB
// functions, e.g. "NFC Stempel: blau") to user-friendly labels for the App.
// Code/DB identifiers stay the same; only display is rewritten.
export function formatTransactionDescription(
  description: string | null | undefined,
  fallback: string,
): string {
  const desc = (description ?? '').trim();
  if (!desc) return fallback;
  // "NFC Stempel: blau" / "NFC-Stempel: grün" / etc. => "NFC-Karte gescannt"
  if (/^nfc[- ]?stempel\b/i.test(desc)) {
    return 'NFC-Karte gescannt';
  }
  return desc;
}
