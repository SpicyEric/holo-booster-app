import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Gift, MessageSquare, TrendingUp, Trophy, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MainLayout } from '@/app/components/layout/MainLayout';
import { NewCustomerOfferDialog } from '@/app/components/NewCustomerOfferDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
  const [loyaltyEntries, setLoyaltyEntries] = useState<LoyaltyEntry[]>([]);
  const [newCustomerOffers, setNewCustomerOffers] = useState<NewCustomerOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [pointsDialogOpen, setPointsDialogOpen] = useState(false);

  // Dialog states
  const [selectedOffer, setSelectedOffer] = useState<NewCustomerOffer | null>(null);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load user's loyalty accounts (where points > 0)
      const { data: accounts, error: accountsError } = await supabase
        .from('loyalty_accounts')
        .select('id, merchant_customer_id, current_points_balance')
        .eq('user_id', user!.id)
        .gt('current_points_balance', 0);

      let stampedMerchantIds: string[] = [];

      if (accountsError) {
        console.error('[AppHome] Error loading loyalty accounts:', accountsError);
        setLoyaltyEntries([]);
      } else if (accounts && accounts.length > 0) {
        stampedMerchantIds = accounts.map(a => a.merchant_customer_id);

        const { data: customersData } = await supabase
          .from('customers')
          .select('id, name, company_name, logo_url, industry, stamps_required')
          .in('id', stampedMerchantIds);

        // Load rewards to check which are redeemable
        const formatted = accounts.map(account => ({
          id: account.id,
          merchant_customer_id: account.merchant_customer_id,
          current_points: account.current_points_balance || 0,
          customer: customersData?.find(c => c.id === account.merchant_customer_id),
        }));

        setLoyaltyEntries(formatted);
      } else {
        setLoyaltyEntries([]);
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
    setOfferDialogOpen(true);
  };

  const handleRedemptionComplete = () => {
    if (selectedOffer) {
      setNewCustomerOffers(prev => prev.filter(o => o.id !== selectedOffer.id));
    }
    loadData();
  };

  // Stats
  const totalStores = loyaltyEntries.length;
  const totalPoints = loyaltyEntries.reduce((sum, e) => sum + e.current_points, 0);
  const rewardsReady = loyaltyEntries.filter(e => {
    const required = e.customer?.stamps_required;
    return required && e.current_points >= required;
  }).length;

  return (
    <MainLayout title="Start">
      <div className="space-y-6">
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

        {/* Deine Punkte Mini-Dashboard */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Deine Punkte</h2>

          {loading ? (
            <Card className="p-6 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </Card>
          ) : totalStores === 0 ? (
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
          ) : (
            <Card className="p-5">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{totalStores}</div>
                  <div className="text-xs text-muted-foreground">
                    {totalStores === 1 ? 'Laden' : 'Läden'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{totalPoints}</div>
                  <div className="text-xs text-muted-foreground">Punkte</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{rewardsReady}</div>
                  <div className="text-xs text-muted-foreground">
                    {rewardsReady === 1 ? 'Prämie' : 'Prämien'}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => setPointsDialogOpen(true)}
              >
                Übersicht öffnen
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Card>
          )}
        </div>

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

      {/* Points Detail Dialog */}
      <Dialog open={pointsDialogOpen} onOpenChange={setPointsDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deine Punkte</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Geschäft</TableHead>
                <TableHead className="text-right">Punkte</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loyaltyEntries.map((entry) => (
                <TableRow
                  key={entry.id}
                  className="cursor-pointer"
                  onClick={() => {
                    setPointsDialogOpen(false);
                    navigate(`/app/merchant/${entry.merchant_customer_id}`);
                  }}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {entry.customer?.logo_url ? (
                        <img
                          src={entry.customer.logo_url}
                          alt={entry.customer.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {(entry.customer?.name || '?').charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-sm">
                          {entry.customer?.company_name || entry.customer?.name || 'Unbekannt'}
                        </div>
                        {entry.customer?.stamps_required && entry.current_points >= entry.customer.stamps_required && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0 mt-0.5">
                            <Trophy className="h-2.5 w-2.5 mr-0.5" />
                            Prämie bereit
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-primary">
                    {entry.current_points}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
