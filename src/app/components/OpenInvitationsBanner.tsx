import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Clock, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface OpenInvitation {
  kind: 'invitee' | 'inviter';
  invitation_id: string;
  redemption_id?: string;
  merchant_customer_id: string;
  merchant_name: string;
  merchant_logo: string | null;
  expires_at: string; // For invitee: bonus_window_starts_at + 7d. For inviter: invitation.expires_at
  bonus_window_starts_at?: string;
}

function daysUntil(dateStr: string): number {
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/**
 * Zeigt offene Einladungen ganz oben im Feed an:
 *  - Eingeladener: "Du wurdest zu [Laden] eingeladen — sammel Stempel bis ..."
 *    (sichtbar wenn Redemption existiert, aber invitee_stamped_at noch null)
 *  - Einladender: "Du hast jemanden zu [Laden] eingeladen — warte auf den ersten Stempel"
 *    (sichtbar wenn invitation pending und nicht abgelaufen)
 */
export function OpenInvitationsBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<OpenInvitation[]>([]);

  useEffect(() => {
    if (!user) return;
    void load();

    // Realtime: bei Änderungen an invitations / redemptions neu laden
    const channel = supabase
      .channel(`open-invitations-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invitations', filter: `inviter_user_id=eq.${user.id}` },
        () => void load(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invitation_redemptions', filter: `invitee_user_id=eq.${user.id}` },
        () => void load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const load = async () => {
    if (!user) return;
    try {
      const collected: OpenInvitation[] = [];

      // 1) Als EINGELADENER: invitation_redemptions wo invitee_user_id = ich, noch nicht gestempelt
      const { data: redemptions, error: redErr } = await supabase
        .from('invitation_redemptions')
        .select('id, invitation_id, accepted_at, bonus_window_starts_at, invitee_stamped_at, bonus_awarded_at')
        .eq('invitee_user_id', user.id)
        .is('invitee_stamped_at', null)
        .is('bonus_awarded_at', null);

      console.log('[OpenInvitationsBanner] redemptions for', user.id, ':', redemptions, 'err:', redErr);

      if (redemptions && redemptions.length > 0) {
        const invIds = redemptions.map(r => r.invitation_id);
        const { data: invs } = await supabase
          .from('invitations')
          .select('id, merchant_customer_id, expires_at, status')
          .in('id', invIds);

        const merchantIds = [...new Set((invs ?? []).map(i => i.merchant_customer_id))];
        const { data: merchants } = await supabase
          .from('customers')
          .select('id, name, company_name, logo_url')
          .in('id', merchantIds);

        for (const r of redemptions) {
          const inv = invs?.find(i => i.id === r.invitation_id);
          if (!inv) continue;
          const m = merchants?.find(x => x.id === inv.merchant_customer_id);
          if (!m) continue;

          // Bonus-Fenster: 7 Tage ab bonus_window_starts_at (fallback accepted_at)
          const start = r.bonus_window_starts_at ?? r.accepted_at;
          const windowEnd = new Date(new Date(start).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
          if (new Date(windowEnd).getTime() < Date.now()) continue;

          collected.push({
            kind: 'invitee',
            invitation_id: inv.id,
            redemption_id: r.id,
            merchant_customer_id: inv.merchant_customer_id,
            merchant_name: m.company_name || m.name || 'Laden',
            merchant_logo: m.logo_url ?? null,
            expires_at: windowEnd,
            bonus_window_starts_at: start ?? undefined,
          });
        }
      }

      // 2) Als EINLADENDER: invitations status pending oder accepted, noch nicht abgelaufen
      const { data: myInvitations, error: invErr } = await supabase
        .from('invitations')
        .select('id, merchant_customer_id, expires_at, status, created_at')
        .eq('inviter_user_id', user.id)
        .in('status', ['pending', 'accepted'])
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      console.log('[OpenInvitationsBanner] my invitations:', myInvitations, 'err:', invErr);

      if (myInvitations && myInvitations.length > 0) {
        const ids = myInvitations.map(i => i.id);
        const { data: redForMine } = await supabase
          .from('invitation_redemptions')
          .select('invitation_id, invitee_stamped_at, bonus_awarded_at')
          .in('invitation_id', ids);

        const merchantIds = [...new Set(myInvitations.map(i => i.merchant_customer_id))];
        const { data: merchants } = await supabase
          .from('customers')
          .select('id, name, company_name, logo_url')
          .in('id', merchantIds);

        for (const inv of myInvitations) {
          const r = redForMine?.find(x => x.invitation_id === inv.id);
          // Wenn Bonus schon ausgezahlt wurde -> nicht zeigen
          if (r?.bonus_awarded_at) continue;
          const m = merchants?.find(x => x.id === inv.merchant_customer_id);
          if (!m) continue;
          collected.push({
            kind: 'inviter',
            invitation_id: inv.id,
            merchant_customer_id: inv.merchant_customer_id,
            merchant_name: m.company_name || m.name || 'Laden',
            merchant_logo: m.logo_url ?? null,
            expires_at: inv.expires_at,
          });
        }
      }

      // Dedupe per merchant+kind, höchste Priorität: invitee vor inviter
      const seen = new Set<string>();
      const deduped: OpenInvitation[] = [];
      for (const it of collected.sort((a, b) => (a.kind === 'invitee' ? -1 : 1))) {
        const key = `${it.kind}-${it.merchant_customer_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(it);
      }
      console.log('[OpenInvitationsBanner] final items:', deduped);
      setItems(deduped);
    } catch (err) {
      console.warn('[OpenInvitationsBanner] load error:', err);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="-mx-4 mb-4 space-y-2">
      {items.map((item) => {
        const days = daysUntil(item.expires_at);
        const isInvitee = item.kind === 'invitee';
        return (
          <button
            key={`${item.kind}-${item.invitation_id}`}
            onClick={() => navigate(`/app/merchant/${item.merchant_customer_id}`)}
            className="w-full text-left px-4 py-3 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-y border-primary/20 flex items-center gap-3 active:opacity-80 transition-opacity"
          >
            {item.merchant_logo ? (
              <img src={item.merchant_logo} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                {isInvitee ? (
                  <Gift className="h-5 w-5 text-primary" />
                ) : (
                  <Users className="h-5 w-5 text-primary" />
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">
                {isInvitee
                  ? `Du wurdest zu ${item.merchant_name} eingeladen`
                  : `Einladung zu ${item.merchant_name} offen`}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                {isInvitee ? (
                  <>Sammel deinen ersten Stempel — noch {days} {days === 1 ? 'Tag' : 'Tage'}</>
                ) : (
                  <>Warte auf den ersten Stempel — noch {days} {days === 1 ? 'Tag' : 'Tage'}</>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default OpenInvitationsBanner;
