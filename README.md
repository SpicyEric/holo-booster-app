# Eloyo - Android App Build-Anleitung

## 🎯 Schnellstart (Kopier-fertige Befehle)

### Erstinstallation (einmalig)

Öffne **CMD** oder **PowerShell** und führe diese Befehle **nacheinander** aus:

```bash
# 1. Repository klonen (ersetze URL mit deiner aus Lovable Settings → GitHub)
git clone https://github.com/DEIN-USERNAME/holo-booster-app.git

# 2. In das Projektverzeichnis wechseln
cd holo-booster-app

# 3. Alle Node-Abhängigkeiten installieren
npm install

# 4. Web-App bauen (erzeugt /dist Ordner)
npm run build

# 5. Android-Plattform hinzufügen (NUR beim ersten Mal!)
npx cap add android

# 6. Android für NFC konfigurieren (setzt Gradle 8.11.1, JDK 21, SDK 35, Permissions)
node scripts/configure-android-nfc.js

# 7. Web-Build in Android-Projekt synchronisieren
npx cap sync android

# 8. NFC-Patches erneut anwenden (sync kann Patches überschreiben!)
node scripts/configure-android-nfc.js

# 9. Android Studio öffnen
npx cap open android
```

---

### Updates holen (nach Änderungen in Lovable)

```bash
# 1. In das Projektverzeichnis wechseln
cd holo-booster-app

# 2. Neueste Änderungen von GitHub holen
#    (Bei Konflikten in package-lock.json: git checkout -- package-lock.json)
git pull

# 3. Abhängigkeiten aktualisieren (falls neue Packages)
npm install

# 4. Web-App neu bauen
npm run build

# 5. Android-Projekt aktualisieren
npx cap sync android

# 6. NFC-Konfiguration + Java 21 Patches erneut anwenden (WICHTIG nach jedem sync!)
node scripts/configure-android-nfc.js

# 7. Android Studio öffnen und Build starten
npx cap open android
```

**Alternativ** kannst du auch das Automatik-Script nutzen (macht sync + patches + run in einem):
```bash
node scripts/cap-run-android.js
```

---

## 📋 Voraussetzungen (einmalig installieren)

### 1. Git für Windows
- Download: https://git-scm.com/download/win
- Installiere mit Standardeinstellungen
- Nach Installation: CMD/PowerShell **neu öffnen**

### 2. Node.js (LTS-Version)
- Download: https://nodejs.org/
- Empfohlen: Version 20.x LTS
- Installiere mit Standardeinstellungen

### 3. Java JDK 21 (WICHTIG: Version 21!)
- Download: https://adoptium.net/temurin/releases/?version=21
- Wähle: **Windows x64**, **JDK**, **.msi**
- Nach Installation: JAVA_HOME Umgebungsvariable setzen:
  1. Windows-Suche → "Umgebungsvariablen"
  2. "Umgebungsvariablen" klicken
  3. Unter "Systemvariablen" → "Neu"
  4. Name: `JAVA_HOME`
  5. Wert: `C:\Program Files\Eclipse Adoptium\jdk-21.0.x` (dein Pfad)
- **Prüfen:** Öffne CMD und tippe `java -version` → sollte 21.x.x zeigen

### 4. Android Studio
- Download: https://developer.android.com/studio
- Nach Installation SDK Manager öffnen und installieren:
  - ✅ Android SDK Platform 35 (Android 15)
  - ✅ Android SDK Build-Tools 35
  - ✅ Android SDK Command-line Tools

---

## 🔧 In Android Studio (nach `npx cap open android`)

1. **Warte** bis Gradle-Sync abgeschlossen ist (kann 1-5 Min dauern)
2. Falls Fehler erscheinen: **File → Sync Project with Gradle Files**
3. **Build → Make Project** oder **Run → Run 'app'**
4. Wähle dein verbundenes Android-Gerät oder Emulator
5. APK wird gebaut und auf Gerät installiert

---

## ⚠️ Fehlerbehebung

