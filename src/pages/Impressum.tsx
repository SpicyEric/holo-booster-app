import ClassicNav from '@/components/ClassicNav';
import Particles from '@/components/Particles';
import loyoLogo from '@/assets/loyo-logo.png';

const Impressum = () => {
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
        logo={<img src={loyoLogo} alt="Loyo Logo" className="h-10 w-auto" />}
      />

      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-8">Impressum</h1>
          
          <div className="bg-card border border-border rounded-2xl p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">Angaben gemäß § 5 TMG</h2>
              <p className="text-muted-foreground">
                Klaus Eric Pfadisch<br />
                Fuggerstr. 2<br />
                86836 Untermeitingen
              </p>
              <p className="text-muted-foreground mt-4">
                <strong>Hinweis:</strong> Es handelt sich um ein Einzelunternehmen. 
                "Loyo" ist ein Fantasiename und keine Rechtsform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Vertreten durch</h2>
              <p className="text-muted-foreground">
                Geschäftsführer: Klaus Eric Pfadisch
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Kontakt</h2>
              <p className="text-muted-foreground">
                Telefon: +49 151 62665596<br />
                E-Mail: kontakt@loyo.de
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Registereintrag</h2>
              <p className="text-muted-foreground">
                Es liegt kein Registereintrag vor, da es sich um ein Einzelunternehmen handelt.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Umsatzsteuer-ID</h2>
              <p className="text-muted-foreground">
                Es liegt keine Umsatzsteuer-Identifikationsnummer vor, 
                da noch kein Gewerbe angemeldet wurde.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
              <p className="text-muted-foreground">
                Klaus Eric Pfadisch<br />
                Fuggerstr. 2<br />
                86836 Untermeitingen
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">EU-Streitschlichtung</h2>
              <p className="text-muted-foreground">
                Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
                <a 
                  href="https://ec.europa.eu/consumers/odr/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  https://ec.europa.eu/consumers/odr/
                </a>
                <br />
                Unsere E-Mail-Adresse finden Sie oben im Impressum.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Verbraucherstreitbeilegung/Universalschlichtungsstelle</h2>
              <p className="text-muted-foreground">
                Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer 
                Verbraucherschlichtungsstelle teilzunehmen.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Impressum;
