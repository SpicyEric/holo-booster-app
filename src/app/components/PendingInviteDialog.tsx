import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Gift, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const PENDING_INVITE_KEY = 'eloyo_pending_invite';

interface InviteData {
  invitation_id: string;
  merchant_customer_id: string;
  merchant_name: string;
  logo_url: string | null;
  cover_image_url: string | null;
  invitee_points: number;
}

/**
 * Verarbeitet einen pending Invite-Code aus localStorage.
 * Erscheint automatisch nach Login wenn ein Code da ist.
 * Ruft consume_invitation auf, zeigt Popup und navigiert zum Händler.
 */
export function PendingInviteDialog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invite, setInvite] = useState<InviteData | null>(null);

  useEffect(() => {
    if (!user) return;

    const code = localStorage.getItem(PENDING_INVITE_KEY);
    if (!code) return;

    void processCode(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const processCode = async (code: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('consume_invitation', {
        p_share_code: code,
      });
      if (error) throw error;
      const result = data as {
        success: boolean;
        error?: string;
        error_code?: string;
        invitation_id?: string;
        merchant_customer_id?: string;
        merchant_name?: string;
        logo_url?: string | null;
        cover_image_url?: string | null;
        invitee_points?: number;
      };

      // Code in jedem Fall entfernen, damit das Popup nicht erneut auftaucht
      localStorage.removeItem(PENDING_INVITE_KEY);

      if (!result.success) {
        // Stille Fehler bei "schon eingelöst" oder "abgelaufen"
        if (result.error_code === 'already_redeemed') return;
        if (result.error?.toLowerCase().includes('abgelaufen')) return;
        if (result.error?.toLowerCase().includes('selbst')) return;
        return;
      }

      setInvite({
        invitation_id: result.invitation_id!,
        merchant_customer_id: result.merchant_customer_id!,
        merchant_name: result.merchant_name || 'einem Geschäft',
        logo_url: result.logo_url ?? null,
        cover_image_url: result.cover_image_url ?? null,
        invitee_points: result.invitee_points ?? 1,
      });
      setOpen(true);
    } catch (err) {
      // Fehler nicht stören; Code wurde entfernt
      console.error('consume_invitation Fehler:', err);
      localStorage.removeItem(PENDING_INVITE_KEY);
    } finally {
      setLoading(false);
    }
  };

  const goToMerchant = () => {
    if (!invite) return;
    setOpen(false);
    navigate(`/app/merchant/${invite.merchant_customer_id}`);
  };

  if (!invite) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[340px] rounded-3xl p-0 gap-0 overflow-hidden border-0">
        {/* Cover */}
        <div
          className="h-32 bg-gradient-to-br from-primary to-primary/60"
          style={
            invite.cover_image_url || invite.logo_url
              ? {
                  backgroundImage: `url(${invite.cover_image_url || invite.logo_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : undefined
          }
        />
        <div className="px-6 pb-6 -mt-10 text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-card border-4 border-card shadow-lg overflow-hidden flex items-center justify-center mb-3">
            {invite.logo_url ? (
              <img src={invite.logo_url} alt={invite.merchant_name} className="h-full w-full object-cover" />
            ) : (
              <Gift className="h-8 w-8 text-primary" />
            )}
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            Du wurdest eingeladen
          </div>
          <h2 className="text-xl font-bold leading-tight mb-2">
            Willkommen bei <span className="text-primary">{invite.merchant_name}</span> 🎉
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Sammle innerhalb der nächsten <span className="font-semibold text-foreground">24 Stunden</span> hier deinen
            ersten Stempel – ihr bekommt dann <span className="font-semibold text-foreground">beide</span> Bonuspunkte!
          </p>
          <div className="rounded-xl bg-primary/10 px-3 py-2.5 mb-5">
            <div className="text-xs text-muted-foreground">Dein Willkommensbonus</div>
            <div className="text-lg font-bold text-primary">+{invite.invitee_points} Bonuspunkte</div>
          </div>
          <Button onClick={goToMerchant} className="w-full h-11 rounded-xl">
            Zum Geschäft
          </Button>
          <button
            onClick={() => setOpen(false)}
            className="text-xs text-muted-foreground mt-3 hover:text-foreground"
          >
            Später
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hilfsfunktion zum Speichern eines pending Invite Codes
 * (wird vom DeepLinkProvider aufgerufen wenn ein eloyo://invite/CODE Link kommt)
 */
export function storePendingInvite(code: string) {
  try {
    localStorage.setItem(PENDING_INVITE_KEY, code);
  } catch {
    // ignore
  }
}
