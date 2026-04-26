import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Gift, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getDeviceFingerprint } from '@/lib/deviceFingerprint';
import { clearPendingInvite, getPendingInviteCode, storePendingInvite } from '@/app/lib/pendingInvite';

interface InviteData {
  invitation_id: string;
  share_code: string;
  merchant_customer_id: string;
  merchant_name: string;
  logo_url: string | null;
  cover_image_url: string | null;
  invitee_points: number;
}

interface PreviewData {
  share_code: string;
  merchant_customer_id: string;
  merchant_name: string;
  logo_url: string | null;
  cover_image_url: string | null;
  invitee_points: number;
}

/**
 * Verarbeitet einen pending Invite-Code aus localStorage.
 * Zeigt zuerst Preview (annehmen / ablehnen). Erst auf "Annehmen"
 * wird die Einladung verbraucht (consume_invitation) und das 7-Tage-Fenster startet.
 */
export function PendingInviteDialog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [accepted, setAccepted] = useState<InviteData | null>(null);

  useEffect(() => {
    const code = getPendingInviteCode();
    if (code) void loadPreview(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const code = getPendingInviteCode();
    if (code) {
      void loadPreview(code);
    }
    const pollForInvite = window.setInterval(() => {
      const pendingCode = getPendingInviteCode();
      if (pendingCode && pendingCode !== preview?.share_code && pendingCode !== accepted?.share_code) {
        void loadPreview(pendingCode);
      }
    }, 750);
    // Reagiere zusätzlich auf neue Deep-Link-Events (App war bereits offen)
    const onNewInvite = (e: Event) => {
      const detail = (e as CustomEvent).detail as string | undefined;
      const c = detail ? storePendingInvite(detail) : getPendingInviteCode();
      if (c) void loadPreview(c);
    };
    window.addEventListener('eloyo:pending-invite', onNewInvite);
    return () => {
      window.clearInterval(pollForInvite);
      window.removeEventListener('eloyo:pending-invite', onNewInvite);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview?.share_code, accepted?.share_code]);

  const loadPreview = async (code: string) => {
    try {
      const { data, error } = await supabase.rpc('lookup_invitation', { p_share_code: code });
      if (error) throw error;
      const result = data as {
        success: boolean;
        error?: string;
        merchant_customer_id?: string;
        merchant_name?: string;
        logo_url?: string | null;
        cover_image_url?: string | null;
        invitee_points?: number;
      };
      if (!result.success) {
        clearPendingInvite();
        return;
      }
      setPreview({
        share_code: code,
        merchant_customer_id: result.merchant_customer_id!,
        merchant_name: result.merchant_name || 'einem Geschäft',
        logo_url: result.logo_url ?? null,
        cover_image_url: result.cover_image_url ?? null,
        invitee_points: result.invitee_points ?? 1,
      });
      setOpen(true);
    } catch (err) {
      console.error('lookup_invitation Fehler:', err);
      clearPendingInvite();
    }
  };

  const acceptInvite = async () => {
    if (!preview) return;
    if (!user) {
      storePendingInvite(preview.share_code);
      setOpen(false);
      navigate('/app/auth');
      return;
    }
    setAccepting(true);
    try {
      const fp = getDeviceFingerprint();
      const { data, error } = await supabase.rpc('consume_invitation', {
        p_share_code: preview.share_code,
        p_device_fingerprint: fp,
      });
      if (error) throw error;
      const result = data as {
        success: boolean;
        error?: string;
        invitation_id?: string;
        merchant_customer_id?: string;
      };
      clearPendingInvite();
      if (!result.success) {
        // Stille Behandlung
        setOpen(false);
        return;
      }
      setAccepted({
        invitation_id: result.invitation_id!,
        share_code: preview.share_code,
        merchant_customer_id: result.merchant_customer_id!,
        merchant_name: preview.merchant_name,
        logo_url: preview.logo_url,
        cover_image_url: preview.cover_image_url,
        invitee_points: preview.invitee_points,
      });
    } catch (err) {
      console.error('consume_invitation Fehler:', err);
      clearPendingInvite();
      setOpen(false);
    } finally {
      setAccepting(false);
    }
  };

  const declineInvite = () => {
    clearPendingInvite();
    setOpen(false);
    setPreview(null);
  };

  const goToMerchant = () => {
    const target = accepted ?? preview;
    if (!target) return;
    setOpen(false);
    navigate(`/app/merchant/${target.merchant_customer_id}`);
  };

  if (!preview && !accepted) return null;

  const display = accepted ?? preview!;
  const isAccepted = !!accepted;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) declineInvite(); }}>
      <DialogContent className="max-w-[340px] rounded-3xl p-0 gap-0 overflow-hidden border-0">
        <div
          className="h-32 bg-gradient-to-br from-primary to-primary/60"
          style={
            display.cover_image_url || display.logo_url
              ? {
                  backgroundImage: `url(${display.cover_image_url || display.logo_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : undefined
          }
        />
        <div className="px-6 pb-6 -mt-10 text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-card border-4 border-card shadow-lg overflow-hidden flex items-center justify-center mb-3">
            {display.logo_url ? (
              <img src={display.logo_url} alt={display.merchant_name} className="h-full w-full object-cover" />
            ) : (
              <Gift className="h-8 w-8 text-primary" />
            )}
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            Du wurdest eingeladen
          </div>
          <h2 className="text-xl font-bold leading-tight mb-2">
            Willkommen bei <span className="text-primary">{display.merchant_name}</span> 🎉
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Sammle innerhalb der nächsten <span className="font-semibold text-foreground">7 Tage</span> dort
            deinen ersten Stempel – ihr bekommt dann <span className="font-semibold text-foreground">beide</span>{' '}
            Bonuspunkte!
          </p>
          <div className="rounded-xl bg-primary/10 px-3 py-2.5 mb-5">
            <div className="text-xs text-muted-foreground">Dein Willkommensbonus</div>
            <div className="text-lg font-bold text-primary">+{display.invitee_points} Bonuspunkte</div>
          </div>

          {isAccepted ? (
            <Button onClick={goToMerchant} className="w-full h-11 rounded-xl">
              Zum Geschäft
            </Button>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={acceptInvite}
                disabled={accepting}
                className="w-full h-11 rounded-xl"
              >
                {accepting ? 'Wird angenommen…' : user ? 'Einladung annehmen' : 'Einloggen oder registrieren'}
              </Button>
              <button
                onClick={declineInvite}
                className="w-full text-xs text-muted-foreground hover:text-foreground py-2"
              >
                Ablehnen
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { storePendingInvite } from '@/app/lib/pendingInvite';
