import { MainLayout } from '@/app/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';

export default function AppPrivacy() {
  return (
    <MainLayout title="Datenschutz" showBack>
      <Card>
        <CardContent className="prose prose-sm max-w-none p-6">
          <h2 className="text-lg font-bold mb-4">Datenschutzerklärung der Eloyo App</h2>
          
          <p className="text-sm text-muted-foreground mb-4">Stand: Dezember 2024</p>
          
          <h3 className="font-semibold mt-6 mb-2">1. Verantwortlicher</h3>
          <p className="text-sm mb-4">
            Verantwortlich für die Datenverarbeitung ist die Eloyo GmbH. 
            Kontakt: support@eloyo.de
          </p>
          
          <h3 className="font-semibold mt-6 mb-2">2. Erhobene Daten</h3>
          <p className="text-sm mb-4">
            Bei der Nutzung der Eloyo App erheben wir folgende Daten:
          </p>
          <ul className="text-sm list-disc list-inside mb-4 space-y-1">
            <li>E-Mail-Adresse (für die Registrierung)</li>
            <li>Geburtsdatum (zur Altersverifikation)</li>
            <li>Geschlecht (optional, für personalisierte Angebote)</li>
            <li>Transaktionsdaten (gesammelte Punkte, eingelöste Prämien)</li>
            <li>Standortdaten (nur bei Nutzung der Kartenansicht)</li>
          </ul>
          
          <h3 className="font-semibold mt-6 mb-2">3. Zweck der Verarbeitung</h3>
          <p className="text-sm mb-4">
            Wir verarbeiten Ihre Daten für folgende Zwecke:
          </p>
          <ul className="text-sm list-disc list-inside mb-4 space-y-1">
            <li>Bereitstellung des Treuepunkte-Dienstes</li>
            <li>Personalisierung von Angeboten und Prämien</li>
            <li>Kommunikation mit Ihnen (z.B. Benachrichtigungen)</li>
            <li>Verbesserung unserer Dienste</li>
          </ul>
          
          <h3 className="font-semibold mt-6 mb-2">4. Rechtsgrundlage</h3>
          <p className="text-sm mb-4">
            Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO 
            (Vertragserfüllung) sowie Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) für 
            optionale Daten wie Standort.
          </p>
          
          <h3 className="font-semibold mt-6 mb-2">5. Speicherdauer</h3>
          <p className="text-sm mb-4">
            Ihre Daten werden für die Dauer der Nutzung der App gespeichert. 
            Nach Löschung Ihres Kontos werden personenbezogene Daten innerhalb von 
            30 Tagen gelöscht. Anonymisierte Nutzungsstatistiken können länger 
            aufbewahrt werden.
          </p>
          
          <h3 className="font-semibold mt-6 mb-2">6. Weitergabe an Dritte</h3>
          <p className="text-sm mb-4">
            Ihre Daten werden an teilnehmende Händler weitergegeben, soweit dies 
            für die Erbringung des Dienstes erforderlich ist. Eine Weitergabe 
            an sonstige Dritte erfolgt nicht ohne Ihre ausdrückliche Einwilligung.
          </p>
          
          <h3 className="font-semibold mt-6 mb-2">7. Ihre Rechte</h3>
          <p className="text-sm mb-4">
            Sie haben das Recht auf:
          </p>
          <ul className="text-sm list-disc list-inside mb-4 space-y-1">
            <li>Auskunft über Ihre gespeicherten Daten</li>
            <li>Berichtigung unrichtiger Daten</li>
            <li>Löschung Ihrer Daten</li>
            <li>Einschränkung der Verarbeitung</li>
            <li>Datenübertragbarkeit</li>
            <li>Widerspruch gegen die Verarbeitung</li>
            <li>Beschwerde bei einer Aufsichtsbehörde</li>
          </ul>
          
          <h3 className="font-semibold mt-6 mb-2">8. Sicherheit</h3>
          <p className="text-sm mb-4">
            Wir setzen technische und organisatorische Sicherheitsmaßnahmen ein, 
            um Ihre Daten gegen Manipulation, Verlust und unbefugten Zugriff zu schützen.
          </p>
          
          <h3 className="font-semibold mt-6 mb-2">9. Kontakt</h3>
          <p className="text-sm">
            Bei Fragen zum Datenschutz kontaktieren Sie uns unter: support@eloyo.de
          </p>
        </CardContent>
      </Card>
    </MainLayout>
  );
}

export { AppPrivacy };
