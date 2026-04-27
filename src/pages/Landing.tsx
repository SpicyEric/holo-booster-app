import ClassicNav from '@/components/ClassicNav';
import ERecht24Badge from '@/components/ERecht24Badge';
import Particles from '@/components/Particles';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Star, CheckCircle } from 'lucide-react';
import eloyoLogo from '@/assets/eloyo-logo.png';
import nfcStampHero from '@/assets/hero-app-mockup.png';
import heroSlide1 from '@/assets/hero-slide-1.png';
import heroSlide2 from '@/assets/hero-slide-2.png';
import heroSlide3 from '@/assets/hero-slide-3.png';
import eloyoAppMockup from '@/assets/eloyo-app-mockup.jpg';
import pushBg from '@/assets/push-bg.jpeg';
import businessNetwork from '@/assets/business-network-v2.png';
import contactPerson from '@/assets/contact-person.png';
import contactCtaButton from '@/assets/contact-cta-button.png';
import howItWorksStamp from '@/assets/howitworks/stamp.png';
import howItWorksPresent from '@/assets/howitworks/present.png';
import howItWorksReferal from '@/assets/howitworks/referal.png';
import { useEffect, useState } from 'react';

import RewardWheel from '@/components/landing/RewardWheel';
import ReferralSection from '@/components/landing/ReferralSection';
import GoogleReviewsCard from '@/components/landing/GoogleReviewsCard';
import SplitText from '@/components/ui/split-text';

/* ─── Rotating animated headline ─── */
const ROTATING_HEADLINES = [
  'Kunden werben Neukunden. Automatisch.',
  'Schreib deinen Kunden direkt aufs Handy.',
  'Verwandle jeden Besuch in echte Treue.',
];

const RotatingHeadline = () => {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fadeOutTimer = setTimeout(() => setVisible(false), 4000);
    const advanceTimer = setTimeout(() => {
      setIndex((prev) => (prev + 1) % ROTATING_HEADLINES.length);
      setVisible(true);
    }, 4500);
    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(advanceTimer);
    };
  }, [index]);

  return (
    <h1 className="font-headline text-5xl md:text-7xl font-extrabold text-[#1a1b21] leading-[1.1] mb-6 tracking-[-0.02em] min-h-[2.4em]">
      <motion.span
        key={index}
        initial={{ opacity: 1 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="inline-block"
      >
        <SplitText
          key={`split-${index}`}
          text={ROTATING_HEADLINES[index]}
          splitType="chars"
          from={{ opacity: 0, y: 40 }}
          to={{ opacity: 1, y: 0 }}
          duration={1.25}
          delay={50}
        />
      </motion.span>
    </h1>
  );
};

/* ─── Apple-style cubic-bezier ─── */
const appleEase = [0.16, 1, 0.3, 1] as const;

/* ─── Glassmorphism reveal: blur(12px) → blur(0) + y:30 → 0 ─── */
const glassReveal: Variants = {
  hidden: { opacity: 0, y: 30, filter: 'blur(12px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: appleEase },
  },
};

const viewportConfig = { once: true, margin: '-80px' as any };

/* ─── Stagger container ─── */
const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

/* ─── Card hover spring ─── */
const cardHover = {
  whileHover: { y: -6, scale: 1.02 },
  transition: { type: 'spring' as const, stiffness: 280, damping: 20 },
};

/* ─── Button interactions ─── */
const buttonMotion = {
  whileHover: { scale: 1.04 },
  whileTap: { scale: 0.97 },
};

/* ─── Rotating hero notifications ─── */
const heroNotifications = [
  { points: '+80 Punkte gesammelt!', text: 'Noch 20 Punkte bis zu deinem kostenlosen Haarschnitt bei Einfach Schön Salon.' },
  { points: '+30 Punkte gesammelt!', text: 'Weiter so! Dein nächster Gratis-Kaffee bei Café Milano ist fast erreicht.' },
  { points: '+50 Punkte gesammelt!', text: 'Noch 10 Punkte bis zu 20% Rabatt bei Blumen Kaiser.' },
  { points: '+15 Punkte gesammelt!', text: 'Du bist auf dem besten Weg zur Gratis-Maniküre bei Beauty Lounge!' },
];

const notificationVariants: Variants = {
  enter: { opacity: 0, y: 20, filter: 'blur(8px)', scale: 0.95 },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', scale: 1, transition: { duration: 0.6, ease: appleEase } },
  exit: { opacity: 0, y: -10, filter: 'blur(8px)', scale: 0.95, transition: { duration: 0.5, ease: appleEase } },
};

const HeroMockupWithNotifications = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = () => {
      // Show for 3s, then hide
      setVisible(true);
      const hideTimer = setTimeout(() => {
        setVisible(false);
        // After 1.5s hidden, advance and show next
        const nextTimer = setTimeout(() => {
          setCurrentIndex(prev => (prev + 1) % heroNotifications.length);
        }, 1500);
        return () => clearTimeout(nextTimer);
      }, 3000);
      return () => clearTimeout(hideTimer);
    };

    cycle();
    const interval = setInterval(cycle, 5000); // 3s visible + 1.5s hidden + buffer
    return () => clearInterval(interval);
  }, []);

  const note = heroNotifications[currentIndex];

  const heroImages = [heroSlide1, heroSlide2, heroSlide3];
  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    const imgInterval = setInterval(() => {
      setImgIndex(prev => (prev + 1) % heroImages.length);
    }, 4500);
    return () => clearInterval(imgInterval);
  }, []);

  return (
    <div className="relative w-full h-[480px] sm:h-[580px] lg:h-[620px]">
      {/* Sliding hero images */}
      {heroImages.map((src, i) => (
        <img
          key={i}
          src={src}
          alt="Eloyo App Mockup"
          className="absolute inset-0 w-full h-full object-contain transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === imgIndex ? 1 : 0 }}
        />
      ))}
    </div>
  );
};

