## Hybrides Auth-System (E-Mail + Handynummer per SMS-OTP)

Großer Umbau des Auth-Flows mit DB-Schema-Änderungen, neuem Phone-Login, erweitertem Profil und Migrations-Modal. Twilio richten wir nach diesem Schritt gemeinsam ein – der Code wird so vorbereitet, dass nur noch Twilio-Credentials in Supabase Auth aktiviert werden müssen.

### Wichtige Vorab-Klärung

**Supabase Auth statt eigener `users`-Tabelle**: Dein Vorschlag im Prompt erweitert eine eigene `users`-Tabelle mit `password_hash`, `phone` etc. In diesem Projekt läuft Auth aber komplett über Supabase Auth (`auth.users`) — Passwörter, E-Mails und auch Handynummern werden dort verwaltet, nicht in `public.users`. Eine eigene `users`-Tabelle existiert hier nicht; Profildaten liegen in `profiles`.

Deshalb baue ich es Supabase-konform:
- **Phone-Login** läuft über `supabase.auth.signInWithOtp({ phone })` + `verifyOtp` — Supabase speichert Telefonnummer, Verifizierungsstatus und Provider in `auth.users` selbst.
- **`profiles`-Tabelle** wird um `auth_method` (`'email' | 'phone' | 'both'`), `birthdate`, `gender` und `migration_prompt_dismissed` erweitert. Email/Phone müssen wir nicht duplizieren — die kommen aus `auth.users`.
- **SMS-Provider** (Twilio) wird in Supabase Auth → Phone Provider aktiviert (UI-only, machen wir gemeinsam danach). Bis dahin ist die Phone-Login-UI da, schlägt aber beim echten Senden fehl — das ist erwartet.

Wenn du wirklich eine separate `users`-Tabelle willst statt Supabase Auth zu nutzen, sag Bescheid — das wäre ein viel größerer Umbau (eigenes Session-Management, JWT, Passwort-Hashing).

### Was gebaut wird

**1. DB-Migration (`profiles` erweitern)**
- `auth_method TEXT DEFAULT 'email'` — `'email' | 'phone' | 'both'`
- `birthdate DATE` (nullable)
- `gender TEXT` (nullable)
- `migration_prompt_dismissed BOOLEAN DEFAULT false`
- `login_count INTEGER DEFAULT 0` (für „beim 3. Login fragen")
- Trigger: bei Insert in `auth.users` mit `phone` aber ohne `email` → `auth_method = 'phone'`; bei beidem → `'both'`

**2. AppAuth-Screen umbauen** (`src/app/pages/AppAuth.tsx`)
- Standard-Tab: **"Mit Handynummer anmelden"** (großer Button)
- Sekundär: **"Mit E-Mail anmelden"** (Link)
- Phone-Flow: Nummer eingeben → `signInWithOtp({ phone })` → 6-stelligen Code eingeben → `verifyOtp`
- E-Mail-Flow bleibt unverändert
- Registrierung: nur Phone-Flow im UI sichtbar (E-Mail-Signup-Endpoint bleibt im Backend nutzbar)

**3. Profil erweitern** (`src/app/pages/AppSettings.tsx` oder neue Section)
- E-Mail anzeigen/hinzufügen (`updateUser({ email })` — Supabase schickt Bestätigungs-Mail)
- Handynummer anzeigen/hinzufügen (`updateUser({ phone })` → OTP-Verifizierung)
- Geburtsdatum mit Hinweis „Bonus-Check-in am Geburtstag 🎂"
- Passwort ändern (nur wenn `auth_method` enthält `'email'`)
- Bei erfolgreichem Phone-Add: `auth_method = 'both'`

**4. Migrations-Modal**
- Neue Komponente `PhoneMigrationDialog.tsx`
- Trigger nach Login wenn: `auth_method === 'email'` && `login_count >= 3` && `!migration_prompt_dismissed`
- Buttons: „Handynummer hinzufügen" / „Später" / „Nicht mehr fragen" (setzt `migration_prompt_dismissed = true`)

**5. UI-Konsistenz**
- Profil-Header: Phone wenn vorhanden, sonst E-Mail
- „Eingeloggt als …" → gleiche Logik

**6. Sicherheit**
- Doppelte Phone-Nummer: Supabase wirft automatisch Fehler bei `updateUser` → User-freundliche Meldung mappen
- SMS-Rate-Limiting: Supabase Auth hat eingebautes Rate-Limit (1/min pro Nummer), zusätzlich Client-seitig 60s-Cooldown auf „Code erneut senden"
- Server-Side: läuft alles über Supabase Auth, also bereits geschützt

### Was du danach machst

1. Supabase Auth → Phone Auth aktivieren
2. Twilio-Account-SID, Auth-Token, Message-Service-SID in Supabase eintragen
3. SMS-Template anpassen

### Was NICHT in diesem Schritt enthalten ist

- Bestandsuser-Benachrichtigung (separates Mailing/Push, machen wir wenn alles live ist)
- Twilio-Setup selbst
- Komplett-Umbau auf eigene `users`-Tabelle (siehe Klärung oben)

### Technische Details

```text
Files:
  NEW  supabase/migrations/<ts>_hybrid_auth.sql
  EDIT src/app/pages/AppAuth.tsx          (Phone+Email Tabs, OTP-Flow)
  EDIT src/app/pages/AppSettings.tsx      (Profil-Erweiterung)
  NEW  src/app/components/PhoneMigrationDialog.tsx
  EDIT src/app/layouts/AppLayout.tsx      (Modal-Trigger nach Login)
  EDIT src/hooks/useAuth.tsx              (login_count Increment)
  NEW  src/app/lib/phoneAuth.ts           (signInWithOtp/verifyOtp Helper)
```

Bestätige bitte:
1. **Supabase Auth verwenden** (nicht eigene `users`-Tabelle) — okay?
2. Twilio-Setup machen wir nach Code-Deploy gemeinsam — bestätigt?
