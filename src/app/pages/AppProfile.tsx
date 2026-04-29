import { MainLayout } from '@/app/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import {
  Receipt,
  User,
  Store,
  LogOut,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';
import { toast } from 'sonner';

export default function AppProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Fehler beim Abmelden');
    } else {
      toast.success('Erfolgreich abgemeldet');
      navigate('/app/auth');
    }
  };

  const menuItems = [
    {
      icon: User,
      label: 'Kontoeinstellungen',
      description: 'Account verwalten',
      action: () => navigate('/app/settings'),
    },
    {
      icon: Lightbulb,
      label: 'Shop vorschlagen',
      description: 'Neues Geschäft vorschlagen',
      action: () => navigate('/app/suggest-shop'),
    },
    {
      icon: Store,
      label: 'Meine Punktekarten',
      description: 'Deine Punkte',
      action: () => navigate('/app/my-cards'),
    },
    {
      icon: Receipt,
      label: 'Transaktionen',
      description: 'Alle Punktebewegungen',
      action: () => navigate('/app/history'),
    },
  ];

  return (
    <MainLayout title="Profil">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="bg-card rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-left flex flex-col items-center gap-2 h-full"
            >
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-card-foreground text-sm">{item.label}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="space-y-2 pt-4 border-t border-border">
          <h3 className="font-bold text-foreground mb-3">Support & Sicherheit</h3>
          <button
            onClick={() => navigate('/app/support')}
            className="w-full text-left py-3 flex items-center justify-between hover:text-primary transition-colors"
          >
            <span className="text-foreground">Kontakt & Hilfe</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
          <button
            onClick={() => navigate('/app/terms')}
            className="w-full text-left py-3 flex items-center justify-between hover:text-primary transition-colors"
          >
            <span className="text-foreground">Nutzungsbedingungen</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
          <button
            onClick={() => navigate('/app/privacy')}
            className="w-full text-left py-3 flex items-center justify-between hover:text-primary transition-colors"
          >
            <span className="text-foreground">Datenschutz</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Abmelden
        </Button>
      </div>
    </MainLayout>
  );
}

export { AppProfile };
