import ClassicNav from '@/components/ClassicNav';
import ERecht24Badge from '@/components/ERecht24Badge';
import Particles from '@/components/Particles';
import { motion, type Variants } from 'framer-motion';
import eloyoLogo from '@/assets/eloyo-logo.png';

const appleEase = [0.16, 1, 0.3, 1] as const;

export const glassReveal: Variants = {
  hidden: { opacity: 0, y: 30, filter: 'blur(12px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: appleEase },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

export const viewportConfig = { once: true, margin: '-80px' as any };

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Karriere', href: '/karriere' },
  { label: 'Kontakt', href: '/kontakt' },
  { label: 'Datenschutz', href: '/datenschutz' },
  { label: 'Impressum', href: '/impressum' },
  { label: 'Konto löschen', href: '/konto-loeschen' },
  { label: 'Login', href: '/auth' },
];

interface PageLayoutProps {
  children: React.ReactNode;
}

const PageLayout = ({ children }: PageLayoutProps) => {
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

      {children}

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

export default PageLayout;
