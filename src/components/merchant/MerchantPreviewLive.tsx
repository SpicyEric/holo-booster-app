import { useState, useEffect, useRef } from 'react';
import { MapPin, Phone, Globe, Instagram, Clock, Gift, ArrowLeft, Facebook, Twitter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const MerchantPreviewLive = ({ 
  data, 
  rewards, 
  activeTab = 'rewards',
  onTabChange,
  userPoints = 25,
  scrollTarget
}: MerchantPreviewLiveProps) => {
  const [tab, setTab] = useState<'rewards' | 'info'>(activeTab);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTab(activeTab);
  }, [activeTab]);

  // Auto-scroll when scrollTarget changes
  useEffect(() => {
    if (!scrollTarget || !scrollContainerRef.current) return;
    
    setTimeout(() => {
      if (scrollTarget === 'bottom' || scrollTarget === 'contact') {
        scrollContainerRef.current?.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: 'smooth' });
      }
    }, 100);
  }, [scrollTarget, data.phone, data.website, data.instagram, data.facebook, data.twitter]);

  const handleTabChange = (newTab: string) => {
    const t = newTab as 'rewards' | 'info';
    setTab(t);
    onTabChange?.(t);
  };

  const formatOpeningHours = (hours?: OpeningHours) => {
    if (!hours || typeof hours !== 'object' || Object.keys(hours).length === 0) return null;
    
    // Check if any opening hours are actually configured
    const hasConfiguredHours = Object.values(hours).some(h => 
      h && !h.closed && h.open && h.close && h.open !== '00:00' && h.close !== '00:00'
    );
    
    if (!hasConfiguredHours) return null;
    
    const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    return dayKeys.map((key, i) => {
      const dayHours = hours[key];
      if (!dayHours || dayHours.closed) {
        return { day: days[i], time: 'Geschlossen' };
      }
      return { day: days[i], time: `${dayHours.open} - ${dayHours.close}` };
    });
  };

  // Format description with bold, italic and line breaks
  const formatDescription = (text: string) => {
    if (!text) return null;
    // Convert **text** to bold and _text_ to italic
    const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('_') && part.endsWith('_')) {
        return <em key={i}>{part.slice(1, -1)}</em>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const streetWithNumber = [data.street, data.house_number].filter(Boolean).join(' ');
  const address = [streetWithNumber, data.postal_code, data.city].filter(Boolean).join(', ');
  const openingHours = formatOpeningHours(data.opening_hours);

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Cover Image */}
      <div className="relative flex-shrink-0">
        <div className="h-44">
          {data.cover_image_url ? (
            <img
              src={data.cover_image_url}
              alt={data.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary to-secondary" />
          )}
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background via-background/80 to-transparent" />
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 left-3 bg-black/20 text-white hover:bg-black/40 h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="absolute top-3 right-3 bg-white/90 rounded-full px-2 py-1">
          <span className="font-bold text-primary text-xs">{userPoints}</span>
          <span className="text-[10px] text-muted-foreground ml-1">Punkte</span>
        </div>

        <div className="absolute bottom-2 left-3 right-3">
          <h1 className="text-lg font-bold text-foreground leading-tight">
            {data.name || 'Geschäftsname'}
          </h1>
          {data.city && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-2.5 w-2.5" />
              {data.city}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full grid grid-cols-2 mx-3 mt-2 flex-shrink-0" style={{ width: 'calc(100% - 24px)' }}>
          <TabsTrigger value="rewards" className="text-xs py-1.5">Prämien</TabsTrigger>
          <TabsTrigger value="info" className="text-xs py-1.5">Info</TabsTrigger>
        </TabsList>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0" style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 40px, black 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 40px, black 100%)' }}>
          <TabsContent value="rewards" className="mt-2 px-3 pb-3 space-y-2">
            {rewards.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-center text-muted-foreground">
                  <Gift className="h-6 w-6 mx-auto mb-1 opacity-50" />
                  <p className="text-xs">Keine Prämien verfügbar</p>
                </CardContent>
              </Card>
            ) : (
              rewards.map((reward) => {
                const canRedeem = userPoints >= reward.points_required;
                return (
                  <Card key={reward.id} className={canRedeem ? 'border-primary' : ''}>
                    <CardContent className="p-3 flex items-center gap-3">
                      {reward.image_url ? (
                        <img 
                          src={reward.image_url} 
                          alt={reward.title}
                          className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Gift className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-xs truncate">{reward.title}</h3>
                        {reward.description && (
                          <p className="text-[10px] text-muted-foreground line-clamp-1">
                            {reward.description}
                          </p>
                        )}
                      </div>
                      <Badge variant={canRedeem ? 'default' : 'secondary'} className="text-[10px] flex-shrink-0">
                        {reward.points_required} Pkt
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="info" className="mt-2 px-3 pb-3 space-y-2">
            {data.description && (
              <Card>
                <CardContent className="p-3">
                  <p className="text-[10px] text-muted-foreground whitespace-pre-wrap">
                    {formatDescription(data.description)}
                  </p>
                </CardContent>
              </Card>
            )}

            {openingHours && (
              <Card>
                <CardContent className="p-3">
                  <h3 className="font-medium text-xs mb-2 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Öffnungszeiten
                  </h3>
                  <div className="space-y-0.5">
                    {openingHours.map((h) => (
                      <div key={h.day} className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">{h.day}</span>
                        <span>{h.time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card ref={contactRef}>
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
                {data.facebook && (
                  <div className="flex items-center gap-2 text-[10px]">
                    <Facebook className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">Facebook</span>
                  </div>
                )}
                {data.twitter && (
                  <div className="flex items-center gap-2 text-[10px]">
                    <Twitter className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">Twitter/X</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default MerchantPreviewLive;
