# Eloyo - Lokaler Entwicklungs- und Android-Build-Workflow

## Repository-Informationen

**GitHub Repository URL (HTTPS):**
```
https://github.com/[DEIN-GITHUB-USERNAME]/holo-booster-app.git
```

> **Hinweis:** Du findest die exakte URL in Lovable unter **Settings → GitHub**. Falls noch nicht verbunden, klicke dort auf "Connect to GitHub" und dann "Create Repository".

---

## Voraussetzungen (einmalig installieren)

### 1. Git für Windows installieren
Download: https://git-scm.com/download/win
- Installiere mit Standardeinstellungen
- Nach Installation: CMD/PowerShell neu öffnen

### 2. Node.js installieren
Download: https://nodejs.org/ (LTS-Version empfohlen, z.B. 20.x)
- Installiere mit Standardeinstellungen

### 3. Android Studio installieren
Download: https://developer.android.com/studio
- Installiere mit Standard-SDK
- Öffne SDK Manager und installiere:
  - Android SDK Platform 34
  - Android SDK Build-Tools 34
  - Android SDK Command-line Tools

### 4. Java JDK 17 installieren (WICHTIG: Version 17, NICHT 21!)
Download: https://adoptium.net/temurin/releases/?version=17
- Wähle: Windows x64, JDK, .msi
- Nach Installation: Setze JAVA_HOME Umgebungsvariable auf JDK-17-Pfad

---

## Erstinstallation (einmalig)

Öffne **CMD** oder **PowerShell** und führe folgende Befehle aus:

```bash
# 1. Repository klonen (URL aus Lovable Settings → GitHub kopieren!)
git clone https://github.com/[DEIN-USERNAME]/holo-booster-app.git

# 2. In das Projektverzeichnis wechseln
cd holo-booster-app

# 3. Node-Abhängigkeiten installieren
npm install

# 4. Web-App bauen (erzeugt /dist Ordner)
npm run build

# 5. Android-Plattform hinzufügen
npx cap add android

# 6. Android-Projekt konfigurieren (Gradle/Kotlin-Versionen etc.)
node scripts/configure-android-nfc.js

# 7. Web-Build nach Android synchronisieren
npx cap sync android

# 8. Android Studio öffnen
npx cap open android
```

### In Android Studio:
1. Warte bis Gradle-Sync abgeschlossen ist
2. Falls Fehler: **File → Sync Project with Gradle Files**
3. **Build → Make Project** oder **Run → Run 'app'**
4. Wähle dein verbundenes Android-Gerät oder Emulator

---

## Spätere Updates (regelmäßig)

Wenn du neue Änderungen aus Lovable holen willst:

```bash
# 1. In das Projektverzeichnis wechseln
cd holo-booster-app

# 2. Neueste Änderungen von GitHub holen
git pull

# 3. Falls neue Abhängigkeiten hinzugefügt wurden
npm install

# 4. Web-App neu bauen
npm run build

# 5. Android-Projekt aktualisieren
npx cap sync android

# 6. (Optional) Gradle-Konfiguration neu anwenden falls Probleme auftreten
node scripts/configure-android-nfc.js

# 7. Android Studio öffnen und Build starten
npx cap open android
```

---

## Schnellreferenz: Alle Befehle

| Aktion | Befehl |
|--------|--------|
| Repository klonen | `git clone <URL>` |
| Abhängigkeiten installieren | `npm install` |
| Web-App bauen | `npm run build` |
| Android-Plattform hinzufügen | `npx cap add android` |
| Android konfigurieren | `node scripts/configure-android-nfc.js` |
| Android synchronisieren | `npx cap sync android` |
| Android Studio öffnen | `npx cap open android` |
| Updates holen | `git pull` |

---

## Fehlerbehebung

### "Gradle version incompatible" Fehler
```bash
# Android-Ordner löschen und neu erstellen
rmdir /s /q android
npx cap add android
node scripts/configure-android-nfc.js
npx cap sync android
```

### "git is not recognized" Fehler
Git für Windows installieren: https://git-scm.com/download/win
Dann CMD/PowerShell neu öffnen.

### "JAVA_HOME not set" oder Java-Version-Fehler
1. JDK 17 installieren (NICHT Version 21!)
2. Umgebungsvariable JAVA_HOME setzen auf z.B. `C:\Program Files\Eclipse Adoptium\jdk-17.0.x`
3. CMD neu öffnen

### Build funktioniert nicht nach git pull
```bash
npm install
npm run build
node scripts/configure-android-nfc.js
npx cap sync android
```

---

## Projektstruktur

```
holo-booster-app/
├── src/                    # React/TypeScript Quellcode
│   ├── app/               # End-Kunden App (/app/* Routes)
│   ├── pages/             # Web-Seiten
│   └── components/        # UI-Komponenten
├── public/                 # Statische Assets
├── supabase/              # Edge Functions
├── scripts/               # Build-Skripte (Android-Konfiguration)
├── android/               # (generiert) Android-Projekt
├── capacitor.config.ts    # Capacitor-Konfiguration
├── package.json           # Node-Abhängigkeiten
└── vite.config.ts         # Vite Build-Konfiguration
```

> **Hinweis:** Der `android/` Ordner wird durch `npx cap add android` generiert und muss nach Problemen komplett neu erstellt werden.

---

## Technologie-Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Backend:** Supabase (Lovable Cloud)
- **Mobile:** Capacitor 7
- **NFC:** @exxili/capacitor-nfc

---

## Support

Bei Fragen zum Lovable-Projekt: https://docs.lovable.dev/
