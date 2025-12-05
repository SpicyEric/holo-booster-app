import { useState, useEffect } from 'react';
import { MapPin, Phone, Globe, Instagram, Clock, Gift, Sparkles, Info as InfoIcon, ArrowLeft, Facebook, Twitter } from 'lucide-react';
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
}

/**
 * MerchantPreviewLive - Exact replica of the app's merchant detail view
 * 
 * This component mirrors AppMerchantDetail exactly for accurate live preview
 * in the merchant dashboard. It uses passed data instead of fetching from DB.
 */
const MerchantPreviewLive = ({ 
  data, 
  rewards, 
  activeTab = 'rewards',
  onTabChange,
  userPoints = 25
}: MerchantPreviewLiveProps) => {
  const [tab, setTab] = useState<'rewards' | 'info'>(activeTab);

  useEffect(() => {
    setTab(activeTab);
  }, [activeTab]);

  const handleTabChange = (newTab: string) => {
    const t = newTab as 'rewards' | 'info';
    setTab(t);
    onTabChange?.(t);
  };

  const formatOpeningHours = (hours?: OpeningHours) => {
    if (!hours || typeof hours !== 'object') return null;
    
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

  const streetWithNumber = [data.street, data.house_number].filter(Boolean).join(' ');
  const address = [streetWithNumber, data.postal_code, data.city].filter(Boolean).join(', ');
  const openingHours = formatOpeningHours(data.opening_hours);

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Cover Image with soft fade - Exact replica of AppMerchantDetail */}
      <div className="relative">
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
        
        {/* Soft gradient fade to white */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background via-background/80 to-transparent" />
        
        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 left-3 bg-black/20 text-white hover:bg-black/40 h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Points Badge */}
        <div className="absolute top-3 right-3 bg-white/90 rounded-full px-2 py-1">
          <span className="font-bold text-primary text-xs">{userPoints}</span>
          <span className="text-[10px] text-muted-foreground ml-1">Punkte</span>
        </div>

        {/* Merchant Name in the fade area */}
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

      {/* Tabs - Only Prämien and Info (no Angebote) */}
      <Tabs value={tab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
        <TabsList className="w-full grid grid-cols-2 mx-3 mt-2" style={{ width: 'calc(100% - 24px)' }}>
          <TabsTrigger value="rewards" className="text-xs py-1.5">Prämien</TabsTrigger>
          <TabsTrigger value="info" className="text-xs py-1.5">Info</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
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
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Gift className="h-4 w-4 text-primary" />
                      </div>
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
                  <p className="text-[10px] text-muted-foreground">{data.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Opening Hours */}
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

            {/* Contact */}
            <Card>
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
