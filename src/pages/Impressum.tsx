import PageLayout, { glassReveal, viewportConfig } from '@/components/PageLayout';
import { motion } from 'framer-motion';

const Impressum = () => {
  return (
    <PageLayout>
      <section className="relative z-10 pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={glassReveal} initial="hidden" animate="visible">
            <h1 className="font-headline text-4xl sm:text-5xl font-extrabold tracking-[-0.02em] mb-8">Impressum</h1>
          </motion.div>

          <motion.div variants={glassReveal} initial="hidden" whileInView="visible" viewport={viewportConfig}>
            <div className="bg-white rounded-2xl p-8 shadow-sm space-y-8">
              <section>
                <p className="text-[#4a4455]">
                  Klaus Eric Pfadisch<br />
                  Eloyo<br />
                  Fuggerstr. 2<br />
                  86836 Untermeitingen
                </p>
              </section>

              <section>
                <h2 className="font-headline text-2xl font-bold mb-4">Kontakt</h2>
                <p className="text-[#4a4455]">
                  Telefon: +49 1516 2665596<br />
                  E-Mail: support@eloyo.de
                </p>
              </section>

              <section>
                <h2 className="font-headline text-2xl font-bold mb-4">Verbraucher­streit­beilegung/Universal­schlichtungs­stelle</h2>
                <p className="text-[#4a4455]">
                  Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
                  Verbraucherschlichtungsstelle teilzunehmen.
                </p>
              </section>

              <section>
                <h2 className="font-headline text-2xl font-bold mb-4">Zentrale Kontaktstelle nach dem Digital Services Act – DSA (Verordnung (EU) 2022/265)</h2>
                <p className="text-[#4a4455]">
                  Unsere zentrale Kontaktstelle für Nutzer und Behörden nach Art. 11, 12 DSA erreichen Sie wie folgt:
                </p>
                <p className="text-[#4a4455] mt-2">E-Mail: support@eloyo.de</p>
                <p className="text-[#4a4455] mt-2">
                  Sonstige Kontaktwege:<br />
                  <a href="https://eloyo.de/kontakt" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    https://eloyo.de/kontakt
                  </a>
                </p>
                <p className="text-[#4a4455] mt-2">
                  Die für den Kontakt zur Verfügung stehenden Sprachen sind: Deutsch, Englisch.
                </p>
              </section>
            </div>
          </motion.div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Impressum;
