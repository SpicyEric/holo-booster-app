ns# Eloyo V2 – Umsetzung für Backstube König

V2 betrifft ausschließlich den Demo-Merchant **Backstube König**. Alle anderen Händler bleiben auf V1 (App-Anzeige UND Merchant-Backoffice). Gating läuft über `merchant.version === 'v2'` bzw. die bestehende `DEFAULT_DEMO_MERCHANT_CUSTOMER_ID`.

## 1. Terminologie (global gültig für V2)
- "Stempel/Besuch" → **Check-in**
- Schlangen-Seite in der App → **Treuepass**
- Fortschritt durch Empfehlung → **Boost**
- Fortschritt durch Geburtstag → **Geburtstag**

Memory-Eintrag wird angelegt, damit künftige Antworten dieses Wording konsequent verwenden.

## 2. App – Treuepass (`AppMerchantDetailV2.tsx`)

**Beschriftung Knoten**
- Aktueller Knoten: bleibt "Jetzt"
- Vergangene Knoten: Haken (✓) in Markenfarbe in der Mitte, KEINE Zahl mehr im Kreis
- Über jedem vergangenen Knoten Mini-Label: leer (Standard), `Boost` oder `Geburtstag`
- Header-Zähler: zweizeilig "Check-ins" / große Zahl

**Mock-Datenmodell erweitern**
```ts
interface CheckInEntry {
  visitNumber: number;
  source: 'normal' | 'boost' | 'birthday';
}
```
`simulateReferralBoost` markiert den neuen Eintrag als `boost`. Zusätzlicher Sandbox-Button "Geburtstag simulieren" erzeugt einen `birthday`-Eintrag.

**Pre-Activation Flow**
- Tap auf freigeschalteten/zukünftigen Reward-Knoten → Dialog "Beim nächsten Check-in einlösen?"
- Bei Bestätigung: Reward bekommt `activatedForNextCheckIn = true` (visuell goldener Ring/Badge "Aktiviert")
- Nur **eine** Prämie gleichzeitig aktivierbar
- "Check-in simulieren" prüft: gibt es eine aktivierte Prämie? Wenn ja → automatisch einlösen + Erfolgs-Vollbild
- Pro Tag nur ein Check-in (Toast bei Wiederholung)
- "Meine Belohnungen"-Liste und Vollbild-Einlöseansicht für nachträgliches Einlösen werden entfernt – Einlösung passiert ausschließlich über Aktivierung + Check-in

## 3. Markenfarbe pro Händler

**DB-Migration**: Spalten an `merchant_customers` hinzufügen
- `version text default 'v1'` (für V2-Gating, Backstube König wird auf `'v2'` gesetzt)
- `brand_color text` (HEX, z.B. `#FF6B35`)

**Frontend**
- Neuer Hook `useMerchantBrand(merchantId)` liefert `{ color, version }` und stellt CSS-Variablen `--brand`, `--brand-soft`, `--brand-foreground` auf dem Merchant-Scope bereit.
- `AppMerchantDetailV2` ersetzt alle `ORANGE`/`GOLD`-Hardcodes durch `var(--brand)` / abgeleitete Töne.
- BottomNav Scan-Button: liest aktive Brand-Farbe aus Context (gesetzt nur auf Treuepass-Routen), fällt sonst auf Standard-Lila zurück.
- Default-Farbe für alle Händler bleibt Eloyo-Lila.

## 4. Merchant-Backoffice V2 (nur wenn `merchant.version === 'v2'`)

Zentraler Wrapper `useMerchantVersion()` entscheidet pro Seite, welche Variante gerendert wird. Bestehende V1-Komponenten bleiben unverändert.

### 4.1 Profil / `MeinGeschaeft` (Tab "Karte")
- Neuer Block "Markenfarbe" mit **Color Picker** (HEX-Input + visuelles Rad, `react-colorful`)
- Live-Vorschau des Treuepasses rechts daneben (eingebettete `AppMerchantDetailV2`-Vorschau im Phone-Frame, read-only)
- Speichern schreibt `brand_color` und aktualisiert Vorschau sofort

### 4.2 Marketing → Automationen (V2)
- Alles entfernen außer der oberen Info-Karte
- Texte werden in einem späteren Schritt finalisiert (Platzhalter setzen)

### 4.3 Marketing → Neukunden (V2)
- Nur die obere Info-Textkarte rendern, Rest entfernen

### 4.4 Marketing → Empfehlungen (V2)
- Nur die obere Info-Textkarte rendern, Rest entfernen

### 4.5 Marketing → Prämien (V2)
- Bestehende Prämienliste oben behalten
- Darunter Schlangen-Linie (gleiche Optik wie App-Treuepass) als Drop-Zone
- Drag-and-Drop: Prämie aus Liste auf einen Check-in-Knoten ziehen → ordnet `visit_number` zu
- Implementierung: `@dnd-kit/core` (bereits im Projekt verfügbar prüfen, sonst hinzufügen)

## 5. Technische Details

- **DB**: Migration für `version` + `brand_color` auf `merchant_customers`; Backstube König direkt auf `version='v2'`, `brand_color='#FF6B35'` setzen.
- **V1 unangetastet**: alle V2-spezifischen Komponenten leben in `*/v2/`-Unterordnern oder mit `V2`-Suffix. Routing prüft Version und entscheidet.
- **Brand-Color-Verteilung**: über React-Context `MerchantBrandProvider` rund um Treuepass-Route + Merchant-Backoffice-Layout (wenn V2).
- **Sandbox**: alle bestehenden Mock-Buttons im Treuepass bleiben; "Geburtstag simulieren" kommt dazu.

## 6. Reihenfolge der Umsetzung

1. Memory + DB-Migration (`version`, `brand_color`)
2. App-Treuepass: Wording, Haken-Knoten, Boost/Geburtstag-Labels, Mock erweitern
3. Pre-Activation Flow + Entfernung der Belohnungs-Liste/Vollbild
4. Brand-Color-Hook, CSS-Variablen, BottomNav Scan-Button reagiert
5. Merchant-Backoffice Version-Gating
6. Profil-Seite: Color Picker + Live-Vorschau
7. Marketing-Seiten Automationen/Neukunden/Empfehlungen reduzieren
8. Prämien-Seite: Schlange + Drag-and-Drop

Soll ich so loslegen, oder zuerst nur einen Teilbereich (z.B. Punkte 1–4) abschließen, damit du zwischendurch reviewen kannst?
