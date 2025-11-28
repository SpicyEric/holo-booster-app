import ClassicNav from '@/components/ClassicNav';
import Particles from '@/components/Particles';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/GlassCard';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Star, 
  Smartphone,
  Users,
  Gift,
  TrendingUp,
  Zap,
  MessageSquare,
  BarChart3,
  Shield,
  Sparkles,
  Target,
  Heart,
  CheckCircle,
  MapPin,
  Wifi
} from 'lucide-react';
import eloyoLogo from '@/assets/eloyo-logo.png';
import nfcStampHero from '@/assets/nfc-stamp-hero.png';
import eloyoAppMockup from '@/assets/eloyo-app-mockup.jpg';
import businessNetwork from '@/assets/business-network.png';
import heroPersonQr from '@/assets/hero-person-qr.png';
import contactCtaButton from '@/assets/contact-cta-button.png';

import { useEffect } from 'react';

const Landing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash || "";
    if (hash && (hash.includes('type=recovery') || hash.includes('type=signup'))) {
      navigate(`/auth${hash}`, {
        replace: true
      });
    }
  }, [navigate]);

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Kontakt', href: '/kontakt' },
    { label: 'Datenschutz', href: '/datenschutz' },
    { label: 'Impressum', href: '/impressum' },
    { label: 'Login', href: '/auth' }
  ];

  const coreFeatures = [
    {
      icon: Wifi,
      title: 'NFC-Technologie',
      description: 'Echte Holzstempel mit integriertem NFC-Chip. Kunden halten einfach ihr Smartphone dran – fertig.'
    },
    {
      icon: Smartphone,
      title: 'Die Eloyo-App',
      description: 'Deine Kunden sammeln Punkte über eine moderne App. Verfügbar im AppStore und PlayStore.'
    },
    {
      icon: Gift,
      title: 'Flexible Prämien',
      description: 'Du bestimmst selbst, welche Belohnungen es gibt. Von Gratis-Kaffee bis zum halben Preis – dein System, deine Regeln.'
    },
    {
      icon: Users,
      title: 'Das Eloyo-Netzwerk',
      description: 'Erreiche automatisch Kunden von anderen Eloyo-Geschäften in deiner Umgebung.'
    }
  ];


  const networkBenefits = [
    {
      icon: Target,
      title: 'Neukunden gewinnen',
      description: 'Kunden, die bei anderen Eloyo-Geschäften einkaufen, sehen auch dein Angebot in der App.'
    },
    {
      icon: Sparkles,
      title: 'Neukundenprämien',
      description: 'Biete Erstbesucher-Rabatte an und ziehe neue Kunden aktiv in dein Geschäft.'
    },
    {
      icon: MapPin,
      title: 'Lokale Reichweite',
      description: 'Je mehr Geschäfte in deiner Umgebung Eloyo nutzen, desto größer wird dein Kundenpotenzial.'
    }
  ];

  const businessFeatures = [
    {
      icon: MessageSquare,
      title: 'Direkte Kommunikation',
      description: 'Sende persönliche Nachrichten und Angebote an alle Kunden mit einer aktiven Bonuskarte bei dir.'
    },
    {
      icon: BarChart3,
      title: 'Detaillierte Analytics',
      description: 'Verstehe deine Kunden: Kaufverhalten, Besuchszeiten, Umsätze und mehr – alles in deinem Dashboard.'
    },
    {
      icon: Heart,
      title: 'Rückholaktionen',
      description: 'Hole inaktive Kunden zurück mit gezielten Angeboten, die nur sie erreichen.'
    },
    {
      icon: Zap,
      title: 'Kinderleichte Einrichtung',
      description: 'Einmal eingerichtet, läuft das System von selbst. Kein technisches Know-how nötig.'
    }
  ];

  const gamificationPoints = [
    'Mehrere Prämien zur Auswahl – der Kunde entscheidet',
    'Sichtbarer Fortschritt motiviert zum Wiederkommen',
    'Persönliche Belohnungen schaffen emotionale Bindung',
    'Punkte können nicht verfallen – maximale Fairness'
  ];

  return (
    <div className="bg-background text-foreground min-h-screen">
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

      {/* Hero Section */}
      <section className="relative z-10 pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="grid md:grid-cols-2 gap-12 items-center"
            >
              {/* Left: Headline and Text */}
              <div className="space-y-6 pr-8">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                  Das moderne <span className="bg-gradient-primary bg-clip-text text-transparent">NFC-Stempelsystem</span> für maximale Kundenbindung
                </h1>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={() => navigate('/kontakt')}
                    size="lg"
                    className="bg-gradient-primary text-primary-foreground hover:shadow-glow px-8 py-6 rounded-2xl text-lg"
                  >
                    Kostenlos beraten lassen
                  </Button>
                </div>
              </div>

              {/* Right: Image */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative rounded-2xl overflow-hidden"
              >
                <img 
                  src={nfcStampHero} 
                  alt="Eloyo NFC-Holzstempel" 
                  className="w-full h-auto rounded-2xl shadow-2xl"
                />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Mehr als nur Stempel sammeln
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Eloyo ist ein komplettes Kundenbindungs-Ökosystem, das dein Geschäft auf das nächste Level bringt.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {coreFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <GlassCard className="h-full">
                  <div className="space-y-4 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto">
                      <feature.icon className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* The Network - Key Differentiator */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
                Das Eloyo-Netzwerk: <span className="bg-gradient-primary bg-clip-text text-transparent">Deine neue Werbefläche</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Das Besondere an Eloyo: Du profitierst automatisch von allen anderen Geschäften, die ebenfalls Eloyo nutzen. Kunden, die woanders einkaufen, sehen auch dein Geschäft in der App.
              </p>
              <div className="space-y-4">
                {networkBenefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="flex items-start gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                      <benefit.icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{benefit.title}</h3>
                      <p className="text-muted-foreground text-sm">{benefit.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <img
                src={businessNetwork}
                alt="Eloyo Geschäftsnetzwerk"
                className="w-full h-auto rounded-2xl shadow-2xl"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Gamification Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="order-2 lg:order-1"
            >
              <img
                src={eloyoAppMockup}
                alt="Eloyo App mit Gamification"
                className="w-full max-w-md mx-auto h-auto rounded-2xl shadow-2xl"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6 order-1 lg:order-2"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
                Gamification, die <span className="bg-gradient-primary bg-clip-text text-transparent">süchtig macht</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Vergiss langweilige Stempelkarten, die niemand einlöst. Bei Eloyo entscheiden deine Kunden selbst, wie sie ihre Punkte ausgeben – das schafft echte Motivation und emotionale Bindung.
              </p>
              <ul className="space-y-3">
                {gamificationPoints.map((point, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">{point}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Business Features */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Alles, was du für dein Marketing brauchst
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Direktkommunikation, Analytics und Kampagnen – alles in einem System.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {businessFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <GlassCard className="h-full">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center">
                      <feature.icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Google Reviews Bonus */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <GlassCard className="text-center p-8 md:p-12">
              <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-6">
                <Star className="h-8 w-8 text-primary-foreground" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Bonus: Mehr Google-Bewertungen
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
                Deine Kunden bekommen einmalig Bonuspunkte, wenn sie eine ehrliche Google-Bewertung hinterlassen. Das steigert automatisch deine Sichtbarkeit auf Google Maps – ohne extra Aufwand für dich.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span>Mehr Sichtbarkeit</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Star className="h-5 w-5 text-primary" />
                  <span>Bessere Bewertungen</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-5 w-5 text-primary" />
                  <span>Mehr Neukunden</span>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* Deletion Service (small) */}
      <section className="relative z-10 py-12 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
              <Shield className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                Löschservice für unfaire Google-Bewertungen
              </h3>
              <p className="text-muted-foreground">
                Wir helfen dir auch bei negativen Fake-Bewertungen. Unser Löschservice arbeitet rein erfolgsbasiert – du zahlst nur, wenn die Bewertung entfernt wird. Preiswert und transparent.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col-reverse lg:flex-row items-center gap-8 lg:gap-16"
          >
            {/* Text content - links */}
            <div className="text-center lg:text-left space-y-6">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
                Bereit, deine Kundenbindung zu revolutionieren?
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl">
                Lass dich kostenlos und unverbindlich beraten. Wir zeigen dir, wie Eloyo dein Geschäft auf das nächste Level bringt.
              </p>
            </div>
            
            {/* Button-Bild - rechts */}
            <img 
              src={contactCtaButton} 
              alt="Kostenlos beraten lassen" 
              onClick={() => navigate('/kontakt')}
              className="w-[250px] sm:w-[300px] lg:w-[350px] h-auto cursor-pointer hover:scale-105 transition-transform duration-300"
            />
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 bg-card/30 backdrop-blur-sm py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <img src={eloyoLogo} alt="Eloyo Logo" className="h-8 w-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                Das moderne NFC-Stempelsystem für lokale Geschäfte
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground mb-4">Rechtliches</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/impressum" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Impressum
                  </a>
                </li>
                <li>
                  <a href="/datenschutz" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Datenschutz
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-4">Kontakt</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/kontakt" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Kontaktformular
                  </a>
                </li>
                <li>
                  <a href="mailto:support@eloyo.de" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    support@eloyo.de
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-4">Social Media</h3>
              <ul className="space-y-2">
                <li>
                  <a href="https://instagram.com/eloyo.de" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Instagram
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border/50 text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Eloyo. Alle Rechte vorbehalten.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
