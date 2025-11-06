import PillNav from '@/components/PillNav';
import { DotGrid } from '@/components/DotGrid';
import logo from '@/assets/qrait-logo.svg';

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
      <DotGrid />
      <div className="fixed top-0 left-0 right-0 flex justify-center z-50">
        <PillNav
          logo={logo}
          logoAlt="QRAIT Logo"
          items={navItems}
          baseColor="hsl(262 83% 58%)"
          pillColor="#ffffff"
          hoveredPillTextColor="hsl(262 83% 58%)"
          pillTextColor="hsl(262 83% 58%)"
        />
      </div>

      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-8">Impressum</h1>
          
          <div className="bg-card border border-border rounded-2xl p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">Angaben gemäß § 5 TMG</h2>
              <p className="text-muted-foreground">
                QRAIT GmbH<br />
                Musterstraße 123<br />
                12345 Musterstadt
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Vertreten durch</h2>
              <p className="text-muted-foreground">
                Geschäftsführer: Max Mustermann
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Kontakt</h2>
              <p className="text-muted-foreground">
                Telefon: +49 123 456 7890<br />
                E-Mail: info@qrait.de
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Registereintrag</h2>
              <p className="text-muted-foreground">
                Eintragung im Handelsregister.<br />
                Registergericht: Amtsgericht Musterstadt<br />
                Registernummer: HRB 12345
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Umsatzsteuer-ID</h2>
              <p className="text-muted-foreground">
                Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
                DE123456789
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
              <p className="text-muted-foreground">
                Max Mustermann<br />
                Musterstraße 123<br />
                12345 Musterstadt
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
