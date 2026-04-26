import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Phone, Globe, Instagram, Clock, Gift, Sparkles, History, Star, PartyPopper, Timer } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { BottomNav } from '@/app/components/layout/BottomNav';
import { RewardRedemptionDialog } from '@/app/components/RewardRedemptionDialog';
import { NewCustomerOfferDialog } from '@/app/components/NewCustomerOfferDialog';
import { InviteFriendDialog } from '@/app/components/InviteFriendDialog';
import { UserPlus } from 'lucide-react';

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
  referral_enabled?: boolean | null;
  referral_inviter_points?: number | null;
  referral_invitee_points?: number | null;
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

interface MerchantRouteState {
  fromScan?: boolean;
  initialMerchant?: Merchant;
  initialRewards?: Reward[];
  initialUserPoints?: number;
  scanAwardedPoints?: number;
}

type MerchantTab = 'rewards' | 'info' | 'transactions';

export const AppMerchantDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as MerchantRouteState | null;
  const initialMerchant = routeState?.initialMerchant && routeState.initialMerchant.id === id
    ? routeState.initialMerchant
    : null;
  const initialRewards = initialMerchant ? routeState?.initialRewards ?? [] : [];
  const initialUserPoints = initialMerchant ? routeState?.initialUserPoints ?? 0 : 0;
  const scanAwardedPoints = initialMerchant ? routeState?.scanAwardedPoints ?? 0 : 0;
  const shouldAnimateFromScan = routeState?.fromScan === true && Boolean(initialMerchant);
  const [merchant, setMerchant] = useState<Merchant | null>(initialMerchant);
  const [rewards, setRewards] = useState<Reward[]>(initialRewards);
  const [newCustomerOffer, setNewCustomerOffer] = useState<NewCustomerOffer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userPoints, setUserPoints] = useState(initialUserPoints);
  const [displayPoints, setDisplayPoints] = useState(
    shouldAnimateFromScan && scanAwardedPoints > 0
      ? Math.max(initialUserPoints - scanAwardedPoints, 0)
      : initialUserPoints,
  );
  const [hasEverStamped, setHasEverStamped] = useState(initialUserPoints > 0);
  const [loading, setLoading] = useState(!initialMerchant);
  const [activeTab, setActiveTab] = useState<MerchantTab>('rewards');
  const [headerHeight, setHeaderHeight] = useState(0);
  const [pulsePoints, setPulsePoints] = useState(false);
  const [pointsAnimation, setPointsAnimation] = useState<{
    startX: number;
    startY: number;
    deltaX: number;
    deltaY: number;
  } | null>(null);
  const [showPointsBubble, setShowPointsBubble] = useState(false);
  const [googleReviewBonus, setGoogleReviewBonus] = useState<GoogleReviewBonus>({
    enabled: false,
    pointsValue: 5,
    reviewUrl: null,
    alreadyClaimed: false,
  });
  const [claimingReviewBonus, setClaimingReviewBonus] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  
  // Dialog states
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [newCustomerOfferDialogOpen, setNewCustomerOfferDialogOpen] = useState(false);
  const [newCustomerOfferDialogMode, setNewCustomerOfferDialogMode] = useState<'preview' | 'unlocked'>('preview');
  const [activeInvitation, setActiveInvitation] = useState<{
    redemption_id: string;
    invitation_id: string;
    expires_at: string;
    inviter_points: number;
    invitee_points: number;
  } | null>(null);
  const [invitationDialogOpen, setInvitationDialogOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const pointsBadgeRef = useRef<HTMLDivElement | null>(null);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const scanAnimationPlayedRef = useRef(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    contentScrollRef.current?.scrollTo({ top: 0, left: 0 });
  }, [id]);

  useEffect(() => {
    if (id) {
      loadMerchant(Boolean(initialMerchant));
    }
  }, [id, initialMerchant, user]);

  // Auto-Refresh: Punkte neu laden wenn der Tab wieder sichtbar/fokussiert wird
  // ODER wenn ein point_transaction für diesen User+Merchant via Realtime eintrifft
  // (z.B. nach NFC-Scan, Welcome-Bonus oder Referral-Bonus auf einem anderen Device).
  useEffect(() => {
    if (!id || !user) return;

    const refresh = () => {
      void loadMerchant(true);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', refresh);

    // Realtime: punkt_transactions für diesen Merchant
    const channel = supabase
      .channel(`merchant-detail-${id}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'point_transactions',
          filter: `merchant_customer_id=eq.${id}`,
        },
        () => refresh(),
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'loyalty_accounts',
          filter: `merchant_customer_id=eq.${id}`,
        },
        () => refresh(),
      )
      .subscribe();

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', refresh);
      supabase.removeChannel(channel);
    };
  }, [id, user]);

  useEffect(() => {
    if (scanAnimationPlayedRef.current || !shouldAnimateFromScan || scanAwardedPoints <= 0) {
      setDisplayPoints(userPoints);
    }
  }, [scanAwardedPoints, shouldAnimateFromScan, userPoints]);

  useEffect(() => {
    const updateHeaderHeight = () => {
      const next = headerRef.current?.offsetHeight ?? 0;
      // Ignore transient 0/very-small measurements (e.g. when tab/app
      // is briefly hidden) — keep the last valid height instead.
      if (next < 50) return;
      setHeaderHeight((prev) => (prev === next ? prev : next));
    };

    updateHeaderHeight();

    // Re-measure once images inside the header have loaded — image
    // load events after a tab/app resume can change the cover height.
    const headerEl = headerRef.current;
    const imgs = headerEl ? Array.from(headerEl.querySelectorAll('img')) : [];
    imgs.forEach((img) => {
      if (!img.complete) {
        img.addEventListener('load', updateHeaderHeight, { once: true });
      }
    });

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Defer to next frames so layout has settled.
        requestAnimationFrame(() => requestAnimationFrame(updateHeaderHeight));
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pageshow', updateHeaderHeight);
    window.addEventListener('focus', updateHeaderHeight);

    if (!headerEl || typeof ResizeObserver === 'undefined') {
      return () => {
        document.removeEventListener('visibilitychange', handleVisibility);
        window.removeEventListener('pageshow', updateHeaderHeight);
        window.removeEventListener('focus', updateHeaderHeight);
        imgs.forEach((img) => img.removeEventListener('load', updateHeaderHeight));
      };
    }

    const observer = new ResizeObserver(() => updateHeaderHeight());
    observer.observe(headerEl);
    window.addEventListener('resize', updateHeaderHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeaderHeight);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pageshow', updateHeaderHeight);
      window.removeEventListener('focus', updateHeaderHeight);
      imgs.forEach((img) => img.removeEventListener('load', updateHeaderHeight));
    };
  }, [merchant]);

  useEffect(() => {
    if (!merchant || !shouldAnimateFromScan || scanAwardedPoints <= 0 || scanAnimationPlayedRef.current) {
      return;
    }

    let frameOne = 0;
    let frameTwo = 0;
    let updateTimer = 0;
    let pulseTimer = 0;

    const startAnimation = () => {
      const cardRect = cardRef.current?.getBoundingClientRect();
      const badgeRect = pointsBadgeRef.current?.getBoundingClientRect();

      if (!cardRect || !badgeRect) {
        scanAnimationPlayedRef.current = true;
        setDisplayPoints(initialUserPoints);
        return;
      }

      const startX = cardRect.left + cardRect.width / 2;
      const startY = cardRect.top + cardRect.height / 2;
      const endX = badgeRect.left + badgeRect.width / 2;
      const endY = badgeRect.top + badgeRect.height / 2;

      setPointsAnimation({
        startX,
        startY,
        deltaX: endX - startX,
        deltaY: endY - startY,
      });
      setShowPointsBubble(true);

      updateTimer = window.setTimeout(() => {
        scanAnimationPlayedRef.current = true;
        setShowPointsBubble(false);
        setDisplayPoints(initialUserPoints);
        setPulsePoints(true);

        pulseTimer = window.setTimeout(() => {
          setPulsePoints(false);
        }, 400);
      }, 4700);
    };

    frameOne = window.requestAnimationFrame(() => {
      frameTwo = window.requestAnimationFrame(startAnimation);
    });

    return () => {
      window.cancelAnimationFrame(frameOne);
      window.cancelAnimationFrame(frameTwo);
      window.clearTimeout(updateTimer);
      window.clearTimeout(pulseTimer);
    };
  }, [initialUserPoints, merchant, scanAwardedPoints, shouldAnimateFromScan]);

  const loadMerchant = async (keepVisible = false) => {
    if (!id) return;

    if (!keepVisible) {
      setLoading(true);
    }

    try {
      const [{ data: merchantData, error: merchantError }, { data: rewardsData }] = await Promise.all([
        supabase
          .from('customers')
          .select('*')
          .eq('id', id)
          .single(),
        supabase
          .from('rewards')
          .select('*')
          .eq('merchant_customer_id', id)
          .eq('is_active', true)
          .order('points_required', { ascending: true }),
      ]);

      if (merchantError) throw merchantError;

      setMerchant(merchantData);
      setRewards(rewardsData ?? []);

      const reviewEnabled = merchantData.google_review_points_enabled === true;
      const reviewPointsVal = merchantData.google_review_points_value || 5;
      const reviewUrl = merchantData.google_review_url || null;

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

        const [transactionsResponse, offerResponse, claimResponse, invitationResponse] = await Promise.all([
          loyaltyAccount
            ? supabase
                .from('point_transactions')
                .select('id, points_change, transaction_type, description, created_at')
                .eq('loyalty_account_id', loyaltyAccount.id)
                .order('created_at', { ascending: false })
            : Promise.resolve(null),
          points === 0
            ? supabase
                .from('new_customer_offers')
                .select('*')
                .eq('merchant_customer_id', id)
                .eq('is_active', true)
                .maybeSingle()
            : Promise.resolve(null),
          reviewEnabled && reviewUrl
            ? supabase
                .from('google_review_claims')
                .select('id')
                .eq('user_id', user.id)
                .eq('merchant_customer_id', id)
                .maybeSingle()
            : Promise.resolve(null),
          // Aktive Einladung als Eingeladener für DIESEN Merchant
          supabase
            .from('invitation_redemptions')
            .select('id, invitation_id, accepted_at, bonus_window_starts_at, invitee_stamped_at, bonus_awarded_at, invitations!inner(id, merchant_customer_id)')
            .eq('invitee_user_id', user.id)
            .eq('invitations.merchant_customer_id', id)
            .is('invitee_stamped_at', null)
            .is('bonus_awarded_at', null)
            .order('accepted_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        setTransactions(transactionsResponse?.data ?? []);
        setNewCustomerOffer(offerResponse?.data ?? null);

        // Auto-Trigger: Wenn eine Neukundenprämie freigeschaltet wurde (Transaktion existiert)
        // und das Willkommens-Pop-up für diesen User+Merchant noch nicht angezeigt wurde,
        // dann jetzt einmalig öffnen.
        const unlockedTx = (transactionsResponse?.data ?? []).find(
          (t: Transaction) => t.transaction_type === 'new_customer_offer_unlocked',
        );
        if (unlockedTx && offerResponse?.data && id) {
          const seenKey = `eloyo:nco-welcome-shown:${user.id}:${id}`;
          if (!localStorage.getItem(seenKey)) {
            setNewCustomerOfferDialogMode('unlocked');
            setNewCustomerOfferDialogOpen(true);
            localStorage.setItem(seenKey, '1');
          }
        }

        // Einladung verarbeiten — nur anzeigen, wenn 7-Tage-Fenster noch aktiv ist
        const inviteRow = invitationResponse?.data as
          | { id: string; invitation_id: string; accepted_at: string; bonus_window_starts_at: string | null }
          | null;
        if (inviteRow) {
          const start = inviteRow.bonus_window_starts_at ?? inviteRow.accepted_at;
          const expiresAt = new Date(new Date(start).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
          if (new Date(expiresAt).getTime() > Date.now()) {
            setActiveInvitation({
              redemption_id: inviteRow.id,
              invitation_id: inviteRow.invitation_id,
              expires_at: expiresAt,
              inviter_points: merchantData.referral_inviter_points ?? 3,
              invitee_points: merchantData.referral_invitee_points ?? 1,
            });
          } else {
            setActiveInvitation(null);
          }
        } else {
          setActiveInvitation(null);
        }

        if (reviewEnabled && reviewUrl) {
          setGoogleReviewBonus({
            enabled: true,
            pointsValue: reviewPointsVal,
            reviewUrl,
            alreadyClaimed: !!claimResponse?.data,
          });
        } else {
          setGoogleReviewBonus({ enabled: false, pointsValue: 5, reviewUrl: null, alreadyClaimed: false });
        }
      } else {
        setTransactions([]);
        setNewCustomerOffer(null);
        setActiveInvitation(null);

        if (reviewEnabled && reviewUrl) {
          setGoogleReviewBonus({ enabled: true, pointsValue: reviewPointsVal, reviewUrl, alreadyClaimed: false });
        } else {
          setGoogleReviewBonus({ enabled: false, pointsValue: 5, reviewUrl: null, alreadyClaimed: false });
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
    
    // Only show days that are actually configured
    const result = dayKeys.map((key, i) => {
      const dayHours = hours[key];
      if (!dayHours) return null;
      if (dayHours.closed) {
        return { day: days[i], time: 'Geschlossen' };
      }
      return { day: days[i], time: `${dayHours.open} - ${dayHours.close}` };
    }).filter(Boolean) as { day: string; time: string }[];
    
    return result.length > 0 ? result : null;
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
    setNewCustomerOfferDialogMode('preview');
    setNewCustomerOfferDialogOpen(true);
  };

  const handlePointsUpdated = (newPoints: number) => {
    setUserPoints(newPoints);
    setDisplayPoints(newPoints);
    // Transaktionen sofort neu laden damit die Einlösung direkt sichtbar ist
    reloadTransactions();
  };

  const reloadTransactions = async () => {
    if (!user || !id) return;
    const { data: loyaltyAccount } = await supabase
      .from('loyalty_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('merchant_customer_id', id)
      .maybeSingle();
    if (loyaltyAccount) {
      const { data: txData } = await supabase
        .from('point_transactions')
        .select('id, points_change, transaction_type, description, created_at')
        .eq('loyalty_account_id', loyaltyAccount.id)
        .order('created_at', { ascending: false });
      if (txData) setTransactions(txData);
    }
  };

  const handleNewCustomerOfferRedeemed = () => {
    setHasEverStamped(true);
    setNewCustomerOffer(null);
    loadMerchant(); // Reload to get updated points
  };

  if (loading) {
    return (
      <div className="bg-background overflow-hidden" style={{ height: '100dvh' }}>
        <div className="h-full overflow-y-auto pb-32 overflow-x-hidden" style={{ overscrollBehavior: 'none', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
          <div className="fixed top-0 left-0 right-0 z-[60]" style={{ height: 'env(safe-area-inset-top, 0px)', background: 'hsl(var(--background))' }} />
          <div className="px-4 pt-4">
            <div className="scan-merchant-card-transition relative rounded-2xl overflow-hidden shadow-lg" style={{ aspectRatio: '1.55 / 1' }}>
              <Skeleton className="h-full w-full" />
            </div>
          </div>
          <div className="p-4 space-y-4">
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        </div>
        <BottomNav />
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

  // Build an array of all reward items for stagger animation
  const rewardItems: { key: string; element: React.ReactNode }[] = [];
  
  // 🎁 Aktive Einladung — IMMER ganz oben, vor allen anderen Prämien
  if (activeInvitation) {
    const msLeft = new Date(activeInvitation.expires_at).getTime() - Date.now();
    const daysLeft = Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
    rewardItems.push({
      key: 'active-invitation',
      element: (
        <Card
          className="reward-glow border-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent cursor-pointer relative rounded-xl"
          onClick={() => setInvitationDialogOpen(true)}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <PartyPopper className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <Badge variant="default" className="mb-1 text-xs">Du wurdest eingeladen 🎉</Badge>
              <h3 className="font-medium leading-tight">Sammle deinen ersten Stempel & erhalte doppelte Punkte</h3>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Timer className="h-3 w-3" />
                Noch {daysLeft} {daysLeft === 1 ? 'Tag' : 'Tage'} Zeit
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              <Sparkles className="h-3 w-3 mr-1" />2×
            </Badge>
          </CardContent>
        </Card>
      ),
    });
  }

  if (newCustomerOffer && !hasEverStamped) {
    rewardItems.push({
      key: 'new-customer-offer',
      element: (
        <Card 
          className="reward-glow border-0 bg-primary/5 cursor-pointer hover:shadow-lg transition-shadow rounded-xl"
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
                <p className="text-sm text-muted-foreground line-clamp-1">{newCustomerOffer.description}</p>
              )}
            </div>
            {newCustomerOffer.bonus_stamps > 0 && (
              <Badge variant="secondary"><Gift className="h-3 w-3 mr-1" />+{newCustomerOffer.bonus_stamps}</Badge>
            )}
          </CardContent>
        </Card>
      ),
    });
  }

  if (!loading && googleReviewBonus.enabled && !googleReviewBonus.alreadyClaimed && transactions.length === 1) {
    rewardItems.push({
      key: 'google-review',
      element: (
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
            <Badge variant="secondary"><Star className="h-3 w-3 mr-1" />+{googleReviewBonus.pointsValue}</Badge>
          </CardContent>
        </Card>
      ),
    });
  }

  if (rewards.length === 0 && rewardItems.length === 0) {
    rewardItems.push({
      key: 'empty',
      element: (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <Gift className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Keine Prämien verfügbar
          </CardContent>
        </Card>
      ),
    });
  } else {
    rewards.forEach((reward) => {
      const canRedeem = userPoints >= reward.points_required;
      rewardItems.push({
        key: reward.id,
        element: (
          <Card 
            className={`cursor-pointer hover:shadow-lg transition-shadow ${canRedeem ? 'reward-glow border-0' : 'border-0 bg-black/[0.06] dark:bg-white/[0.04]'}`}
            onClick={() => handleRewardClick(reward)}
          >
            <CardContent className="p-4 flex items-center gap-4">
              {reward.image_url ? (
                <img src={reward.image_url} alt={reward.title} className="w-12 h-12 rounded-lg object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Gift className="h-6 w-6 text-primary" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-medium">{reward.title}</h3>
                {reward.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1">{reward.description}</p>
                )}
              </div>
              <Badge variant={canRedeem ? 'default' : 'secondary'}>
                {reward.points_required}
              </Badge>
            </CardContent>
          </Card>
        ),
      });
    });
  }

  return (
    <div className="bg-background overflow-hidden" style={{ height: '100dvh', overscrollBehavior: 'none', touchAction: 'pan-y' }}>
      <div className="fixed top-0 left-0 right-0 z-[60]" style={{ height: 'env(safe-area-inset-top, 0px)', background: 'hsl(var(--background))' }} />

      {showPointsBubble && pointsAnimation && (
        <motion.div
          initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
          animate={{
            scale: [0, 1.2, 1, 1.08, 1, 1.06, 1, 1, 0.4, 0.3],
            opacity: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            x: [0, 0, 0, 0, 0, 0, 0, 0, pointsAnimation.deltaX, pointsAnimation.deltaX],
            y: [0, 0, 0, 0, 0, 0, 0, 0, pointsAnimation.deltaY, pointsAnimation.deltaY],
          }}
          transition={{ duration: 5, times: [0, 0.08, 0.16, 0.3, 0.38, 0.5, 0.58, 0.78, 0.95, 1], ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none fixed z-[70] flex h-24 w-24 items-center justify-center rounded-full bg-primary shadow-xl shadow-primary/50"
          style={{ left: pointsAnimation.startX, top: pointsAnimation.startY, transform: 'translate(-50%, -50%)' }}
        >
          <span className="text-2xl font-bold text-primary-foreground">+{scanAwardedPoints}</span>
        </motion.div>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MerchantTab)} className="relative h-full">
        <div ref={headerRef} className="pointer-events-none absolute inset-x-0 top-0 z-40">
          {/* Solid background layer so scrolled content is fully hidden behind header */}
          <div className="absolute inset-0 bg-background pointer-events-none" />

          <div className="relative pointer-events-none px-4 pt-4" style={{ touchAction: 'none' }}>
            <div ref={cardRef} className="scan-merchant-card-transition relative rounded-2xl overflow-hidden shadow-lg" style={{ aspectRatio: '1.55 / 1' }}>
              {merchant.cover_image_url ? (
                <img src={merchant.cover_image_url} alt={merchant.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary to-secondary" />
              )}

              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 via-black/25 to-transparent" />

              <motion.div
                initial={shouldAnimateFromScan ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: shouldAnimateFromScan ? 0.2 : 0 }}
                className="absolute top-3 left-3 z-10 pointer-events-auto"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm rounded-xl"
                  onClick={() => navigate('/app/stores')}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </motion.div>

              <motion.div
                ref={pointsBadgeRef}
                initial={shouldAnimateFromScan ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: shouldAnimateFromScan ? 0.3 : 0 }}
                className="absolute top-3 right-3 z-10"
              >
                <motion.div
                  animate={pulsePoints ? { scale: [1, 1.24, 1] } : { scale: 1 }}
                  transition={{ duration: 0.34, ease: 'easeOut' }}
                  className="bg-black/40 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow-md"
                >
                  <span className="font-bold text-white">{displayPoints}</span>
                  <span className="text-sm text-white/80 ml-1">Punkte</span>
                </motion.div>
              </motion.div>

              <motion.div
                initial={shouldAnimateFromScan ? { opacity: 0, y: 5 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: shouldAnimateFromScan ? 0.25 : 0 }}
                className="absolute bottom-3 left-4 right-16"
              >
                <h1 className="text-lg font-bold text-white drop-shadow-md truncate">{merchantName}</h1>
              </motion.div>

              {merchant.referral_enabled !== false && (
                <motion.button
                  initial={shouldAnimateFromScan ? { opacity: 0, scale: 0.6 } : false}
                  animate={{
                    opacity: 1,
                    scale: [1, 1.06, 1],
                    boxShadow: [
                      '0 6px 18px hsl(var(--primary) / 0.35)',
                      '0 8px 26px hsl(var(--primary) / 0.55)',
                      '0 6px 18px hsl(var(--primary) / 0.35)',
                    ],
                  }}
                  transition={{
                    opacity: { duration: 0.4, delay: shouldAnimateFromScan ? 0.45 : 0 },
                    scale: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
                    boxShadow: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
                  }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setInviteOpen(true)}
                  aria-label="Freund einladen"
                  className="absolute bottom-3 right-3 z-10 pointer-events-auto h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                >
                  <UserPlus className="h-5 w-5" />
                </motion.button>
              )}
            </div>
          </div>

          <motion.div
            initial={shouldAnimateFromScan ? { opacity: 0, y: 20 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: shouldAnimateFromScan ? 0.4 : 0 }}
            className="relative pointer-events-none px-4 pt-3"
            style={{ touchAction: 'none' }}
          >
            <div className="rounded-xl border border-border/50 bg-background/85 p-1 shadow-lg backdrop-blur-xl">
              <div className="relative grid h-auto w-full grid-cols-3 gap-1">
                {(['rewards', 'info', 'transactions'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pointer-events-auto relative z-10 rounded-lg py-2.5 text-sm transition-colors duration-200 ${
                      activeTab === tab ? 'text-foreground font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    {tab === 'rewards' ? 'Prämien' : tab === 'info' ? 'Info' : 'Transaktionen'}
                    {activeTab === tab && (
                      <motion.div
                        layoutId="tab-indicator"
                        className="absolute inset-0 rounded-lg bg-foreground/10 shadow-md border border-border/60"
                        style={{ zIndex: -1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

        </div>

        <div 
          className="pointer-events-none absolute inset-x-0 z-30"
          style={{ top: headerHeight ? `${headerHeight}px` : '0px', height: '20px' }}
        >
          <div className="h-full bg-gradient-to-b from-background to-transparent" />
        </div>

        <div className="relative h-full overflow-visible">
          <div
            ref={contentScrollRef}
            className="h-full overflow-y-auto px-4 overflow-x-hidden scrollbar-hide"
            style={{
              // Sensible fallback so content never slides under the header
              // while the header is being (re-)measured.
              paddingTop: `${(headerHeight || 320) + 15}px`,
              paddingBottom: 'calc(8rem + env(safe-area-inset-bottom, 0px))',
              overscrollBehavior: 'none',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
            }}
          >
            <TabsContent value="rewards" className="mt-0 space-y-3">
              {rewardItems.map((item, index) => (
                <motion.div
                  key={item.key}
                  initial={shouldAnimateFromScan ? { opacity: 0, y: 15 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: shouldAnimateFromScan ? 0.5 + index * 0.1 : 0 }}
                >
                  {item.element}
                </motion.div>
              ))}
            </TabsContent>

            <TabsContent value="info" className="mt-0 space-y-4">
              {merchant.description && (
                <Card className="border-0 bg-black/[0.06] dark:bg-white/[0.04]">
                  <CardContent className="p-4">
                    <p className="text-sm whitespace-pre-wrap">{merchant.description}</p>
                  </CardContent>
                </Card>
              )}

              {openingHours && (
                <Card className="border-0 bg-black/[0.06] dark:bg-white/[0.04]">
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Öffnungszeiten
                    </h3>
                    <div className="space-y-1 text-sm">
                      {openingHours.map((h) => (
                        <div key={h.day} className="flex justify-between gap-4">
                          <span className="text-muted-foreground">{h.day}</span>
                          <span>{h.time}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-0 bg-black/[0.06] dark:bg-white/[0.04]">
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

              {merchant.referral_enabled !== false && (
                <Button
                  onClick={() => setInviteOpen(true)}
                  className="w-full h-12 rounded-xl gap-2"
                  variant="outline"
                >
                  <UserPlus className="h-4 w-4" />
                  Freund einladen
                </Button>
              )}
            </TabsContent>

            <TabsContent value="transactions" className="mt-0 space-y-3">
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
                    <Card key={tx.id} className="border-0 bg-black/[0.06] dark:bg-white/[0.04]">
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
          </div>
        </div>
      </Tabs>

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

      {newCustomerOffer && merchant && (
        <NewCustomerOfferDialog
          offer={newCustomerOffer}
          merchant={merchant}
          open={newCustomerOfferDialogOpen}
          onOpenChange={setNewCustomerOfferDialogOpen}
          mode={newCustomerOfferDialogMode}
        />
      )}

      {merchant && (
        <InviteFriendDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          merchantId={merchant.id}
          merchantName={merchantName}
          inviterPoints={merchant.referral_inviter_points ?? 3}
          inviteePoints={merchant.referral_invitee_points ?? 1}
        />
      )}

      {/* Pop-up: Aktive Einladung — Erklärung + Countdown */}
      <Dialog open={invitationDialogOpen} onOpenChange={setInvitationDialogOpen}>
        <DialogContent className="max-w-[340px] rounded-3xl p-0 gap-0 overflow-hidden border-0 [&>button]:hidden">
          <div
            className="h-32 bg-gradient-to-br from-primary to-primary/60"
            style={
              merchant?.cover_image_url || merchant?.logo_url
                ? {
                    backgroundImage: `url(${merchant.cover_image_url || merchant.logo_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }
          />
          <div className="px-6 pb-6 -mt-10 text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-card border-4 border-card shadow-lg overflow-hidden flex items-center justify-center mb-3">
              {merchant?.logo_url ? (
                <img src={merchant.logo_url} alt={merchantName} className="h-full w-full object-cover" />
              ) : (
                <PartyPopper className="h-8 w-8 text-primary" />
              )}
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              Du wurdest eingeladen
            </div>
            <h2 className="text-xl font-bold leading-tight mb-2">
              Willkommen bei <span className="text-primary">{merchantName}</span> 🎉
            </h2>
            {activeInvitation && (() => {
              const ms = new Date(activeInvitation.expires_at).getTime() - Date.now();
              const daysLeft = Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
              return (
                <>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Sammle innerhalb der nächsten{' '}
                    <span className="font-semibold text-foreground">
                      {daysLeft} {daysLeft === 1 ? 'Tag' : 'Tage'}
                    </span>{' '}
                    deinen <span className="font-semibold text-foreground">ersten Stempel</span> und du bekommst{' '}
                    <span className="font-semibold text-foreground">automatisch doppelte Punkte</span> auf deinen ersten Einkauf.
                    Auch die Person, die dich eingeladen hat, erhält dafür einen kleinen Bonus 💜
                  </p>
                  <div className="rounded-xl bg-primary/10 px-3 py-2.5 mb-4 flex items-center justify-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-base font-bold text-primary">Punkte ×2 auf deinen ersten Stempel</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-5">
                    <Timer className="h-3.5 w-3.5" />
                    Verlier keine Zeit — sicher dir deine doppelten Punkte, bevor die Einladung abläuft!
                  </div>
                </>
              );
            })()}
            <Button onClick={() => setInvitationDialogOpen(false)} className="w-full h-11 rounded-xl">
              Alles klar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default AppMerchantDetail;
