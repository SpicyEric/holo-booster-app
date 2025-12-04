import { HelpCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export interface TopBarProps {
  title: string;
  showBack?: boolean;
}

export const TopBar = ({ title, showBack = false }: TopBarProps) => {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border h-14 flex items-center justify-between px-4 shadow-sm">
      <div className="flex items-center gap-2">
        {showBack && (
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-foreground -ml-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>
      <Button variant="ghost" size="icon" className="text-muted-foreground">
        <HelpCircle className="h-5 w-5" />
      </Button>
    </header>
  );
};
