import ClassicNav from '@/components/ClassicNav';
import Particles from '@/components/Particles';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight } from 'lucide-react';
import qraitLogo from '@/assets/qrait-logo-full.png';

const Datenschutz = () => {
  const navigate = useNavigate();

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Kontakt', href: '/kontakt' },
    { label: 'Datenschutz', href: '/datenschutz' },
    { label: 'Impressum', href: '/impressum' },
    { label: 'Login', href: '/auth' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Particles 
        particleColors={['#8B5CF6', '#3B82F6', '#8B5CF6']}
        particleCount={100}
        particleSpread={8}
        speed={0.05}
        particleBaseSize={100}
        sizeRandomness={1.5}
        moveParticlesOnHover={true}
        alphaParticles={true}
        disableRotation={false}
        cameraDistance={20}
      />
      
      <ClassicNav 
        items={navItems}
        logo={<img src={qraitLogo} alt="QRait Logo" className="h-10 w-auto" />}
      />

      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-8">Datenschutzerklärung</h1>
          
          <div className="bg-card border border-border rounded-2xl p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">1. Datenschutz auf einen Blick</h2>
              
              <h3 className="text-xl font-semibold mb-3">Allgemeine Hinweise</h3>
              <p className="text-muted-foreground mb-4">
                Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen 
                Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit 
                denen Sie persönlich identifiziert werden können.
              </p>

              <h3 className="text-xl font-semibold mb-3">Datenerfassung auf dieser Website</h3>
              <p className="text-muted-foreground mb-4">
                Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten 
                können Sie dem Impressum dieser Website entnehmen.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. Hosting</h2>
              <p className="text-muted-foreground mb-4">
                Diese Website wird bei einem externen Dienstleister gehostet (Hoster). Die personenbezogenen Daten, 
                die auf dieser Website erfasst werden, werden auf den Servern des Hosters gespeichert.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. Allgemeine Hinweise und Pflichtinformationen</h2>
              
              <h3 className="text-xl font-semibold mb-3">Datenschutz</h3>
              <p className="text-muted-foreground mb-4">
                Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln 
                Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften 
                sowie dieser Datenschutzerklärung.
              </p>

              <p className="text-muted-foreground mb-4">
                <strong>Hinweis zur verantwortlichen Stelle</strong> Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:
              </p>
              <p className="text-muted-foreground mb-4">
                Klaus Eric Pfadisch<br />
                Fuggerstr. 2<br />
                86836 Untermeitingen<br />
                <br />
                Telefon: +49 151 62665596<br />
                E-Mail: kontakt@qrait.de
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. Datenerfassung auf dieser Website</h2>
              
              <h3 className="text-xl font-semibold mb-3">Kontaktformular</h3>
              <p className="text-muted-foreground mb-4">
                Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben aus dem 
                Anfrageformular inklusive der von Ihnen dort angegebenen Kontaktdaten zwecks Bearbeitung 
                der Anfrage und für den Fall von Anschlussfragen bei uns gespeichert.
              </p>

              <h3 className="text-xl font-semibold mb-3">QR-Code Scans</h3>
              <p className="text-muted-foreground mb-4">
                Beim Scannen unserer QR-Codes erfassen wir folgende Daten:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2">
                <li>Zeitpunkt des Scans</li>
                <li>Telefonnummer (optional, bei Opt-in)</li>
                <li>E-Mail-Adresse (optional, bei Opt-in)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Ihre Rechte</h2>
              <p className="text-muted-foreground mb-4">
                Sie haben folgende Rechte:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2">
                <li>Recht auf Auskunft über Ihre bei uns gespeicherten personenbezogenen Daten</li>
                <li>Recht auf Berichtigung unrichtiger Daten</li>
                <li>Recht auf Löschung Ihrer Daten</li>
                <li>Recht auf Einschränkung der Verarbeitung</li>
                <li>Recht auf Datenübertragbarkeit</li>
                <li>Widerspruchsrecht gegen die Verarbeitung</li>
              </ul>
              <p className="text-muted-foreground mb-4">
                <strong>Datenlöschung:</strong> Sie können Ihre Daten jederzeit selbstständig über unsere{' '}
                <button 
                  onClick={() => navigate('/delete')}
                  className="text-primary hover:underline font-medium"
                >
                  Datenlöschungs-Seite
                </button> entfernen.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Dauer der Datenspeicherung</h2>
              <p className="text-muted-foreground mb-4">
                Ihre Daten werden nur so lange gespeichert, wie dies für den jeweiligen Zweck erforderlich ist. 
                Sie können Ihre Daten jederzeit löschen lassen.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. Cookies</h2>
              <p className="text-muted-foreground mb-4">
                Unsere Website verwendet Cookies. Cookies sind kleine Textdateien, die auf Ihrem Endgerät 
                gespeichert werden und die Ihr Browser speichert. Sie dienen dazu, unser Angebot 
                nutzerfreundlicher zu machen.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Datenschutz;
