import ClassicNav from '@/components/ClassicNav';
import Particles from '@/components/Particles';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Scan, MessageSquare, Award, Star, TrendingUp, Users, Zap, Heart, Shield, ArrowRight } from 'lucide-react';
import qraitLogo from '@/assets/qrait-logo-full.png';
import { useEffect } from 'react';

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
    { label: 'Kontakt', href: '/kontakt' },
    { label: 'Datenschutz', href: '/datenschutz' },
    { label: 'Impressum', href: '/impressum' },
    { label: 'Login', href: '/auth' }
  ];

  const steps = [
    { 
      icon: Scan, 
      title: 'Scannen', 
      description: 'Kunde scannt QR-Code',
      details: ''
    },
    { 
      icon: MessageSquare, 
      title: 'Bewerten', 
      description: 'Hinterlässt eine ehrliche Google-Bewertung',
      details: 'Zufriedene Kunden werden ermutigt, ihre positiven Erfahrungen öffentlich zu teilen.'
    },
    { 
      icon: Award, 
      title: 'Geschenk', 
      description: 'Erhält sofort sein persönliches Dankeschön',
      details: 'Belohnen Sie Loyalität mit individuellen Incentives und stärken Sie die Kundenbindung.'
    }
  ];

  const benefits = [
    {
      icon: Star,
      title: 'Mehr Sichtbarkeit',
      description: 'Steigern Sie Ihre Online-Präsenz durch authentische Kundenbewertungen'
    },
    {
      icon: TrendingUp,
      title: 'Höhere Conversion',
      description: 'Mehr positive Bewertungen führen zu mehr Vertrauen und höheren Umsätzen'
    },
    {
      icon: Users,
      title: 'Stärkere Kundenbindung',
      description: 'Belohnen Sie Ihre Kunden und schaffen Sie langfristige Beziehungen'
    },
    {
      icon: Zap,
      title: 'Einfache Integration',
      description: 'Schnelle Einrichtung ohne technisches Know-how erforderlich'
    },
    {
      icon: Heart,
      title: 'Authentisches Feedback',
      description: 'Erhalten Sie ehrliche Bewertungen von echten Kunden'
    },
    {
      icon: Shield,
      title: 'Datenschutzkonform',
      description: 'DSGVO-konforme Lösung für den deutschen Markt'
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
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 text-foreground">
                Mehr Google-Bewertungen.<br />
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Mehr Erfolg.
                </span>
              </h1>
              <p className="text-xl sm:text-2xl text-muted-foreground mb-8 leading-relaxed">
                Die innovative Lösung für mehr Google-Bewertungen und nachhaltiges Wachstum Ihres Unternehmens.
              </p>
              <Button 
                onClick={() => navigate('/kontakt')}
                size="lg"
                className="bg-foreground text-background hover:bg-foreground/90 text-lg px-8 py-6"
              >
                Jetzt Kontakt aufnehmen
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">So einfach geht's</h2>
            <p className="text-xl text-muted-foreground">In drei Schritten zu mehr Bewertungen</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="bg-card border border-border rounded-lg p-8 hover:shadow-lg transition-shadow"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mb-6">
                  <step.icon className="w-8 h-8 text-white" />
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl font-bold text-muted-foreground/30">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-2xl font-bold">{step.title}</h3>
                </div>
                <p className="text-muted-foreground mb-2">{step.description}</p>
                {step.details && (
                  <p className="text-sm text-muted-foreground/80">{step.details}</p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Ihre Vorteile</h2>
            <p className="text-xl text-muted-foreground">Warum QRait die richtige Wahl ist</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-all hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-primary rounded-lg p-12 shadow-lg"
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Bereit für mehr Bewertungen?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Starten Sie jetzt und steigern Sie Ihre Online-Reputation nachhaltig.
            </p>
            <Button 
              onClick={() => navigate('/kontakt')}
              size="lg"
              className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6"
            >
              Kontakt aufnehmen
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-12 px-4 sm:px-6 lg:px-8 bg-card">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <img src={qraitLogo} alt="QRait Logo" className="h-8 w-auto mb-2 mx-auto md:mx-0" />
              <p className="text-sm text-muted-foreground">
                © 2025 QRAIT. Alle Rechte vorbehalten.
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <a href="/impressum" className="text-muted-foreground hover:text-foreground transition-colors">
                Impressum
              </a>
              <a href="/datenschutz" className="text-muted-foreground hover:text-foreground transition-colors">
                Datenschutz
              </a>
              <a href="/kontakt" className="text-muted-foreground hover:text-foreground transition-colors">
                Kontakt
              </a>
              <a 
                href="https://instagram.com/qrait.de" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Instagram
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
