import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TopBarProps {
  title: string;
}

export const TopBar = ({ title }: TopBarProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border h-14 flex items-center justify-between px-4 shadow-sm">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <Button variant="ghost" size="icon" className="text-muted-foreground">
        <HelpCircle className="h-5 w-5" />
      </Button>
    </header>
  );
};
