import { MainLayout } from '@/app/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';

export default function AppTerms() {
  return (
    <MainLayout title="Nutzungsbedingungen" showBack>
      <Card>
        <CardContent className="prose prose-sm max-w-none p-6">
          <h2 className="text-lg font-bold mb-4">Nutzungsbedingungen der Eloyo App</h2>
          
          <p className="text-sm text-muted-foreground mb-4">Stand: März 2026</p>

          {/* 1. Geltungsbereich */}
          <h3 className="font-semibold mt-6 mb-2">1. Geltungsbereich</h3>
          <p className="text-sm mb-4">
            Diese Nutzungsbedingungen („AGB") gelten für die Nutzung der Eloyo Mobile-App 
            („App"), bereitgestellt von:<br /><br />
            Eloyo – Klaus Eric Pfadisch<br />
            Fuggerstr. 2<br />
            86836 Untermeitingen<br />
            E-Mail: support@eloyo.de<br />
            Telefon: +49 1516 2665596<br /><br />
            Mit der Registrierung und Nutzung der App erklären Sie sich mit diesen 
            Nutzungsbedingungen einverstanden. Sofern Sie mit diesen Bedingungen nicht 
            einverstanden sind, ist die Nutzung der App nicht gestattet.
          </p>

          {/* 2. Leistungsbeschreibung */}
          <h3 className="font-semibold mt-6 mb-2">2. Leistungsbeschreibung</h3>
          <p className="text-sm mb-2">
            Die Eloyo App ermöglicht registrierten Nutzern die Teilnahme an digitalen 
            Treueprogrammen teilnehmender Händler. Die Kernfunktionen umfassen:
          </p>
          <ul className="text-sm list-disc list-inside mb-4 space-y-1">
            <li>Sammeln von Treuepunkten durch Scannen von NFC-Karten oder QR-Codes bei teilnehmenden Händlern</li>
            <li>Einlösen von Prämien, die von den jeweiligen Händlern angeboten werden</li>
            <li>Empfang von Nachrichten, Angeboten und Benachrichtigungen teilnehmender Händler</li>
            <li>Anzeige nahegelegener teilnehmender Geschäfte auf einer Karte</li>
            <li>Verwaltung des eigenen Nutzerkontos und der Treuekarten</li>
          </ul>
          <p className="text-sm mb-4">
            Der Funktionsumfang kann jederzeit erweitert, eingeschränkt oder angepasst werden. 
            Ein Anspruch auf bestimmte Funktionen oder eine dauerhafte Verfügbarkeit besteht nicht.
          </p>

          {/* 3. Registrierung und Konto */}
          <h3 className="font-semibold mt-6 mb-2">3. Registrierung und Konto</h3>
          <p className="text-sm mb-2">
            Zur Nutzung der App ist eine Registrierung mit einer gültigen E-Mail-Adresse 
            und einem Passwort erforderlich. Bei der Registrierung gilt:
          </p>
          <ul className="text-sm list-disc list-inside mb-4 space-y-1">
            <li>Sie müssen mindestens 14 Jahre alt sein.</li>
            <li>Die angegebenen Daten müssen wahrheitsgemäß und vollständig sein.</li>
            <li>Pro Person darf nur ein Konto erstellt werden.</li>
            <li>Sie sind für die Geheimhaltung Ihrer Zugangsdaten selbst verantwortlich.</li>
            <li>Jede Nutzung, die unter Ihren Zugangsdaten erfolgt, wird Ihnen zugerechnet.</li>
          </ul>

          {/* 4. Punkte, Stempel und Prämien */}
          <h3 className="font-semibold mt-6 mb-2">4. Punkte, Karte und Prämien</h3>
          <ul className="text-sm list-disc list-inside mb-4 space-y-1">
            <li>Gesammelte Punkte und Karte haben keinen Bargeldwert und sind nicht auf andere Nutzer oder Konten übertragbar.</li>
            <li>Punkte und Karte können ausschließlich bei dem Händler eingelöst werden, bei dem sie gesammelt wurden.</li>
            <li>Art, Umfang und Verfügbarkeit der Prämien werden vom jeweiligen Händler festgelegt. Eloyo übernimmt keine Gewährleistung für die Einlösbarkeit oder Qualität der Prämien.</li>
            <li>Wir behalten uns das Recht vor, das Punktesystem, den Wert von Punkten oder die Bedingungen für die Einlösung jederzeit mit angemessener Ankündigungsfrist anzupassen.</li>
            <li>Bei Verdacht auf Manipulation oder Missbrauch können Punkte ohne Vorankündigung annulliert werden.</li>
          </ul>

          {/* 5. NFC- und QR-Code-Nutzung */}
          <h3 className="font-semibold mt-6 mb-2">5. NFC- und QR-Code-Nutzung</h3>
          <p className="text-sm mb-4">
            Das Sammeln von Punkten erfolgt durch das Scannen von NFC-Stempeln oder QR-Codes 
            in den Geschäftsräumen teilnehmender Händler. Dabei gilt:
          </p>
          <ul className="text-sm list-disc list-inside mb-4 space-y-1">
            <li>Das Scannen darf nur an den dafür vorgesehenen Geräten und Stempelpunkten des Händlers erfolgen.</li>
            <li>Jeder Versuch, NFC-Chips zu kopieren, zu manipulieren oder außerhalb des vorgesehenen Kontexts zu verwenden, ist strengstens untersagt.</li>
            <li>Das Auslesen der NFC-Chip-ID dient ausschließlich der Zuordnung Ihres Stempels. Es werden keine Daten auf den NFC-Chip geschrieben.</li>
          </ul>

          {/* 6. Push-Benachrichtigungen */}
          <h3 className="font-semibold mt-6 mb-2">6. Push-Benachrichtigungen</h3>
          <p className="text-sm mb-4">
            Mit Ihrer Einwilligung können Sie Push-Benachrichtigungen von teilnehmenden Händlern 
            erhalten. Diese können Nachrichten, Angebote, Prämien-Erinnerungen und Neuigkeiten 
            enthalten. Die Einwilligung kann jederzeit über die Geräteeinstellungen oder die 
            App-Einstellungen widerrufen werden.
          </p>

          {/* 7. Pflichten des Nutzers */}
          <h3 className="font-semibold mt-6 mb-2">7. Pflichten des Nutzers</h3>
          <p className="text-sm mb-2">Sie verpflichten sich:</p>
          <ul className="text-sm list-disc list-inside mb-4 space-y-1">
            <li>Die App nur für den vorgesehenen Zweck (Teilnahme an Treueprogrammen) zu nutzen.</li>
            <li>Keine betrügerischen Aktivitäten durchzuführen, insbesondere keine Punkte oder Karte durch Manipulation zu erschleichen.</li>
            <li>Keine automatisierten Zugriffe, Bots oder Scraping-Tools zu verwenden.</li>
            <li>Keine Inhalte hochzuladen oder zu verbreiten, die rechtswidrig, beleidigend oder anderweitig unangemessen sind.</li>
            <li>Die Rechte Dritter (insbesondere Urheber-, Marken- und Persönlichkeitsrechte) nicht zu verletzen.</li>
          </ul>

          {/* 8. Sperrung und Kündigung */}
          <h3 className="font-semibold mt-6 mb-2">8. Sperrung und Kündigung</h3>
          <p className="text-sm mb-2"><strong>Durch den Nutzer:</strong></p>
          <ul className="text-sm list-disc list-inside mb-3 space-y-1">
            <li>Sie können Ihr Konto jederzeit über die App-Einstellungen löschen.</li>
            <li>Mit der Löschung verfallen alle gesammelten Punkte und Karte unwiderruflich.</li>
          </ul>
          <p className="text-sm mb-2"><strong>Durch Eloyo:</strong></p>
          <ul className="text-sm list-disc list-inside mb-4 space-y-1">
            <li>Wir behalten uns das Recht vor, Konten bei Verstoß gegen diese Nutzungsbedingungen vorübergehend zu sperren oder dauerhaft zu löschen.</li>
            <li>Insbesondere bei Verdacht auf Manipulation des Punktesystems, Missbrauch von NFC-Chips oder mehrfacher Kontoerstellung erfolgt eine sofortige Sperrung.</li>
            <li>Vor einer dauerhaften Löschung werden Sie, sofern möglich, per E-Mail informiert.</li>
          </ul>

          {/* 9. Verfügbarkeit und Wartung */}
          <h3 className="font-semibold mt-6 mb-2">9. Verfügbarkeit und Wartung</h3>
          <p className="text-sm mb-4">
            Wir bemühen uns um eine hohe Verfügbarkeit der App, können jedoch keine 
            ununterbrochene Erreichbarkeit garantieren. Wartungsarbeiten, technische Störungen 
            oder höhere Gewalt können zu vorübergehenden Einschränkungen führen. Ein Anspruch 
            auf ständige Verfügbarkeit besteht nicht.
          </p>

          {/* 10. Geistiges Eigentum */}
          <h3 className="font-semibold mt-6 mb-2">10. Geistiges Eigentum</h3>
          <p className="text-sm mb-4">
            Alle Inhalte der App (Design, Texte, Grafiken, Logos, Software) sind urheberrechtlich 
            geschützt und Eigentum von Eloyo oder der jeweiligen Rechteinhaber. Die Nutzung der 
            App gewährt Ihnen kein Eigentums- oder Lizenzrecht an diesen Inhalten. Jede 
            Vervielfältigung, Verbreitung oder öffentliche Zugänglichmachung ohne ausdrückliche 
            Genehmigung ist untersagt.
          </p>

          {/* 11. Haftung */}
          <h3 className="font-semibold mt-6 mb-2">11. Haftung</h3>
          <ul className="text-sm list-disc list-inside mb-4 space-y-1">
            <li>Eloyo haftet unbeschränkt für Schäden aus der Verletzung von Leben, Körper oder Gesundheit sowie bei Vorsatz und grober Fahrlässigkeit.</li>
            <li>Bei leichter Fahrlässigkeit haftet Eloyo nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten), der Höhe nach begrenzt auf den vorhersehbaren, vertragstypischen Schaden.</li>
            <li>Eloyo haftet nicht für die Qualität, Verfügbarkeit oder Einlösbarkeit der von Händlern angebotenen Waren, Dienstleistungen oder Prämien.</li>
            <li>Eloyo haftet nicht für den Verlust von Punkten durch Kontolöschung, Sperrung bei Missbrauch oder technische Störungen.</li>
            <li>Die Haftung nach dem Produkthaftungsgesetz bleibt unberührt.</li>
          </ul>

          {/* 12. Datenschutz */}
          <h3 className="font-semibold mt-6 mb-2">12. Datenschutz</h3>
          <p className="text-sm mb-4">
            Informationen zur Verarbeitung Ihrer personenbezogenen Daten finden Sie in unserer 
            separaten Datenschutzerklärung für die Eloyo App, die in der App unter 
            „Datenschutz" abrufbar ist.
          </p>

          {/* 13. Änderungen der Nutzungsbedingungen */}
          <h3 className="font-semibold mt-6 mb-2">13. Änderungen der Nutzungsbedingungen</h3>
          <p className="text-sm mb-4">
            Wir behalten uns das Recht vor, diese Nutzungsbedingungen jederzeit zu ändern. 
            Über wesentliche Änderungen werden Sie per Push-Benachrichtigung oder E-Mail 
            informiert. Die fortgesetzte Nutzung der App nach Inkrafttreten der Änderungen 
            gilt als Zustimmung zu den geänderten Bedingungen. Widersprechen Sie den 
            Änderungen, steht Ihnen das Recht zur Kündigung und Löschung Ihres Kontos zu.
          </p>

          {/* 14. Anwendbares Recht und Streitbeilegung */}
          <h3 className="font-semibold mt-6 mb-2">14. Anwendbares Recht und Streitbeilegung</h3>
          <p className="text-sm mb-4">
            Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des 
            UN-Kaufrechts. Die Europäische Kommission stellt eine Plattform zur 
            Online-Streitbeilegung (OS) bereit:{' '}
            <a href="https://ec.europa.eu/consumers/odr" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              https://ec.europa.eu/consumers/odr
            </a>. 
            Wir sind weder verpflichtet noch bereit, an einem Streitbeilegungsverfahren 
            vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>

          {/* 15. Salvatorische Klausel */}
          <h3 className="font-semibold mt-6 mb-2">15. Salvatorische Klausel</h3>
          <p className="text-sm mb-4">
            Sollten einzelne Bestimmungen dieser Nutzungsbedingungen unwirksam sein oder 
            werden, bleibt die Wirksamkeit der übrigen Bestimmungen hiervon unberührt. 
            An die Stelle der unwirksamen Bestimmung tritt eine Regelung, die dem 
            wirtschaftlichen Zweck der unwirksamen Bestimmung am nächsten kommt.
          </p>

          {/* 16. Kontakt */}
          <h3 className="font-semibold mt-6 mb-2">16. Kontakt</h3>
          <p className="text-sm">
            Bei Fragen zu diesen Nutzungsbedingungen kontaktieren Sie uns unter:{' '}
            <a href="mailto:support@eloyo.de" className="text-primary hover:underline">
              support@eloyo.de
            </a>
          </p>
        </CardContent>
      </Card>
    </MainLayout>
  );
}

export { AppTerms };
