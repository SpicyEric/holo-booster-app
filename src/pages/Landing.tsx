import GooeyNav from '@/components/GooeyNav';
import Particles from '@/components/Particles';
import { GradientButton } from '@/components/GradientButton';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Scan, MessageSquare, Award, ChevronDown, Star, TrendingUp, Users, Zap, Heart, Shield } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import qraitLogo from '@/assets/qrait-logo-full.png';

const Landing = () => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const scrollTop = containerRef.current.scrollTop;
        setScrolled(scrollTop > 100);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const logoX = useTransform(scrollYProgress, [0, 0.15], [0, -600]);
  const logoY = useTransform(scrollYProgress, [0, 0.15], [0, -350]);
  const logoScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.3]);

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
    <div ref={containerRef} className="bg-background text-foreground relative snap-y snap-mandatory overflow-y-scroll h-screen">
      <Particles 
        particleColors={['#ffffff', '#ffffff', '#ffffff']}
        particleCount={200}
        particleSpread={12}
        speed={0.08}
        particleBaseSize={150}
        sizeRandomness={2}
        moveParticlesOnHover={true}
        alphaParticles={false}
        disableRotation={false}
        cameraDistance={18}
      />
      
      <div className="fixed top-8 left-0 right-0 flex justify-center z-50">
        <div className="flex items-center gap-8">
          <motion.img
            src={qraitLogo}
            alt="QRait Logo"
            className="h-12 w-auto"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: scrolled ? 1 : 0,
              scale: scrolled ? 1 : 0.8
            }}
            transition={{ duration: 0.3 }}
          />
          <GooeyNav
            items={navItems}
            particleCount={15}
            particleDistances={[90, 10]}
            particleR={100}
            initialActiveIndex={0}
            animationTime={600}
            timeVariance={300}
            colors={[1, 2, 3, 1, 2, 3, 1, 4]}
          />
        </div>
      </div>

      {/* Hero Section - Logo Only */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 snap-start">
        <motion.div
          style={{ x: logoX, y: logoY, scale: logoScale }}
          className="flex flex-col items-center"
        >
          <motion.img
            src={qraitLogo}
            alt="QRait Logo"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="h-32 sm:h-40 lg:h-48 w-auto mb-12"
          />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.8, 
              delay: 0.6,
              repeat: Infinity,
              repeatType: "reverse",
              repeatDelay: 0.5
            }}
            className="flex flex-col items-center gap-2"
          >
            <ChevronDown className="w-8 h-8 text-primary" />
            <ChevronDown className="w-8 h-8 text-primary -mt-6 opacity-60" />
          </motion.div>
        </motion.div>
      </section>

      {/* Sticky Panels - 3 Steps */}
      {steps.map((step, index) => (
        <section 
          key={index}
          className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 snap-start"
        >
          <div className="max-w-7xl mx-auto w-full">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Text Content */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true, margin: "-100px" }}
                className="space-y-6"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary mb-4">
                  <step.icon className="w-8 h-8 text-white" />
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="text-6xl font-bold text-muted-foreground/20">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-4xl sm:text-5xl font-bold">{step.title}</h3>
                </div>
                
                <p className="text-xl text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
                
                {step.details && (
                  <p className="text-lg text-muted-foreground/80 leading-relaxed">
                    {step.details}
                  </p>
                )}
              </motion.div>

              {/* Phone Mock */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: true, margin: "-100px" }}
                className="flex justify-center lg:justify-end"
              >
                <div className="relative w-72 h-[600px]">
                  {/* Phone Frame */}
                  <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-sm border border-primary/20 shadow-2xl shadow-primary/20 p-3">
                    <div className="w-full h-full rounded-[2.5rem] bg-background/50 backdrop-blur-md border border-border/50 overflow-hidden">
                      {/* Phone Content */}
                      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6">
                          <step.icon className="w-10 h-10 text-white" />
                        </div>
                        <h4 className="text-2xl font-bold mb-3">{step.title}</h4>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Glow Effect */}
                  <div className="absolute -inset-4 bg-gradient-primary opacity-20 blur-3xl -z-10" />
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      ))}

      {/* Benefits Section */}
      {benefits.map((benefit, index) => (
        <section 
          key={index}
          className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 snap-start"
        >
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm border border-primary/20 rounded-3xl p-8 sm:p-12 shadow-glow">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-3xl sm:text-4xl font-bold">{benefit.title}</h3>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </div>
          </motion.div>
        </section>
      ))}

      {/* CTA Section */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 snap-start">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-primary rounded-3xl p-12 shadow-glow"
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
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
      <footer className="relative z-10 border-t border-border py-12 px-4 sm:px-6 lg:px-8">
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