### Problem: "Minimum supported Gradle version is 8.11.1"
**Ursache:** Das Android-Projekt hat eine alte Gradle-Version.
**Lösung:** NFC-Skript erneut ausführen (setzt automatisch Gradle 8.11.1):
```bash
node scripts/configure-android-nfc.js
npx cap sync android
node scripts/configure-android-nfc.js
```
Falls das nicht hilft, Android-Ordner komplett neu erstellen:
```bash
rmdir /s /q android
npx cap add android
node scripts/configure-android-nfc.js
npx cap sync android
node scripts/configure-android-nfc.js
npx cap open android
```

### Problem: "could not determine executable to run"
**Lösung:** Capacitor CLI fehlt. Führe aus:
```bash
npm install
```

### Problem: "Gradle version incompatible" oder andere Build-Fehler
**Lösung:** Android-Ordner komplett neu erstellen:
```bash
rmdir /s /q android
npx cap add android
node scripts/configure-android-nfc.js
npx cap sync android
node scripts/configure-android-nfc.js
npx cap open android
```

### Problem: "JAVA_HOME not set" oder Java-Fehler
**Lösung:**
1. Prüfe ob JDK **21** installiert ist
2. Setze JAVA_HOME wie oben beschrieben
3. CMD **komplett schließen** und neu öffnen
4. Prüfe: `java -version` sollte 21.x.x zeigen

### Problem: Build funktioniert nicht nach git pull
**Lösung:** Vollständige Neu-Synchronisation:
```bash
npm install
npm run build
npx cap sync android
node scripts/configure-android-nfc.js
```

### Problem: "NFC plugin is not implemented on android"
**Lösung:** Das NFC-Plugin wurde nicht korrekt registriert:
```bash
node scripts/configure-android-nfc.js
```
Das Skript fügt automatisch die manuelle Registrierung in `MainActivity.java` hinzu.

### Problem: package-lock.json Konflikte bei git pull
**Lösung:**
```bash
git checkout -- package-lock.json
git pull
npm install
```

---

## 📁 Projektstruktur

```
holo-booster-app/
├── src/                    # React/TypeScript Quellcode
│   ├── app/               # End-Kunden App (/app/* Routes)
│   ├── pages/             # Web-Seiten
│   └── components/        # UI-Komponenten
├── public/                 # Statische Assets
├── supabase/              # Edge Functions (Backend)
├── scripts/               # Build-Skripte
│   ├── configure-android-nfc.js  # Android NFC + Gradle 8.11.1 + JDK 21 Konfiguration
│   ├── configure-ios-nfc.js      # iOS NFC + Geolocation Konfiguration
│   ├── capacitor-hooks.js        # Post-Sync Hooks
│   └── cap-run-android.js        # Automatisiertes Build + Run
├── android/               # (generiert) Android Studio Projekt
├── capacitor.config.ts    # Capacitor-Konfiguration
└── package.json           # Node-Abhängigkeiten
```

---

## 🛠 Technologie-Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Lovable Cloud |
| Mobile | Capacitor 7 |
| NFC | @capawesome-team/capacitor-nfc v7.3.0 (Premium) |
| Java | JDK 21 (Temurin) |
| Gradle | 8.11.1 + AGP 8.7.2 |
| Android SDK | compileSdk 35, targetSdk 35, minSdk 24 |

---

## 📱 App-Infos

- **Package ID:** `com.eloyo.app`
- **App Name:** Eloyo
- **Minimum Android:** API 24 (Android 7.0)
- **Target Android:** API 35 (Android 15)
- **Gradle Version:** 8.11.1 (wird automatisch gesetzt)
- **AGP Version:** 8.7.2 (wird automatisch gesetzt)
- **Java Version:** 21 (wird automatisch erzwungen)

---

## 🔗 Nützliche Links

- Lovable Docs: https://docs.lovable.dev/
- Capacitor Docs: https://capacitorjs.com/docs
- Android Studio: https://developer.android.com/studio
- Adoptium JDK 21: https://adoptium.net/temurin/releases/?version=21
