# Capacitor NFC Setup für iOS & Android (Capacitor 7)

## Voraussetzungen

| Anforderung | Version |
|-------------|---------|
| Node.js | 20.x LTS |
| Java JDK | **21** (Temurin) |
| Capacitor | 7.x |
| Gradle | 8.11.1 |
| AGP | 8.7.2 |
| Android SDK | compileSdk 35, targetSdk 35, minSdk 24 |
| NFC Plugin | @capawesome-team/capacitor-nfc v7.3.0 |

## Erstinstallation

```bash
# 1. Projekt klonen und Dependencies installieren
git clone <repo-url>
cd holo-booster-app
npm install

# 2. Web-App bauen
npm run build

# 3. Plattformen hinzufügen
npx cap add android
npx cap add ios   # optional, nur auf macOS

# 4. Plattform-spezifische Konfiguration
node scripts/configure-android-nfc.js   # Android: NFC, Gradle, JDK 21, SDK 35
node scripts/configure-ios-nfc.js       # iOS: Info.plist, Entitlements

# 5. Synchronisieren
npx cap sync

# 6. WICHTIG: Patches erneut anwenden (sync überschreibt manche Änderungen)
node scripts/configure-android-nfc.js

# 7. Öffnen
npx cap open android   # oder: npx cap open ios
```

## Automatische Skripte

### `scripts/configure-android-nfc.js`
Konfiguriert automatisch das gesamte Android-Projekt:
- **Gradle Wrapper** → 8.11.1
- **gradle.properties** → AndroidX, Jetifier, Build Config
- **app/build.gradle** → compileSdk 35, targetSdk 35, Java 21
- **Plugin Gradle-Dateien** → Java/Kotlin 21 erzwungen (node_modules + android/)
- **AndroidManifest.xml** → NFC Permissions, Intent-Filter
- **nfc_tech_filter.xml** → Alle NFC-Tag-Typen
- **MainActivity.java/kt** → Capawesome NFC Plugin Registrierung

### `scripts/configure-ios-nfc.js`
Konfiguriert automatisch alle iOS NFC-Berechtigungen:
- Info.plist Einträge (NFC + Geolocation)
- App.entitlements (NFC Reader Session Formats)

### `scripts/cap-run-android.js`
Automatisierter Build+Run Workflow:
```bash
node scripts/cap-run-android.js
# Führt aus: cap sync → configure-android-nfc.js → cap run android --no-sync
```

### `scripts/capacitor-hooks.js`
Post-Sync Hook für beide Plattformen:
```bash
npx cap sync && node scripts/capacitor-hooks.js
```

## Android-spezifische Konfiguration

### Automatische Konfiguration (empfohlen)

```bash
node scripts/configure-android-nfc.js
```

### Was das Skript konfiguriert:

1. **AndroidManifest.xml Permissions:**
   - `android.permission.NFC`
   - `android.permission.ACCESS_FINE_LOCATION`
   - `android.permission.ACCESS_COARSE_LOCATION`
   - `android.permission.POST_NOTIFICATIONS`
   - `android.permission.VIBRATE`

2. **NFC Intent-Filter für Auto-Launch:**
   ```xml
   <intent-filter>
       <action android:name="android.nfc.action.NDEF_DISCOVERED"/>
       <category android:name="android.intent.category.DEFAULT"/>
       <data android:mimeType="text/plain"/>
   </intent-filter>
   <intent-filter>
       <action android:name="android.nfc.action.TECH_DISCOVERED"/>
   </intent-filter>
   <intent-filter>
       <action android:name="android.nfc.action.TAG_DISCOVERED"/>
       <category android:name="android.intent.category.DEFAULT"/>
   </intent-filter>
   ```

3. **NFC Tech Filter** (`android/app/src/main/res/xml/nfc_tech_filter.xml`)

4. **MainActivity NFC Registration** (Fallback für Plugin-Autoloading)

## iOS-spezifische Konfiguration

### Automatisch (via configure-ios-nfc.js):
- `NFCReaderUsageDescription` in Info.plist
- ISO7816 Select Identifiers
- FeliCa System Codes
- NFC Reader Session Formats in App.entitlements
- Location Usage Descriptions

### Manuell in Xcode:
1. Öffne: `npx cap open ios`
2. Wähle App-Target → "Signing & Capabilities"
3. "+" → "Near Field Communication Tag Reading"
4. Stelle sicher, dass Provisioning Profile NFC unterstützt

## NFC Berechtigungs-Flow in der App

### Android
- **NFC hat kein natives Permission-Popup** – es ist ein System-Toggle (an/aus)
- Beim App-Start und vor jedem Scan: `nfcService.isEnabled()` wird geprüft
- Wenn NFC **deaktiviert**: `NfcPermissionDialog` erscheint sofort
- Dialog bietet "Einstellungen öffnen" → öffnet NFC-Settings via `capacitor-native-settings`

### iOS
- NFC wird über `NFCReaderSession` angefragt
- iOS zeigt automatisch ein natives Scan-Sheet
- NFC kann auf iOS nicht systemweit deaktiviert werden

## Debugging

### Android NFC Debugging
- NFC auf Android Emulator: Begrenzt (empfohlen: echtes Gerät)
- Prüfe NFC in Android-Einstellungen
- Logcat Filter: `[NFC]` für App-Logs

### iOS NFC Debugging
- NFC nur auf echten Geräten (iPhone 7+)
- iOS Simulator unterstützt kein NFC

## Häufige Fehler

| Fehler | Lösung |
|--------|--------|
| "NFC plugin is not implemented" | `node scripts/configure-android-nfc.js` (registriert Plugin in MainActivity) |
| "Minimum Gradle version is 8.x" | `node scripts/configure-android-nfc.js` (setzt Gradle 8.11.1) |
| "JAVA_HOME not set" | JDK 21 installieren, JAVA_HOME setzen, CMD neu öffnen |
| "compileSdk version mismatch" | `node scripts/configure-android-nfc.js` (setzt SDK 35) |
| "NFC nicht unterstützt" | Gerät hat keine NFC-Hardware |
| "NFC ist deaktiviert" | NFC in Geräteeinstellungen aktivieren |
