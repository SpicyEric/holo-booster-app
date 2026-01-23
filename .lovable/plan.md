
# App Release-Ready Plan: Premium NFC Plugin Integration

## Übersicht

Dieser Plan ersetzt das instabile Beta-Plugin `@monaca/capacitor-nfc-reader` durch das Premium-Plugin `@capawesome-team/capacitor-nfc` und macht die App vollständig release-ready für Android und iOS.

---

## Dein License Key

```
POLAR-FA3A18F4-A45F-4DAF-8A58-EF5DCA0E53D8
```

Dieser Key wird für den Zugriff auf die private NPM Registry verwendet.

---

## Änderungen im Überblick

### Neue Dateien
| Datei | Beschreibung |
|-------|-------------|
| `.npmrc` | Konfiguration für private Capawesome NPM Registry |

### Geänderte Dateien
| Datei | Änderung |
|-------|----------|
| `package.json` | Altes NFC Plugin entfernen, neues Premium Plugin hinzufügen |
| `src/app/services/nfcService.ts` | Komplett neu geschrieben für Premium Plugin API |
| `scripts/configure-android-nfc.js` | Erweiterte Permissions (Background Location optional) |

### Unveränderte Dateien
Diese Dateien nutzen bereits den nfcService und brauchen keine Änderungen:
- `src/app/pages/AppScan.tsx`
- `src/app/hooks/useRewardRedemption.ts`
- `src/app/hooks/useNewCustomerOfferRedemption.ts`
- `scripts/configure-ios-nfc.js` (bereits korrekt konfiguriert)

---

## Phase 1: NPM Registry & Plugin Setup

### 1.1 Neue Datei: `.npmrc`

Erstellt die NPM Registry-Konfiguration für das private Capawesome Plugin:

```text
@capawesome-team:registry=https://npm.nicoschmitt.dev
//npm.nicoschmitt.dev/:_authToken=POLAR-FA3A18F4-A45F-4DAF-8A58-EF5DCA0E53D8
```

### 1.2 Package.json Änderungen

**Entfernen:**
```json
"@monaca/capacitor-nfc-reader": "^0.0.1-beta.1"
```

**Hinzufügen:**
```json
"@capawesome-team/capacitor-nfc": "^7.0.0"
```

---

## Phase 2: NFC Service Neuschreibung

Der `nfcService.ts` wird komplett neu geschrieben für die Premium Plugin API.

### Neue Features des Premium Plugins:
- Stabilere NFC Session-Verwaltung
- Bessere iOS Unterstützung (Alert-Nachrichten)
- Saubere Event-basierte Architektur
- Zuverlässigere NDEF-Verarbeitung

### API-Unterschiede:

```text
+--------------------------------+----------------------------------+
|  Altes Plugin (Monaca Beta)   |  Neues Plugin (Capawesome Pro)   |
+--------------------------------+----------------------------------+
| import { NFCReader }           | import { Nfc }                   |
| NFCReader.startScan()          | Nfc.startScanSession()           |
| NFCReader.stopScan()           | Nfc.stopScanSession()            |
| addListener('nfcTagDetected')  | addListener('nfcTagScanned')     |
| NFCReader.isEnabled()          | Nfc.isSupported() / isEnabled()  |
| NFCReader.openSettings()       | Nfc.openSettings()               |
+--------------------------------+----------------------------------+
```

### Neue NFC Service Struktur:

```text
nfcService.ts
├── isSupported()        → Prüft ob NFC Hardware vorhanden
├── isEnabled()          → Prüft ob NFC aktiviert ist (Android)
├── openSettings()       → Öffnet NFC Einstellungen
├── startScan(callback)  → Startet NFC Session mit iOS Alert
│   ├── Native: Capawesome Plugin
│   └── Web: NDEFReader Fallback
├── stopScan()           → Beendet NFC Session sauber
├── validateChipData()   → Validiert BOXID:FARBE Format
└── decodeNdefPayload()  → Dekodiert NDEF Text Records
```

### NDEF Verarbeitung:

Das neue Plugin liefert NDEF Records strukturierter:

