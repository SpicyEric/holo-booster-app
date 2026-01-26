

# Plan: Berechtigungs-Popups direkt in der App triggern

## Ziel
Wenn der Nutzer auf **Karte** geht oder auf **Punkte sammeln** tippt, soll **sofort ein natives Berechtigungs-Popup** erscheinen (falls möglich), oder ein **benutzerfreundlicher Fallback-Dialog** der direkt in die Einstellungen führt.

---

## Technische Hintergrund-Info

### Android Berechtigungsverhalten
- **Erstes Mal**: Android zeigt ein natives Popup ("App XY möchte auf deinen Standort zugreifen")
- **Nach Ablehnung**: Android zeigt das Popup **nicht mehr** automatisch. Die App muss den Nutzer in die **Einstellungen** führen
- **NFC**: Es gibt kein "Berechtigungs-Popup" für NFC – NFC kann nur **eingeschaltet oder ausgeschaltet** werden in den Systemeinstellungen

### Was wir umsetzen
1. **Beim ersten Zugriff**: Natives Popup triggern über Capacitor API
2. **Bei "denied" Status**: Benutzerfreundlichen Dialog zeigen mit Button "Einstellungen öffnen"
3. **Bei NFC aus**: Dialog zeigen mit Button "NFC-Einstellungen öffnen"

---

## Änderungen im Detail

### 1. Neuer LocationPermissionDialog erstellen
**Datei**: `src/app/components/LocationPermissionDialog.tsx`

Ein Dialog ähnlich wie `NfcPermissionDialog`, der erscheint wenn:
- Standortberechtigung verweigert wurde
- Der Nutzer in die Einstellungen geführt werden muss

Enthält:
- Erklärungstext warum Standort benötigt wird
- Button "Einstellungen öffnen" (öffnet App-Einstellungen)
- Button "Erneut versuchen"
- Button "Abbrechen"

### 2. AppStores.tsx verbessern
**Datei**: `src/app/pages/AppStores.tsx`

Aktuelle Logik:
```
useEffect fetchUserLocation -> getCurrentLocation() -> Fehler -> locationError
```

Neue Logik:
```
1. Beim Laden: checkLocationPermission()
2. Wenn "prompt" -> requestLocationPermission() -> natives Popup erscheint
3. Wenn "denied" -> LocationPermissionDialog anzeigen
4. Wenn "granted" -> getCurrentLocation()
5. Bei "Erneut versuchen" -> requestLocationPermission() erneut aufrufen
```

Änderungen:
- Import `requestLocationPermission`, `checkLocationPermission` aus geolocationService
- Neuer State: `showLocationDialog` 
- Logik in `fetchUserLocation` erweitern um erst Berechtigung zu prüfen/anfragen
- Integration des neuen `LocationPermissionDialog`

### 3. Geolocation Service erweitern
**Datei**: `src/app/services/geolocationService.ts`

Neue Funktion hinzufügen:
```typescript
export async function openAppSettings(): Promise<void>
```
- Nutzt `@capacitor/app` Plugin um die App-Einstellungen zu öffnen
- Ermöglicht Nutzer dort die Standortberechtigung zu aktivieren

### 4. NFC Permission Dialog verbessern
**Datei**: `src/app/components/NfcPermissionDialog.tsx`

Der Dialog existiert bereits, aber wird nicht immer korrekt getriggert. Sicherstellen dass:
- Bei NFC "disabled" sofort der Dialog erscheint (nicht erst nach Fehler)
- Der Dialog deutlich erklärt dass NFC in den **Geräte-Einstellungen** aktiviert werden muss

### 5. AppScan.tsx Logik anpassen
**Datei**: `src/app/pages/AppScan.tsx`

Die aktuelle Logik zeigt den Dialog nur bei bestimmten Fehlern. Änderung:
- **Vor** dem Scan-Start prüfen: `nfcService.isEnabled()`
- Wenn false -> sofort `NfcPermissionDialog` anzeigen (nicht erst Scan starten und Fehler abwarten)
- Das passiert bereits teilweise (Zeile 151-157), aber die UI zeigt trotzdem die Fehlermeldung statt Dialog

### 6. usePermissions Hook verbessern
**Datei**: `src/app/hooks/usePermissions.ts`

Erweitern um:
- `openAppSettings()` Funktion für Standort-Einstellungen
- Robusteres Error-Handling wenn Capacitor-Plugin nicht verfügbar

### 7. App.then() Fehler beheben
**Datei**: `src/app/hooks/useBackButton.ts`

Der Fehler `"App.then()" is not implemented on web` kommt aus Zeile 92:
```typescript
listener.then(l => l.remove());
```

Änderung zu:
```typescript
if (listener && typeof listener.then === 'function') {
  listener.then(l => l?.remove?.());
}
```

---

## Erwartetes Verhalten nach der Umsetzung

### Szenario: Nutzer öffnet "Karte" Tab
1. App prüft Standortberechtigung
2. **Wenn nie gefragt**: Natives Android-Popup erscheint "Eloyo möchte auf deinen Standort zugreifen"
3. **Wenn bereits abgelehnt**: LocationPermissionDialog erscheint mit Option "Einstellungen öffnen"
4. **Wenn erlaubt**: Karte lädt normal

### Szenario: Nutzer tippt "Punkte sammeln"
1. App prüft ob NFC eingeschaltet ist
2. **Wenn NFC aus**: NfcPermissionDialog erscheint sofort mit "NFC-Einstellungen öffnen"
3. **Wenn NFC an**: NFC-Scan startet normal

---

## Dateien die erstellt/geändert werden

| Datei | Aktion |
|-------|--------|
| `src/app/components/LocationPermissionDialog.tsx` | NEU erstellen |
| `src/app/pages/AppStores.tsx` | Ändern |
| `src/app/services/geolocationService.ts` | Erweitern |
| `src/app/hooks/usePermissions.ts` | Erweitern |
| `src/app/pages/AppScan.tsx` | Anpassen |
| `src/app/hooks/useBackButton.ts` | Bugfix |

---

## Nach der Umsetzung

Du musst die App neu bauen und installieren:
```bash
npm run build
npx cap sync android
npx cap run android
```

Dann beim ersten Öffnen der Karte sollte das native Android-Popup erscheinen.

