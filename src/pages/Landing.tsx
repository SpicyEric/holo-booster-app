import GooeyNav from '@/components/GooeyNav';
import Particles from '@/components/Particles';
import { GradientButton } from '@/components/GradientButton';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Eye, Star, TrendingUp, Gift, BarChart3, Scan, MessageSquare, Award } from 'lucide-react';
import Stepper, { Step } from '@/components/Stepper';
import TextType from '@/components/TextType';
import ScrollStack, { ScrollStackItem } from '@/components/ScrollStack';
import { gsap } from 'gsap';
import qraitLogo from '@/assets/qrait-logo.svg';

const Landing = () => {
  const navigate = useNavigate();
  const [showLogo, setShowLogo] = useState(false);
  const [showStepper, setShowStepper] = useState(false);
  const [typingComplete, setTypingComplete] = useState(false);
  const logoRef = useRef<HTMLDivElement>(null);
  const lettersRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Kontakt', href: '/kontakt' },
    { label: 'Datenschutz', href: '/datenschutz' },
    { label: 'Impressum', href: '/impressum' },
    { label: 'Login', href: '/auth' }
  ];

  const steps = [
    { icon: Scan, title: 'Scannen', description: 'Kunde scannt QR-Code auf dem Kassenbon' },
    { icon: MessageSquare, title: 'Bewerten', description: 'Hinterlässt eine Google-Bewertung' },
    { icon: Award, title: 'Geschenk', description: 'Erhält sofort sein persönliches Dankeschön' }
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

  const handleTextTypeComplete = () => {
    setTypingComplete(true);
    
    // After typing completes, wait a moment then animate letters
    setTimeout(() => {
      if (!lettersRef.current) return;
      
      const text = lettersRef.current.textContent || '';
      lettersRef.current.innerHTML = '';
      
      // Create spans for each character
      const chars = text.split('');
      const letterSpans: HTMLSpanElement[] = [];
      
      chars.forEach((char, i) => {
        const span = document.createElement('span');
        span.textContent = char;
        span.style.display = 'inline-block';
        span.style.opacity = '1';
        lettersRef.current!.appendChild(span);
        letterSpans.push(span);
      });

      // Indices to keep: Q(0), R(6), A(9), I(11), T(14) from "Quick Response AI Tool"
      const keepIndices = [0, 6, 9, 11, 14];
      const timeline = gsap.timeline();

      // Fade out letters we don't want
      letterSpans.forEach((span, i) => {
        if (!keepIndices.includes(i)) {
          timeline.to(span, {
            opacity: 0,
            duration: 0.3,
            ease: 'power2.out'
          }, 0.5);
        }
      });

      // Move kept letters together
      timeline.to(letterSpans.filter((_, i) => keepIndices.includes(i)), {
        x: (index) => {
          // Calculate target positions to spell "QRAIT"
          const finalIndex = keepIndices.indexOf(keepIndices[index]);
          const currentIndex = keepIndices[index];
          return (finalIndex - currentIndex) * 20; // Adjust spacing
        },
        duration: 0.8,
        ease: 'power2.inOut',
        onComplete: () => {
          setShowLogo(true);
          setTimeout(() => setShowStepper(true), 800);
        }
      }, '+=0.3');
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative">
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
          particleCount={8}
          particleDistances={[90, 10]}
          particleR={100}
          initialActiveIndex={0}
          animationTime={600}
          timeVariance={300}
          colors={[1, 2, 3, 1, 2, 3, 1, 4]}
        />
      </div>

      {/* Hero Section with Animation */}
      <section className="relative z-10 pt-32 pb-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center w-full">
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            {!typingComplete && (
              <div ref={lettersRef} className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-8">
                <TextType
                  text="Quick Response AI Tool"
                  typingSpeed={75}
                  showCursor={true}
                  cursorCharacter="|"
                  loop={false}
                  onSentenceComplete={handleTextTypeComplete}
                />
              </div>
            )}
            
            {typingComplete && (
              <div ref={lettersRef} className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-8">
                Quick Response AI Tool
              </div>
            )}

            {showLogo && (
              <motion.div
                ref={logoRef}
                initial={{ opacity: 0, x: 0 }}
                animate={{ opacity: 1, x: -200 }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
                className="mb-8"
              >
                <img src={qraitLogo} alt="QRAIT Logo" className="w-32 h-32" />
              </motion.div>
            )}
          </div>

          {showLogo && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto"
            >
              Die innovative Lösung für mehr Google-Bewertungen und nachhaltiges Wachstum Ihres Unternehmens.
            </motion.p>
          )}
        </div>
      </section>

      {/* Stepper Section */}
      {showStepper && (
        <section className="relative z-10 py-10 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <Stepper
              initialStep={1}
              scrollBased={true}
              onStepChange={(step) => {
                console.log(step);
              }}
              backButtonText="Zurück"
              nextButtonText="Weiter"
            >
              {steps.map((step, index) => (
                <Step key={index}>
                  <div className="flex flex-col items-center text-center py-8">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6">
                      <step.icon className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">{step.title}</h2>
                    <p className="text-muted-foreground max-w-md">{step.description}</p>
                  </div>
                </Step>
              ))}
            </Stepper>
          </div>
        </section>
      )}

      {/* Features Section with ScrollStack */}
      {showStepper && (
        <section className="relative z-10 h-screen">
          <ScrollStack
            itemDistance={100}
            itemScale={0.05}
            itemStackDistance={40}
            stackPosition="30%"
            scaleEndPosition="15%"
            baseScale={0.9}
            useWindowScroll={false}
          >
            {features.map((feature, index) => (
              <ScrollStackItem key={index}>
                <div className="bg-card border border-border rounded-2xl p-8 h-full flex flex-col">
                  <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center mb-6">
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </ScrollStackItem>
            ))}
          </ScrollStack>
        </section>
      )}

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-12 px-4 sm:px-6 lg:px-8 mt-20">
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
