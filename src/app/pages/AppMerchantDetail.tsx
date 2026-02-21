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
import { BottomNav } from '@/app/components/layout/BottomNav';
import { RewardRedemptionDialog } from '@/app/components/RewardRedemptionDialog';
import { NewCustomerOfferDialog } from '@/app/components/NewCustomerOfferDialog';

interface Merchant {
  id: string;
  name: string;
  company_name: string | null;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  city: string | null;
  street: string | null;
  house_number: string | null;
  postal_code: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  opening_hours: any;
  google_review_url: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface Reward {
  id: string;
  title: string;
  description: string | null;
  points_required: number;
  image_url: string | null;
}

interface NewCustomerOffer {
  id: string;
  title: string;
  description: string | null;
  bonus_stamps: number;
  merchant_customer_id: string;
}

export const AppMerchantDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [newCustomerOffer, setNewCustomerOffer] = useState<NewCustomerOffer | null>(null);
  const [userPoints, setUserPoints] = useState(0);
  const [hasEverStamped, setHasEverStamped] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [newCustomerOfferDialogOpen, setNewCustomerOfferDialogOpen] = useState(false);

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

      // Load user points and check if ever stamped
      if (user) {
        const { data: loyaltyAccount } = await supabase
          .from('loyalty_accounts')
          .select('current_points_balance')
          .eq('user_id', user.id)
          .eq('merchant_customer_id', id)
          .maybeSingle();

        if (loyaltyAccount) {
          setUserPoints(loyaltyAccount.current_points_balance || 0);
          setHasEverStamped(true);
        } else {
          setUserPoints(0);
          setHasEverStamped(false);
        }

        // Load new customer offer if user hasn't stamped yet
        if (!loyaltyAccount) {
          const { data: offerData } = await supabase
            .from('new_customer_offers')
            .select('*')
            .eq('merchant_customer_id', id)
            .eq('is_active', true)
            .maybeSingle();

          if (offerData) {
            setNewCustomerOffer(offerData);
          }
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

  const handleRewardClick = (reward: Reward) => {
    setSelectedReward(reward);
    setRewardDialogOpen(true);
  };

  const handleNewCustomerOfferClick = () => {
    setNewCustomerOfferDialogOpen(true);
  };

  const handlePointsUpdated = (newPoints: number) => {
    setUserPoints(newPoints);
  };

  const handleNewCustomerOfferRedeemed = () => {
    setHasEverStamped(true);
    setNewCustomerOffer(null);
    loadMerchant(); // Reload to get updated points
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

  const streetWithNumber = [merchant.street, merchant.house_number].filter(Boolean).join(' ');
  const address = [streetWithNumber, merchant.postal_code, merchant.city]
    .filter(Boolean)
    .join(', ');

  const openingHours = formatOpeningHours(merchant.opening_hours);
  const merchantName = merchant.company_name || merchant.name;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Cover Image with soft fade */}
      <div className="relative">
        <div className="h-56">
          {merchant.cover_image_url ? (
            <img
              src={merchant.cover_image_url}
              alt={merchant.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary to-secondary" />
          )}
        </div>
        
        {/* Soft gradient fade to white */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/80 to-transparent" />
        
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

        {/* Merchant Name in the fade area */}
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl font-bold text-foreground">
            {merchantName}
          </h1>
          {address && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" />
              {merchant.city}
            </p>
          )}
        </div>
      </div>

      {/* Tabs - Only Prämien and Info */}
      <Tabs defaultValue="rewards" className="p-4">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="rewards">Prämien</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="mt-4 space-y-3">
          {/* New Customer Offer - shown at top if available */}
          {newCustomerOffer && !hasEverStamped && (
            <Card 
              className="border-2 border-primary bg-primary/5 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={handleNewCustomerOfferClick}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <Badge variant="default" className="mb-1 text-xs">Neukundenprämie</Badge>
                  <h3 className="font-medium">{newCustomerOffer.title}</h3>
                  {newCustomerOffer.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {newCustomerOffer.description}
                    </p>
                  )}
                </div>
                <Badge variant="secondary">
                  <Gift className="h-3 w-3 mr-1" />
                  +{newCustomerOffer.bonus_stamps}
                </Badge>
              </CardContent>
            </Card>
          )}

          {/* Regular Rewards */}
          {rewards.length === 0 && !newCustomerOffer ? (
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
                <Card 
                  key={reward.id} 
                  className={`cursor-pointer hover:shadow-lg transition-shadow ${canRedeem ? 'border-primary' : ''}`}
                  onClick={() => handleRewardClick(reward)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    {reward.image_url ? (
                      <img 
                        src={reward.image_url} 
                        alt={reward.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Gift className="h-6 w-6 text-primary" />
                      </div>
                    )}
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
                <p className="text-sm whitespace-pre-wrap">{merchant.description}</p>
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
      </Tabs>

      {/* Reward Redemption Dialog */}
      {selectedReward && id && (
        <RewardRedemptionDialog
          reward={selectedReward}
          open={rewardDialogOpen}
          onOpenChange={setRewardDialogOpen}
          userPoints={userPoints}
          merchantId={id}
          merchantName={merchantName}
          onPointsUpdated={handlePointsUpdated}
        />
      )}

      {/* New Customer Offer Dialog */}
      {newCustomerOffer && merchant && (
        <NewCustomerOfferDialog
          offer={newCustomerOffer}
          merchant={merchant}
          open={newCustomerOfferDialogOpen}
          onOpenChange={setNewCustomerOfferDialogOpen}
          onRedemptionComplete={handleNewCustomerOfferRedeemed}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default AppMerchantDetail;
