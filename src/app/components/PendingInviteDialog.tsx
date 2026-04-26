import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Gift, Sparkles, Info, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getDeviceFingerprint } from '@/lib/deviceFingerprint';
import { clearPendingInvite, getPendingInviteCode, isInviteConsumed, markInviteConsumed, storePendingInvite } from '@/app/lib/pendingInvite';

type IneligibleReason =
  | { kind: 'already_customer'; merchant_customer_id: string; merchant_name: string; logo_url: string | null; cover_image_url: string | null }
  | { kind: 'already_invited'; merchant_customer_id: string; merchant_name: string; logo_url: string | null; cover_image_url: string | null; expires_at: string | null };

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
  const [ineligible, setIneligible] = useState<IneligibleReason | null>(null);

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
    // Bereits angenommene/abgelehnte Einladungen niemals erneut als Preview anzeigen
    if (isInviteConsumed(code)) {
      clearPendingInvite();
      return;
    }

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
        console.info('[PendingInviteDialog] lookup_invitation not successful:', result.error);
        markInviteConsumed(code);
        clearPendingInvite();
        return;
      }

      // Wenn User eingeloggt ist: read-only Eligibility-Check, BEVOR der Dialog erscheint.
      // (Wir wollen NICHT consume_invitation aufrufen — das würde das 7-Tage-Fenster sofort starten.)
      if (user && result.merchant_customer_id) {
        // 1) User darf sich nicht selbst einladen / hat schon Punkte beim Merchant
        const { data: existingAccount } = await supabase
          .from('loyalty_accounts')
          .select('id, current_points_balance')
          .eq('user_id', user.id)
          .eq('merchant_customer_id', result.merchant_customer_id)
          .maybeSingle();

        if (existingAccount && existingAccount.current_points_balance > 0) {
          console.info('[PendingInviteDialog] user is already customer of merchant — skipping');
          markInviteConsumed(code);
          clearPendingInvite();
          return;
        }

        // 2) User hat bereits eine offene Redemption für DIESEN Merchant
        const { data: existingRedemption } = await supabase
          .from('invitation_redemptions')
          .select('id, bonus_window_starts_at, bonus_awarded_at, invitation_id, invitations!inner(merchant_customer_id)')
          .eq('invitee_user_id', user.id)
          .eq('invitations.merchant_customer_id', result.merchant_customer_id)
          .is('bonus_awarded_at', null)
          .maybeSingle();

        if (existingRedemption) {
          console.info('[PendingInviteDialog] user already has open redemption — skipping');
          markInviteConsumed(code);
          clearPendingInvite();
          return;
        }
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
      markInviteConsumed(code);
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

      // 🔍 DEBUG: Aktiver User vor RPC-Call
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      console.log('[consume_invitation] PRE-CALL', {
        share_code: preview.share_code,
        device_fingerprint: fp,
        client_user_id: userData?.user?.id ?? null,
        client_user_email: userData?.user?.email ?? null,
        getUser_error: userErr,
        useAuth_user_id: user?.id ?? null,
      });

      const { data, error } = await supabase.rpc('consume_invitation', {
        p_share_code: preview.share_code,
        p_device_fingerprint: fp,
      });

      // 🔍 DEBUG: Vollständige Response
      console.log('[consume_invitation] RESPONSE', {
        data,
        error,
        error_message: error?.message,
        error_code: (error as { code?: string } | null)?.code,
        error_details: (error as { details?: string } | null)?.details,
        error_hint: (error as { hint?: string } | null)?.hint,
      });

      if (error) throw error;
      const result = data as {
        success: boolean;
        error?: string;
        error_code?: string;
        invitation_id?: string;
        merchant_customer_id?: string;
      };

      console.log('[consume_invitation] PARSED RESULT', result);

      // Egal ob neu angenommen oder bereits angenommen: nicht nochmal zeigen
      markInviteConsumed(preview.share_code);
      clearPendingInvite();
      if (!result.success) {
        console.warn('[consume_invitation] FAILED:', result.error, '(code:', result.error_code, ')');
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

      // Bug 3 Fix: Banner im Feed sofort aktualisieren (Realtime ist nicht garantiert sofort da)
      window.dispatchEvent(new CustomEvent('eloyo:invitation-changed'));

      // Push an den Einladenden – mit Retry, falls erster Versuch scheitert.
      // Wir blockieren das UI nicht, aber wir versuchen es bis zu 2x mit Backoff.
      void (async () => {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const { data: notifyData, error: notifyErr } = await supabase.functions.invoke(
              'notify-invitation-accepted',
              {
                body: {
                  invitation_id: result.invitation_id,
                  merchant_customer_id: result.merchant_customer_id,
                },
              },
            );
            console.log(`[notify-invitation-accepted] attempt ${attempt}:`, { notifyData, notifyErr });
            const notifyResult = notifyData as { success?: boolean } | null;
            if (notifyResult?.success) return;
            if (attempt < 2) await new Promise((r) => setTimeout(r, 2000));
          } catch (err) {
            console.warn(`[notify-invitation-accepted] attempt ${attempt} failed:`, err);
            if (attempt < 2) await new Promise((r) => setTimeout(r, 2000));
          }
        }
      })();
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

  const closeDialog = () => {
    setOpen(false);
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
    <Dialog open={open} onOpenChange={(o) => { if (!o) closeDialog(); }}>
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
