## Ziel

Im Vertriebler-Bereich einen vollwertigen "Demo-Abschluss"-Übungsmodus bauen und die Academy-Sidebar aufräumen.

## 1. Sidebar Academy umbauen

Aktuell hat Academy 5 Unterpunkte (Wie funktioniert eloyo, Box, Kunden, Abschluss, Verkauf). Diese werden ersetzt durch nur 3 Einträge:

- **Quick Onboarding** → führt zur bestehenden Academy-Seite (`/vertriebler/academy`); die Tabs oben bleiben erhalten und werden dort durchgeklickt.
- **Demo Abschluss** → `/vertriebler/demo-abschluss` (neu)
- **Demo Merchant** → triggert den vorhandenen `enableDemoMerchant`-Flow

Der goldene "Demo Merchant"-Button am unteren Rand der Sidebar wird entfernt.

## 2. Neue Seite: Demo Abschluss (`/vertriebler/demo-abschluss`)

### Schritt A — Vorausgefüllter Checkout
- Eigene Demo-Variante des Checkout-Bildschirms (kein echter `CheckoutForm`-Submit).
- Felder vorausgefüllt mit "Backstube König"-Beispieldaten (Firma, Inhaber Vorname/Nachname, Demo-Email, Adresse, Telefon, 1 Standort, Starterbox).
- Hinweis-Banner oben: „Demo-Modus – es werden keine echten Daten gespeichert."
- Der CTA „Kunde abschließen" pulsiert/blinkt mit Pfeil-Animation und Tooltip „Hier geht's weiter →".

### Schritt B — Stripe-Simulation
- Klick öffnet eine Modal/Übergangsanzeige: „Jetzt würde der Stripe-Checkout starten…" mit Lade-Animation, ca. 1,5 s, dann „Zahlung erfolgreich (Demo)".
- Kein realer Stripe-Aufruf, kein DB-Insert.

### Schritt C — Geführte Einrichtung im Merchant-Bereich
- Aktiviert den bestehenden Demo-Merchant-Modus (`enableDemoMerchant` mit Backstube König) → Schreibvorgänge sind ohnehin durch den DemoWriteGuard blockiert.
- Navigiert zu `/kunde` (Merchant Dashboard).
- Setzt ein zusätzliches localStorage-Flag `eloyo:demo-onboarding-tour` mit aktuellem Step.
- Ein **goldener Top-Banner** (über dem bestehenden Demo-Banner) zeigt Step-für-Step-Anweisungen mit Fortschrittsanzeige (z. B. „Schritt 2 von 6") und einem „Erledigt – weiter →"-Button.

### Tour-Schritte
1. „Klicke links auf **Mein Geschäft** und öffne den Tab **System**."
2. „Trage im Bereich Karten-ID die folgende Demo-Karten-ID ein: **DEMO-0421-AB**."
3. „Wechsle in den Tab **Punkte** und stelle die Werte ein: Klein 10, Mittel 30, Groß 60."
4. „Lege im Tab **Prämien** drei Prämien fest (Erste, Mittlere, Top)."
5. „Aktiviere die **Neukundenprämie** und setze den Weiterempfehlungs-Bonus."
6. Abschluss-Karte: „**Perfekt!** Dein Demo-Kunde ist optimal eingerichtet. Mache jetzt 1–2 Trainingsdurchläufe direkt mit deinem Kunden vor Ort." Buttons: „Tour beenden" (deaktiviert Demo-Modus) / „Tour neu starten".

Steps werden über einfaches Pattern-Matching der aktuellen Route + DOM-Heuristik weitergeschaltet, alternativ manuell per „Erledigt"-Button (immer verfügbar als Fallback). Erstimplementierung: manuelles Weiterschalten — robust und framework-agnostisch.

## 3. Demo-Abschluss verlassen

- Tour-Banner enthält ein „X – Tour abbrechen" das `eloyo:demo-onboarding-tour` löscht und Demo-Merchant-Modus deaktiviert (zurück zu `/vertriebler`).
- Bestehender amber `DemoMerchantBanner` bleibt unverändert — der Tour-Banner liegt **darüber** (höherer z-index) wenn Tour aktiv.

## Technische Änderungen

| Datei | Änderung |
|---|---|
| `src/components/salesrep/SalesRepSidebar.tsx` | Academy-Gruppe auf 3 Einträge reduzieren; Demo-Merchant-Button unten entfernen; Demo-Merchant-Item triggert `enableDemoMerchant` direkt |
| `src/pages/salesrep/SalesRepDemoAbschluss.tsx` | **Neu** — Checkout-Demo + Stripe-Simulation + Start der Tour |
| `src/lib/demoOnboardingTour.ts` | **Neu** — localStorage-Helper (start/step/end) + Event |
| `src/hooks/useDemoOnboardingTour.ts` | **Neu** — Hook für aktuellen Step |
| `src/components/DemoOnboardingTourBanner.tsx` | **Neu** — Goldener Top-Banner mit Step-Inhalt, Fortschritt, „Weiter"/„Abbrechen" |
| `src/components/MerchantLayout.tsx` | Tour-Banner einbinden (oberhalb DemoMerchantBanner) |
| `src/App.tsx` | Route `/vertriebler/demo-abschluss` registrieren |

Kein DB-Migrations-, kein Edge-Function-, kein Stripe-Aufruf. Reines Frontend.