```text
NfcTag Event
├── id: string (Tag Serial Number)
├── techTypes: string[] (NfcA, Ndef, etc.)
└── message: NdefMessage
    └── records: NdefRecord[]
        ├── type: string ("T" für Text)
        ├── payload: number[] (Rohdaten)
        └── Dekodierung → "T3K8M-N2P5R-W7Y9Q:grün"
```

---

## Phase 3: Android Konfiguration

### 3.1 configure-android-nfc.js Erweiterungen

Das bestehende Script wird erweitert um sicherzustellen, dass alle Permissions korrekt gesetzt sind:

```text
Permissions (bereits vorhanden):
├── NFC
├── INTERNET
├── ACCESS_FINE_LOCATION
├── ACCESS_COARSE_LOCATION
├── POST_NOTIFICATIONS
└── VIBRATE

Neu hinzufügen:
└── (keine neuen erforderlich - alles bereits konfiguriert)
```

### 3.2 NFC Intent Filter

Bereits korrekt konfiguriert für:
- `NDEF_DISCOVERED` (Eloyo NDEF Tags)
- `TECH_DISCOVERED` (Alle Tag-Typen)
- `TAG_DISCOVERED` (Fallback)

---

## Phase 4: iOS Konfiguration

### 4.1 Info.plist (automatisch via Script)

Bereits konfiguriert:
- `NFCReaderUsageDescription`: "Diese App nutzt NFC um Treuepunkte bei teilnehmenden Händlern zu sammeln."
- ISO7816 Select Identifiers
- Location Permissions

### 4.2 App.entitlements

Bereits konfiguriert:
- NFC Reader Session Formats (NDEF, TAG)

### 4.3 Manuelle Xcode-Schritte (für dich nach Build)

1. Öffne Xcode nach `npx cap open ios`
2. Wähle das Target "App"
3. Gehe zu "Signing & Capabilities"
4. Klicke "+" und füge hinzu:
   - "Near Field Communication Tag Reading"
5. Stelle sicher, dass dein Provisioning Profile NFC unterstützt

---

## Technische Details

### Capawesome Plugin Lizenz-Aktivierung

Das Plugin prüft die Lizenz automatisch beim ersten Start. Die Lizenz ist an deine Polar.sh Subscription gebunden und gilt für bis zu 3 kommerzielle Apps.

### Kapazitor Versionskompatiblität

```text
Plugin Version  │  Capacitor Version
────────────────┼────────────────────
@capawesome v7  │  Capacitor 6.x, 7.x
@capacitor/core │  ^7.4.4 (aktuell)
────────────────┴────────────────────
```

### Web Fallback

Für Browser-Tests bleibt der Web NFC API Fallback erhalten (`NDEFReader`), aber im Produktionsbetrieb auf Android/iOS wird ausschließlich das Premium Plugin verwendet.

---

## Build-Ablauf nach Implementierung

Nach Genehmigung des Plans führst du diese Schritte aus:

```text
1. git pull                           # Änderungen holen
2. npm install                        # Neues Plugin installieren
3. npm run build                      # Projekt bauen
4. npx cap add android                # (falls nicht vorhanden)
5. npx cap add ios                    # (falls nicht vorhanden)
6. node scripts/configure-android-nfc.js
7. node scripts/configure-ios-nfc.js
8. npx cap sync                       # Native Projekte synchronisieren
9. npx cap open android               # Android Studio öffnen
10. npx cap open ios                  # Xcode öffnen
```

### In Android Studio:
- Build → Make Project
- Build → Build Bundle(s) / APK(s) → Build APK

### In Xcode:
- Signing & Capabilities → NFC Capability hinzufügen
- Product → Build

---

## Zusammenfassung der Änderungen

| # | Datei | Aktion | Zeilen |
|---|-------|--------|--------|
| 1 | `.npmrc` | Neu erstellen | ~3 |
| 2 | `package.json` | Plugin austauschen | ~2 |
| 3 | `src/app/services/nfcService.ts` | Komplett neu | ~350 |
| 4 | `scripts/configure-android-nfc.js` | Kleine Erweiterung | ~10 |

**Geschätzte Implementierungszeit:** ~5 Minuten

Nach Genehmigung werde ich alle Änderungen durchführen und das Premium NFC Plugin integrieren.
