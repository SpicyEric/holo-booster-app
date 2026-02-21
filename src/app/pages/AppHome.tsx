import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Gift, MessageSquare, TrendingUp, Trophy, ChevronRight, Loader2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MainLayout } from '@/app/components/layout/MainLayout';
import { NewCustomerOfferDialog } from '@/app/components/NewCustomerOfferDialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface LoyaltyEntry {
  id: string;
  merchant_customer_id: string;
  current_points: number;
  customer?: {
    id: string;
    name: string;
    company_name: string | null;
    logo_url: string | null;
    industry: string | null;
    stamps_required: number | null;
  };
}

interface NewCustomerOffer {
  id: string;
  merchant_customer_id: string;
  title: string;
  description: string | null;
  bonus_stamps: number;
  distance?: number;
  customer?: {
    id: string;
    name: string;
    company_name: string | null;
    logo_url: string | null;
    industry: string | null;
    street: string | null;
    house_number: string | null;
    postal_code: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
  };
}

interface RedeemableReward {
  id: string;
  title: string;
  points_required: number;
  merchant_customer_id: string;
  merchantName: string;
  merchantLogo: string | null;
  userPoints: number;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const AppHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loyaltyEntries, setLoyaltyEntries] = useState<LoyaltyEntry[]>([]);
  const [newCustomerOffers, setNewCustomerOffers] = useState<NewCustomerOffer[]>([]);
  const [redeemableRewards, setRedeemableRewards] = useState<RedeemableReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [rewardsDialogOpen, setRewardsDialogOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [selectedOffer, setSelectedOffer] = useState<NewCustomerOffer | null>(null);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);

  // Get user location
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => console.log('[AppHome] Geolocation denied'),
      { timeout: 5000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user, userLocation]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load loyalty accounts
      const { data: accounts } = await supabase
        .from('loyalty_accounts')
        .select('id, merchant_customer_id, current_points_balance')
        .eq('user_id', user!.id)
        .gt('current_points_balance', 0);

      let stampedMerchantIds: string[] = [];
      const pointsMap = new Map<string, number>();

      if (accounts && accounts.length > 0) {
        stampedMerchantIds = accounts.map(a => a.merchant_customer_id);
        accounts.forEach(a => pointsMap.set(a.merchant_customer_id, a.current_points_balance || 0));

        const { data: customersData } = await supabase
          .from('customers')
          .select('id, name, company_name, logo_url, industry, stamps_required')
          .in('id', stampedMerchantIds);

        const formatted = accounts.map(account => ({
          id: account.id,
          merchant_customer_id: account.merchant_customer_id,
          current_points: account.current_points_balance || 0,
          customer: customersData?.find(c => c.id === account.merchant_customer_id),
        }));
        setLoyaltyEntries(formatted);

        // Load actual redeemable rewards
        const { data: rewardsData } = await supabase
          .from('rewards')
          .select('id, title, points_required, merchant_customer_id')
          .eq('is_active', true)
          .in('merchant_customer_id', stampedMerchantIds);

        if (rewardsData) {
          const redeemable = rewardsData
            .filter(r => (pointsMap.get(r.merchant_customer_id) || 0) >= r.points_required)
            .map(r => {
              const c = customersData?.find(c => c.id === r.merchant_customer_id);
              return {
                ...r,
                merchantName: c?.company_name || c?.name || 'Unbekannt',
                merchantLogo: c?.logo_url || null,
                userPoints: pointsMap.get(r.merchant_customer_id) || 0,
              };
            });
          setRedeemableRewards(redeemable);
        }
      } else {
        setLoyaltyEntries([]);
        setRedeemableRewards([]);
      }

      // Load new customer offers
      const { data: offersData } = await supabase
        .from('new_customer_offers')
        .select('id, merchant_customer_id, title, description, bonus_stamps')
        .eq('is_active', true);

      if (offersData && offersData.length > 0) {
        const filteredOffers = offersData.filter(
          offer => !stampedMerchantIds.includes(offer.merchant_customer_id)
        );

        if (filteredOffers.length > 0) {
          const offerMerchantIds = filteredOffers.map(o => o.merchant_customer_id);
          const { data: offerCustomersData } = await supabase
            .from('customers')
            .select('id, name, company_name, logo_url, industry, street, house_number, postal_code, city, latitude, longitude')
            .in('id', offerMerchantIds);

          let formattedOffers: NewCustomerOffer[] = filteredOffers.map(offer => {
            const customer = offerCustomersData?.find(c => c.id === offer.merchant_customer_id);
            let distance: number | undefined;
            if (userLocation && customer?.latitude && customer?.longitude) {
              distance = haversineDistance(userLocation.lat, userLocation.lng, customer.latitude, customer.longitude);
            }
            return { ...offer, customer, distance };
          });

          // Sort by distance if available, then limit to 5
          formattedOffers.sort((a, b) => {
            if (a.distance !== undefined && b.distance !== undefined) return a.distance - b.distance;
            if (a.distance !== undefined) return -1;
            if (b.distance !== undefined) return 1;
            return 0;
          });
          formattedOffers = formattedOffers.slice(0, 5);

          setNewCustomerOffers(formattedOffers);
        } else {
          setNewCustomerOffers([]);
        }
      }
    } catch (err) {
      console.error('[AppHome] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOfferClick = (offer: NewCustomerOffer) => {
    setSelectedOffer(offer);
    setOfferDialogOpen(true);
  };

  const handleRedemptionComplete = () => {
    if (selectedOffer) {
      setNewCustomerOffers(prev => prev.filter(o => o.id !== selectedOffer.id));
    }
    loadData();
  };

  return (
    <MainLayout title="Start">
      <div className="space-y-6">
        {/* Neukundenprämien Section */}
        {newCustomerOffers.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-foreground">Neukundenprämien</h2>
            <p className="text-sm text-muted-foreground mb-4">Angebote in deiner Nähe</p>
            <div className="space-y-3">
              {newCustomerOffers.map((offer) => (
                <Card
                  key={offer.id}
                  className="p-4 hover:shadow-lg transition-shadow cursor-pointer border-2 border-primary/20"
                  onClick={() => handleOfferClick(offer)}
                >
                  <div className="flex items-center gap-4">
                    {offer.customer?.logo_url ? (
                      <img src={offer.customer.logo_url} alt={offer.customer.name} className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                        {offer.customer?.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">
                        {offer.customer?.company_name || offer.customer?.name || 'Unbekannt'}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-1">{offer.title}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          <Gift className="h-3 w-3 mr-1" />
                          +{offer.bonus_stamps} Bonus-Punkte
                        </Badge>
                        {offer.distance !== undefined && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />
                            {offer.distance < 1
                              ? `${Math.round(offer.distance * 1000)}m`
                              : `${offer.distance.toFixed(1)}km`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Mini Dashboard */}
        <div>
          {loading ? (
            <Card className="p-6 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </Card>
          ) : redeemableRewards.length > 0 ? (
            <Card
              className="p-5 cursor-pointer hover:shadow-lg transition-shadow border-2 border-green-200 bg-green-50/50 dark:bg-green-950/20"
              onClick={() => setRewardsDialogOpen(true)}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <Trophy className="h-7 w-7 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {redeemableRewards.length}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-500">
                    {redeemableRewards.length === 1 ? 'Einlösbare Prämie' : 'Einlösbare Prämien'}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-green-400" />
              </div>
            </Card>
          ) : loyaltyEntries.length > 0 ? (
            <Card className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold text-primary">
                    {loyaltyEntries.reduce((sum, e) => sum + e.current_points, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Punkte bei {loyaltyEntries.length} {loyaltyEntries.length === 1 ? 'Laden' : 'Läden'}
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-6 text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <TrendingUp className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Noch keine Punkte</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Besuche einen teilnehmenden Shop und scanne deinen ersten NFC-Stempel!
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate('/app/stores')}>
                Shops entdecken
              </Button>
            </Card>
          )}
        </div>

        {/* Support Section */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-3">Support</h2>
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 hover:shadow-md transition-shadow">
              <button onClick={() => window.open('https://wa.me/', '_blank')} className="w-full text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                  <MessageSquare className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Hilfe benötigt?</h3>
                <p className="text-xs text-muted-foreground">Schreib uns auf WhatsApp</p>
              </button>
            </Card>
            <Card className="p-4 hover:shadow-md transition-shadow">
              <button onClick={() => navigate('/app/suggest-shop')} className="w-full text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Store className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Dir fehlt dein Lieblingsladen?</h3>
                <p className="text-xs text-muted-foreground">Jetzt vorschlagen</p>
              </button>
            </Card>
          </div>
        </div>
      </div>

      {/* Redeemable Rewards Dialog */}
      <Dialog open={rewardsDialogOpen} onOpenChange={setRewardsDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Einlösbare Prämien</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {redeemableRewards.map((reward) => (
              <Card
                key={reward.id}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setRewardsDialogOpen(false);
                  navigate(`/app/merchant/${reward.merchant_customer_id}`);
                }}
              >
                <div className="flex items-center gap-3">
                  {reward.merchantLogo ? (
                    <img src={reward.merchantLogo} alt={reward.merchantName} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {reward.merchantName.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{reward.title}</p>
                    <p className="text-xs text-muted-foreground">{reward.merchantName}</p>
                  </div>
                  <Badge variant="default" className="text-xs">
                    <Trophy className="h-3 w-3 mr-1" />
                    Bereit
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* New Customer Offer Dialog */}
      {selectedOffer && selectedOffer.customer && (
        <NewCustomerOfferDialog
          offer={selectedOffer}
          merchant={{
            name: selectedOffer.customer.name,
            company_name: selectedOffer.customer.company_name,
            logo_url: selectedOffer.customer.logo_url,
            street: selectedOffer.customer.street,
            house_number: selectedOffer.customer.house_number,
            postal_code: selectedOffer.customer.postal_code,
            city: selectedOffer.customer.city,
            latitude: selectedOffer.customer.latitude,
            longitude: selectedOffer.customer.longitude,
          }}
          open={offerDialogOpen}
          onOpenChange={setOfferDialogOpen}
          onRedemptionComplete={handleRedemptionComplete}
        />
      )}
    </MainLayout>
  );
};

export default AppHome;
