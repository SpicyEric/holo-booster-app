import { MainLayout } from '@/app/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';

export default function AppPrivacy() {
  return (
    <MainLayout title="Datenschutz" showBack>
      <Card>
        <CardContent className="prose prose-sm max-w-none p-6">
          <h2 className="text-lg font-bold mb-4">Datenschutzerklärung der Eloyo App</h2>
          
          <p className="text-sm text-muted-foreground mb-4">Stand: März 2026</p>

          {/* 1. Verantwortlicher */}
          <h3 className="font-semibold mt-6 mb-2">1. Verantwortlicher</h3>
          <p className="text-sm mb-2">
            Eloyo – Klaus Eric Pfadisch<br />
            Fuggerstr. 2<br />
            86836 Untermeitingen<br />
            E-Mail: support@eloyo.de<br />
            Telefon: +49 1516 2665596
          </p>

          {/* 2. Geltungsbereich */}
          <h3 className="font-semibold mt-6 mb-2">2. Geltungsbereich</h3>
          <p className="text-sm mb-4">
            Diese Datenschutzerklärung gilt ausschließlich für die Nutzung der Eloyo Mobile-App 
            (iOS und Android). Für die Website eloyo.de gilt eine separate Datenschutzerklärung, 
            die unter <a href="https://eloyo.de/datenschutz" className="text-primary hover:underline">eloyo.de/datenschutz</a> abrufbar ist.
          </p>

          {/* 3. Erhobene Daten */}
          <h3 className="font-semibold mt-6 mb-2">3. Welche Daten wir erheben</h3>

          <h4 className="font-medium mt-4 mb-1 text-sm">a) Registrierungsdaten</h4>
          <ul className="text-sm list-disc list-inside mb-3 space-y-1">
            <li>E-Mail-Adresse</li>
            <li>Vor- und Nachname (optional)</li>
            <li>Geburtsdatum (optional, für Geburtstagsangebote)</li>
            <li>Geschlecht (optional, für personalisierte Angebote)</li>
          </ul>

          <h4 className="font-medium mt-4 mb-1 text-sm">b) Treueprogramm-Daten</h4>
          <ul className="text-sm list-disc list-inside mb-3 space-y-1">
            <li>Gesammelte Punkte und Karte</li>
            <li>Eingelöste Prämien und Angebote</li>
            <li>Teilnehmende Geschäfte, bei denen Sie Kunde sind</li>
            <li>Transaktionshistorie</li>
          </ul>

          <h4 className="font-medium mt-4 mb-1 text-sm">c) NFC-Daten</h4>
          <p className="text-sm mb-3">
            Beim Scannen von NFC-Chips in teilnehmenden Geschäften wird die Chip-ID ausgelesen, 
            um Ihre Punkte zu erfassen. Es werden dabei keine Daten auf den 
            NFC-Chip geschrieben. Die NFC-Berechtigung wird nur aktiv genutzt, wenn Sie die 
            Scan-Funktion in der App verwenden.
          </p>

          <h4 className="font-medium mt-4 mb-1 text-sm">d) Push-Benachrichtigungen</h4>
          <p className="text-sm mb-3">
            Wenn Sie Push-Benachrichtigungen erlauben, speichern wir Ihr Geräte-Token (FCM-Token), 
            um Ihnen Nachrichten von teilnehmenden Händlern, Angebote und Prämien-Erinnerungen zu 
            senden. Sie können Push-Benachrichtigungen jederzeit in den Geräteeinstellungen deaktivieren.
          </p>

          <h4 className="font-medium mt-4 mb-1 text-sm">e) Standortdaten</h4>
          <p className="text-sm mb-3">
            Die App kann Ihren Standort nutzen, um nahegelegene teilnehmende Geschäfte auf einer 
            Karte anzuzeigen. Die Standortfreigabe ist vollständig optional und wird nur bei aktiver 
            Nutzung der Kartenansicht abgefragt. Ihr Standort wird nicht dauerhaft gespeichert oder 
            an Dritte weitergegeben.
          </p>

          <h4 className="font-medium mt-4 mb-1 text-sm">f) Technische Gerätedaten</h4>
          <ul className="text-sm list-disc list-inside mb-3 space-y-1">
            <li>Gerätetyp und Betriebssystem (für die Push-Zustellung)</li>
            <li>App-Version</li>
          </ul>

          {/* 4. Zweck der Verarbeitung */}
          <h3 className="font-semibold mt-6 mb-2">4. Zweck der Verarbeitung</h3>
          <ul className="text-sm list-disc list-inside mb-4 space-y-1">
            <li>Bereitstellung und Verwaltung Ihres Treuepunkte-Kontos</li>
            <li>Zuordnung von Scannen und Punkten zu Ihrem Konto beim NFC-Scan</li>
            <li>Versand von Push-Benachrichtigungen (Angebote, Nachrichten, Prämien)</li>
            <li>Anzeige nahegelegener Geschäfte (Kartenansicht)</li>
            <li>Personalisierung von Angeboten (z.&nbsp;B. Geburtstagsangebote)</li>
            <li>Kommunikation zwischen Ihnen und teilnehmenden Händlern</li>
          </ul>

          {/* 5. Rechtsgrundlage */}
          <h3 className="font-semibold mt-6 mb-2">5. Rechtsgrundlage</h3>
          <p className="text-sm mb-4">
            Die Verarbeitung Ihrer Registrierungs- und Treueprogramm-Daten erfolgt auf Grundlage 
            von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung). Die Verarbeitung optionaler Daten 
            (Standort, Push-Benachrichtigungen, Geburtsdatum) erfolgt auf Grundlage Ihrer 
            Einwilligung gem. Art. 6 Abs. 1 lit. a DSGVO. Sie können diese Einwilligungen 
            jederzeit widerrufen.
          </p>

          {/* 6. Datenweitergabe */}
          <h3 className="font-semibold mt-6 mb-2">6. Datenweitergabe</h3>
          <p className="text-sm mb-2">
            Ihre Daten werden an folgende Empfänger weitergegeben:
          </p>
          <ul className="text-sm list-disc list-inside mb-3 space-y-1">
            <li>
              <strong>Teilnehmende Händler:</strong> Händler sehen Ihre gesammelten Punkte und 
              können Ihnen Nachrichten und Angebote senden. Händler haben keinen Zugriff auf Ihre 
              E-Mail-Adresse oder persönliche Daten, sofern Sie diese nicht aktiv teilen.
            </li>
            <li>
              <strong>Hosting-Anbieter:</strong> Supabase (USA) – für die Speicherung Ihrer Daten. 
              Es besteht ein Auftragsverarbeitungsvertrag (AVV). Die Datenübermittlung in die USA 
              erfolgt auf Grundlage von Standardvertragsklauseln gem. Art. 46 Abs. 2 lit. c DSGVO.
            </li>
            <li>
              <strong>Push-Dienst:</strong> Google Firebase Cloud Messaging (FCM) – für den Versand 
              von Push-Benachrichtigungen.
            </li>
          </ul>
          <p className="text-sm mb-4">
            Eine darüber hinausgehende Weitergabe an Dritte erfolgt nicht ohne Ihre ausdrückliche 
            Einwilligung.
          </p>

          {/* 7. Speicherdauer */}
          <h3 className="font-semibold mt-6 mb-2">7. Speicherdauer</h3>
          <p className="text-sm mb-4">
            Ihre Daten werden für die Dauer der Nutzung der App gespeichert. Nach Löschung Ihres 
            Kontos werden alle personenbezogenen Daten innerhalb von 30 Tagen unwiderruflich gelöscht. 
            Anonymisierte Nutzungsstatistiken können davon ausgenommen sein.
          </p>

          {/* 8. Ihre Rechte */}
          <h3 className="font-semibold mt-6 mb-2">8. Ihre Rechte</h3>
          <p className="text-sm mb-2">Sie haben folgende Rechte:</p>
          <ul className="text-sm list-disc list-inside mb-4 space-y-1">
            <li><strong>Auskunft</strong> über Ihre gespeicherten Daten (Art. 15 DSGVO)</li>
            <li><strong>Berichtigung</strong> unrichtiger Daten (Art. 16 DSGVO)</li>
            <li><strong>Löschung</strong> Ihrer Daten (Art. 17 DSGVO)</li>
            <li><strong>Einschränkung</strong> der Verarbeitung (Art. 18 DSGVO)</li>
            <li><strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO)</li>
            <li><strong>Widerspruch</strong> gegen die Verarbeitung (Art. 21 DSGVO)</li>
            <li><strong>Widerruf</strong> erteilter Einwilligungen jederzeit ohne Angabe von Gründen</li>
            <li><strong>Beschwerde</strong> bei der zuständigen Aufsichtsbehörde</li>
          </ul>
          <p className="text-sm mb-4">
            Sie können Ihr Konto und alle zugehörigen Daten jederzeit in den App-Einstellungen 
            unter „Konto löschen" selbst entfernen.
          </p>

          {/* 9. Berechtigungen */}
          <h3 className="font-semibold mt-6 mb-2">9. App-Berechtigungen</h3>
          <p className="text-sm mb-2">Die App kann folgende Geräte-Berechtigungen anfordern:</p>
          <ul className="text-sm list-disc list-inside mb-4 space-y-1">
            <li><strong>NFC:</strong> Zum Scannen von NFC-Karten in Geschäften</li>
            <li><strong>Kamera:</strong> Zum Scannen von QR-Codes</li>
            <li><strong>Standort:</strong> Zur Anzeige nahegelegener Geschäfte</li>
            <li><strong>Push-Benachrichtigungen:</strong> Für Nachrichten und Angebote</li>
          </ul>
          <p className="text-sm mb-4">
            Alle Berechtigungen sind optional. Die Kernfunktionen der App (Punkte sammeln, 
            Prämien einlösen) funktionieren auch ohne diese Berechtigungen. Sie können erteilte 
            Berechtigungen jederzeit in den Geräteeinstellungen widerrufen.
          </p>

          {/* 10. Datensicherheit */}
          <h3 className="font-semibold mt-6 mb-2">10. Datensicherheit</h3>
          <p className="text-sm mb-4">
            Alle Daten werden verschlüsselt übertragen (TLS/SSL). Der Zugriff auf Ihre Daten 
            ist durch Authentifizierung geschützt. Wir setzen technische und organisatorische 
            Maßnahmen ein, um Ihre Daten gegen Manipulation, Verlust und unbefugten Zugriff 
            zu schützen.
          </p>

          {/* 11. Kontakt */}
          <h3 className="font-semibold mt-6 mb-2">11. Kontakt</h3>
          <p className="text-sm">
            Bei Fragen zum Datenschutz in der App kontaktieren Sie uns unter:{' '}
            <a href="mailto:support@eloyo.de" className="text-primary hover:underline">
              support@eloyo.de
            </a>
          </p>
        </CardContent>
      </Card>
    </MainLayout>
  );
}

export { AppPrivacy };