const Landing = () => {
  const navigate = useNavigate();
  const [contactImageOffsetY, setContactImageOffsetY] = useState(20);
  const [contactImageCopied, setContactImageCopied] = useState(false);

  const copyContactImageValues = async () => {
    const values = `CTA Foto Werte:\noffsetY: ${contactImageOffsetY}px\nposition: absolute; bottom: 0; left: 0;\nwidth: mobile 160px / desktop 192px`;
    await navigator.clipboard.writeText(values);
    setContactImageCopied(true);
    window.setTimeout(() => setContactImageCopied(false), 1600);
  };

  // Auto-cycling "hover" highlight for the 3 step cards (1 → 2 → 3 → off → repeat)
  const [activeStep, setActiveStep] = useState<number>(0);
  useEffect(() => {
    // Sequence: card 0 on (1.6s) → off (0.4s) → card 1 on → off → card 2 on → off → loop
    const sequence = [0, -1, 1, -1, 2, -1];
    const onDuration = 900;
    const offDuration = 300;
    let i = 0;
    setActiveStep(sequence[0]);
    const tick = () => {
      i = (i + 1) % sequence.length;
      setActiveStep(sequence[i]);
    };
    const interval = setInterval(() => {
      tick();
    }, 0);
    clearInterval(interval);
    // Use a recursive timeout to alternate durations
    let timeoutId: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const current = sequence[i];
      const delay = current === -1 ? offDuration : onDuration;
      timeoutId = setTimeout(() => {
        i = (i + 1) % sequence.length;
        setActiveStep(sequence[i]);
        schedule();
      }, delay);
    };
    schedule();
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const hash = window.location.hash || "";
    if (hash && (hash.includes('type=recovery') || hash.includes('type=signup'))) {
      navigate(`/auth${hash}`, { replace: true });
    }
  }, [navigate]);

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Backoffice', href: '/backoffice' },
    { label: 'Karriere', href: '/karriere' },
    { label: 'Kontakt', href: '/kontakt' },
    { label: 'Datenschutz', href: '/datenschutz' },
    { label: 'Impressum', href: '/impressum' },
    { label: 'Konto löschen', href: '/konto-loeschen' },
    { label: 'Login', href: '/auth' }
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

      {/* ═══════ HERO ═══════ */}
      <section className="relative z-10 px-6 pt-32 pb-20 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-gradient-to-br from-primary to-secondary blur-[120px] opacity-20 rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] bg-blue-400 blur-[120px] opacity-10 rounded-full pointer-events-none" />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10"
        >
          <motion.div variants={glassReveal} className="text-left">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Stempelkarte 2.0
            </div>
            <RotatingHeadline />
            <p className="text-xl text-[#4a4455] leading-relaxed mb-10 max-w-xl">
              Die erste Kundenkarte, die dir Neukunden bringt und sich selbst verbreitet — ohne dass du etwas tust.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <motion.button
                {...buttonMotion}
                onClick={() => navigate('/kontakt')}
                className="bg-gradient-to-r from-primary to-blue-500 text-white px-8 py-4 rounded-xl text-lg font-bold shadow-xl shadow-primary/25 hover:shadow-[0_20px_60px_rgba(124,58,237,0.25)] transition-shadow"
              >
                Jetzt Termin anfragen
              </motion.button>
              <motion.button
                {...buttonMotion}
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-[#f4f3fb] text-[#1a1b21] border border-[#ccc3d8]/30 px-8 py-4 rounded-xl text-lg font-bold hover:bg-[#eeedf5] transition-colors"
              >
                Unsere Features
              </motion.button>
            </div>
          </motion.div>

          <motion.div variants={glassReveal} className="relative flex justify-center">
            <HeroMockupWithNotifications />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section id="how-it-works" className="relative z-10 py-24 px-6 bg-[#faf8ff]">
        <div className="max-w-7xl mx-auto text-center mb-20">
          <motion.h2
            variants={glassReveal}
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            className="font-headline text-4xl md:text-5xl font-extrabold mb-4 tracking-[-0.02em]"
          >
            So einfach wie Händeschütteln
          </motion.h2>
          <motion.p
            variants={glassReveal}
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            className="text-[#4a4455] text-lg"
          >
            Drei Schritte zu mehr Umsatz und glücklicheren Kunden.
          </motion.p>
        </div>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8 lg:gap-12"
        >
          {[
            { step: '1', title: 'Kunde scannt den Stempel', desc: 'Dein Mitarbeiter hält den Eloyo-Stempel ans Handy des Kunden — ein kurzer Tap und die Punkte sind sofort gutgeschrieben.', bg: howItWorksStamp },
            { step: '2', title: 'Sammelt Punkte, löst Prämien ein', desc: 'Jeder Besuch wird belohnt. Der Kunde wählt selbst was er will — das schafft echte Motivation und er kommt wieder.', bg: howItWorksPresent },
            { step: '3', title: 'Bringt neue Kunden rein', desc: 'Der Kunde teilt seinen persönlichen Einladungslink. Du bekommst Neukunden — ohne einen Euro Werbekosten.', bg: howItWorksReferal },
          ].map((item, i) => {
            const isActive = activeStep === i;
            return (
              <motion.div
                key={i}
                variants={glassReveal}
                animate={{ y: isActive ? -6 : 0, scale: isActive ? 1.02 : 1 }}
                transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                className="relative cursor-default"
              >
                <div
                  className="group relative overflow-hidden bg-[#e8e7ef] rounded-[2rem] p-6 h-56"
                >
                  {/* Background icon — kräftiger im Standardzustand, schwächer beim Hover */}
                  <img
                    src={item.bg}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none select-none absolute inset-0 w-full h-full object-contain p-6 opacity-30 transition-opacity duration-500 group-hover:opacity-15"
                    style={{
                      filter:
                        'brightness(0) saturate(100%) invert(11%) sepia(78%) saturate(5736%) hue-rotate(269deg) brightness(82%) contrast(105%)',
                    }}
                  />
                  <div className="relative z-10 h-full flex flex-col justify-center">
                    <h3 className="font-headline text-xl font-bold transition-transform duration-500 ease-out group-hover:-translate-y-4">
                      {item.step}. {item.title}
                    </h3>
                    <p className="text-[#4a4455] text-sm mt-3 max-h-0 opacity-0 overflow-hidden transition-all duration-500 ease-out group-hover:max-h-40 group-hover:opacity-100 group-hover:-translate-y-2">
                      {item.desc}
                    </p>
                  </div>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-6 -translate-y-1/2 text-[#ccc3d8] text-3xl">→</div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ═══════ FEATURES SECTION HEADER ═══════ */}
      <section className="relative z-10 pt-24 pb-4 px-6 bg-[#faf8ff] text-center">
        <motion.div
          variants={glassReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          className="max-w-4xl mx-auto"
        >
          <span className="text-primary font-bold tracking-widest uppercase text-xs font-headline">Features</span>
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold mt-3 tracking-[-0.02em]">
            Alles was du brauchst — in einem System
          </h2>
        </motion.div>
      </section>

      {/* ═══════ REWARD WHEEL ═══════ */}
      <div id="features">
        <RewardWheel />
      </div>

      {/* ═══════ REFERRAL SECTION ═══════ */}
      <ReferralSection />

      {/* ═══════ PUSH-NACHRICHTEN ═══════ */}
      <section className="relative z-10 py-20 px-6 bg-[#faf8ff]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Phone links */}
          <div className="flex justify-center md:justify-start order-1">
            <div className="w-[260px] sm:w-[280px] h-[540px] sm:h-[580px] bg-slate-900 rounded-[3rem] p-1.5 shadow-2xl border-[3px] border-slate-700">
              <div className="w-full h-full bg-slate-100 rounded-[2.6rem] overflow-hidden relative">
                <img src={pushBg} alt="Eloyo App Push-Benachrichtigung" className="w-full h-full object-cover" />
                <div className="absolute top-1/2 -translate-y-1/2 left-3 right-3 space-y-3">
                  <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-lg animate-bounce">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-md overflow-hidden flex-shrink-0">
                        <img src={eloyoLogo} alt="Eloyo" className="w-full h-full object-contain" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Eloyo · Jetzt</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">Backstube König:</p>
                    <p className="text-xs text-slate-600">Morgen Frühstück für 1 Person – nur 10 €. Komm vorbei! 🥐</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Text rechts */}
          <div className="text-left order-2">
            <span className="text-primary font-bold tracking-widest uppercase text-xs font-headline">
              Push-Nachrichten
            </span>
            <h3 className="font-headline text-3xl md:text-4xl font-extrabold mt-3 mb-5 leading-tight tracking-[-0.02em] text-[#1a1b21]">
              Der direkteste Kanal zu deinen Kunden
            </h3>
            <p className="text-[#4a4455] text-lg leading-relaxed">
              E-Mails werden ignoriert, SMS kosten Geld. Push-Nachrichten erscheinen direkt auf dem Sperrbildschirm – selbst wenn niemand die App öffnet. Neue Angebote, freie Termine, neue Produkte, Sonderaktionen – alles geht.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════ GOOGLE REVIEWS ═══════ */}
      <section className="relative z-10 py-20 px-6 bg-white border-t border-b border-[#ece6ff]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Text links */}
          <div className="text-left order-2 md:order-1">
            <span className="text-primary font-bold tracking-widest uppercase text-xs font-headline">
              Google-Bewertungen
            </span>
            <h3 className="font-headline text-3xl md:text-4xl font-extrabold mt-3 mb-5 leading-tight tracking-[-0.02em] text-[#1a1b21]">
              Mehr Google-Bewertungen, ohne ein Wort zu sagen
            </h3>
            <p className="text-[#4a4455] text-lg leading-relaxed">
              Du musst keinen Kunden mehr bitten, dir eine Bewertung zu hinterlassen. Eloyo macht das automatisch für dich.
            </p>
          </div>

          {/* Live Reviews Card rechts */}
          <div className="order-1 md:order-2">
            <GoogleReviewsCard />
          </div>
        </div>
      </section>

      {/* ═══════ NETZWERK ═══════ */}
      <section className="relative z-10 py-24 px-6 bg-[#faf8ff]">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          className="max-w-7xl mx-auto"
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div variants={glassReveal} className="order-1">
              <img src={businessNetwork} alt="Eloyo Geschäftsnetzwerk" className="w-full h-auto" />
            </motion.div>
            <motion.div variants={glassReveal} className="space-y-6 order-2">
              <h2 className="font-headline text-4xl md:text-5xl font-extrabold leading-tight tracking-[-0.02em]">
                Das Eloyo-Netzwerk: <span className="text-primary">Deine neue Werbefläche</span>
              </h2>
              <p className="text-lg text-[#4a4455]">
                Das Besondere an Eloyo: Du profitierst automatisch von allen anderen Geschäften, die ebenfalls Eloyo nutzen. Kunden, die woanders einkaufen, sehen auch dein Geschäft in der App.
              </p>
              <div className="space-y-4">
                {[
                  { title: 'Neukunden gewinnen', desc: 'Kunden, die bei anderen Eloyo-Geschäften einkaufen, sehen auch dein Angebot in der App.' },
                  { title: 'Neukundenprämien', desc: 'Biete Erstbesucherprämien an und ziehe neue Kunden ins Geschäft.' },
                  { title: 'Lokale Reichweite', desc: 'Je mehr Geschäfte in deiner Umgebung Eloyo nutzen, desto größer wird dein Kundenpotenzial.' },
                ].map((b, i) => (
                  <motion.div
                    key={i}
                    variants={glassReveal}
                  >
                    <h3 className="font-bold text-[#1a1b21]">{b.title}</h3>
                    <p className="text-[#4a4455] text-sm">{b.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>
      {/* ═══════ FINAL CTA ═══════ */}
      <section className="relative z-10 py-10 px-6 pt-24">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={glassReveal}
            initial="hidden"
            whileInView="visible"
            viewport={viewportConfig}
            className="bg-gradient-to-r from-primary to-blue-500 rounded-2xl px-8 py-8 relative text-white flex flex-col sm:flex-row items-center gap-6 min-h-[140px]"
            style={{ overflow: 'visible' }}
          >
            {/* Foto links – unten bündig mit Banner-Kante, ragt oben heraus */}
            <div className="relative shrink-0 w-40 sm:w-48 self-stretch">
              <img
                src={contactPerson}
                alt="Eloyo Geschäftsinhaber"
                className="absolute left-0 bottom-0 w-40 sm:w-48 h-auto object-contain pointer-events-none select-none"
                style={{ transform: 'translateY(32px)', maxHeight: 'none' }}
              />
            </div>

            {/* Text – vertikal zentriert, mit Abstand zum Foto */}
            <div className="flex-1 sm:pl-4">
              <p className="font-headline text-lg font-bold leading-snug">
                Wir kommen persönlich vorbei & richten alles ein.
              </p>
              <p className="text-sm text-white/80">
                Kostenlose Demo – in 10 Min. live erleben.
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

export default Landing;
