## Boost-Mechanik mit 1-2-3-Eskalation pro Händler

### Ziel
Jede erfolgreiche Empfehlung gibt 1 → 2 → 3 → 1 → 2 → 3 ... Boost-Check-ins, **getrennt pro Händler**. Tageslimit 5 Boosts/User über alle Händler. Überschüsse werden in eine Queue gelegt und am nächsten Tag verarbeitet.

---

### 1. Datenbank (Migration)

**Neue Spalte `loyalty_accounts.successful_referrals`** (int, default 0)
- Zählt erfolgreiche Empfehlungen pro (user, merchant). Eindeutige Kombination existiert bereits.

**Neue Tabelle `boost_processing_state`** (pro User)
- `user_id` (PK)
- `boosts_today` (int, default 0)
- `last_processed_date` (date)
- RLS: nur User selbst lesen.

**Neue Tabelle `pending_boosts`** (Queue für übrig gebliebene Boosts)
- `id`, `user_id`, `merchant_customer_id`, `boost_count` (int), `referral_index` (int), `invitee_name` (text), `created_at`
- RLS: User darf eigene lesen.

---

### 2. RPC `process_referral_bonus` umbauen

Aktuell: gibt fixe `referral_inviter_points` aus `customers`.

Neu:
- `successful_referrals` für (inviter, merchant) +1 → `n`
- `boosts_due = (n % 3 == 0) ? 3 : (n % 3)`
- Tageslimit-Check via `boost_processing_state` (reset bei neuem Tag)
- `boosts_to_grant = min(boosts_due, 5 - boosts_today)`
- Überschuss → `pending_boosts` insert
- Boost-Gutschrift = `point_transactions` mit `transaction_type='referral_bonus'`, `points_change=boosts_to_grant`, beschreibung enthält `boost`/`streak`-Info
- Return-JSON erweitert: `boosts_granted`, `boosts_pending`, `referral_index`, `next_reward` für UI

### 3. Neue RPC `process_pending_boosts` + `get_next_boost_reward(merchant)`

- `process_pending_boosts(p_user_id)`: wird beim App-Open aufgerufen, leert Queue solange Tageslimit erlaubt, schreibt Punkte gut, sendet Push.
- `get_next_boost_reward(p_merchant)`: liefert für UI `next_boosts` (1/2/3) basierend auf aktuellem Counter.

### 4. Edge Function `notify-referral-bonus` erweitern

- Payload um `boost_count` + `merchant_name` + `invitee_name` ergänzen
- Title/Body je nach 1/2/3 Boost variieren (🚀, 🚀🚀, 🚀🚀🚀 STREAK)

### 5. UI — App `AppMerchantDetailV2` Boost-Popup

Aktuelles "Freunde einladen / Einladungslink teilen" Popup erweitern:
- Lade Counter via neue RPC `get_next_boost_reward`
- Zeige:
  - "✅ X erfolgreiche Empfehlungen"
  - "🔥 Nächste Belohnung: +Y Check-in(s)" (mit 🎉 bei +3, "(neuer Zyklus)" bei Reset)
- Buttons: WhatsApp, Link kopieren, Mehr Optionen (Native Share)

### 6. UI — Vorschau `MerchantTreuepassPreviewV2`

Popup-Vorschau analog updaten (statisch, Demo-Werte: 1 Empfehlung, nächste +2).

### 7. App-Boot: Pending-Boost-Verarbeitung

In `usePushNotifications` / App-Init Hook nach Login einmal `process_pending_boosts` rufen.

---

### Technische Details
- Modulo-Logik in SQL: `CASE WHEN n % 3 = 0 THEN 3 ELSE n % 3 END`
- Tageslimit-Reset: wenn `last_processed_date < current_date` → `boosts_today = 0`, dann update.
- `point_transactions.description` bekommt strukturierte Info `'Empfehlungs-Boost: +N Check-ins'` damit Activity-Feed lesbar bleibt.
- Race-Conditions: `FOR UPDATE` auf `loyalty_accounts` Row + `boost_processing_state` Row.

### Dateien
- `supabase/migrations/<ts>_boost_escalation.sql` — Schema + RPCs
- `supabase/functions/notify-referral-bonus/index.ts` — Push-Wording
- `src/app/pages/AppMerchantDetailV2.tsx` — Boost-Popup-Inhalt
- `src/components/merchant/MerchantTreuepassPreviewV2.tsx` — Vorschau-Popup
- `src/app/lib/referralBonus.ts` — neue Felder im Result-Type, Push mit boost_count
- `src/App.tsx` oder Auth-Bootstrap — Pending-Queue beim Boot abarbeiten
