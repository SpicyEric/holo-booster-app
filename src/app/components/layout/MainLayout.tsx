import { ReactNode } from 'react';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import Particles from '@/components/Particles';
import { OfflineBanner } from '@/app/components/OfflineBanner';

export interface MainLayoutProps {
  children: ReactNode;
  title: string;
  showBack?: boolean;
  disableParticles?: boolean;
}

export const MainLayout = ({ children, title, showBack = false, disableParticles = false }: MainLayoutProps) => {
  const topInsetOffset = 'calc(3.5rem + env(safe-area-inset-top, 0px))';
  const bottomInsetOffset = 'calc(7rem + env(safe-area-inset-bottom, 0px))';

  return (
    <div
      className="bg-gradient-to-b from-background to-muted/30 overflow-hidden"
      style={{
        height: '100dvh',
        paddingTop: topInsetOffset,
        paddingBottom: bottomInsetOffset,
      }}
    >
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
      <OfflineBanner />
      <TopBar title={title} showBack={showBack} />
      <main
        className="container mx-auto px-4 py-6 pb-16 max-w-2xl relative z-10 h-full overflow-y-auto overflow-x-hidden"
        style={{ overscrollBehavior: 'none', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
};
