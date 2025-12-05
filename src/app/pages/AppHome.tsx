import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Gift, MessageSquare, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MainLayout } from '@/app/components/layout/MainLayout';
import { NewCustomerOfferDialog } from '@/app/components/NewCustomerOfferDialog';
import confetti from 'canvas-confetti';

interface UserStampCard {
  id: string;
  merchant_customer_id: string;
  current_points: number;
  customer?: {
    id: string;
    name: string;
    company_name: string | null;
    logo_url: string | null;
    cover_image_url: string | null;
    industry: string | null;
  };
  stamp_card?: {
    stamp_count: number;
    background_color: string | null;
    stamp_type: string | null;
  };
}

interface NewCustomerOffer {
  id: string;
  merchant_customer_id: string;
  title: string;
  description: string | null;
  bonus_stamps: number;
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

export const AppHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stampCards, setStampCards] = useState<UserStampCard[]>([]);
  const [newCustomerOffers, setNewCustomerOffers] = useState<NewCustomerOffer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [selectedOffer, setSelectedOffer] = useState<NewCustomerOffer | null>(null);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redemptionSuccess, setRedemptionSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load user's stamp cards
      const { data: cards, error: cardsError } = await supabase
        .from('user_stamp_cards')
        .select(`
          id,
          merchant_customer_id,
          current_points,
          stamp_card_id
        `)
        .eq('user_id', user?.id);

      let stampedMerchantIds: string[] = [];

      if (!cardsError && cards && cards.length > 0) {
        stampedMerchantIds = cards.map(c => c.merchant_customer_id);
        const stampCardIds = cards.map(c => c.stamp_card_id).filter(Boolean);

        // Fetch customers data
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, name, company_name, logo_url, cover_image_url, industry')
          .in('id', stampedMerchantIds);

        // Fetch stamp card designs
        const { data: stampCardsData } = stampCardIds.length > 0 
          ? await supabase
              .from('stamp_cards')
              .select('id, stamp_count, background_color, stamp_type')
              .in('id', stampCardIds)
          : { data: [] };

        const formatted = cards.map(card => ({
          ...card,
          customer: customersData?.find(c => c.id === card.merchant_customer_id),
          stamp_card: stampCardsData?.find(sc => sc.id === card.stamp_card_id),
        }));

        setStampCards(formatted);
      }

      // Load new customer offers - only for merchants where user hasn't stamped yet
      const { data: offersData } = await supabase
        .from('new_customer_offers')
        .select('id, merchant_customer_id, title, description, bonus_stamps')
        .eq('is_active', true);

      if (offersData && offersData.length > 0) {
        // Filter out offers for merchants where user already has stamps
        const filteredOffers = offersData.filter(
          offer => !stampedMerchantIds.includes(offer.merchant_customer_id)
        );

        if (filteredOffers.length > 0) {
          const offerMerchantIds = filteredOffers.map(o => o.merchant_customer_id);
          const { data: offerCustomersData } = await supabase
            .from('customers')
            .select('id, name, company_name, logo_url, industry, street, house_number, postal_code, city, latitude, longitude')
            .in('id', offerMerchantIds);

          const formattedOffers = filteredOffers.map(offer => ({
            ...offer,
            customer: offerCustomersData?.find(c => c.id === offer.merchant_customer_id),
          }));

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
    setIsRedeeming(false);
    setRedemptionSuccess(false);
    setOfferDialogOpen(true);
  };

  const handleStartRedemption = () => {
    setIsRedeeming(true);
  };

  const handleRedemptionComplete = () => {
    setRedemptionSuccess(true);
    // Remove the offer from the list
    if (selectedOffer) {
      setNewCustomerOffers(prev => prev.filter(o => o.id !== selectedOffer.id));
    }
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    // Reload data to update stamp cards
    loadData();
  };

  return (
    <MainLayout title="Start">
      <div className="space-y-6">
        {/* Stempelkarten Section */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Deine Stempelkarten</h2>

          {loading ? (
            <Card className="p-6">
              <p className="text-muted-foreground text-center">Lädt...</p>
            </Card>
          ) : stampCards.length > 0 ? (
            <div className="space-y-4">
              {stampCards.map((card) => (
                <Card
                  key={card.id}
                  className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/app/merchant/${card.merchant_customer_id}`)}
                >
                  <div className="flex items-center gap-4">
                    {card.customer?.logo_url ? (
                      <img
                        src={card.customer.logo_url}
                        alt={card.customer.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                        {(card.customer?.company_name || card.customer?.name || '?').charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">
                        {card.customer?.company_name || card.customer?.name || 'Unbekannt'}
                      </h3>
                      <p className="text-sm text-muted-foreground">{card.customer?.industry || 'Geschäft'}</p>
                      <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                        {card.current_points} Punkte
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="relative overflow-hidden bg-gradient-to-br from-primary to-secondary p-6 text-primary-foreground">
              <h3 className="text-xl font-bold mb-2">Noch keine Stempelkarten</h3>
              <p className="text-primary-foreground/90 mb-6">
                Besuche umliegende Shops und sammle deine ersten Stempel.
              </p>

              {/* Card Stack Visualization */}
              <div className="relative h-40 mb-4">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 rotate-[-15deg]">
                  <div className="w-full h-full rounded-2xl bg-gradient-to-br from-[hsl(240,85%,65%)] to-[hsl(240,85%,55%)] shadow-lg" />
                </div>
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-32">
                  <div className="w-full h-full rounded-2xl bg-gradient-to-br from-[hsl(250,85%,65%)] to-[hsl(250,85%,55%)] shadow-lg" />
                </div>
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-32 h-32 rotate-[15deg]">
                  <div className="w-full h-full rounded-2xl bg-gradient-to-br from-[hsl(260,75%,65%)] to-[hsl(260,75%,55%)] shadow-lg" />
                </div>
                <div className="absolute top-12 left-1/2 -translate-x-1/2 w-32 h-32 rotate-[25deg]">
                  <div className="w-full h-full rounded-2xl bg-gradient-to-br from-[hsl(270,80%,70%)] to-[hsl(270,80%,60%)] shadow-lg" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-primary-foreground/20">
                <span className="text-sm text-primary-foreground/80">Geschäfte in deiner Nähe</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/app/stores')}
                  className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                >
                  Shops finden
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Neukundenprämien Section */}
        {newCustomerOffers.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Neukundenprämien</h2>
            <div className="space-y-3">
              {newCustomerOffers.map((offer) => (
                <Card
                  key={offer.id}
                  className="p-4 hover:shadow-lg transition-shadow cursor-pointer border-2 border-primary/20"
                  onClick={() => handleOfferClick(offer)}
                >
                  <div className="flex items-center gap-4">
                    {offer.customer?.logo_url ? (
                      <img
                        src={offer.customer.logo_url}
                        alt={offer.customer.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
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
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Support Section */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-3">Support</h2>
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 hover:shadow-md transition-shadow">
              <button
                onClick={() => window.open('https://wa.me/', '_blank')}
                className="w-full text-center"
              >
                <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                  <MessageSquare className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Hilfe benötigt?</h3>
                <p className="text-xs text-muted-foreground">
                  Schreib uns auf WhatsApp
                </p>
              </button>
            </Card>

            <Card className="p-4 hover:shadow-md transition-shadow">
              <button
                onClick={() => navigate('/app/suggest-shop')}
                className="w-full text-center"
              >
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Store className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Dir fehlt dein Lieblingsladen?</h3>
                <p className="text-xs text-muted-foreground">
                  Jetzt vorschlagen
                </p>
              </button>
            </Card>
          </div>
        </div>
      </div>

      {/* New Customer Offer Dialog */}
      {selectedOffer && (
        <NewCustomerOfferDialog
          offer={selectedOffer}
          merchant={selectedOffer.customer ? {
            name: selectedOffer.customer.name,
            company_name: selectedOffer.customer.company_name,
            logo_url: selectedOffer.customer.logo_url,
            street: selectedOffer.customer.street,
            house_number: selectedOffer.customer.house_number,
            postal_code: selectedOffer.customer.postal_code,
            city: selectedOffer.customer.city,
            latitude: selectedOffer.customer.latitude,
            longitude: selectedOffer.customer.longitude,
          } : null}
          open={offerDialogOpen}
          onOpenChange={(open) => {
            setOfferDialogOpen(open);
            if (!open) {
              setIsRedeeming(false);
              setRedemptionSuccess(false);
            }
          }}
          onRedemptionComplete={handleRedemptionComplete}
          isRedeeming={isRedeeming}
          redemptionSuccess={redemptionSuccess}
          onStartRedemption={handleStartRedemption}
        />
      )}
    </MainLayout>
  );
};

export default AppHome;
