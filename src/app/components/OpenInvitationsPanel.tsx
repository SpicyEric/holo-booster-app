import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Clock, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface OpenInvitation {
  invitation_id: string;
  redemption_id: string;
  merchant_customer_id: string;
  merchant_name: string;
  merchant_logo: string | null;
  expires_at: string; // bonus_window_starts_at + 90d
  accepted_at: string;
}

function daysUntil(dateStr: string): number {
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/**
 * Liste offener Einladungen auf der Nachrichten-Seite.
 * Pro Eintrag: Klick -> Merchant Detail, X -> Einladung entfernen.
 */
export function OpenInvitationsPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<OpenInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<OpenInvitation | null>(null);

  useEffect(() => {
    if (!user) return;
    void load();

    const channel = supabase
      .channel(`open-invitations-panel-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invitation_redemptions', filter: `invitee_user_id=eq.${user.id}` },
        () => void load(),
      )
      .subscribe();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const handleCustomEvent = () => void load();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    window.addEventListener('eloyo:invitation-changed', handleCustomEvent);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
      window.removeEventListener('eloyo:invitation-changed', handleCustomEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: redemptions } = await supabase
        .from('invitation_redemptions')
        .select('id, invitation_id, accepted_at, bonus_window_starts_at, invitee_stamped_at, bonus_awarded_at')
        .eq('invitee_user_id', user.id)
        .is('invitee_stamped_at', null)
        .is('bonus_awarded_at', null);

      if (!redemptions || redemptions.length === 0) {
        setItems([]);
        return;
      }

      const invIds = redemptions.map(r => r.invitation_id);
      const { data: invs } = await supabase
        .from('invitations')
        .select('id, merchant_customer_id')
        .in('id', invIds);

      const merchantIds = [...new Set((invs ?? []).map(i => i.merchant_customer_id))];
      const { data: merchants } = await supabase
        .from('customers')
        .select('id, name, company_name, logo_url, active')
        .in('id', merchantIds);

      const collected: OpenInvitation[] = [];
      for (const r of redemptions) {
        const inv = invs?.find(i => i.id === r.invitation_id);
        if (!inv) continue;
        const m = merchants?.find(x => x.id === inv.merchant_customer_id);
        if (!m || m.active === false) continue;

        const start = r.bonus_window_starts_at ?? r.accepted_at;
        // 90-Tage-Fenster (UI). Filter raus, falls bereits abgelaufen.
        const windowEnd = new Date(new Date(start).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
        if (new Date(windowEnd).getTime() < Date.now()) continue;

        collected.push({
          invitation_id: inv.id,
          redemption_id: r.id,
          merchant_customer_id: inv.merchant_customer_id,
          merchant_name: m.company_name || m.name || 'Laden',
          merchant_logo: m.logo_url ?? null,
          expires_at: windowEnd,
          accepted_at: r.accepted_at,
        });
      }

      // Pro Händler nur die jeweils neueste Einladung
      const byMerchant = new Map<string, OpenInvitation>();
      for (const it of collected) {
        const existing = byMerchant.get(it.merchant_customer_id);
        if (!existing || new Date(it.accepted_at).getTime() > new Date(existing.accepted_at).getTime()) {
          byMerchant.set(it.merchant_customer_id, it);
        }
      }

      const sorted = Array.from(byMerchant.values()).sort(
        (a, b) => new Date(b.accepted_at).getTime() - new Date(a.accepted_at).getTime(),
      );
      setItems(sorted);
    } catch (err) {
      console.warn('[OpenInvitationsPanel] load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (item: OpenInvitation) => {
    if (removingId) return;
    setRemovingId(item.redemption_id);
    // Optimistic UI
    setItems(prev => prev.filter(x => x.redemption_id !== item.redemption_id));
    try {
      const { error } = await supabase.rpc('cancel_invitation_redemption', {
        p_redemption_id: item.redemption_id,
      });
      if (error) throw error;
      window.dispatchEvent(new CustomEvent('eloyo:invitation-changed'));
    } catch (err) {
      console.error('[OpenInvitationsPanel] cancel error:', err);
      toast.error('Einladung konnte nicht entfernt werden');
      void load();
    } finally {
      setRemovingId(null);
      setPendingRemove(null);
    }
  };

  if (loading || items.length === 0) return null;

  return (
    <div className="mt-2">
      <h3 className="text-sm font-semibold text-foreground mb-2 px-1">
        Offene Einladungen
      </h3>
      <div className="space-y-2">
        {items.map((item) => {
          const days = daysUntil(item.expires_at);
          return (
            <div
              key={item.invitation_id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/app/merchant/${item.merchant_customer_id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/app/merchant/${item.merchant_customer_id}`);
              }}
              className="w-full text-left px-4 py-3 bg-black/[0.06] dark:bg-white/[0.04] rounded-xl flex items-center gap-3 active:opacity-70 transition-opacity cursor-pointer"
            >
              {item.merchant_logo ? (
                <img src={item.merchant_logo} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Gift className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">
                  Einladung zu {item.merchant_name}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  Noch {days} {days === 1 ? 'Tag' : 'Tage'} aktiv
                </div>
              </div>
              <button
                type="button"
                aria-label="Einladung entfernen"
                onClick={(e) => handleRemove(e, item)}
                disabled={removingId === item.redemption_id}
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-foreground/10 hover:text-foreground transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default OpenInvitationsPanel;
