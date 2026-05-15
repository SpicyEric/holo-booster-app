import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Rocket, Copy, Check, Loader2, Share2, Flame, CircleCheck } from 'lucide-react';
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

const INVITE_BASE_URL = 'https://eloyo.de/i';

interface NextBoost {
  successful_referrals: number;
  next_boost: number;
  is_streak_complete: boolean;
  is_new_cycle: boolean;
}

export const InviteFriendDialog = ({
  open,
  onOpenChange,
  merchantId,
  merchantName,
}: InviteFriendDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [nextBoost, setNextBoost] = useState<NextBoost | null>(null);

  useEffect(() => {
    if (open) {
      void loadBoostPreview();
      if (!shareCode && !loading) void createInvite();
    } else {
      setShareCode(null);
      setCopied(false);
      setNextBoost(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadBoostPreview = async () => {
    try {
      const { data, error } = await supabase.rpc('get_next_boost_reward', {
        p_merchant_customer_id: merchantId,
      });
      if (error) throw error;
      setNextBoost(data as NextBoost);
    } catch (err) {
      console.warn('[InviteFriendDialog] boost preview failed', err);
    }
  };

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
    ? `Hey! 😊 Ich lad dich zu ${merchantName} ein — wenn du dort vorbeischaust und deine ersten Punkte sammelst, bekommst du direkt doppelte Punkte. Und ich krieg dafür einen Boost auf meinem Treuepass 🚀 Hier der Link: ${inviteUrl}`
    : '';

  const openWhatsApp = () => {
    if (!shareText || !shareCode) return;
    void supabase.rpc('mark_invitation_shared', { p_share_code: shareCode });
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const copyLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      if (shareCode) void supabase.rpc('mark_invitation_shared', { p_share_code: shareCode });
      toast.success('Link kopiert!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Link konnte nicht kopiert werden');
    }
  };

  const nativeShare = async () => {
    if (!shareText || !shareCode) return;
    try {
      if (navigator.share) {
        void supabase.rpc('mark_invitation_shared', { p_share_code: shareCode });
        await navigator.share({ title: `Einladung zu ${merchantName}`, text: shareText, url: inviteUrl });
      } else {
        await copyLink();
      }
    } catch {
      // user cancelled
    }
  };

  const next = nextBoost?.next_boost ?? 1;
  const rockets = next === 3 ? '🚀🚀🚀' : next === 2 ? '🚀🚀' : '🚀';
  const nextLabel = next === 3
    ? `+3 Check-ins 🎉`
    : nextBoost?.is_new_cycle
    ? `+${next} Check-in (neuer Zyklus)`
    : `+${next} Check-in${next === 1 ? '' : 's'}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[340px] rounded-3xl border-0 p-6 gap-4 [&>button]:rounded-none [&>button]:bg-transparent [&>button]:opacity-100 [&>button]:ring-0 [&>button]:ring-offset-0 [&>button]:outline-none [&>button]:hover:bg-transparent [&>button>svg]:h-6 [&>button>svg]:w-6 [&>button>svg]:stroke-[2.5]">
        <DialogHeader className="space-y-2 text-center sm:text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
            <Rocket className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl">🚀 Jetzt boosten</DialogTitle>
          <DialogDescription className="text-[12px] leading-relaxed text-left space-y-1.5">
            <span className="block"><span className="font-semibold text-foreground">So funktioniert's:</span></span>
            <span className="block">1. Teile deinen Einladungslink</span>
            <span className="block">2. Dein Freund kauft bei <span className="font-semibold text-foreground">{merchantName}</span> etwas und checkt ein</span>
            <span className="block">3. Du bekommst Boost-Check-ins auf deinem Treuepass</span>
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2.5 space-y-1.5">
          <div className="text-[11px] text-muted-foreground font-medium">
            Dein Stand bei {merchantName}:
          </div>
          <div className="flex items-center gap-2 text-[13px] text-foreground">
            <CircleCheck className="h-4 w-4 text-emerald-500" />
            <span><span className="font-bold">{nextBoost?.successful_referrals ?? 0}</span> erfolgreiche Empfehlungen</span>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-foreground">
            <Flame className="h-4 w-4 text-orange-500" />
            <span>Nächste Belohnung: <span className="font-bold">{rockets} {nextLabel}</span></span>
          </div>
        </div>

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
              Per WhatsApp teilen
            </Button>
            <Button onClick={copyLink} variant="outline" className="w-full h-10 rounded-xl">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Kopiert' : 'Link kopieren'}
            </Button>
            <Button onClick={nativeShare} variant="ghost" className="w-full h-9 rounded-xl text-muted-foreground">
              <Share2 className="h-4 w-4" />
              Mehr Optionen
            </Button>
            <p className="text-center text-[11px] text-muted-foreground pt-1">
              Link gültig 90 Tage · Max. 5 Boost-Check-ins pro Tag
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
