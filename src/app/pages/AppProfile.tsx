import { MainLayout } from '@/app/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AppProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState({
    firstName: '',
    lastName: '',
    totalPoints: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;

      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('user_id', user.id)
          .maybeSingle();

        const { data: stampCardsData, error: stampCardsError } = await supabase
          .from('user_stamp_cards')
          .select('current_points')
          .eq('user_id', user.id);

        const totalPoints = stampCardsData?.reduce((sum, card) => sum + (card.current_points || 0), 0) || 0;

        setUserProfile({
          firstName: profileData?.first_name || '',
          lastName: profileData?.last_name || '',
          totalPoints,
        });
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user]);

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
      icon: Receipt,
      label: 'Transaktionen',
      description: 'Alle Punktebewegungen',
      action: () => navigate('/app/history'),
    },
    {
      icon: Store,
      label: 'Meine Shops',
      description: 'Geschäfte anzeigen',
      action: () => navigate('/app/stores'),
    },
    {
      icon: Lightbulb,
      label: 'Shop vorschlagen',
      description: 'Neues Geschäft vorschlagen',
      action: () => navigate('/kontakt'),
    },
    {
      icon: User,
      label: 'Profil bearbeiten',
      description: 'Account verwalten',
      action: () => navigate('/app/settings'),
    },
  ];

  if (loading) {
    return (
      <MainLayout title="Profil">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Profil">
      <div className="space-y-6">
        <Card className="p-6 bg-gradient-to-br from-primary to-secondary text-primary-foreground">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-4 border-primary-foreground/20">
              <AvatarFallback className="bg-primary-foreground/20 text-2xl">
                {userProfile.firstName?.[0]}{userProfile.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">
                {userProfile.firstName} {userProfile.lastName}
              </h2>
              <p className="text-primary-foreground/80 text-sm">
                {user?.email}
              </p>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-primary-foreground/20">
            <div className="flex items-center justify-between">
              <span className="text-primary-foreground/80">Deine Stempelpunkte</span>
              <span className="text-3xl font-bold">
                {userProfile.totalPoints}
              </span>
            </div>
          </div>
        </Card>

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
            onClick={() => window.open('https://wa.me/', '_blank')}
            className="w-full text-left py-3 flex items-center justify-between hover:text-primary transition-colors"
          >
            <span className="text-foreground">Kontakt</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
          <button
            onClick={() => {}}
            className="w-full text-left py-3 flex items-center justify-between hover:text-primary transition-colors"
          >
            <span className="text-foreground">FAQ</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
          <button
            onClick={() => navigate('/datenschutz')}
            className="w-full text-left py-3 flex items-center justify-between hover:text-primary transition-colors"
          >
            <span className="text-foreground">Nutzungsbedingungen</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
          <button
            onClick={() => navigate('/datenschutz')}
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
