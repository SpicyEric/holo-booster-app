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

# 6. Android für NFC konfigurieren (setzt Gradle 8.9, SDK-Versionen, Permissions)
node scripts/configure-android-nfc.js

# 7. Web-Build in Android-Projekt synchronisieren
npx cap sync android

# 8. Android Studio öffnen
npx cap open android
```

---

### Updates holen (nach Änderungen in Lovable)

```bash
# 1. In das Projektverzeichnis wechseln
cd holo-booster-app

# 2. Neueste Änderungen von GitHub holen
git pull

# 3. Abhängigkeiten aktualisieren (falls neue Packages)
npm install

# 4. Web-App neu bauen
npm run build

# 5. NFC-Konfiguration erneut ausführen (wichtig bei Gradle-Updates!)
node scripts/configure-android-nfc.js

# 6. Android-Projekt aktualisieren
npx cap sync android

# 7. Android Studio öffnen und Build starten
npx cap open android
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

### 3. Java JDK 17 (WICHTIG: Version 17, NICHT 21!)
- Download: https://adoptium.net/temurin/releases/?version=17
- Wähle: **Windows x64**, **JDK**, **.msi**
- Nach Installation: JAVA_HOME Umgebungsvariable setzen:
  1. Windows-Suche → "Umgebungsvariablen"
  2. "Umgebungsvariablen" klicken
  3. Unter "Systemvariablen" → "Neu"
  4. Name: `JAVA_HOME`
  5. Wert: `C:\Program Files\Eclipse Adoptium\jdk-17.0.x` (dein Pfad)

### 4. Android Studio
- Download: https://developer.android.com/studio
- Nach Installation SDK Manager öffnen und installieren:
  - ✅ Android SDK Platform 34
  - ✅ Android SDK Build-Tools 34
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

### Problem: "Minimum supported Gradle version is 8.9"
**Ursache:** Das Android-Projekt hat eine alte Gradle-Version.
**Lösung:** NFC-Skript erneut ausführen (setzt automatisch Gradle 8.9):
```bash
node scripts/configure-android-nfc.js
npx cap sync android
```
Falls das nicht hilft, Android-Ordner komplett neu erstellen:
```bash
rmdir /s /q android
npx cap add android
node scripts/configure-android-nfc.js
npx cap sync android
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
npx cap open android
```

### Problem: "JAVA_HOME not set" oder Java-Fehler
**Lösung:**
1. Prüfe ob JDK **17** installiert ist (NICHT 21!)
2. Setze JAVA_HOME wie oben beschrieben
3. CMD **komplett schließen** und neu öffnen

### Problem: "git is not recognized"
**Lösung:** Git installieren: https://git-scm.com/download/win, dann CMD neu öffnen.

### Problem: Build funktioniert nicht nach git pull
**Lösung:** Vollständige Neu-Synchronisation:
```bash
npm install
npm run build
node scripts/configure-android-nfc.js
npx cap sync android
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
│   └── configure-android-nfc.js  # Android NFC + Gradle 8.9 Konfiguration
├── android/               # (generiert) Android Studio Projekt
├── capacitor.config.ts    # Capacitor-Konfiguration
└── package.json           # Node-Abhängigkeiten
```

---

## 🛠 Technologie-Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Supabase (Lovable Cloud) |
| Mobile | Capacitor 7 |
| NFC | @capawesome-team/capacitor-nfc (Premium) |
| Gradle | 8.9 (automatisch gesetzt durch configure-android-nfc.js) |

---

## 📱 App-Infos

- **Package ID:** `com.eloyo.app`
- **App Name:** Eloyo
- **Minimum Android:** API 24 (Android 7.0)
- **Target Android:** API 34 (Android 14)
- **Gradle Version:** 8.9 (wird automatisch gesetzt)

---

## 🔗 Nützliche Links

- Lovable Docs: https://docs.lovable.dev/
- Capacitor Docs: https://capacitorjs.com/docs
- Android Studio: https://developer.android.com/studio
