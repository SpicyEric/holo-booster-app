import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Nfc, Gift, Sparkles, MapPin, Clock, Globe, Instagram, Facebook, Twitter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/app/components/layout/MainLayout';
import { OpenInvitationsBanner } from '@/app/components/OpenInvitationsBanner';

interface OpeningHourEntry { open?: string; close?: string; closed?: boolean }
interface MerchantCard {
  id: string;
  merchantId: string;
  name: string;
  category: string | null;
  logoUrl: string | null;
  coverImage: string | null;
  description: string | null;
  openingHours: Record<string, OpeningHourEntry> | null;
  address: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  twitter: string | null;
}

const DAY_LABELS: { key: string; label: string }[] = [
  { key: 'monday', label: 'Mo' },
  { key: 'tuesday', label: 'Di' },
  { key: 'wednesday', label: 'Mi' },
  { key: 'thursday', label: 'Do' },
  { key: 'friday', label: 'Fr' },
  { key: 'saturday', label: 'Sa' },
  { key: 'sunday', label: 'So' },
];

function normalizeUrl(u: string | null): string | null {
  if (!u) return null;
  const v = u.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

function instagramUrl(v: string | null): string | null {
  if (!v) return null;
  const t = v.trim().replace(/^@/, '');
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://instagram.com/${t}`;
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
          .select('id, merchant_customer_id')
          .eq('user_id', user.id);

        const merchantIds = (accounts || []).map((a) => a.merchant_customer_id);
        if (merchantIds.length === 0) {
          if (!cancelled) { setCards([]); setLoading(false); }
          return;
        }

        const { data: merchants } = await supabase
          .from('customers')
          .select('id, name, company_name, logo_url, cover_image_url, industry')
          .eq('active', true)
          .in('id', merchantIds);

        const list: MerchantCard[] = (accounts || [])
          .map((a) => {
            const m = merchants?.find((x) => x.id === a.merchant_customer_id);
            if (!m) return null;
            return {
              id: a.id,
              merchantId: a.merchant_customer_id,
              name: m.company_name || m.name || 'Unbekannt',
              category: m.industry || null,
              logoUrl: m.logo_url || null,
              coverImage: m.cover_image_url || null,
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
    <MainLayout title="Home">
      <OpenInvitationsBanner />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : cards.length === 0 ? (
        <EmptyTutorial onExplore={() => navigate('/app/stores')} />
      ) : (
        <div style={{ paddingBottom: '2rem' }}>
          {cards.map((store) => (
            <div key={store.id} style={{ marginBottom: '12px' }}>
              <button
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  try {
                    sessionStorage.setItem(
                      'treuepass-transition',
                      JSON.stringify({
                        merchantId: store.merchantId,
                        coverUrl: store.coverImage,
                        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
                        timestamp: Date.now(),
                      }),
                    );
                  } catch {}
                  navigate(`/app/merchant/${store.merchantId}`);
                }}
                className="w-full rounded-xl overflow-hidden shadow-md text-left relative block"
                style={{ aspectRatio: '1.55 / 1', display: 'block' }}
              >
                <div className="absolute inset-0">
                  {store.coverImage ? (
                    <img src={store.coverImage} alt={store.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500" />
                  )}
                </div>
                <div className="absolute top-3 left-3 z-20 w-12 h-12 rounded-full overflow-hidden">
                  {store.logoUrl ? (
                    <img src={store.logoUrl} alt={`${store.name} Logo`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary flex items-center justify-center">
                      <span className="text-lg font-bold text-white">
                        {store.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 z-10">
                  <h3 className="text-white font-semibold text-xl truncate drop-shadow-md">{store.name}</h3>
                  {store.category && (
                    <p className="text-white/80 text-sm truncate drop-shadow-md">{store.category}</p>
                  )}
                </div>
              </button>
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  );
};

function EmptyTutorial({ onExplore }: { onExplore: () => void }) {
  const steps = [
    { icon: MapPin, title: 'Shop entdecken', text: 'Finde teilnehmende Geschäfte in deiner Nähe.' },
    { icon: Nfc, title: 'Karte scannen', text: 'Halte dein Handy an die NFC-Karte im Shop und sammle Punkte.' },
    { icon: Gift, title: 'Prämien einlösen', text: 'Tausche gesammelte Punkte gegen Belohnungen ein.' },
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
          <div key={s.title} className="flex items-start gap-3 p-4 rounded-2xl bg-card shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <s.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground text-sm">{i + 1}. {s.title}</p>
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
