import ClassicNav from '@/components/ClassicNav';
import ERecht24Badge from '@/components/ERecht24Badge';
import Particles from '@/components/Particles';
import { motion, type Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import {
  Store,
  Star,
  Gift,
  Share2,
  UserPlus,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import eloyoLogo from '@/assets/eloyo-logo.png';
import businessNetwork from '@/assets/business-network-v2.png';
import contactPerson from '@/assets/contact-person.png';

const appleEase = [0.16, 1, 0.3, 1] as const;

const glassReveal: Variants = {
  hidden: { opacity: 0, y: 30, filter: 'blur(12px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: appleEase },
  },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const viewportConfig = { once: true, margin: '-80px' as any };

const buttonMotion = {
  whileHover: { scale: 1.04 },
  whileTap: { scale: 0.97 },
};

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Empfehlungen', href: '/empfehlungen' },
  { label: 'Backoffice', href: '/backoffice' },
  { label: 'Karriere', href: '/karriere' },
  { label: 'Kontakt', href: '/kontakt' },
  { label: 'Datenschutz', href: '/datenschutz' },
  { label: 'Impressum', href: '/impressum' },
  { label: 'Konto löschen', href: '/konto-loeschen' },
  { label: 'Login', href: '/auth' },
];

/* ─── Schneeball-Rechner ─── */
const SnowballCalculator = () => {
  const [stammkunden, setStammkunden] = useState(50);

  const empfehlungen = useMemo(() => Math.round(stammkunden * 0.15), [stammkunden]);
  const neueStammkunden = useMemo(() => Math.round(empfehlungen * 0.6), [empfehlungen]);

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-[#ece6ff] shadow-[0_10px_40px_rgba(124,58,237,0.08)] p-8 md:p-10">
      <label className="block">
        <div className="flex justify-between items-baseline mb-3">
          <span className="font-headline font-bold text-[#1a1b21] text-lg">
            Wie viele Stammkunden hast du?
          </span>
          <span className="font-headline text-3xl font-extrabold text-primary tabular-nums">
            {stammkunden}
          </span>
        </div>
        <input
          type="range"
          min={10}
          max={500}
          step={1}
          value={stammkunden}
          onChange={(e) => setStammkunden(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[#ece6ff] accent-primary"
        />
        <div className="flex justify-between text-xs text-[#7b7487] mt-2 font-body">
          <span>10</span>
          <span>500</span>
        </div>
      </label>

      <div className="grid sm:grid-cols-3 gap-4 mt-8">
        {[
          { label: 'Davon empfehlen realistisch 15%:', value: empfehlungen },
          { label: 'Das sind neue Kunden pro Monat:', value: empfehlungen },
          { label: 'Davon werden ca. 60% Stammkunden:', value: neueStammkunden },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-[#faf8ff] rounded-2xl p-5 border border-[#ece6ff] text-center"
          >
            <div className="text-[#4a4455] text-xs font-body mb-2 leading-snug min-h-[2.5em]">
              {stat.label}
            </div>
            <div className="font-headline text-4xl font-extrabold text-primary tabular-nums">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-[#7b7487] bg-[#f4f3fb] rounded-xl px-4 py-3 leading-relaxed">
        <strong className="text-[#4a4455]">Basis:</strong> 15 % Empfehlungsrate ist ein konservativer
        Wert aus realen Kundenbindungsprogrammen. Mit guten Prämien liegt die Rate deutlich höher.
      </p>
    </div>
  );
};

const Empfehlungen = () => {
  const navigate = useNavigate();

  // 🔧 TEMP: Mobile-only Y-Offset für das Foto im CTA-Banner
  const [mobilePhotoOffset, setMobilePhotoOffset] = useState<number>(-32);

  const winners = [
    {
      icon: Store,
      title: 'Für dich als Geschäft',
      text:
        'Du bekommst echte Neukunden — ohne Werbebudget, ohne Aufwand. Der Bonus wird erst ausgezahlt wenn der eingeladene Freund wirklich bei dir einkauft und Punkte sammelt.',
    },
    {
      icon: Star,
      title: 'Für deine Stammkunden',
      text:
        'Sie schicken einem Freund einen Link per WhatsApp. Wenn der Freund kommt und kauft, bekommen sie Bonuspunkte — genug für eine wirklich gute Prämie nach nur 2 erfolgreichen Empfehlungen.',
    },
    {
      icon: Gift,
      title: 'Für den eingeladenen Freund',
      text:
        'Er öffnet den Link, landet direkt in der App, sieht die Prämien deines Ladens und bekommt beim ersten Stempel sofort doppelte Punkte als Willkommensbonus.',
    },
  ];

  const steps = [
    {
      icon: Share2,
      title: 'Stammkunde tippt auf Teilen',
      text: 'Mit einem Tap schickt er seinem Freund einen persönlichen Einladungslink per WhatsApp.',
    },
    {
      icon: UserPlus,
      title: 'Freund kommt innerhalb von 7 Tagen',
      text:
        'Der Freund öffnet den Link, sieht die Prämien und sammelt seinen ersten Stempel. Erst dann zählt die Einladung.',
    },
    {
      icon: CheckCircle2,
      title: 'Beide bekommen ihren Bonus automatisch',
      text:
        'Der Eingeladene bekommt doppelte Punkte. Der Einladende bekommt seinen Bonus. Alles läuft automatisch — du musst nichts tun.',
    },
  ];

  const protections = [
    'Nur echte Neukunden können eingeladen werden — wer schon Punkte hat, kann nicht nochmal eingeladen werden',
    'Bonus wird erst ausgezahlt wenn der Freund wirklich einkauft und seinen ersten Stempel sammelt',
    'Jede Person kann nur von einem Freund gleichzeitig eingeladen werden — kein Spam möglich',
    'Device-Fingerprint erkennt Missbrauchsversuche automatisch im Hintergrund',
  ];

  return (
    <div className="landing-page-shell bg-[#faf8ff] text-[#1a1b21] min-h-screen w-full font-body">
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

      {/* ═══════ SECTION 1 — STORY HERO ═══════ */}
      <section className="relative z-10 px-6 pt-32 pb-20 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-gradient-to-br from-primary to-secondary blur-[120px] opacity-20 rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] bg-blue-400 blur-[120px] opacity-10 rounded-full pointer-events-none" />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          className="max-w-5xl mx-auto text-center relative z-10"
        >
          <motion.div variants={glassReveal}>
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Empfehlungssystem
            </div>
          </motion.div>

          <motion.h1
            variants={glassReveal}
            className="font-headline text-4xl md:text-6xl font-extrabold text-[#1a1b21] leading-[1.1] mb-6 tracking-[-0.02em]"
          >
            <span className="text-primary">Stell dir vor:</span>{' '}
            Du gehst zum Haarschnitt kostenlos,
            <br />
            <span className="text-primary">nur weil du zwei Freunde mitgebracht hast.</span>
          </motion.h1>

          <motion.p
            variants={glassReveal}
            className="text-xl text-[#4a4455] leading-relaxed mb-10 max-w-3xl mx-auto"
          >
            Genau das passiert, wenn deine Kunden das Eloyo Empfehlungssystem nutzen. Alle gewinnen
            — du, deine Stammkunden, und ihre Freunde.
          </motion.p>

          <motion.div variants={glassReveal} className="flex justify-center mb-16">
            <motion.button
              {...buttonMotion}
              onClick={() => navigate('/kontakt')}
              className="bg-gradient-to-r from-primary to-blue-500 text-white px-8 py-4 rounded-xl text-lg font-bold shadow-xl shadow-primary/25 hover:shadow-[0_20px_60px_rgba(124,58,237,0.25)] transition-shadow"
            >
              Jetzt kostenlose Demo anfragen
            </motion.button>
          </motion.div>

          <motion.div variants={glassReveal} className="flex justify-center">
            <img
              src={businessNetwork}
              alt="Eloyo Empfehlungsnetzwerk"
              className="w-full max-w-3xl h-auto"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════ SECTION 2 — WIN WIN WIN ═══════ */}
      <section className="relative z-10 py-24 px-6 bg-[#faf8ff]">
        <div className="max-w-7xl mx-auto text-center mb-16">
          <motion.h2
            variants={glassReveal}
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            className="font-headline text-4xl md:text-5xl font-extrabold tracking-[-0.02em]"
          >
            Drei Gewinner. Eine Einladung.
          </motion.h2>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8"
        >
          {winners.map((w, i) => {
            const Icon = w.icon;
            return (
              <motion.div
                key={i}
                variants={glassReveal}
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                className="bg-white border border-[#ece6ff] rounded-[2rem] p-8 shadow-[0_4px_20px_rgba(124,58,237,0.05)]"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Icon className="w-7 h-7 text-primary" strokeWidth={2} />
                </div>
                <h3 className="font-headline text-xl font-bold mb-3 text-[#1a1b21]">{w.title}</h3>
                <p className="text-[#4a4455] text-base leading-relaxed">{w.text}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ═══════ SECTION 3 — SO FUNKTIONIERT'S ═══════ */}
      <section className="relative z-10 py-24 px-6 bg-white border-t border-b border-[#ece6ff]">
        <div className="max-w-7xl mx-auto text-center mb-16">
          <motion.h2
            variants={glassReveal}
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            className="font-headline text-4xl md:text-5xl font-extrabold tracking-[-0.02em]"
          >
            So einfach läuft eine Empfehlung ab
          </motion.h2>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8 lg:gap-12"
        >
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={i} variants={glassReveal} className="relative">
                <div className="bg-[#faf8ff] border border-[#ece6ff] rounded-[2rem] p-8 h-full">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-headline font-bold text-lg">
                      {i + 1}
                    </div>
                    <Icon className="w-6 h-6 text-primary" strokeWidth={2} />
                  </div>
                  <h3 className="font-headline text-xl font-bold mb-3 text-[#1a1b21]">{s.title}</h3>
                  <p className="text-[#4a4455] text-base leading-relaxed">{s.text}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:flex absolute top-1/2 -right-6 -translate-y-1/2 text-[#ccc3d8] items-center justify-center">
                    <ArrowRight className="w-8 h-8" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ═══════ SECTION 4 — DIE KRAFT VON 2 EMPFEHLUNGEN ═══════ */}
      <section className="relative z-10 py-24 px-6 bg-[#faf8ff]">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center"
        >
          <motion.div variants={glassReveal} className="text-left">
            <span className="text-primary font-bold tracking-widest uppercase text-xs font-headline">
              Warum es wirklich funktioniert
            </span>
            <h2 className="font-headline text-3xl md:text-4xl font-extrabold mt-3 mb-6 leading-tight tracking-[-0.02em] text-[#1a1b21]">
              2 Empfehlungen. Eine richtig gute Prämie.
            </h2>
            <p className="text-[#4a4455] text-lg leading-relaxed mb-4">
              Das Geheimnis liegt in der Punktekonfiguration. Als Eloyo-Partner richtest du einen
              Einlader-Bonus ein, der so attraktiv ist, dass sich 2 erfolgreiche Empfehlungen
              wirklich lohnen — mit einer Prämie, die deine Kunden wirklich wollen. Nicht irgendein
              Mini-Bonus, sondern etwas das Motivation schafft.
            </p>
            <p className="text-[#4a4455] text-lg leading-relaxed">
              Der Eingeladene sieht beim Öffnen des Links sofort die Prämien deines Ladens und dass
              er doppelte Punkte bekommt. Wenn die Prämien gut sind, will er schnell sammeln — und
              kommt wieder. Das ist der Moment wo aus einem eingeladenen Freund ein neuer
              Stammkunde wird.
            </p>
          </motion.div>

          <motion.div variants={glassReveal} className="relative">
            <div className="relative bg-gradient-to-br from-primary/15 via-primary/10 to-blue-400/10 backdrop-blur-sm border border-primary/20 rounded-[2.5rem] p-10 md:p-12 text-center shadow-[0_20px_80px_rgba(124,58,237,0.15)]">
              <div className="font-headline text-[8rem] md:text-[10rem] leading-none font-extrabold text-primary tracking-tighter">
                2
              </div>
              <div className="font-headline text-xl md:text-2xl font-bold text-[#1a1b21] mt-2">
                erfolgreiche Empfehlungen
              </div>

              <div className="my-8 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

              <div className="font-headline text-lg md:text-xl font-bold text-[#1a1b21] leading-snug">
                = eine wirklich gute Prämie
                <br />
                für deinen Stammkunden
              </div>

              <p className="mt-8 text-xs text-[#7b7487] leading-relaxed max-w-sm mx-auto">
                Du entscheidest selbst welche Prämien du anbietest — wir helfen dir dabei, sie so zu
                konfigurieren dass der Anreiz maximal ist.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════ SECTION 5 — KEIN MISSBRAUCH MÖGLICH ═══════ */}
      <section className="relative z-10 py-24 px-6 bg-white border-t border-b border-[#ece6ff]">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            variants={glassReveal}
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6"
          >
            <ShieldCheck className="w-8 h-8" strokeWidth={2} />
          </motion.div>
          <motion.h2
            variants={glassReveal}
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            className="font-headline text-4xl md:text-5xl font-extrabold mb-12 tracking-[-0.02em]"
          >
            Du bist auf jeder Seite geschützt.
          </motion.h2>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            className="grid md:grid-cols-2 gap-x-10 gap-y-6 text-left"
          >
            {protections.map((p, i) => (
              <motion.div key={i} variants={glassReveal} className="flex items-start gap-4">
                <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <CheckCircle2 className="w-5 h-5 text-primary" strokeWidth={2.5} />
                </div>
                <p className="text-[#4a4455] text-base leading-relaxed">{p}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════ SECTION 6 — SCHNEEBALL-RECHNER ═══════ */}
      <section className="relative z-10 py-24 px-6 bg-[#faf8ff]">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <motion.h2
            variants={glassReveal}
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            className="font-headline text-4xl md:text-5xl font-extrabold mb-4 tracking-[-0.02em]"
          >
            Wie viele Neukunden bringt dir das pro Monat?
          </motion.h2>
          <motion.p
            variants={glassReveal}
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            className="text-[#4a4455] text-lg"
          >
            Verschieb den Regler und sieh selbst was passiert wenn nur ein kleiner Teil deiner
            Stammkunden einen Freund einlädt.
          </motion.p>
        </div>
        <motion.div
          variants={glassReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
        >
          <SnowballCalculator />
        </motion.div>
      </section>

      {/* ═══════ SECTION 7 — WIR RICHTEN ALLES EIN ═══════ */}
      <section className="relative z-10 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={glassReveal}
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            className="bg-gradient-to-r from-primary to-blue-500 rounded-2xl px-8 py-8 relative text-white flex flex-col sm:flex-row items-center gap-6 min-h-[140px]"
            style={{ overflow: 'visible' }}
          >
            <div className="relative shrink-0 w-40 sm:w-48 self-stretch">
              <img
                src={contactPerson}
                alt="Eric von Eloyo"
                className="absolute left-0 bottom-0 w-40 sm:w-48 h-auto object-contain pointer-events-none select-none"
                style={{ transform: 'translateY(32px)', maxHeight: 'none' }}
              />
            </div>

            <div className="flex-1 sm:pl-4">
              <p className="font-headline text-lg font-bold leading-snug">
                Wir kommen persönlich vorbei und konfigurieren dein Empfehlungssystem so, dass der
                Anreiz für deine Kunden maximal ist — abgestimmt auf deine Prämien, deinen Laden,
                deine Zielgruppe.
              </p>
              <p className="text-sm text-white/80 mt-1">
                Kostenlose Demo — in 10 Min. live erleben.
              </p>
            </div>

            <div className="sm:ml-auto shrink-0">
              <motion.button
                {...buttonMotion}
                onClick={() => navigate('/kontakt')}
                className="bg-white text-primary px-6 py-3 rounded-xl text-sm font-bold shadow-lg hover:shadow-[0_10px_30px_rgba(255,255,255,0.25)] transition-shadow whitespace-nowrap"
              >
                Jetzt Termin anfragen
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <motion.footer
        variants={glassReveal}
        initial="hidden"
        whileInView="visible"
        viewport={viewportConfig}
        className="relative z-10 bg-[#f9f8fc] py-12 px-6"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
            <img src={eloyoLogo} alt="Eloyo Logo" className="h-8 w-auto" />
            <div className="flex flex-wrap justify-center gap-8 font-body text-sm">
              <a href="/datenschutz" className="text-[#4a4455] hover:text-primary transition-colors">Datenschutz</a>
              <a href="/impressum" className="text-[#4a4455] hover:text-primary transition-colors">Impressum</a>
              <a href="/kontakt" className="text-[#4a4455] hover:text-primary transition-colors">Kontakt</a>
              <a href="https://instagram.com/eloyo.de" target="_blank" rel="noopener noreferrer" className="text-[#4a4455] hover:text-primary transition-colors">Instagram</a>
              <a href="mailto:support@eloyo.de" className="text-[#4a4455] hover:text-primary transition-colors">support@eloyo.de</a>
            </div>
          </div>
          <div className="text-center text-[#7b7487] text-sm">
            © {new Date().getFullYear()} Eloyo. Kundenbindung für lokale Geschäfte – einfach, digital, direkt.
          </div>
        </div>
      </motion.footer>

      <ERecht24Badge />
    </div>
  );
};

export default Empfehlungen;
