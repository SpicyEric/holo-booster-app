import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Globe, Instagram, Clock, Gift, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface Merchant {
  id: string;
  name: string;
  company_name: string | null;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  city: string | null;
  street: string | null;
  postal_code: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  opening_hours: any;
  google_review_url: string | null;
}

interface Reward {
  id: string;
  title: string;
  description: string | null;
  points_required: number;
  image_url: string | null;
}

interface Offer {
  id: string;
  title: string;
  description: string | null;
  valid_until: string | null;
}

export const AppMerchantDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadMerchant();
    }
  }, [id, user]);

  const loadMerchant = async () => {
    setLoading(true);
    try {
      // Load merchant
      const { data: merchantData, error: merchantError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (merchantError) throw merchantError;
      setMerchant(merchantData);

      // Load rewards
      const { data: rewardsData } = await supabase
        .from('rewards')
        .select('*')
        .eq('merchant_customer_id', id)
        .eq('is_active', true)
        .order('points_required', { ascending: true });

      if (rewardsData) setRewards(rewardsData);

      // Load offers
      const { data: offersData } = await supabase
        .from('offers')
        .select('*')
        .eq('merchant_customer_id', id)
        .eq('is_active', true)
        .eq('show_in_storefront', true);

      if (offersData) setOffers(offersData);

      // Load user points for this merchant
      if (user) {
        const { data: stampCard } = await supabase
          .from('user_stamp_cards')
          .select('current_points')
          .eq('user_id', user.id)
          .eq('merchant_customer_id', id)
          .maybeSingle();

        if (stampCard) {
          setUserPoints(stampCard.current_points);
        }
      }
    } catch (err) {
      console.error('Error loading merchant:', err);
      toast.error('Geschäft nicht gefunden');
      navigate('/app');
    } finally {
      setLoading(false);
    }
  };

  const formatOpeningHours = (hours: any) => {
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

  if (loading) {
    return (
      <div className="min-h-screen">
        <Skeleton className="h-48 w-full" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!merchant) return null;

  const address = [merchant.street, merchant.postal_code, merchant.city]
    .filter(Boolean)
    .join(', ');

  const openingHours = formatOpeningHours(merchant.opening_hours);

  return (
    <div className="min-h-screen pb-24">
      {/* Cover Image */}
      <div className="relative h-48">
        {merchant.cover_image_url ? (
          <img
            src={merchant.cover_image_url}
            alt={merchant.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary to-secondary" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 bg-black/20 text-white hover:bg-black/40"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Points Badge */}
        <div className="absolute top-4 right-4 bg-white/90 rounded-full px-3 py-1">
          <span className="font-bold text-primary">{userPoints}</span>
          <span className="text-sm text-muted-foreground ml-1">Punkte</span>
        </div>

        {/* Logo & Name */}
        <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3">
          {merchant.logo_url && (
            <img
              src={merchant.logo_url}
              alt=""
              className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-lg"
            />
          )}
          <div className="flex-1 text-white">
            <h1 className="text-xl font-bold drop-shadow-lg">
              {merchant.company_name || merchant.name}
            </h1>
            {address && (
              <p className="text-sm opacity-90 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {merchant.city}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rewards" className="p-4">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="rewards">Prämien</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="offers">Angebote</TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="mt-4 space-y-3">
          {rewards.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <Gift className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Keine Prämien verfügbar
              </CardContent>
            </Card>
          ) : (
            rewards.map((reward) => {
              const canRedeem = userPoints >= reward.points_required;
              return (
                <Card key={reward.id} className={canRedeem ? 'border-primary' : ''}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Gift className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{reward.title}</h3>
                      {reward.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {reward.description}
                        </p>
                      )}
                    </div>
                    <Badge variant={canRedeem ? 'default' : 'secondary'}>
                      {reward.points_required} Punkte
                    </Badge>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="info" className="mt-4 space-y-4">
          {merchant.description && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm">{merchant.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Opening Hours */}
          {openingHours && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Öffnungszeiten
                </h3>
                <div className="space-y-1 text-sm">
                  {openingHours.map((h) => (
                    <div key={h.day} className="flex justify-between">
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
            <CardContent className="p-4 space-y-3">
              {address && (
                <a 
                  href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm hover:text-primary"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {address}
                </a>
              )}
              {merchant.phone && (
                <a href={`tel:${merchant.phone}`} className="flex items-center gap-3 text-sm hover:text-primary">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {merchant.phone}
                </a>
              )}
              {merchant.website && (
                <a 
                  href={merchant.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm hover:text-primary"
                >
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  Website
                </a>
              )}
              {merchant.instagram && (
                <a 
                  href={merchant.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm hover:text-primary"
                >
                  <Instagram className="h-4 w-4 text-muted-foreground" />
                  Instagram
                </a>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offers" className="mt-4 space-y-3">
          {offers.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Keine Angebote verfügbar
              </CardContent>
            </Card>
          ) : (
            offers.map((offer) => (
              <Card key={offer.id}>
                <CardContent className="p-4">
                  <h3 className="font-medium">{offer.title}</h3>
                  {offer.description && (
                    <p className="text-sm text-muted-foreground mt-1">{offer.description}</p>
                  )}
                  {offer.valid_until && (
                    <Badge variant="outline" className="mt-2">
                      Gültig bis {new Date(offer.valid_until).toLocaleDateString('de-DE')}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AppMerchantDetail;
