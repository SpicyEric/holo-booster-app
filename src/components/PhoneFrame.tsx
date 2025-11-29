import { ReactNode } from 'react';

interface PhoneFrameProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

/**
 * PhoneFrame - Reusable smartphone mockup frame
 * 
 * Wraps content in a realistic iPhone-style frame for previews.
 * Use this consistently across:
 * - Merchant dashboard preview
 * - Design previews
 * - Marketing materials
 */
const PhoneFrame = ({ children, title, className = '' }: PhoneFrameProps) => (
  <div className={`flex flex-col items-center ${className}`}>
    {title && (
      <h3 className="text-lg font-semibold mb-3 text-foreground">{title}</h3>
    )}
    <div className="relative w-[280px] h-[560px] bg-black rounded-[40px] p-2 shadow-2xl">
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl z-10" />
      {/* Screen */}
      <div className="w-full h-full bg-background rounded-[32px] overflow-hidden">
        {children}
      </div>
    </div>
  </div>
);

export default PhoneFrame;
