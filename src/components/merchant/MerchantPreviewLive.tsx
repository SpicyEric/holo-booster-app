import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Globe, Instagram, Clock, Gift, ArrowLeft, UserPlus, History } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface OpeningHours {
  [key: string]: { open: string; close: string; closed: boolean };
}

interface Reward {
  id: string;
  title: string;
  description: string | null;
  points_required: number;
  image_url?: string | null;
}

interface MerchantPreviewData {
  name: string;
  description?: string;
  logo_url?: string;
  cover_image_url?: string;
  street?: string;
  house_number?: string;
  postal_code?: string;
  city?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  opening_hours?: OpeningHours;
}

interface MerchantPreviewLiveProps {
  data: MerchantPreviewData;
  rewards: Reward[];
  activeTab?: 'rewards' | 'info';
  onTabChange?: (tab: 'rewards' | 'info') => void;
  userPoints?: number;
  scrollTarget?: 'description' | 'hours' | 'contact' | 'bottom' | null;
}

type PreviewTab = 'rewards' | 'info' | 'transactions';

const MerchantPreviewLive = ({
  data,
  rewards,
  activeTab = 'rewards',
  onTabChange,
  userPoints = 25,
  scrollTarget,
}: MerchantPreviewLiveProps) => {
  const [tab, setTab] = useState<PreviewTab>(activeTab);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    setTab(activeTab);
  }, [activeTab]);

  // Measure header height (cover + tabs) like in the real app
  useEffect(() => {
    if (!headerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setHeaderHeight(e.contentRect.height);
    });
    ro.observe(headerRef.current);
    setHeaderHeight(headerRef.current.offsetHeight);
    return () => ro.disconnect();
  }, []);

  // Auto-scroll inside the preview container
  useEffect(() => {
    if (!scrollTarget || !scrollContainerRef.current) return;
    setTimeout(() => {
      if (scrollTarget === 'bottom' || scrollTarget === 'contact') {
        scrollContainerRef.current?.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, 100);
  }, [scrollTarget, data.phone, data.website, data.instagram, data.facebook, data.twitter]);

  const handleTabChange = (newTab: PreviewTab) => {
    setTab(newTab);
    if (newTab === 'rewards' || newTab === 'info') {
      onTabChange?.(newTab);
    }
  };

  const formatOpeningHours = (hours?: OpeningHours) => {
    if (!hours || typeof hours !== 'object' || Object.keys(hours).length === 0) return null;
    const hasConfigured = Object.values(hours).some(
      (h) => h && !h.closed && h.open && h.close && h.open !== '00:00' && h.close !== '00:00'
    );
    if (!hasConfigured) return null;
    const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return dayKeys.map((key, i) => {
      const dh = hours[key];
      if (!dh || dh.closed) return { day: days[i], time: 'Geschlossen' };
      return { day: days[i], time: `${dh.open} - ${dh.close}` };
    });
  };

  const formatDescription = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.startsWith('_') && part.endsWith('_')) return <em key={i}>{part.slice(1, -1)}</em>;
      return <span key={i}>{part}</span>;
    });
  };

  const streetWithNumber = [data.street, data.house_number].filter(Boolean).join(' ');
  const address = [streetWithNumber, data.postal_code, data.city].filter(Boolean).join(', ');
  const openingHours = formatOpeningHours(data.opening_hours);
  const merchantName = data.name || 'Geschäftsname';

  return (
    // Force the App's dark theme inside the preview so it matches AppMerchantDetail 1:1
    <div
      className="dark relative h-full w-full overflow-hidden"
      style={{
        // Mirror the App dark tokens (see html.dark[data-app-route='true'] in index.css)
        // so semantic classes (bg-background, text-foreground, ...) render exactly like in the app.
        ['--background' as any]: '0 0% 13%',
        ['--foreground' as any]: '0 0% 93%',
        ['--card' as any]: '0 0% 17%',
        ['--card-foreground' as any]: '0 0% 93%',
        ['--popover' as any]: '0 0% 17%',
        ['--popover-foreground' as any]: '0 0% 93%',
        ['--muted' as any]: '0 0% 20%',
        ['--muted-foreground' as any]: '0 0% 63%',
        ['--border' as any]: '0 0% 22%',
        ['--input' as any]: '0 0% 20%',
        backgroundColor: 'hsl(0 0% 13%)',
        color: 'hsl(0 0% 93%)',
      }}
    >
      <Tabs value={tab} onValueChange={(v) => handleTabChange(v as PreviewTab)} className="relative h-full">
        {/* ===== Floating header (cover + tabs) — matches AppMerchantDetail ===== */}
        <div ref={headerRef} className="pointer-events-none absolute inset-x-0 top-0 z-40">
          <div className="absolute inset-0 bg-background pointer-events-none" />

          <div className="relative pointer-events-none px-3 pt-3">
            <div className="relative rounded-2xl overflow-hidden shadow-lg" style={{ aspectRatio: '1.55 / 1' }}>
              {data.cover_image_url ? (
                <img src={data.cover_image_url} alt={merchantName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary to-secondary" />
              )}

              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 via-black/25 to-transparent" />

              {/* Back button */}
              <div className="absolute top-2 left-2 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm rounded-xl h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>

              {/* Points badge */}
              <div className="absolute top-2 right-2 z-10">
                <div className="bg-black/40 backdrop-blur-sm rounded-xl px-2.5 py-1 shadow-md">
                  <span className="font-bold text-white text-xs">{userPoints}</span>
                  <span className="text-[10px] text-white/80 ml-1">Punkte</span>
                </div>
              </div>

              {/* Title */}
              <div className="absolute bottom-2 left-3 right-12">
                <h1 className="text-sm font-bold text-white drop-shadow-md truncate">{merchantName}</h1>
              </div>

              {/* Invite friend button */}
              <button
                aria-label="Freund einladen"
                className="absolute bottom-2 right-2 z-10 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_6px_18px_hsl(var(--primary)/0.45)]"
              >
                <UserPlus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ===== Floating Tab pill ===== */}
          <div className="relative pointer-events-none px-3 pt-2">
            <div className="rounded-xl border border-border/50 bg-background/85 p-1 shadow-lg backdrop-blur-xl">
              <div className="relative grid h-auto w-full grid-cols-3 gap-1">
                {(['rewards', 'info', 'transactions'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => handleTabChange(t)}
                    className={`pointer-events-auto relative z-10 rounded-lg py-1.5 text-[11px] transition-colors duration-200 ${
                      tab === t ? 'text-foreground font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    {t === 'rewards' ? 'Prämien' : t === 'info' ? 'Info' : 'Transaktionen'}
                    {tab === t && (
                      <motion.div
                        layoutId="preview-tab-indicator"
                        className="absolute inset-0 rounded-lg bg-foreground/10 shadow-md border border-border/60"
                        style={{ zIndex: -1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Soft fade below header */}
        <div
          className="pointer-events-none absolute inset-x-0 z-30"
          style={{ top: headerHeight ? `${headerHeight}px` : '0px', height: '16px' }}
        >
          <div className="h-full bg-gradient-to-b from-background to-transparent" />
        </div>

        {/* ===== Scrollable content ===== */}
        <div className="relative h-full overflow-visible">
          <div
            ref={scrollContainerRef}
            className="h-full overflow-y-auto px-3 overflow-x-hidden scrollbar-hide"
            style={{
              paddingTop: `${(headerHeight || 240) + 12}px`,
              paddingBottom: '20px',
            }}
          >
            <TabsContent value="rewards" className="mt-0 space-y-2">
              {rewards.length === 0 ? (
                <Card className="border-0 bg-white/[0.04]">
                  <CardContent className="p-4 text-center text-muted-foreground">
                    <Gift className="h-6 w-6 mx-auto mb-1 opacity-50" />
                    <p className="text-xs">Keine Prämien verfügbar</p>
                  </CardContent>
                </Card>
              ) : (
                rewards.map((reward) => {
                  const canRedeem = userPoints >= reward.points_required;
                  return (
                    <Card
                      key={reward.id}
                      className={`cursor-pointer ${canRedeem ? 'reward-glow border-0' : 'border-0 bg-white/[0.04]'}`}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        {reward.image_url ? (
                          <img
                            src={reward.image_url}
                            alt={reward.title}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                            <Gift className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-xs leading-tight">{reward.title}</h3>
                          {reward.description && (
                            <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                              {reward.description}
                            </p>
                          )}
                        </div>
                        <Badge variant={canRedeem ? 'default' : 'secondary'} className="text-[10px] flex-shrink-0">
                          {reward.points_required}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="info" className="mt-0 space-y-2">
              {data.description && (
                <Card className="border-0 bg-white/[0.04]">
                  <CardContent className="p-3">
                    <p className="text-[11px] text-foreground/90 whitespace-pre-wrap leading-relaxed">
                      {formatDescription(data.description)}
                    </p>
                  </CardContent>
                </Card>
              )}

              {openingHours && (
                <Card className="border-0 bg-white/[0.04]">
                  <CardContent className="p-3">
                    <h3 className="font-medium text-xs mb-2 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      Öffnungszeiten
                    </h3>
                    <div className="space-y-0.5 text-[10px]">
                      {openingHours.map((h) => (
                        <div key={h.day} className="flex justify-between gap-3">
                          <span className="text-muted-foreground">{h.day}</span>
                          <span>{h.time}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-0 bg-white/[0.04]">
                <CardContent className="p-3 space-y-2">
                  {address && (
                    <div className="flex items-center gap-2 text-[10px]">
                      <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{address}</span>
                    </div>
                  )}
                  {data.phone && (
                    <div className="flex items-center gap-2 text-[10px]">
                      <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      {data.phone}
                    </div>
                  )}
                  {data.website && (
                    <div className="flex items-center gap-2 text-[10px]">
                      <Globe className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">Website</span>
                    </div>
                  )}
                  {data.instagram && (
                    <div className="flex items-center gap-2 text-[10px]">
                      <Instagram className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">Instagram</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Button
                className="w-full h-9 rounded-xl gap-2 text-[11px]"
                variant="outline"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Freund einladen
              </Button>
            </TabsContent>

            <TabsContent value="transactions" className="mt-0 space-y-2">
              <Card className="border-0 bg-white/[0.04]">
                <CardContent className="p-4 text-center text-muted-foreground">
                  <History className="h-6 w-6 mx-auto mb-1 opacity-50" />
                  <p className="text-xs">Noch keine Transaktionen</p>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default MerchantPreviewLive;
