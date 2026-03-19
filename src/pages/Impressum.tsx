import ClassicNav from '@/components/ClassicNav';
import ERecht24Badge from '@/components/ERecht24Badge';
import Particles from '@/components/Particles';
import eloyoLogo from '@/assets/eloyo-logo.png';

const Impressum = () => {
  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Karriere', href: '/karriere' },
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
        logo={<img src={eloyoLogo} alt="Eloyo Logo" className="h-10 w-auto" />}
      />

      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-8">Impressum</h1>
          
          <div className="bg-card border border-border rounded-2xl p-8 space-y-8">
            <section>
              <p className="text-muted-foreground">
                Klaus Eric Pfadisch<br />
                Eloyo<br />
                Fuggerstr. 2<br />
                86836 Untermeitingen
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Kontakt</h2>
              <p className="text-muted-foreground">
                Telefon: +49 1516 2665596<br />
                E-Mail: support@eloyo.de
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Verbraucher­streit­beilegung/Universal­schlichtungs­stelle</h2>
              <p className="text-muted-foreground">
                Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer 
                Verbraucherschlichtungsstelle teilzunehmen.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Zentrale Kontaktstelle nach dem Digital Services Act – DSA (Verordnung (EU) 2022/265)</h2>
              <p className="text-muted-foreground">
                Unsere zentrale Kontaktstelle für Nutzer und Behörden nach Art. 11, 12 DSA erreichen Sie wie folgt:
              </p>
              <p className="text-muted-foreground mt-2">
                E-Mail: support@eloyo.de
              </p>
              <p className="text-muted-foreground mt-2">
                Sonstige Kontaktwege:<br />
                <a 
                  href="https://eloyo.de/kontakt" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  https://eloyo.de/kontakt
                </a>
              </p>
              <p className="text-muted-foreground mt-2">
                Die für den Kontakt zur Verfügung stehenden Sprachen sind: Deutsch, Englisch.
              </p>
            </section>
          </div>
        </div>
      </div>
      <ERecht24Badge />
    </div>
  );
};

export default Impressum;
