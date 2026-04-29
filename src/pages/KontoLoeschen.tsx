import { Helmet } from 'react-helmet-async';
import PageLayout, { glassReveal, viewportConfig } from '@/components/PageLayout';
import { motion } from 'framer-motion';
import { AlertTriangle, Trash2, Mail, Smartphone, Settings, UserX } from 'lucide-react';

const KontoLoeschen = () => {
  const steps = [
    { icon: Smartphone, text: 'Öffne die Eloyo App auf deinem Smartphone' },
    { icon: Settings, text: 'Gehe zu „Einstellungen"' },
    { icon: UserX, text: 'Gehe zu „Kontoeinstellungen"' },
    { icon: Trash2, text: 'Tippe auf „Konto löschen" und bestätige die Löschung' },
  ];

  return (
    <PageLayout>
      <Helmet>
        <title>Eloyo Konto löschen</title>
        <meta name="description" content="So kannst du dein Eloyo Konto und deine Daten dauerhaft löschen." />
        <link rel="canonical" href="https://eloyo.de/konto-loeschen" />
      </Helmet>

      <section className="relative z-10 pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={glassReveal} initial="hidden" animate="visible">
            <h1 className="font-headline text-4xl sm:text-5xl font-extrabold tracking-[-0.02em] mb-4">Konto löschen bei Eloyo</h1>
            <p className="text-lg text-[#4a4455] mb-12 leading-relaxed">
              Du kannst dein Eloyo-Konto jederzeit direkt in der App löschen.
              Der gesamte Vorgang dauert nur wenige Sekunden und erfordert keine Kontaktaufnahme mit unserem Support.
            </p>
          </motion.div>

          {/* Schritt-für-Schritt-Anleitung */}
          <motion.div variants={glassReveal} initial="hidden" whileInView="visible" viewport={viewportConfig}>
            <div className="bg-white rounded-2xl p-8 shadow-sm mb-8">
              <h2 className="font-headline text-2xl font-bold mb-6">So löschst du dein Konto</h2>
              <div className="space-y-6">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {index + 1}
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <step.icon className="w-5 h-5 text-[#7b7487] flex-shrink-0" />
                      <p>{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Wichtiger Hinweis */}
          <motion.div variants={glassReveal} initial="hidden" whileInView="visible" viewport={viewportConfig}>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                <h2 className="font-headline text-2xl font-bold text-red-600">Wichtiger Hinweis</h2>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-2"><span className="text-red-500 font-bold mt-0.5">•</span><span>Diese Aktion kann <strong>nicht rückgängig</strong> gemacht werden.</span></li>
                <li className="flex items-start gap-2"><span className="text-red-500 font-bold mt-0.5">•</span><span>Alle gesammelten <strong>Punkte und Karte</strong> gehen unwiderruflich verloren.</span></li>
                <li className="flex items-start gap-2"><span className="text-red-500 font-bold mt-0.5">•</span><span>Dein Konto wird <strong>dauerhaft und vollständig gelöscht</strong>.</span></li>
              </ul>
            </div>
          </motion.div>

          {/* Datenlöschung */}
          <motion.div variants={glassReveal} initial="hidden" whileInView="visible" viewport={viewportConfig}>
            <div className="bg-white rounded-2xl p-8 shadow-sm mb-8">
              <h2 className="font-headline text-2xl font-bold mb-4">Was passiert mit deinen Daten?</h2>
              <p className="text-[#4a4455] mb-4">Wir nehmen den Schutz deiner Daten ernst. Bei der Kontolöschung gilt Folgendes:</p>
              <ul className="space-y-3 text-[#4a4455]">
                <li className="flex items-start gap-2"><span className="text-primary font-bold mt-0.5">•</span><span>Alle <strong>persönlichen Daten</strong> (Name, E-Mail, Geburtsdatum, Profilbild) werden vollständig und unwiderruflich gelöscht.</span></li>
                <li className="flex items-start gap-2"><span className="text-primary font-bold mt-0.5">•</span><span>Dein Konto kann nach der Löschung <strong>nicht wiederhergestellt</strong> werden.</span></li>
                <li className="flex items-start gap-2"><span className="text-primary font-bold mt-0.5">•</span><span>Anonymisierte Nutzungsdaten können zu <strong>statistischen Zwecken</strong> gespeichert bleiben. Diese lassen keinen Rückschluss auf deine Person zu.</span></li>
              </ul>
            </div>
          </motion.div>

          {/* Support */}
          <motion.div variants={glassReveal} initial="hidden" whileInView="visible" viewport={viewportConfig}>
            <div className="bg-[#f4f3fb] rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <Mail className="w-6 h-6 text-primary" />
                <h2 className="font-headline text-2xl font-bold">Probleme beim Löschen?</h2>
              </div>
              <p className="text-[#4a4455]">
                Falls du Probleme beim Löschen deines Kontos hast oder weitere Fragen zur Datenverarbeitung hast,
                kontaktiere uns jederzeit unter:{' '}
                <a href="mailto:support@eloyo.de" className="text-primary hover:underline font-medium">support@eloyo.de</a>
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </PageLayout>
  );
};

export default KontoLoeschen;
