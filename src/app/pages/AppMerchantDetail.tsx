import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Globe, Instagram, Clock, Gift, Sparkles, History, Star } from 'lucide-react';
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

interface Transaction {
  id: string;
  points_change: number;
  transaction_type: string | null;
  description: string | null;
  created_at: string | null;
}

interface GoogleReviewBonus {
  enabled: boolean;
  pointsValue: number;
  reviewUrl: string | null;
  alreadyClaimed: boolean;
}

export const AppMerchantDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [newCustomerOffer, setNewCustomerOffer] = useState<NewCustomerOffer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [hasEverStamped, setHasEverStamped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [googleReviewBonus, setGoogleReviewBonus] = useState<GoogleReviewBonus>({
    enabled: false,
    pointsValue: 5,
    reviewUrl: null,
    alreadyClaimed: false,
  });
  const [claimingReviewBonus, setClaimingReviewBonus] = useState(false);
  
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

      // Check Google review bonus settings
      const reviewEnabled = merchantData.google_review_points_enabled === true;
      const reviewPointsVal = merchantData.google_review_points_value || 5;
      const reviewUrl = merchantData.google_review_url || null;
      // Load user points and check if ever stamped
      if (user) {
        const { data: loyaltyAccount } = await supabase
          .from('loyalty_accounts')
          .select('id, current_points_balance')
          .eq('user_id', user.id)
          .eq('merchant_customer_id', id)
          .maybeSingle();

        const points = loyaltyAccount?.current_points_balance || 0;
        setUserPoints(points);
        setHasEverStamped(points > 0);

        // Load transactions for this merchant
        if (loyaltyAccount) {
          const { data: txData } = await supabase
            .from('point_transactions')
            .select('id, points_change, transaction_type, description, created_at')
            .eq('loyalty_account_id', loyaltyAccount.id)
            .order('created_at', { ascending: false });

          if (txData) setTransactions(txData);
        }

        // Load new customer offer only if user has 0 points
        if (points === 0) {
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

        // Check if user already claimed Google review bonus
        if (reviewEnabled && reviewUrl) {
          const { data: claimData } = await supabase
            .from('google_review_claims')
            .select('id')
            .eq('user_id', user.id)
            .eq('merchant_customer_id', id!)
            .maybeSingle();

          setGoogleReviewBonus({
            enabled: true,
            pointsValue: reviewPointsVal,
            reviewUrl,
            alreadyClaimed: !!claimData,
          });
        } else {
          setGoogleReviewBonus({ enabled: false, pointsValue: 5, reviewUrl: null, alreadyClaimed: false });
        }
      } else {
        // Not logged in - still set review bonus info for display
        if (reviewEnabled && reviewUrl) {
          setGoogleReviewBonus({ enabled: true, pointsValue: reviewPointsVal, reviewUrl, alreadyClaimed: false });
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

  const handleClaimGoogleReviewBonus = async () => {
    if (!user || !id || googleReviewBonus.alreadyClaimed) return;
    
    // First open the Google review URL
    if (googleReviewBonus.reviewUrl) {
      window.open(googleReviewBonus.reviewUrl, '_blank');
    }

    setClaimingReviewBonus(true);
    try {
      // Create claim record
      const { error: claimError } = await supabase
        .from('google_review_claims')
        .insert({
          user_id: user.id,
          merchant_customer_id: id,
          points_awarded: googleReviewBonus.pointsValue,
        });

      if (claimError) throw claimError;

      // Get or create loyalty account
      let { data: loyaltyAccount } = await supabase
        .from('loyalty_accounts')
        .select('id, current_points_balance')
        .eq('user_id', user.id)
        .eq('merchant_customer_id', id)
        .maybeSingle();

      if (!loyaltyAccount) {
        const { data: newAccount, error: createErr } = await supabase
          .from('loyalty_accounts')
          .insert({ user_id: user.id, merchant_customer_id: id, current_points_balance: googleReviewBonus.pointsValue })
          .select('id, current_points_balance')
          .single();
        if (createErr) throw createErr;
        loyaltyAccount = newAccount;
      } else {
        const newBalance = (loyaltyAccount.current_points_balance || 0) + googleReviewBonus.pointsValue;
        await supabase
          .from('loyalty_accounts')
          .update({ current_points_balance: newBalance })
          .eq('id', loyaltyAccount.id);
        loyaltyAccount.current_points_balance = newBalance;
      }

      // Log the transaction
      await supabase.from('point_transactions').insert({
        loyalty_account_id: loyaltyAccount!.id,
        merchant_customer_id: id,
        points_change: googleReviewBonus.pointsValue,
        transaction_type: 'google_review_bonus',
        description: 'Google-Bewertungs-Bonus',
      });

      setUserPoints(loyaltyAccount!.current_points_balance || 0);
      setGoogleReviewBonus(prev => ({ ...prev, alreadyClaimed: true }));
      toast.success(`+${googleReviewBonus.pointsValue} Bonuspunkte erhalten! 🎉`);
    } catch (err) {
      console.error('Error claiming review bonus:', err);
      toast.error('Fehler beim Einlösen des Bonus');
    } finally {
      setClaimingReviewBonus(false);
    }
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
        <div className="absolute top-4 right-4 bg-card/90 rounded-full px-3 py-1">
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

      {/* Tabs */}
      <Tabs defaultValue="rewards" className="p-4">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="rewards">Prämien</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="transactions">Transaktionen</TabsTrigger>
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

          {/* Google Review Bonus */}
          {googleReviewBonus.enabled && !googleReviewBonus.alreadyClaimed && (
            <Card 
              className="border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={handleClaimGoogleReviewBonus}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                  <Star className="h-6 w-6 text-amber-600 fill-amber-500" />
                </div>
                <div className="flex-1">
                  <Badge className="mb-1 text-xs bg-amber-500 hover:bg-amber-600">Google-Bewertung</Badge>
                  <h3 className="font-medium">Bewerte uns & erhalte Bonuspunkte!</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    Hinterlasse eine Google-Bewertung und erhalte {googleReviewBonus.pointsValue} Bonuspunkte
                  </p>
                </div>
                <Badge variant="secondary">
                  <Star className="h-3 w-3 mr-1" />
                  +{googleReviewBonus.pointsValue}
                </Badge>
              </CardContent>
            </Card>
          )}

          {/* Regular Rewards */}
          {rewards.length === 0 && !newCustomerOffer && !googleReviewBonus.enabled ? (
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

        <TabsContent value="transactions" className="mt-4 space-y-3">
          {transactions.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Noch keine Transaktionen
              </CardContent>
            </Card>
          ) : (
            transactions.map((tx) => {
              const isPositive = tx.points_change > 0;
              const date = tx.created_at
                ? new Date(tx.created_at).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';
              return (
                <Card key={tx.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {isPositive ? '+' : '−'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{tx.description || (isPositive ? 'Punkte erhalten' : 'Punkte eingelöst')}</p>
                      <p className="text-xs text-muted-foreground">{date}</p>
                    </div>
                    <span className={`font-bold text-sm ${isPositive ? 'text-green-700' : 'text-red-600'}`}>
                      {isPositive ? '+' : ''}{tx.points_change}
                    </span>
                  </CardContent>
                </Card>
              );
            })
          )}
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
