import GooeyNav from '@/components/GooeyNav';
import Particles from '@/components/Particles';
import { GradientButton } from '@/components/GradientButton';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Scan, MessageSquare, Award } from 'lucide-react';
import { useRef } from 'react';

const Landing = () => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

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
      description: 'Kunde scannt QR-Code auf dem Kassenbon',
      details: 'Ein simpler Scan verwandelt jeden Kassenbon in eine direkte Verbindung zu Ihrer Marke.'
    },
    { 
      icon: MessageSquare, 
      title: 'Bewerten', 
      description: 'Hinterlässt eine Google-Bewertung',
      details: 'Zufriedene Kunden werden ermutigt, ihre positiven Erfahrungen öffentlich zu teilen.'
    },
    { 
      icon: Award, 
      title: 'Geschenk', 
      description: 'Erhält sofort sein persönliches Dankeschön',
      details: 'Belohnen Sie Loyalität mit individuellen Incentives und stärken Sie die Kundenbindung.'
    }
  ];

  return (
    <div ref={containerRef} className="bg-background text-foreground relative scroll-smooth">
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

      {/* Hero Section with Parallax */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-4 snap-start">
        <motion.div 
          style={{ y: heroY, opacity: heroOpacity }}
          className="max-w-5xl mx-auto text-center"
        >
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-6xl sm:text-7xl lg:text-8xl font-bold mb-8"
          >
            Verwandeln Sie Kunden in{' '}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Markenbotschafter
            </span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl sm:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto"
          >
            Die innovative Lösung für mehr Google-Bewertungen und nachhaltiges Wachstum Ihres Unternehmens.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <GradientButton onClick={() => navigate('/kontakt')} className="text-lg px-8 py-6">
              Jetzt Kontakt aufnehmen
            </GradientButton>
          </motion.div>
        </motion.div>
      </section>

      {/* Sticky Intro */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-4 snap-start">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-4xl sm:text-5xl font-bold mb-6"
          >
            So funktioniert's
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-xl text-muted-foreground"
          >
            In drei einfachen Schritten zu mehr Bewertungen und höherer Kundenbindung
          </motion.p>
        </div>
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
                
                <p className="text-lg text-muted-foreground/80 leading-relaxed">
                  {step.details}
                </p>
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
