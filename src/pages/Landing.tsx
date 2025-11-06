import PillNav from '@/components/PillNav';
import Particles from '@/components/Particles';
import { GradientButton } from '@/components/GradientButton';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Eye, Star, TrendingUp, Gift, BarChart3, Scan, MessageSquare, Award } from 'lucide-react';
import logo from '@/assets/qrait-logo.svg';

const Landing = () => {
  const navigate = useNavigate();

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Kontakt', href: '/kontakt' },
    { label: 'Datenschutz', href: '/datenschutz' },
    { label: 'Impressum', href: '/impressum' },
    { label: 'Login', href: '/auth' },
  ];

  const features = [
    {
      icon: Eye,
      title: 'Mehr Sichtbarkeit',
      description: 'QR-Codes auf jedem Kassenbon - Ihre Kunden werden zu Botschaftern Ihrer Marke.'
    },
    {
      icon: Star,
      title: 'Echte Bewertungen',
      description: 'Motivieren Sie zufriedene Kunden, authentische Google-Bewertungen zu hinterlassen.'
    },
    {
      icon: TrendingUp,
      title: 'Nachhaltiges Wachstum',
      description: 'Steigern Sie Ihre Online-Reputation und gewinnen Sie mehr Neukunden durch Vertrauen.'
    },
    {
      icon: Gift,
      title: 'Kundenbindung',
      description: 'Belohnen Sie Ihre Kunden mit attraktiven Geschenken für ihre Bewertungen.'
    },
    {
      icon: BarChart3,
      title: 'Analytics',
      description: 'Verfolgen Sie Ihre Performance in Echtzeit mit detaillierten Statistiken.'
    }
  ];

  const steps = [
    { icon: Scan, title: 'Scannen', description: 'Kunde scannt QR-Code auf dem Kassenbon' },
    { icon: MessageSquare, title: 'Bewerten', description: 'Hinterlässt eine Google-Bewertung' },
    { icon: Award, title: 'Geschenk', description: 'Erhält sofort sein persönliches Dankeschön' }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Particles 
        particleColors={['#000000', '#1a1a1a']}
        particleCount={150}
        particleSpread={10}
        speed={0.05}
        particleBaseSize={80}
        moveParticlesOnHover={true}
        alphaParticles={false}
        disableRotation={false}
      />
      <div className="fixed top-0 left-0 right-0 flex justify-center z-50">
        <PillNav
          logo={logo}
          logoAlt="QRAIT Logo"
          items={navItems}
          baseColor="#000000"
          pillColor="#ffffff"
          hoveredPillTextColor="#ffffff"
          pillTextColor="#000000"
        />
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6"
          >
            Verwandeln Sie Kunden in{' '}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Markenbotschafter
            </span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto"
          >
            Die innovative Lösung für mehr Google-Bewertungen und nachhaltiges Wachstum Ihres Unternehmens.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <GradientButton onClick={() => navigate('/kontakt')} className="text-lg px-8 py-6">
              Jetzt Kontakt aufnehmen
            </GradientButton>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">
            So funktioniert's
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="relative"
              >
                <div className="bg-card border border-border rounded-2xl p-8 h-full">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6">
                    <step.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute top-8 -right-4 w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {index + 1}
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">
            Ihre Vorteile
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <div className="bg-card border border-border rounded-2xl p-8 h-full hover:shadow-glow transition-shadow duration-300">
                  <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center mb-6">
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-primary rounded-3xl p-12"
          >
            <h2 className="text-4xl font-bold text-white mb-6">
              Bereit für mehr Bewertungen?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Starten Sie jetzt und steigern Sie Ihre Online-Reputation nachhaltig.
            </p>
            <GradientButton 
              onClick={() => navigate('/kontakt')}
              className="bg-white text-primary hover:bg-white/90"
            >
              Kontakt aufnehmen
            </GradientButton>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <div className="flex items-center space-x-2 justify-center md:justify-start mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <span className="text-white font-bold">Q</span>
                </div>
                <span className="text-lg font-bold">QRAIT</span>
              </div>
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
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
