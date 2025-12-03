# Capacitor NFC Setup für iOS & Android

## Voraussetzungen

1. Projekt auf GitHub exportieren
2. Lokal klonen: `git clone <repo-url>`
3. Dependencies installieren: `npm install`

## Capacitor Setup

```bash
# Capacitor CLI installieren (falls nicht vorhanden)
npm install @capacitor/cli @capacitor/core

# NFC Plugin installieren
npm install @capawesome-team/capacitor-nfc

# iOS und Android Plattformen hinzufügen
npx cap add ios
npx cap add android

# Projekt bauen und synchronisieren
npm run build
npx cap sync

# ⭐ AUTOMATISCHE iOS NFC Konfiguration
node scripts/configure-ios-nfc.js
```

## Automatische Skripte

Das Projekt enthält automatische Konfigurationsskripte:

### `scripts/configure-ios-nfc.js`
Konfiguriert automatisch alle iOS NFC-Berechtigungen:
- Info.plist Einträge
- App.entitlements

```bash
# Manuell ausführen
node scripts/configure-ios-nfc.js

# Oder nach jedem cap sync
npx cap sync && node scripts/capacitor-hooks.js
```

### `scripts/capacitor-hooks.js`
Post-Sync Hook für iOS und Android Konfiguration.

## iOS-spezifische Konfiguration

### 1. Info.plist Einträge

Öffne `ios/App/App/Info.plist` und füge folgende Einträge hinzu:

```xml
<!-- NFC Berechtigung - Nutzer-Erklärung -->
<key>NFCReaderUsageDescription</key>
<string>Diese App nutzt NFC um Treuepunkte bei teilnehmenden Händlern zu sammeln.</string>

<!-- ISO7816 Tag Identifiers (für kontaktlose Karten) -->
<key>com.apple.developer.nfc.readersession.iso7816.select-identifiers</key>
<array>
    <string>D276000085010100</string>
</array>

<!-- FeliCa System Codes (für bestimmte NFC Tags) -->
<key>com.apple.developer.nfc.readersession.felica.systemcodes</key>
<array>
    <string>0000</string>
</array>
```

### 2. App Entitlements

Öffne `ios/App/App/App.entitlements` und füge hinzu:

```xml
<key>com.apple.developer.nfc.readersession.formats</key>
<array>
    <string>NDEF</string>
    <string>TAG</string>
</array>
```

### 3. Xcode Capabilities

1. Öffne das Projekt in Xcode: `npx cap open ios`
2. Wähle das App-Target
3. Gehe zu "Signing & Capabilities"
4. Klicke auf "+ Capability"
5. Füge "Near Field Communication Tag Reading" hinzu

### 4. Apple Developer Account

- Stelle sicher, dass dein Apple Developer Account NFC-Berechtigung hat
- Das App Bundle ID muss mit dem Provisioning Profile übereinstimmen

## Android-spezifische Konfiguration

### AndroidManifest.xml

Die NFC-Berechtigungen werden automatisch vom Plugin hinzugefügt. Überprüfe `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.NFC" />
<uses-feature android:name="android.hardware.nfc" android:required="false" />
```

### Intent Filter (optional, für automatisches Öffnen)

Falls die App automatisch bei NFC-Scan öffnen soll:

```xml
<intent-filter>
    <action android:name="android.nfc.action.NDEF_DISCOVERED"/>
    <category android:name="android.intent.category.DEFAULT"/>
    <data android:mimeType="application/vnd.eloyo.stamp"/>
</intent-filter>
```

## App starten

```bash
# iOS Simulator/Gerät
npx cap run ios

# Android Emulator/Gerät
npx cap run android
```

## Debugging

### iOS NFC Debugging
- NFC funktioniert nur auf echten Geräten (iPhone 7+)
- Der iOS Simulator unterstützt kein NFC
- Stelle sicher, dass NFC in den iPhone-Einstellungen aktiviert ist

### Android NFC Debugging
- Android Emulator unterstützt NFC-Simulation
- Teste auf echtem Gerät für beste Ergebnisse
- Prüfe ob NFC in den Android-Einstellungen aktiviert ist

## Häufige Fehler

### "NFC nicht unterstützt"
- iOS: Gerät muss iPhone 7 oder neuer sein
- Android: Gerät benötigt NFC-Hardware

### "NFC ist deaktiviert"
- Nutzer muss NFC in den Geräteeinstellungen aktivieren
- Die App bietet einen Button um Einstellungen zu öffnen

### iOS Build-Fehler
- Prüfe ob alle Info.plist Einträge korrekt sind
- Stelle sicher, dass Entitlements konfiguriert sind
- Überprüfe das Provisioning Profile
