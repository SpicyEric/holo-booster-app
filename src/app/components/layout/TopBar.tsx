import { useEffect, useState } from 'react';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/app/hooks/useTheme';
import { getActiveBrandColor, subscribeActiveBrandColor } from '@/lib/activeBrandColor';

export interface TopBarProps {
  title: string;
  showBack?: boolean;
}

export const TopBar = ({ title, showBack = false }: TopBarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggle } = useTheme();
  const [rawBrandColor, setRawBrandColor] = useState<string | null>(() => getActiveBrandColor());

  useEffect(() => subscribeActiveBrandColor(setRawBrandColor), []);

  // Brand color should only tint the TopBar on merchant detail / scan,
  // not on Home (/app) while the user swipes through loyalty cards.
  const onMerchantDetail = /^\/app\/merchant\//.test(location.pathname);
  const onScan = location.pathname.startsWith('/app/scan');
  const brandColor = onMerchantDetail || onScan ? rawBrandColor : null;

  const thumbStyle: React.CSSProperties = brandColor
    ? { backgroundColor: brandColor, transition: 'background-color 220ms ease-out, transform 300ms' }
    : { transition: 'background-color 220ms ease-out, transform 300ms' };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card flex items-center justify-between px-4" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', height: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}>
      <div className="flex items-center gap-2">
        {showBack && (
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-foreground -ml-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>
      <button
        onClick={toggle}
        className="relative w-14 h-7 rounded-full bg-muted border border-border transition-colors flex items-center px-1"
        aria-label="Dark Mode umschalten"
      >
        <span
          className={`absolute w-5 h-5 rounded-full ${brandColor ? '' : 'bg-primary'} shadow-md transition-transform duration-300 flex items-center justify-center ${
            isDark ? 'translate-x-7' : 'translate-x-0'
          }`}
          style={thumbStyle}
        >
          {isDark ? (
            <Moon className="h-3 w-3 text-primary-foreground" />
          ) : (
            <Sun className="h-3 w-3 text-primary-foreground" />
          )}
        </span>
      </button>
    </header>
  );
};
