import ClassicNav from '@/components/ClassicNav';
import Particles from '@/components/Particles';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/GlassCard';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Star, 
  CreditCard, 
  MessageSquare, 
  ShieldCheck,
  QrCode,
  MapPin,
  Gift,
  Smartphone,
  TrendingUp,
  Zap,
  Users,
  CheckCircle,
  Scale,
  BarChart3
} from 'lucide-react';
import qraitLogo from '@/assets/qrait-logo-full.png';
import heroPersonQr from '@/assets/hero-person-qr.jpg';
import qrStandProduct from '@/assets/qr-stand-product.png';
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

  const features = [
    {
      icon: Star,
      title: 'Mehr Google-Bewertungen',
      points: [
        'Kunden scannen deinen QR-Code',
        'Geben sofort eine Bewertung ab',
        'Du bekommst mehr Sichtbarkeit auf Google Maps'
      ]
    },
    {
      icon: CreditCard,
      title: 'Digitale Stempelkarte',
      points: [
        'Belohnungen nach X Besuchen',
        'Perfekte Kundenbindung',
        'Niemals vergessen - jeder Kunde hat sein Handy immer dabei'
      ]
    },
    {
      icon: MessageSquare,
      title: 'SMS-Kampagnen',
      points: [
        'Aktionen und Events per SMS',
        'Ruhige Zeiten füllen',
        'Automatisierte Umsatzimpulse'
      ]
    },
    {
      icon: ShieldCheck,
      title: 'Negative Bewertungen löschen lassen',
      points: [
        'Professioneller Löschservice',
        'Erfolgsbasierte Abrechnung',
        'Sehr hohe Löschquote'
      ]
    }
  ];

  const processSteps = [
    {
      number: 1,
      icon: QrCode,
      title: 'QR-Code scannen',
      description: 'Aufsteller am Tisch, Tresen oder Kassenbereich.'
    },
    {
      number: 2,
      icon: Star,
      title: 'Google-Bewertung hinterlassen',
      description: 'Mehr echte Bewertungen → mehr Reichweite bei Google Maps.'
    },
    {
      number: 3,
      icon: Smartphone,
      title: 'Handynummer eingeben',
      description: 'DSGVO-konformes Eintragen auf deiner QRait-Seite.'
    },
    {
      number: 4,
      icon: Gift,
      title: 'Geschenk + digitale Stempelkarte',
      description: 'Einmaliges Geschenk + Start der Kundenkarte, die immer dabei ist.'
    },
    {
      number: 5,
      icon: MessageSquare,
      title: 'SMS-Marketing für mehr Umsatz',
      description: 'Aktionen, Events, Reaktivierungen – direkt aufs Handy der Kunden.'
    }
  ];

  const benefits = [
    {
      icon: MapPin,
      title: 'Mehr Sichtbarkeit auf Google Maps',
      description: 'Du erscheinst weiter oben in lokalen Suchergebnissen.'
    },
    {
      icon: Star,
      title: 'Bessere Sternebewertung',
      description: 'Mehr positive Kunden, weniger negative Einträge.'
    },
    {
      icon: Users,
      title: 'Stärkere Kundenbindung',
      description: 'Wiederkehrende Kunden durch die digitale Stempelkarte.'
    },
    {
      icon: TrendingUp,
      title: 'SMS-Marketing wie große Unternehmen',
      description: 'Automatisierte Umsätze durch Aktionen & Events.'
    },
    {
      icon: Zap,
      title: 'Einfache Integration ohne Technikstress',
      description: 'QR-Codes, Vorlagen, Setup – alles fertig eingerichtet.'
    },
    {
      icon: ShieldCheck,
      title: 'Professioneller Löschservice',
      description: 'Wir kümmern uns um ungerechte oder falsche Bewertungen.'
    }
  ];

  const deletionFeatures = [
    {
      icon: CheckCircle,
      title: 'Hohe Löschquote',
      description: 'Viele negative Bewertungen lassen sich erfolgreich entfernen.'
    },
    {
      icon: Scale,
      title: 'Erfolgsbasiertes Preismodell',
      description: 'Bezahlt wird nur bei erfolgreicher Löschung – fair und transparent.'
    },
    {
      icon: BarChart3,
      title: 'Ideal kombinierbar mit Bewertungs-Boost',
      description: 'Mehr positive Bewertungen + weniger negative = besseres Ranking.'
    }
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
        logo={<img src={qraitLogo} alt="QRait Logo" className="h-10 w-auto" />} 
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
                  Mehr Google-<span className="bg-gradient-primary bg-clip-text text-transparent">Bewertungen</span> und Stammkunden durch <span className="whitespace-nowrap">ein einziges <span className="bg-gradient-primary bg-clip-text text-transparent">QR-System</span></span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  QRait kombiniert Bewertungsboost, digitale Stempelkarte, SMS-Marketing und einen professionellen Löschservice für negative Bewertungen – speziell für lokale Unternehmen.
                </p>
              </div>

              {/* Right: Image with CTA */}
              <div className="space-y-4 flex flex-col items-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="relative rounded-2xl overflow-hidden max-w-xs mx-auto"
                >
                  <img 
                    src={heroPersonQr} 
                    alt="QRait in Aktion" 
                    className="w-full h-auto"
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="w-auto"
                >
                  <Button
                    onClick={() => navigate('/auth')}
                    size="default"
                    className="bg-gradient-primary text-primary-foreground hover:shadow-glow px-8 py-5 rounded-2xl"
                  >
                    Jetzt starten
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 2: What QRait Does */}
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
              Was QRait für dein Geschäft erledigt
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <GlassCard className="h-full">
                  <div className="space-y-4 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto">
                      <feature.icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      {feature.title}
                    </h3>
                    <ul className="space-y-2">
                      {feature.points.map((point, idx) => (
                        <li key={idx} className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Process Flow */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              So läuft der Prozess für deine Kunden ab
            </h2>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-4">
            {processSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative w-40"
              >
                <GlassCard className="h-full p-4">
                  <div className="space-y-3 text-center">
                    <div className="relative inline-flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
                        <span className="text-lg font-bold text-primary-foreground">{step.number}</span>
                      </div>
                    </div>
                    <step.icon className="h-6 w-6 text-primary mx-auto" />
                    <h3 className="text-sm font-bold text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Benefits */}
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
              Deine Vorteile mit QRait
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
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
                      <benefit.icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      {benefit.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {benefit.description}
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: Deletion Service */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Ungerechte oder falsche Google-Bewertungen?<br />
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Wir kümmern uns darum.
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Wir prüfen negative Bewertungen juristisch, sachlich und technisch. Viele Bewertungen lassen sich entfernen. Bezahlt wird nur bei erfolgreicher Löschung – fair, transparent und auf Erfolgsbasis.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {deletionFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <GlassCard className="h-full text-center p-6">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center mx-auto">
                      <feature.icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6: Visual Product Section */}
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
                QRait in deinem Geschäft
              </h2>
              <p className="text-lg text-muted-foreground">
                So sieht QRait in deinem Geschäft aus – der QR-Aufsteller macht den gesamten Prozess für deine Kunden einfach, logisch und schnell.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative max-w-md mx-auto"
            >
              <motion.img
                src={qrStandProduct}
                alt="QRait Aufsteller im Einsatz"
                className="w-full h-auto rounded-2xl"
                animate={{
                  scale: [1, 1.02, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 7: Final CTA */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
              Bereit für mehr Bewertungen und Stammkunden?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Wir melden uns persönlich bei dir, erklären dir das System und führen dich durch die ersten Schritte.
            </p>
            <Button
              onClick={() => navigate('/kontakt')}
              size="lg"
              className="bg-gradient-primary text-primary-foreground hover:shadow-glow text-xl py-8 px-12 rounded-2xl"
            >
              Kontakt aufnehmen
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 bg-card/30 backdrop-blur-sm py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <img src={qraitLogo} alt="QRait Logo" className="h-8 w-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                Das Marketing-System für lokale Geschäfte
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
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-4">Social Media</h3>
              <ul className="space-y-2">
                <li>
                  <a href="https://instagram.com/qrait.de" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Instagram
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border/50 text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} QRait. Alle Rechte vorbehalten.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
