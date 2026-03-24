import { Helmet } from 'react-helmet-async';
import ClassicNav from '@/components/ClassicNav';
import ERecht24Badge from '@/components/ERecht24Badge';
import Particles from '@/components/Particles';
import { AlertTriangle, Trash2, Mail, Smartphone, Settings, UserX } from 'lucide-react';
import eloyoLogo from '@/assets/eloyo-logo.png';

const KontoLoeschen = () => {
  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Kontakt', href: '/kontakt' },
    { label: 'Datenschutz', href: '/datenschutz' },
    { label: 'Impressum', href: '/impressum' },
    { label: 'Login', href: '/auth' },
  ];

  const steps = [
    { icon: Smartphone, text: 'Öffne die Eloyo App auf deinem Smartphone' },
    { icon: Settings, text: 'Gehe zu „Einstellungen"' },
    { icon: UserX, text: 'Gehe zu „Kontoeinstellungen"' },
    { icon: Trash2, text: 'Tippe auf „Konto löschen" und bestätige die Löschung' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Eloyo Konto löschen</title>
        <meta name="description" content="So kannst du dein Eloyo Konto und deine Daten dauerhaft löschen." />
        <link rel="canonical" href="https://eloyo.de/konto-loeschen" />
      </Helmet>

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
        logo={<img src={eloyoLogo} alt="Eloyo Logo" className="h-10 w-auto" />}
      />

      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-4">Konto löschen bei Eloyo</h1>
          <p className="text-xl text-muted-foreground mb-12">
            Du kannst dein Eloyo-Konto jederzeit direkt in der App löschen. 
            Der gesamte Vorgang dauert nur wenige Sekunden und erfordert keine Kontaktaufnahme mit unserem Support.
          </p>

          {/* Schritt-für-Schritt-Anleitung */}
          <div className="bg-card border border-border rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">So löschst du dein Konto</h2>
            <div className="space-y-6">
              {steps.map((step, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {index + 1}
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <step.icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <p className="text-foreground">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Wichtiger Hinweis */}
          <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-8 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-destructive" />
              <h2 className="text-2xl font-bold text-destructive">Wichtiger Hinweis</h2>
            </div>
            <ul className="space-y-3 text-foreground">
              <li className="flex items-start gap-2">
                <span className="text-destructive font-bold mt-0.5">•</span>
                <span>Diese Aktion kann <strong>nicht rückgängig</strong> gemacht werden.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive font-bold mt-0.5">•</span>
                <span>Alle gesammelten <strong>Punkte und Stempel</strong> gehen unwiderruflich verloren.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive font-bold mt-0.5">•</span>
                <span>Dein Konto wird <strong>dauerhaft und vollständig gelöscht</strong>.</span>
              </li>
            </ul>
          </div>

          {/* Datenlöschung */}
          <div className="bg-card border border-border rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-4">Was passiert mit deinen Daten?</h2>
            <p className="text-muted-foreground mb-4">
              Wir nehmen den Schutz deiner Daten ernst. Bei der Kontolöschung gilt Folgendes:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">•</span>
                <span>Alle <strong>persönlichen Daten</strong> (Name, E-Mail, Geburtsdatum, Profilbild) werden vollständig und unwiderruflich gelöscht.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">•</span>
                <span>Dein Konto kann nach der Löschung <strong>nicht wiederhergestellt</strong> werden.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">•</span>
                <span>Anonymisierte Nutzungsdaten können zu <strong>statistischen Zwecken</strong> gespeichert bleiben. Diese lassen keinen Rückschluss auf deine Person zu.</span>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="bg-muted/50 border border-border rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">Probleme beim Löschen?</h2>
            </div>
            <p className="text-muted-foreground">
              Falls du Probleme beim Löschen deines Kontos hast oder weitere Fragen zur Datenverarbeitung hast, 
              kontaktiere uns jederzeit unter:{' '}
              <a href="mailto:support@eloyo.de" className="text-primary hover:underline font-medium">
                support@eloyo.de
              </a>
            </p>
          </div>
        </div>
      </div>
      <ERecht24Badge />
    </div>
  );
};

export default KontoLoeschen;
