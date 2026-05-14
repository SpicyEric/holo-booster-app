import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Smartphone } from 'lucide-react';

const SESSION_KEY = 'eloyo_phone_migration_seen_session';

/**
 * Promotes SMS-Login to email-only legacy users on the 3rd login,
 * unless they have dismissed the prompt for good.
 */
export const PhoneMigrationDialog = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    if (sessionStorage.getItem(SESSION_KEY) === '1') return;

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('auth_method, login_count, migration_prompt_dismissed')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled || !data) return;
      if (
        data.auth_method === 'email' &&
        !data.migration_prompt_dismissed &&
        (data.login_count ?? 0) >= 3
      ) {
        setOpen(true);
        sessionStorage.setItem(SESSION_KEY, '1');
      }
    })();

    return () => { cancelled = true; };
  }, [user, loading]);

  const dismissForever = async () => {
    if (!user) return;
    setWorking(true);
    await supabase
      .from('profiles')
      .update({ migration_prompt_dismissed: true })
      .eq('user_id', user.id);
    setWorking(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle>Login einfacher machen?</DialogTitle>
          <DialogDescription>
            Füge deine Handynummer hinzu und logge dich künftig per
            SMS-Code ein – ganz ohne Passwort.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full bg-gradient-to-r from-primary to-secondary"
            onClick={() => { setOpen(false); navigate('/app/settings'); }}
          >
            Handynummer hinzufügen
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>
            Später
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            disabled={working}
            onClick={dismissForever}
          >
            Nicht mehr fragen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PhoneMigrationDialog;
