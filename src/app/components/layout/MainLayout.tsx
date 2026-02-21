import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import Particles from '@/components/Particles';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export interface MainLayoutProps {
  children: ReactNode;
  title: string;
  showBack?: boolean;
}

export const MainLayout = ({ children, title, showBack = false }: MainLayoutProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-20" style={{ paddingTop: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}>
      <Particles
        particleColors={['#6366F1', '#8B5CF6', '#A855F7']}
        particleCount={400}
        particleSpread={10}
        speed={0.03}
        particleBaseSize={120}
        sizeRandomness={1.8}
        moveParticlesOnHover={true}
        alphaParticles={true}
        disableRotation={false}
        cameraDistance={20}
      />
      <TopBar title={title} showBack={showBack} />
      <main className="container mx-auto px-4 py-6 max-w-2xl relative z-10">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};
