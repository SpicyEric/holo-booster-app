import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Gift, MapPin, Clock, Globe, Instagram, Facebook, Twitter, ArrowDown, MessageCircle, Hand, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/app/components/layout/MainLayout';
import { OpenInvitationsBanner } from '@/app/components/OpenInvitationsBanner';
import { setActiveBrandColor } from '@/lib/activeBrandColor';

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
  brandColor: string | null;
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
          .select('id, name, company_name, logo_url, cover_image_url, industry, description, opening_hours, street, house_number, postal_code, city, website, instagram, facebook, twitter, brand_color, version')
          .eq('active', true)
          .in('id', merchantIds);

        const list: MerchantCard[] = (accounts || [])
          .map((a) => {
            const m = merchants?.find((x) => x.id === a.merchant_customer_id);
            if (!m) return null;
            const streetWithNumber = [m.street, m.house_number].filter(Boolean).join(' ');
            const address = [streetWithNumber, [m.postal_code, m.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
            const brandColor = (m as { brand_color?: string | null }).brand_color || null;
            return {
              id: a.id,
              merchantId: a.merchant_customer_id,
              name: m.company_name || m.name || 'Unbekannt',
              category: m.industry || null,
              logoUrl: m.logo_url || null,
              coverImage: m.cover_image_url || null,
              description: m.description || null,
              openingHours: (m.opening_hours && typeof m.opening_hours === 'object') ? m.opening_hours as Record<string, OpeningHourEntry> : null,
              address: address || null,
              website: m.website || null,
              instagram: m.instagram || null,
              facebook: m.facebook || null,
              twitter: m.twitter || null,
              brandColor,
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

  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Track which card is currently most visible and publish its brand color
  useEffect(() => {
    if (cards.length === 0) return;
    cardRefs.current = cardRefs.current.slice(0, cards.length);
    const observer = new IntersectionObserver(
      (entries) => {
        let bestIdx = activeIndex;
        let bestRatio = 0;
        entries.forEach((entry) => {
          const idx = Number((entry.target as HTMLElement).dataset.cardIndex);
          if (Number.isNaN(idx)) return;
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestIdx = idx;
          }
        });
        if (bestRatio > 0) setActiveIndex(bestIdx);
      },
      { threshold: [0.25, 0.5, 0.75] },
    );
    cardRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [cards.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Publish active brand color on Home so BottomNav scan-button + TopBar pick it up
  useEffect(() => {
    const active = cards[activeIndex];
    setActiveBrandColor(active?.brandColor || null);
    return () => setActiveBrandColor(null);
  }, [activeIndex, cards]);

  return (
    <MainLayout title="Home" disableParticles>
      <OpenInvitationsBanner />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : cards.length === 0 ? (
        <EmptyTutorial onExplore={() => navigate('/app/stores')} />
      ) : (
        <div style={{ paddingBottom: '2rem' }}>
          {cards.map((store, idx) => (
            <div
              key={store.id}
              ref={(el) => { cardRefs.current[idx] = el; }}
              data-card-index={idx}
              style={{ marginBottom: '28px' }}
            >
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
                  } catch { void 0; }
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

              <MerchantInfoBlock store={store} active={idx === activeIndex} />
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

function MerchantInfoBlock({ store, active }: { store: MerchantCard; active: boolean }) {
  const hours = store.openingHours;
  const links: { href: string; label: string; Icon: typeof Globe }[] = [];
  const web = normalizeUrl(store.website);
  const ig = instagramUrl(store.instagram);
  const fb = normalizeUrl(store.facebook);
  const tw = normalizeUrl(store.twitter);
  if (web) links.push({ href: web, label: 'Website', Icon: Globe });
  if (ig) links.push({ href: ig, label: 'Instagram', Icon: Instagram });
  if (fb) links.push({ href: fb, label: 'Facebook', Icon: Facebook });
  if (tw) links.push({ href: tw, label: 'Twitter', Icon: Twitter });

  const hasAnything = !!(store.description || hours || store.address || links.length);
  if (!hasAnything) return null;

  const accent = store.brandColor || undefined;
  // Quick fade: invisible while card is not active, fade-in when it becomes active
  const fadeStyle: React.CSSProperties = {
    opacity: active ? 1 : 0,
    transition: active ? 'opacity 220ms ease-out' : 'opacity 120ms ease-out',
  };
  const iconStyle = accent ? { color: accent } : undefined;
  const linkStyle = accent
    ? { color: accent, backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)` }
    : undefined;

  return (
    <div className="mt-3 px-1 space-y-3" style={fadeStyle}>
      {store.description && (
        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
          {store.description}
        </p>
      )}

      {hours && (
        <div className="rounded-xl bg-card border border-border/50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-primary" style={iconStyle} />
            <span className="text-xs font-semibold text-foreground">Öffnungszeiten</span>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            {DAY_LABELS.map(({ key, label }) => {
              const d = hours[key];
              if (!d) return null;
              const time = d.closed ? 'Geschlossen' : `${d.open ?? ''} – ${d.close ?? ''}`;
              return (
                <div key={key} className="contents">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground">{time}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {store.address && (
        <div className="flex items-start gap-2 text-sm text-foreground/80">
          <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" style={iconStyle} />
          <span>{store.address}</span>
        </div>
      )}

      {links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {links.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/15 transition-colors"
              style={linkStyle}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default AppHome;
