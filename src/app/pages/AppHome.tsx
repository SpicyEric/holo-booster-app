import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Nfc, Gift, Sparkles, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/app/components/layout/MainLayout';
import { OpenInvitationsBanner } from '@/app/components/OpenInvitationsBanner';

interface MerchantCard {
  id: string;            // loyalty_account id
  merchantId: string;
  merchantName: string;
  merchantLogo: string | null;
  coverImage: string | null;
  points: number;
}

export const AppHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState<MerchantCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) return;
      try {
        const { data: accounts } = await supabase
          .from('loyalty_accounts')
          .select('id, merchant_customer_id, current_points_balance')
          .eq('user_id', user.id);

        const merchantIds = (accounts || []).map((a) => a.merchant_customer_id);
        if (merchantIds.length === 0) {
          if (!cancelled) { setCards([]); setLoading(false); }
          return;
        }

        const { data: merchants } = await supabase
          .from('customers')
          .select('id, name, company_name, logo_url, cover_image_url')
          .eq('active', true)
          .in('id', merchantIds);

        const list: MerchantCard[] = (accounts || [])
          .map((a) => {
            const m = merchants?.find((x) => x.id === a.merchant_customer_id);
            if (!m) return null;
            return {
              id: a.id,
              merchantId: a.merchant_customer_id,
              merchantName: m.company_name || m.name || 'Unbekannt',
              merchantLogo: m.logo_url || null,
              coverImage: m.cover_image_url || null,
              points: a.current_points_balance ?? 0,
            } as MerchantCard;
          })
          .filter((x): x is MerchantCard => !!x);

        if (!cancelled) {
          setCards(list);
          setLoading(false);
        }
      } catch (e) {
        console.error('[AppHome] load error', e);
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <MainLayout title="">
      <OpenInvitationsBanner />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : cards.length === 0 ? (
        <EmptyTutorial onExplore={() => navigate('/app/stores')} />
      ) : (
        <div className="space-y-4">
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => navigate(`/app/merchant/${card.merchantId}`)}
              className="w-full text-left rounded-2xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="relative w-full aspect-[16/7] bg-muted">
                {card.coverImage ? (
                  <img src={card.coverImage} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 to-secondary/30" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3">
                  {card.merchantLogo ? (
                    <img
                      src={card.merchantLogo}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/80"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-white/90 flex items-center justify-center text-primary font-bold">
                      {card.merchantName.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate drop-shadow">
                      {card.merchantName}
                    </p>
                    <p className="text-white/90 text-xs">
                      {card.points} {card.points === 1 ? 'Punkt' : 'Punkte'}
                    </p>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </MainLayout>
  );
};

function EmptyTutorial({ onExplore }: { onExplore: () => void }) {
  const steps = [
    {
      icon: MapPin,
      title: 'Shop entdecken',
      text: 'Finde teilnehmende Geschäfte in deiner Nähe.',
    },
    {
      icon: Nfc,
      title: 'Karte scannen',
      text: 'Halte dein Handy an die NFC-Karte im Shop und sammle Punkte.',
    },
    {
      icon: Gift,
      title: 'Prämien einlösen',
      text: 'Tausche gesammelte Punkte gegen Belohnungen ein.',
    },
  ];

  return (
    <div className="space-y-6 py-4">
      <div className="text-center px-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Willkommen bei Eloyo</h2>
        <p className="text-sm text-muted-foreground">
          So einfach sammelst du Punkte bei deinen Lieblingsshops:
        </p>
      </div>

      <div className="space-y-3">
        {steps.map((s, i) => (
          <div
            key={s.title}
            className="flex items-start gap-3 p-4 rounded-2xl bg-card shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <s.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground text-sm">
                {i + 1}. {s.title}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">{s.text}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onExplore}
        className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-sm hover:opacity-95 transition-opacity"
      >
        Shops in der Nähe entdecken
      </button>
    </div>
  );
}

export default AppHome;
