import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Gift, Copy, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InviteFriendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchantId: string;
  merchantName: string;
  inviterPoints: number;
  inviteePoints: number;
}

// Web-Link auf eloyo.de — die Route /i/:code zeigt eine Landing-Seite,
// die auf Mobile automatisch die App via eloyo:// öffnet (Deferred Deep Link)
// und sonst zum App Store / Play Store fällt.
const INVITE_BASE_URL = 'https://eloyo.de/i';

export const InviteFriendDialog = ({
  open,
  onOpenChange,
  merchantId,
  merchantName,
  inviterPoints,
  inviteePoints,
}: InviteFriendDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Generate code once when dialog opens
  useEffect(() => {
    if (open && !shareCode && !loading) {
      void createInvite();
    }
    if (!open) {
      // reset on close so re-open creates a fresh link
      setShareCode(null);
      setCopied(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const createInvite = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('create_invitation', {
        p_merchant_customer_id: merchantId,
      });
      if (error) throw error;
      const result = data as { success: boolean; share_code?: string; error?: string };
      if (!result.success || !result.share_code) {
        throw new Error(result.error || 'Einladung konnte nicht erstellt werden');
      }
      setShareCode(result.share_code);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
      toast.error(msg);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const inviteUrl = shareCode ? `${INVITE_BASE_URL}/${shareCode}` : '';
  const shareText = shareCode
    ? `Hey! 😊 Ich lad dich zu ${merchantName} ein — wenn du dort innerhalb der nächsten 7 Tage vorbeischaust und deine ersten Punkte sammelst, bekommst du direkt doppelte Punkte. Und ich krieg dafür auch einen kleinen Bonus 😄 Hier der Link: ${inviteUrl}`
    : '';

  const openWhatsApp = () => {
    if (!shareText || !shareCode) return;
    // Erst beim tatsächlichen Versand zählt es als verschickte Einladung
    void supabase.rpc('mark_invitation_shared', { p_share_code: shareCode });
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const copyLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success('Link kopiert!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Link konnte nicht kopiert werden');
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[340px] rounded-3xl border-0 p-6 gap-4 [&>button]:rounded-none [&>button]:bg-transparent [&>button]:opacity-100 [&>button]:ring-0 [&>button]:ring-offset-0 [&>button]:outline-none [&>button]:focus:outline-none [&>button]:focus:ring-0 [&>button]:focus:ring-offset-0 [&>button]:focus-visible:outline-none [&>button]:focus-visible:ring-0 [&>button]:focus-visible:ring-offset-0 [&>button]:hover:bg-transparent [&>button]:active:bg-transparent [&>button]:data-[state=open]:bg-transparent [&>button>svg]:h-6 [&>button>svg]:w-6 [&>button>svg]:stroke-[2.5]">
        <DialogHeader className="space-y-3 text-center sm:text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
            <Gift className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl">Freund einladen</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Lade eine Person zu <span className="font-semibold text-foreground">{merchantName}</span> ein,
            indem du ihr deinen persönlichen Link schickst. Sammelt sie innerhalb von{' '}
            <span className="font-semibold text-foreground">7 Tagen</span> dort ihre ersten Punkte,
            bekommt ihr <span className="font-semibold text-foreground">beide</span> einen Bonus:
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-muted/50 px-3 py-3 text-center">
            <div className="text-xs text-muted-foreground">Du bekommst</div>
            <div className="text-lg font-bold text-primary leading-tight">+{inviterPoints} Punkte</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">als Empfehlungs-Bonus</div>
          </div>
          <div className="rounded-xl bg-muted/50 px-3 py-3 text-center">
            <div className="text-xs text-muted-foreground">Dein Freund</div>
            <div className="text-lg font-bold text-primary leading-tight">Punkte ×2</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">auf die ersten Punkte</div>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed text-center px-1">
          Du kannst nur Personen einladen, die bei <span className="font-medium text-foreground">{merchantName}</span> noch
          keine Punkte gesammelt haben und aktuell keine offene Einladung von jemand anderem für diesen Laden besitzen.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : shareCode ? (
          <div className="space-y-2">
            <Button onClick={openWhatsApp} className="w-full h-11 rounded-xl">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
              </svg>
              Über WhatsApp einladen
            </Button>
            <Button
              onClick={copyLink}
              variant="outline"
              className="w-full h-10 rounded-xl"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Kopiert' : 'Link kopieren'}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground pt-1">
              Link gültig 7 Tage · Code: <span className="font-mono">{shareCode}</span>
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
