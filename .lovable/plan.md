Großes Update mit mehreren Bereichen. Da das aktuell alles auf Backstube König als Demo läuft, halte ich die Änderungen so weit möglich frontend-seitig — echte DB-Logik (7-Tage-Fenster, Boost-Auszahlung) lasse ich unverändert, ändere aber UI/Texte und Demo-Verhalten entsprechend.

## 1. Nachrichten-Seite (`AppMessages.tsx`)
- "Einlösbare Prämien"-Kachel oben **komplett entfernen** (nicht mehr klickbar, nicht mehr sichtbar).
- Reihenfolge: zuerst Nachrichten-Liste, **darunter** ein eigenes Panel "Offene Einladungen".
- Panel zeigt alle offenen Einladungen (per Geschäft), klickbar → führt zum Merchant-Detail.
- Pro Einladungs-Item ein kleines "Einladung entfernen"-Button (Trash/X). Beim Klick: Bestätigung → RPC/Update auf `invitation_redemptions` setzt z.B. `bonus_awarded_at = now()` mit Marker oder löscht den Datensatz (über eine neue Edge Function / RPC `cancel_invitation_redemption`).

## 2. Einladungs-Annahme (`PendingInviteDialog.tsx`)
- Pop-up mit abgerundeten Ecken, Buttons "Annehmen" / "Ablehnen".
- Nach Annahme: Inhalt wechselt zu "Einladung angenommen" + Untertitel "Deine offenen Einladungen findest du unter Nachrichten" + großes Nachrichten-Icon. Schließen via X.
- Kein Auto-Redirect mehr direkt zum Merchant.

## 3. Boost-Erklär-Dialog (`AppMerchantDetailV2.tsx`)
- Text anpassen: "Ihr beide bekommt jeweils +1 Boost auf eurem Treuepass."
- Schritte: Link teilen → Freund checkt bei {merchant} ein → **Beide** bekommen +1 Boost.

## 4. Google-Bewertungs-Karte (`AppMerchantDetailV2.tsx`)
- Karte unten: nur "Hol dir einen Check-in" + "Bewerte uns bei Google" + Button "Bewerten".
- Klick öffnet Pop-up: "Bewertung abgeben — So funktioniert's: Bewerte Backstube König bei Google. Du bekommst +1 Check-in geschenkt. Nur einmal pro Geschäft möglich." + Button "Bei Google bewerten" + X.
- Sichtbarkeit: nur wenn (a) User mindestens 1 Check-in bei diesem Merchant hat **und** (b) noch keine Google-Bewertung abgegeben (Demo: localStorage-Flag `eloyo:v2:google-review-done:{merchantId}` setzen, sobald auf "Bei Google bewerten" geklickt — Karte verschwindet, automatischer Bonus-Check-in vom Typ `google_review` wird angelegt).

## 5. Treuepass-Knoten klickbar (`AppMerchantDetailV2.tsx`)
- Bei normalen Check-ins Label "Check-in" anzeigen (statt leer).
- Jeder gefüllte Knoten (Check-in / Boost / Geburtstag / Bewertung) wird klickbar → Pop-up:
  - **Check-in**: "Eingecheckt am {datum} um {uhrzeit}" + "Prämie eingelöst: ja/nein".
  - **Boost**: "Boost erhalten am {datum} um {uhrzeit}" + "Einladung angenommen am {datum}".
  - **Geburtstag**: Datum + Uhrzeit.
  - **Bewertung**: Datum + Uhrzeit.
- Eingelöste Prämien-Knoten ebenfalls klickbar → "Prämie eingelöst am {datum} um {uhrzeit}".
- Pop-up schließbar via X.

## 6. WhatsApp-Link → App-Store-Fallback
- Antwort an User: aktuell ist der Invite-Link `https://eloyo.de/i/{code}` (siehe `pendingInvite.ts` + `InviteRedirect`-Page). Auf Mobil ohne installierte App geht der Browser auf eloyo.de — von dort wird **noch nicht** automatisch in App-/Play-Store weitergeleitet. Das müsste in `InviteRedirect.tsx` ergänzt werden (User-Agent-Sniff → store-Link, Code in localStorage cachen für späteren Pickup nach Install via Deep-Link / Clipboard-Fallback).
- Im selben Schritt einbauen.

## 7. 7-Tage-Beschränkung entfernen
- Frontend-seitig: `OpenInvitationsBanner` und neues "Offene Einladungen"-Panel filtern **nicht mehr** nach `bonus_window_starts_at > now()-7d`.
- DB-seitige 7-Tage-Bonusfenster-Logik (`process_referral_bonus`) bleibt erstmal — bestätige mit User, ob ich diese auch entfernen soll (Boost auch nach Monaten noch zahlbar).

## Technisch (Dateien)
- `src/app/pages/AppMessages.tsx` — Prämien-Tile entfernen, neues Einladungs-Panel.
- Neue Komponente `src/app/components/OpenInvitationsPanel.tsx` (mit Cancel-Button).
- `src/app/components/PendingInviteDialog.tsx` — neuer Annahme-Confirm-State.
- `src/app/components/OpenInvitationsBanner.tsx` — 7d-Filter raus oder Komponente nur noch fürs Home-Feed.
- `src/app/pages/AppMerchantDetailV2.tsx` — Boost-Dialog-Text, Google-Review-Karte/Dialog, klickbare Pass-Knoten + Detail-Dialog, "Check-in"-Label.
- `src/pages/InviteRedirect.tsx` — Store-Fallback bei mobilen Geräten ohne App.
- Migration: RPC `cancel_invitation_redemption(p_redemption_id uuid)` (löscht eigene offene Redemption).

Soll ich so loslegen? Insbesondere bestätige bitte:
- (a) DB-seitiges 7-Tage-Bonusfenster ebenfalls aufheben (sonst zahlt der Server den Boost nach 7 Tagen nicht mehr aus, auch wenn UI ihn noch zeigt)?
- (b) Google-Review-Bonus rein als Demo (Frontend-only, localStorage) oder echte Logik (`google_review`-Transaktion + Single-Use pro Merchant in DB)?