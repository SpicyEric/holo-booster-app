import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, ChevronRight, Bell, Shield, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface Profile {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  full_name: string | null;
}

interface Stats {
  totalPoints: number;
  totalMerchants: number;
  totalRedemptions: number;
}

export const AppProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({ totalPoints: 0, totalMerchants: 0, totalRedemptions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url, full_name')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      // Load stats
      const { data: stampCards } = await supabase
        .from('user_stamp_cards')
        .select('current_points')
        .eq('user_id', user?.id);

      const { count: redemptionCount } = await supabase
        .from('reward_redemptions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      if (stampCards) {
        setStats({
          totalPoints: stampCards.reduce((sum, c) => sum + (c.current_points || 0), 0),
          totalMerchants: stampCards.length,
          totalRedemptions: redemptionCount || 0,
        });
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Fehler beim Abmelden');
    } else {
      toast.success('Erfolgreich abgemeldet');
      navigate('/app/auth');
    }
  };

  const displayName = profile?.first_name 
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : profile?.full_name || user?.email?.split('@')[0] || 'Benutzer';

  const initials = displayName
    .split(' ')
    .map(n => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const menuItems = [
    { icon: Settings, label: 'Einstellungen', path: '/app/settings' },
    { icon: Bell, label: 'Benachrichtigungen', path: '/app/notifications' },
    { icon: Shield, label: 'Datenschutz', path: '/datenschutz' },
    { icon: HelpCircle, label: 'Hilfe & Support', path: '/kontakt' },
  ];

  if (loading) {
    return (
      <div className="p-4 space-y-6">
        <div className="flex flex-col items-center py-6">
          <Skeleton className="w-24 h-24 rounded-full mb-4" />
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Profile Header */}
      <div className="flex flex-col items-center py-6">
        <Avatar className="w-24 h-24 mb-4">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <h1 className="text-xl font-bold">{displayName}</h1>
        <p className="text-muted-foreground">{user?.email}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.totalPoints}</p>
            <p className="text-xs text-muted-foreground">Punkte gesamt</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.totalMerchants}</p>
            <p className="text-xs text-muted-foreground">Geschäfte</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.totalRedemptions}</p>
            <p className="text-xs text-muted-foreground">Eingelöst</p>
          </CardContent>
        </Card>
      </div>

      {/* Menu */}
      <Card>
        <CardContent className="p-0 divide-y divide-border">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <span>{item.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Logout */}
      <Button 
        variant="outline" 
        className="w-full text-destructive border-destructive hover:bg-destructive/10"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Abmelden
      </Button>
    </div>
  );
};

export default AppProfile;
