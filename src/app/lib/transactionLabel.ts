// Maps raw point_transactions.description values (often produced by DB
// functions, e.g. "NFC Stempel: blau") to user-friendly labels for the App.
// Code/DB identifiers stay the same; only display is rewritten.

export interface FormattedTransaction {
  /** Hauptzeile, z.B. "Check-in durch Besuch" */
  primary: string;
  /** Optionale Detailzeile, z.B. eingelöste Prämie */
  secondary?: string;
}

/**
 * Liefert eine saubere Darstellung für einen point_transactions-Eintrag.
 * - transaction_type: 'check_in' | 'nfc_stamp' | 'referral_bonus' | 'reward_redeemed' | 'google_review_bonus' | ...
 * - description: roher Text aus DB
 */
export function formatTransactionEntry(
  transactionType: string | null | undefined,
  description: string | null | undefined,
): FormattedTransaction {
  const type = (transactionType ?? '').trim();
  const desc = (description ?? '').trim();

  // ---------- Prämie eingelöst ----------
  if (type === 'reward_redeemed' || /^reward[_ ]redeemed$/i.test(type)) {
    // Beispiele für desc:
    //   "Visit 1: kostenloses Softgetränk"
    //   "Visit 7: Gratis Breze"
    const m = desc.match(/^visit\s+(\d+)\s*:\s*(.+)$/i);
    if (m) {
      return {
        primary: `Prämie eingelöst bei Check-in: ${m[1]}`,
        secondary: m[2].trim(),
      };
    }
    return { primary: 'Prämie eingelöst', secondary: desc || undefined };
  }

  // ---------- Google-Bewertungs-Bonus ----------
  if (type === 'google_review_bonus' || /google[- ]?bewertung/i.test(desc)) {
    return { primary: 'Check-in für Google-Bewertung' };
  }

  // ---------- Empfehlungs-Boost ----------
  // Bonus-Check-in durch Empfehlung wird als check_in mit
  // 'Bonus-Check-in: …' gespeichert. Außerdem alter Typ 'referral_bonus'.
  if (
    type === 'referral_bonus' ||
    /^bonus[- ]?check[- ]?in/i.test(desc) ||
    /empfehlung/i.test(desc)
  ) {
    return { primary: 'Check-in durch Empfehlung' };
  }

  // ---------- Normaler Check-in (NFC) ----------
  if (
    type === 'check_in' ||
    type === 'nfc_stamp' ||
    type === 'nfc_scan' ||
    /^nfc[- ]?stempel\b/i.test(desc)
  ) {
    return { primary: 'Check-in durch Besuch' };
  }

  // Fallback: nimm die Description, oder einen generischen Begriff.
  if (desc) return { primary: desc };
  return { primary: 'Aktivität' };
}

/**
 * Legacy-Helper (rückwärtskompatibel): liefert nur die Hauptzeile.
 */
export function formatTransactionDescription(
  description: string | null | undefined,
  fallback: string,
): string {
  const out = formatTransactionEntry(null, description);
  if (out.primary === 'Aktivität') return fallback;
  return out.primary;
}
