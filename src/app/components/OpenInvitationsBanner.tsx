import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface OpenInvitation {
  invitation_id: string;
  redemption_id: string;
  merchant_customer_id: string;
  merchant_name: string;
  merchant_logo: string | null;
  expires_at: string; // bonus_window_starts_at + 7d
  accepted_at: string;
}

function daysUntil(dateStr: string): number {
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/**
 * Zeigt offene Einladungen an, bei denen der aktuelle User der EINGELADENE ist
 * (also: jemand hat mich eingeladen, ich habe angenommen, aber noch keinen Stempel).
 * Eigene verschickte Einladungen werden hier nicht angezeigt.
 */
export function OpenInvitationsBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<OpenInvitation[]>([]);

  useEffect(() => {
    if (!user) return;
    void load();

    const channel = supabase
      .channel(`open-invitations-${user.id}`)
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
    try {
      // Nur als EINGELADENER: Redemptions wo ich invitee bin, noch nicht gestempelt, Bonus noch offen
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
        .select('id, name, company_name, logo_url')
        .in('id', merchantIds);

      const collected: OpenInvitation[] = [];
      for (const r of redemptions) {
        const inv = invs?.find(i => i.id === r.invitation_id);
        if (!inv) continue;
        const m = merchants?.find(x => x.id === inv.merchant_customer_id);
        if (!m) continue;

        const start = r.bonus_window_starts_at ?? r.accepted_at;
        const windowEnd = new Date(new Date(start).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
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

      // Pro Händler nur die jeweils neueste Einladung anzeigen
      const byMerchant = new Map<string, OpenInvitation>();
      for (const it of collected) {
        const existing = byMerchant.get(it.merchant_customer_id);
        if (!existing || new Date(it.accepted_at).getTime() > new Date(existing.accepted_at).getTime()) {
          byMerchant.set(it.merchant_customer_id, it);
        }
      }

      // Nach Annahmedatum absteigend sortieren (neueste zuerst)
      const sorted = Array.from(byMerchant.values()).sort(
        (a, b) => new Date(b.accepted_at).getTime() - new Date(a.accepted_at).getTime(),
      );

      setItems(sorted);
    } catch (err) {
      console.warn('[OpenInvitationsBanner] load error:', err);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {items.map((item) => {
        const days = daysUntil(item.expires_at);
        return (
          <button
            key={item.invitation_id}
            onClick={() => navigate(`/app/merchant/${item.merchant_customer_id}`)}
            className="w-full text-left px-4 py-3 bg-card border border-border rounded-xl flex items-center gap-3 shadow-card active:opacity-70 transition-opacity"
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
                Du wurdest zu {item.merchant_name} eingeladen
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                Sammel deinen ersten Stempel — noch {days} {days === 1 ? 'Tag' : 'Tage'}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default OpenInvitationsBanner;
