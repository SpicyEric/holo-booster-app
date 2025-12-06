import { MainLayout } from '@/app/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';

export default function AppTerms() {
  return (
    <MainLayout title="Nutzungsbedingungen" showBack>
      <Card>
        <CardContent className="prose prose-sm max-w-none p-6">
          <h2 className="text-lg font-bold mb-4">Nutzungsbedingungen der Eloyo App</h2>
          
          <p className="text-sm text-muted-foreground mb-4">Stand: Dezember 2024</p>
          
          <h3 className="font-semibold mt-6 mb-2">1. Geltungsbereich</h3>
          <p className="text-sm mb-4">
            Diese Nutzungsbedingungen gelten für die Nutzung der Eloyo Mobile App ("App"), 
            die von der Eloyo GmbH ("wir", "uns") bereitgestellt wird. Mit der Registrierung 
            und Nutzung der App erklären Sie sich mit diesen Bedingungen einverstanden.
          </p>
          
          <h3 className="font-semibold mt-6 mb-2">2. Leistungsbeschreibung</h3>
          <p className="text-sm mb-4">
            Die Eloyo App ermöglicht Nutzern das Sammeln und Einlösen von Treuepunkten 
            bei teilnehmenden Händlern. Die Punkte werden durch das Scannen von NFC-Stempeln 
            bei den Händlern gesammelt und können gegen Prämien eingelöst werden.
          </p>
          
          <h3 className="font-semibold mt-6 mb-2">3. Registrierung</h3>
          <p className="text-sm mb-4">
            Zur Nutzung der App ist eine Registrierung mit einer gültigen E-Mail-Adresse 
            erforderlich. Sie müssen mindestens 14 Jahre alt sein, um die App nutzen zu können. 
            Die angegebenen Daten müssen wahrheitsgemäß sein.
          </p>
          
          <h3 className="font-semibold mt-6 mb-2">4. Punkte und Prämien</h3>
          <p className="text-sm mb-4">
            Gesammelte Punkte haben keinen Bargeldwert und können nicht übertragen werden. 
            Die Verfügbarkeit von Prämien hängt vom jeweiligen Händler ab. Wir behalten uns 
            das Recht vor, das Punktesystem jederzeit anzupassen.
          </p>
          
          <h3 className="font-semibold mt-6 mb-2">5. Pflichten des Nutzers</h3>
          <p className="text-sm mb-4">
            Sie verpflichten sich, die App nur für den vorgesehenen Zweck zu nutzen und 
            keine betrügerischen Aktivitäten durchzuführen. Jeder Versuch, das System zu 
            manipulieren, führt zur sofortigen Sperrung des Kontos.
          </p>
          
          <h3 className="font-semibold mt-6 mb-2">6. Haftung</h3>
          <p className="text-sm mb-4">
            Wir haften nicht für die Qualität der von Händlern angebotenen Waren oder 
            Dienstleistungen. Die Haftung für Schäden aus der Nutzung der App ist auf 
            Vorsatz und grobe Fahrlässigkeit beschränkt.
          </p>
          
          <h3 className="font-semibold mt-6 mb-2">7. Kündigung</h3>
          <p className="text-sm mb-4">
            Sie können Ihr Konto jederzeit über die App-Einstellungen löschen. Mit der 
            Löschung verfallen alle gesammelten Punkte unwiderruflich.
          </p>
          
          <h3 className="font-semibold mt-6 mb-2">8. Änderungen</h3>
          <p className="text-sm mb-4">
            Wir behalten uns das Recht vor, diese Nutzungsbedingungen jederzeit zu ändern. 
            Über wesentliche Änderungen werden Sie informiert.
          </p>
          
          <h3 className="font-semibold mt-6 mb-2">9. Anwendbares Recht</h3>
          <p className="text-sm mb-4">
            Es gilt deutsches Recht. Gerichtsstand ist der Sitz des Unternehmens.
          </p>
          
          <h3 className="font-semibold mt-6 mb-2">10. Kontakt</h3>
          <p className="text-sm">
            Bei Fragen zu diesen Nutzungsbedingungen kontaktieren Sie uns unter: 
            support@eloyo.de
          </p>
        </CardContent>
      </Card>
    </MainLayout>
  );
}

export { AppTerms };
