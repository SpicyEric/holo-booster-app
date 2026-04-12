import ClassicNav from '@/components/ClassicNav';
import ERecht24Badge from '@/components/ERecht24Badge';
import Particles from '@/components/Particles';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Star, CheckCircle } from 'lucide-react';
import eloyoLogo from '@/assets/eloyo-logo.png';
import nfcStampHero from '@/assets/nfc-stamp-hero.png';
import eloyoAppMockup from '@/assets/eloyo-app-mockup.jpg';
import businessNetwork from '@/assets/business-network.png';
import heroPersonQr from '@/assets/hero-person-qr.png';
import contactCtaButton from '@/assets/contact-cta-button.png';
import { useEffect } from 'react';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const Landing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash || "";
    if (hash && (hash.includes('type=recovery') || hash.includes('type=signup'))) {
      navigate(`/auth${hash}`, { replace: true });
    }
  }, [navigate]);

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Karriere', href: '/karriere' },
    { label: 'Kontakt', href: '/kontakt' },
    { label: 'Datenschutz', href: '/datenschutz' },
    { label: 'Impressum', href: '/impressum' },
    { label: 'Konto löschen', href: '/konto-loeschen' },
    { label: 'Login', href: '/auth' }
  ];

  return (
    <div className="bg-[#faf8ff] text-[#1a1b21] min-h-screen font-body overflow-x-hidden">
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
        {/* Ambient glow blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-gradient-to-br from-primary to-secondary blur-[120px] opacity-20 rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] bg-blue-400 blur-[120px] opacity-10 rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div {...fadeUp} className="text-left">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Digitales Stempelsystem 2.0
            </div>
            <h1 className="font-headline text-5xl md:text-7xl font-extrabold text-[#1a1b21] leading-[1.1] mb-6 tracking-[-0.02em]">
              Schreib deinen Stammkunden direkt aufs Handy
            </h1>
            <p className="text-xl text-[#4a4455] leading-relaxed mb-10 max-w-xl">
              Verwandle anonyme Laufkundschaft in loyale Fans. Mit unserem NFC-Stempelsystem kommunizierst du so einfach wie noch nie – direkt per Push-Nachricht.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate('/kontakt')}
                className="bg-gradient-to-r from-primary to-blue-500 text-white px-8 py-4 rounded-xl text-lg font-bold shadow-xl shadow-primary/25 hover:scale-105 transition-transform active:scale-95"
              >
                Jetzt Demo ansehen
              </button>
              <button
                onClick={() => {
                  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-[#f4f3fb] text-[#1a1b21] border border-[#ccc3d8]/30 px-8 py-4 rounded-xl text-lg font-bold hover:bg-[#eeedf5] transition-colors"
              >
                Wie es funktioniert
              </button>
            </div>
          </motion.div>

          <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.2 }} className="relative">
            <div className="bg-white/40 backdrop-blur-2xl rounded-[2.5rem] p-4 sm:p-8 lg:p-12 shadow-2xl relative overflow-hidden group border border-[#ccc3d8]/15">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-blue-500 opacity-5 group-hover:opacity-10 transition-opacity" />
              <div className="relative bg-white rounded-[2rem] p-2 shadow-inner border border-white/20">
                <img 
                  src={nfcStampHero} 
                  alt="Eloyo NFC-Holzstempel" 
                  className="rounded-[1.8rem] w-full h-[400px] sm:h-[500px] object-cover"
                />
                {/* Floating notification card */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%]">
                  <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-white flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                      <Star className="h-5 w-5 text-white" fill="white" />
                    </div>
                    <div>
                      <p className="font-bold text-[#1a1b21]">Neuer Stempel erhalten!</p>
                      <p className="text-sm text-[#4a4455]">Noch 2 Stempel bis zum kostenlosen Haarschnitt bei Salon Müller.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════ FLAGSHIP FEATURE: Push ═══════ */}
      <section className="relative z-10 bg-[#f4f3fb] py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp} className="bg-white rounded-[3rem] overflow-hidden shadow-sm flex flex-col md:flex-row items-center">
            <div className="p-10 lg:p-20 md:w-1/2">
              <span className="text-primary font-bold tracking-widest uppercase text-xs font-headline">Flagship Feature</span>
              <h2 className="font-headline text-4xl md:text-5xl font-extrabold mt-4 mb-6 leading-tight tracking-[-0.02em]">
                Push-Benachrichtigungen, die gelesen werden
              </h2>
              <p className="text-lg text-[#4a4455] leading-relaxed mb-8">
                Vergiss E-Mails, die im Spam landen. Schicke Angebote, Neuigkeiten oder Belohnungen direkt auf den Sperrbildschirm deiner Kunden. Warm, freundlich und effektiv.
              </p>
              <div className="flex items-center gap-3 text-primary font-bold">
                <CheckCircle className="h-5 w-5" />
                <span>98% Öffnungsrate</span>
              </div>
            </div>
            <div className="md:w-1/2 bg-[#eeedf5] min-h-[400px] relative flex items-center justify-center p-12">
              {/* Phone mockup */}
              <div className="w-[260px] sm:w-[280px] h-[540px] sm:h-[580px] bg-slate-900 rounded-[3rem] p-3 shadow-2xl border-[8px] border-slate-800">
                <div className="w-full h-full bg-slate-100 rounded-[2.2rem] overflow-hidden relative">
                  <img src={eloyoAppMockup} alt="Eloyo App Push-Benachrichtigung" className="w-full h-full object-cover opacity-50 grayscale" />
                  <div className="absolute top-1/4 left-3 right-3 space-y-3">
                    <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-lg animate-bounce">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 bg-primary rounded-md flex items-center justify-center">
                          <span className="text-[8px] text-white">🔔</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Eloyo · Jetzt</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900">🎁 Deine Belohnung wartet!</p>
                      <p className="text-xs text-slate-600">Hallo Markus, du hast 10 Punkte gesammelt. Hol dir heute dein Gratis-Brot ab!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section id="how-it-works" className="relative z-10 py-24 px-6 bg-[#faf8ff]">
        <div className="max-w-7xl mx-auto text-center mb-20">
          <motion.h2 {...fadeUp} className="font-headline text-4xl md:text-5xl font-extrabold mb-4 tracking-[-0.02em]">
            So einfach wie Händeschütteln
          </motion.h2>
          <motion.p {...fadeUp} className="text-[#4a4455] text-lg">
            Drei Schritte zu mehr Umsatz und glücklicheren Kunden.
          </motion.p>
        </div>
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8 lg:gap-12">
          {[
            { step: '1', title: 'Kunde scannt Stempel', desc: 'Ein einfacher Tap mit dem Handy auf dein NFC-Terminal genügt. Keine App-Installation nötig.', icon: '📱' },
            { step: '2', title: 'sammelt Punkte', desc: 'Jeder Besuch wird belohnt. Der Fortschritt ist sofort auf dem digitalen Wallet sichtbar.', icon: '⭐' },
            { step: '3', title: 'Händler schickt Push', desc: 'Erreiche deine Kunden jederzeit mit persönlichen Angeboten, um sie wieder in den Laden zu holen.', icon: '🚀' },
          ].map((item, i) => (
            <motion.div key={i} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.15 }} className="relative group">
              <div className="bg-[#e8e7ef] rounded-[2.5rem] p-10 h-full transition-transform group-hover:-translate-y-2">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-8 text-2xl group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-blue-500 transition-colors">
                  <span className="group-hover:brightness-200">{item.icon}</span>
                </div>
                <h3 className="font-headline text-2xl font-bold mb-4">{item.step}. {item.title}</h3>
                <p className="text-[#4a4455]">{item.desc}</p>
              </div>
              {i < 2 && (
                <div className="hidden md:block absolute top-1/2 -right-6 -translate-y-1/2 text-[#ccc3d8] text-3xl">→</div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════ BENTO GRID FEATURES ═══════ */}
      <section className="relative z-10 py-24 px-6 bg-[#f4f3fb]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* NFC - Wide */}
            <motion.div {...fadeUp} className="md:col-span-2 bg-white/40 backdrop-blur-2xl rounded-[2rem] p-8 relative overflow-hidden group border border-[#ccc3d8]/15">
              <div className="relative z-10">
                <span className="text-3xl mb-4 block">📡</span>
                <h3 className="text-2xl font-bold mb-2 font-headline">Modernste NFC Technologie</h3>
                <p className="text-[#4a4455] max-w-md">Keine QR-Codes, kein langes Warten. Ein Tap reicht aus, um die Kundenbindung zu starten.</p>
              </div>
              <div className="absolute bottom-[-20px] right-[-20px] w-48 h-48 bg-gradient-to-br from-primary to-blue-500 opacity-10 rounded-full blur-3xl group-hover:scale-150 transition-transform" />
            </motion.div>

            {/* App */}
            <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="bg-white/40 backdrop-blur-2xl rounded-[2rem] p-8 border-l-4 border-l-primary border border-[#ccc3d8]/15">
              <span className="text-3xl mb-4 block">📲</span>
              <h3 className="text-2xl font-bold mb-2 font-headline">Eigene Mini-App</h3>
              <p className="text-[#4a4455]">Alles läuft im Browser oder Apple/Google Wallet. Deine Kunden brauchen keine neue App.</p>
            </motion.div>

            {/* Rewards */}
            <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="bg-white/40 backdrop-blur-2xl rounded-[2rem] p-8 border border-[#ccc3d8]/15">
              <span className="text-3xl mb-4 block">🎁</span>
              <h3 className="text-2xl font-bold mb-2 font-headline">Flexible Belohnungen</h3>
              <p className="text-[#4a4455]">Bestimme selbst, was deine Kunden für ihre Treue bekommen. Vom Kaffee bis zum Rabatt.</p>
            </motion.div>

            {/* Communication - Wide */}
            <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="md:col-span-2 bg-white/40 backdrop-blur-2xl rounded-[2rem] p-8 flex flex-col md:flex-row gap-8 items-center border border-[#ccc3d8]/15">
              <div className="md:w-1/2">
                <span className="text-3xl mb-4 block">💬</span>
                <h3 className="text-2xl font-bold mb-2 font-headline">Direkte Kommunikation</h3>
                <p className="text-[#4a4455]">Baue eine echte Beziehung zu deinen Kunden auf. Direkt und ohne Mittelsmänner.</p>
              </div>
              <div className="md:w-1/2 grid grid-cols-2 gap-2">
                {['1:1 Chat', 'Feedback', 'Events', 'Angebote'].map((label) => (
                  <div key={label} className="bg-white/40 p-3 rounded-xl text-center text-xs font-bold">{label}</div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════ NETZWERK ═══════ */}
      <section className="relative z-10 py-24 px-6 bg-[#faf8ff]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div {...fadeUp} className="space-y-6">
              <h2 className="font-headline text-4xl md:text-5xl font-extrabold leading-tight tracking-[-0.02em]">
                Das Eloyo-Netzwerk: <span className="text-primary">Deine neue Werbefläche</span>
              </h2>
              <p className="text-lg text-[#4a4455]">
                Das Besondere an Eloyo: Du profitierst automatisch von allen anderen Geschäften, die ebenfalls Eloyo nutzen. Kunden, die woanders einkaufen, sehen auch dein Geschäft in der App.
              </p>
              <div className="space-y-4">
                {[
                  { title: 'Neukunden gewinnen', desc: 'Kunden, die bei anderen Eloyo-Geschäften einkaufen, sehen auch dein Angebot in der App.' },
                  { title: 'Neukundenprämien', desc: 'Biete Erstbesucher-Rabatte an und ziehe neue Kunden aktiv in dein Geschäft.' },
                  { title: 'Lokale Reichweite', desc: 'Je mehr Geschäfte in deiner Umgebung Eloyo nutzen, desto größer wird dein Kundenpotenzial.' },
                ].map((b, i) => (
                  <motion.div key={i} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.1 }} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1a1b21]">{b.title}</h3>
                      <p className="text-[#4a4455] text-sm">{b.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
              <img src={businessNetwork} alt="Eloyo Geschäftsnetzwerk" className="w-full h-auto rounded-2xl shadow-2xl" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════ GOOGLE REVIEWS ═══════ */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <motion.div {...fadeUp} className="lg:w-1/2">
            <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-3xl">⭐</span>
            </div>
            <h2 className="font-headline text-4xl font-extrabold mb-6 tracking-[-0.02em]">Mehr 5-Sterne Google Reviews</h2>
            <p className="text-lg text-[#4a4455] leading-relaxed mb-8">
              Zufriedene Stammkunden sind deine besten Botschafter. Eloyo motiviert deine treuesten Fans, eine positive Bewertung bei Google zu hinterlassen und so dein Neukundengeschäft anzukurbeln.
            </p>
            <div className="p-6 bg-[#e8e7ef] rounded-2xl border-l-4 border-l-yellow-400">
              <p className="italic text-[#1a1b21] mb-4">
                "Seit wir Eloyo nutzen, ist unsere Google-Bewertung von 4.2 auf 4.8 gestiegen. Das System zahlt sich von selbst aus."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center text-sm font-bold">SB</div>
                <div>
                  <p className="font-bold text-sm">Stefan B., Bäckermeister</p>
                  <div className="flex text-yellow-400 text-xs gap-0.5">
                    {[...Array(5)].map((_, i) => <Star key={i} className="h-3 w-3" fill="currentColor" />)}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="lg:w-1/2 relative">
            <div className="absolute inset-0 bg-primary/10 blur-[100px] rounded-full" />
            <div className="relative bg-white rounded-3xl p-8 shadow-2xl space-y-6">
              <div className="flex justify-between items-end pb-4" style={{ borderBottom: '1px solid rgba(204,195,216,0.2)' }}>
                <div>
                  <p className="text-sm font-bold text-[#4a4455]">Google Sichtbarkeit</p>
                  <p className="text-3xl font-black font-headline">+240%</p>
                </div>
                <div className="flex gap-1 items-end h-16">
                  {[4, 8, 6, 10, 16].map((h, i) => (
                    <div key={i} className={`w-4 rounded-t ${i === 4 ? 'bg-primary' : 'bg-primary/20'}`} style={{ height: `${h * 4}px` }} />
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                {['Vor 2 Min.', 'Vor 1 Std.'].map((time, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-[#eeedf5] rounded-xl">
                    <div className="flex items-center gap-3">
                      <Star className="h-5 w-5 text-yellow-500" fill="currentColor" />
                      <span className="text-sm font-bold">Neue 5-Sterne Bewertung</span>
                    </div>
                    <span className="text-xs text-[#4a4455]">{time}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════ GAMIFICATION ═══════ */}
      <section className="relative z-10 py-24 px-6 bg-[#f4f3fb]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div {...fadeUp} className="order-2 lg:order-1">
              <img src={eloyoAppMockup} alt="Eloyo App mit Gamification" className="w-full max-w-md mx-auto h-auto rounded-2xl shadow-2xl" />
            </motion.div>
            <motion.div {...fadeUp} className="space-y-6 order-1 lg:order-2">
              <h2 className="font-headline text-4xl md:text-5xl font-extrabold leading-tight tracking-[-0.02em]">
                Gamification, die <span className="text-primary">süchtig macht</span>
              </h2>
              <p className="text-lg text-[#4a4455]">
                Vergiss langweilige Stempelkarten, die niemand einlöst. Bei Eloyo entscheiden deine Kunden selbst, wie sie ihre Punkte ausgeben – das schafft echte Motivation und emotionale Bindung.
              </p>
              <ul className="space-y-3">
                {[
                  'Mehrere Prämien zur Auswahl – der Kunde entscheidet',
                  'Sichtbarer Fortschritt motiviert zum Wiederkommen',
                  'Persönliche Belohnungen schaffen emotionale Bindung',
                  'Punkte können nicht verfallen – maximale Fairness'
                ].map((point, i) => (
                  <motion.li key={i} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.1 }} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-[#1a1b21]">{point}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════ LÖSCHSERVICE ═══════ */}
      <section className="relative z-10 py-12 px-6 bg-[#faf8ff]">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp} className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🛡️</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#1a1b21] mb-2 font-headline">
                Löschservice für unfaire Google-Bewertungen
              </h3>
              <p className="text-[#4a4455]">
                Wir helfen dir auch bei negativen Fake-Bewertungen. Unser Löschservice arbeitet rein erfolgsbasiert – du zahlst nur, wenn die Bewertung entfernt wird. Preiswert und transparent.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════ FINAL CTA ═══════ */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            {...fadeUp}
            className="bg-gradient-to-br from-primary to-blue-500 rounded-[3rem] p-12 lg:p-20 relative overflow-hidden text-white flex flex-col md:flex-row items-center gap-12"
          >
            {/* Decorative circle */}
            <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 100 100"><circle cx="90" cy="10" r="40" fill="none" stroke="white" strokeWidth="0.5" /></svg>
            </div>
            <div className="md:w-3/5 relative z-10">
              <h2 className="font-headline text-4xl md:text-6xl font-extrabold mb-8 leading-tight tracking-[-0.02em]">
                Bereit für eine neue Art der Kundenbindung?
              </h2>
              <p className="text-xl text-white/90 mb-12 max-w-lg">
                Starte heute kostenlos und sieh selbst, wie einfach du deine Kunden begeistern kannst.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <button
                  onClick={() => navigate('/kontakt')}
                  className="bg-white text-primary px-10 py-5 rounded-2xl text-xl font-bold shadow-2xl hover:scale-105 transition-transform"
                >
                  Kostenlos starten
                </button>
                <div className="flex items-center gap-3 px-6 py-2">
                  <CheckCircle className="h-5 w-5 text-white/80" />
                  <span className="text-sm font-medium">In 2 Min. einsatzbereit</span>
                </div>
              </div>
            </div>
            <div className="md:w-2/5">
              <div className="relative group">
                <div className="absolute -inset-4 bg-white/20 rounded-[3rem] blur-xl group-hover:blur-2xl transition-all" />
                <img
                  src={heroPersonQr}
                  alt="Eloyo Geschäftsinhaber"
                  className="rounded-[2.5rem] w-full aspect-square object-cover shadow-2xl relative z-10 border-4 border-white/10"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="relative z-10 bg-[#f9f8fc] py-12 px-6">
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
            © {new Date().getFullYear()} Eloyo. Alle Rechte vorbehalten.
          </div>
        </div>
      </footer>

      <ERecht24Badge />
    </div>
  );
};

export default Landing;
