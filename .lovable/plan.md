## Drei Bereiche

### 1. Sidebar (`src/components/merchant/MerchantSidebar.tsx`)
- "Mein Geschäft" als Ausklapper komplett entfernen.
- Neu unter **BUSINESS** (flach, beide direkt sichtbar):
  - **Profil** → `/kunde/mein-geschaeft?tab=info`, Icon `Store`
  - **Punktesystem** → `/kunde/mein-geschaeft?tab=karte`, Icon `Package`
- `isActive`-Logik erweitern, damit zwei Items auf demselben Pfad anhand `?tab=` separat aktiv markiert werden.
- Marketing bleibt mit Sub-Items unverändert. Demo-Sidebar zeigt dieselbe Struktur.

### 2. Punktesystem-Seite (`src/pages/merchant/MeinGeschaeft.tsx`, Tab `karte`)
- **Entfernen:** Auto-/Manuell-Toggles, Slider, Variant-Tabs (Ausgewogen/Umsatzboost), farbige Tier-Badges, Beispiel-Einkäufe.
- **Behalten:** Karten-ID-Sektion (unverändert).
- **Neu:** Schlichte Liste mit 3 Kacheln „Karte 1/2/3" (dunkel, kein Farbakzent), Punkte-Wert je Karte als Input, ein einzelner „Speichern"-Button.
- Speichern: setzt `manual_stamp_mode=true`, `stamp_mode='classic'`, schreibt `points_value` der vorhandenen `nfc_chips` (in fester Reihenfolge grün/blau/rot bzw. nach `created_at`).
- Überschrift „Punktesystem" oben im Tab.

### 3. Automatische Onboarding-Seite (`/kunde/willkommen`)
Neue Datei `src/pages/merchant/MerchantOnboarding.tsx`, neue Route in `App.tsx`.

**Auto-Redirect:** `KundeDashboard` prüft beim Laden, ob bereits eine Prämie existiert. Falls 0 → `navigate('/kunde/willkommen', { replace: true })`. Sobald ≥1 Prämie existiert, erscheint die Seite nie wieder. Demo-Onboarding-Tour bleibt davon unberührt.

**Aufbau** (alles auf einer scrollbaren Seite, jede Sektion mit Checkmark wenn erfüllt):
1. **Titelbild & Logo** – inline Uploads (Storage-Bucket `customer-assets`). Titelbild Pflicht, Logo optional.
2. **Karten-ID** – ein Input `XXXXX-XXXXX-XXXXX` (gleiche Format-Logik wie bestehend).
3. **Punktesystem** – Eingabe „Durchschnittsausgabe €" → mit `calculateSuggestion(avg, ['visits'], 'balanced')` werden Punkte für Karte 1/2/3 vorbefüllt (live), beide Werte editierbar.
4. **Bis zu 5 Prämien** – inline Mini-Form (Titel + Punkte + optional Bild), grüner Haken pro angelegter Prämie. Mindestens 1 erforderlich.
5. **Empfehlungspunkte** – ein Number-Input, Default 20.
6. **Neukundenprämie** – Button öffnet inline kleines Formular (Name + Art: Rabatt%/Festbetrag/Gratis-Produkt + Wert).
7. **Öffnungszeiten (optional)** – gleiche UI wie im Profil.
8. **Beschreibung (optional)** – Textarea max 300 Zeichen.

**Speichern-Button** (sticky unten): „🚀 Einrichtung abschließen & loslegen"
- Validiert Pflichtfelder, scrollt bei Fehler zum ersten fehlenden Feld und markiert es rot.
- Persistiert: `customers` (cover_image_url, logo_url, opening_hours, description, stamp_mode='classic', manual_stamp_mode=true, avg_revenue, referral_bonus_points, birthday_enabled=true, birthday_bonus_points=20, recall_enabled=false, google_review_enabled=false).
- Box-ID via `customer_boxes` + lookup in `boxes` (gleiche Logik wie `handleAddBox`).
- Punkte → Update der vorhandenen `nfc_chips` in fester Reihenfolge.
- Prämien → Insert in `rewards`.
- Neukundenprämie → Insert in `new_customer_offers`.
- Anschließend → `navigate('/kunde')`.

### Technisches

- Keine DB-Migration nötig: alle benötigten Spalten (`stamp_mode`, `manual_stamp_mode`, `avg_revenue`, `referral_bonus_points`, `birthday_enabled`, `birthday_bonus_points`, `recall_enabled`, `google_review_enabled`) werden bereits an anderer Stelle im Code beschrieben (Marketing/MeinKonto). Falls eine Spalte beim Speichern fehlt, fange ich den Fehler ab und überspringe sie.
- Falls für die 3 Karten weniger als 3 NFC-Chip-Records existieren (frisches Konto), werden auf der einfachen Punktesystem-Seite Platzhalter angezeigt mit Hinweis „Erst Karten-ID hinterlegen".
- Auf der Onboarding-Seite werden vorhandene Chips nach Erfassung der Karten-ID neu geladen, bevor Punkte zugewiesen werden.

### Geänderte/neue Dateien
- `src/components/merchant/MerchantSidebar.tsx` (Sidebar-Items + isActive)
- `src/pages/merchant/MeinGeschaeft.tsx` (karte-Tab vereinfachen)
- `src/pages/merchant/KundeDashboard.tsx` (Auto-Redirect)
- `src/pages/merchant/MerchantOnboarding.tsx` (neu)
- `src/App.tsx` (neue Route)
