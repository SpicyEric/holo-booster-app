import { useState, useEffect } from 'react';
import { MainLayout } from '@/app/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CreditCard, Gift } from 'lucide-react';

interface StampCard {
  id: string;
  merchantId: string;
  merchantName: string;
  merchantLogo?: string;
  currentPoints: number;
  stampsRequired?: number;
  rewardText?: string;
  hasRedeemableReward: boolean;
}

export default function AppMyCards() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cards, setCards] = useState<StampCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCards = async () => {
      if (!user) return;

      try {
        // Fetch user's loyalty accounts with merchant info
        const { data: accounts, error } = await supabase
          .from('loyalty_accounts')
          .select('id, merchant_customer_id, current_points_balance')
          .eq('user_id', user.id)
          .gt('current_points_balance', 0);

        if (error) throw error;

        // Fetch merchant details for all accounts
        const merchantIds = (accounts || []).map(a => a.merchant_customer_id);
        let customersData: any[] = [];
        if (merchantIds.length > 0) {
          const { data } = await supabase
            .from('customers')
            .select('id, name, logo_url, stamps_required, stamp_reward_text')
            .in('id', merchantIds);
          customersData = data || [];
        }

        // Fetch actual rewards for these merchants
        let rewardsData: any[] = [];
        if (merchantIds.length > 0) {
          const { data } = await supabase
            .from('rewards')
            .select('id, points_required, merchant_customer_id')
            .eq('is_active', true)
            .in('merchant_customer_id', merchantIds);
          rewardsData = data || [];
        }

        const transformedCards: StampCard[] = (accounts || []).map((account: any) => {
          const customer = customersData.find(c => c.id === account.merchant_customer_id);
          const points = account.current_points_balance || 0;
          // Check if any actual reward can be redeemed with current points
          const hasRedeemableReward = rewardsData.some(
            r => r.merchant_customer_id === account.merchant_customer_id && points >= r.points_required
          );
          return {
            id: account.id,
            merchantId: account.merchant_customer_id,
            merchantName: customer?.name || 'Unbekannter Händler',
            merchantLogo: customer?.logo_url,
            currentPoints: points,
            stampsRequired: customer?.stamps_required,
            rewardText: customer?.stamp_reward_text,
            hasRedeemableReward,
          };
        });

        setCards(transformedCards);
      } catch (error) {
        console.error('Error fetching cards:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, [user]);

  if (loading) {
    return (
      <MainLayout title="Meine Punktekarten" showBack>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Meine Punktekarten" showBack>
      <div className="space-y-4">
        {cards.length === 0 ? (
          <Card className="p-8 text-center">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Keine Punktekarten</h3>
            <p className="text-muted-foreground text-sm">
              Du hast noch keine Punkte bei Händlern gesammelt. 
              Besuche einen teilnehmenden Shop und scanne deinen ersten NFC-Stempel!
            </p>
          </Card>
        ) : (
          cards.map((card) => (
            <button
              key={card.id}
              onClick={() => navigate(`/app/merchant/${card.merchantId}`)}
              className="w-full text-left"
            >
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  {card.merchantLogo ? (
                    <img
                      src={card.merchantLogo}
                      alt={card.merchantName}
                      className="w-14 h-14 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{card.merchantName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-bold text-primary">
                        {card.currentPoints}
                      </span>
                      <span className="text-sm text-muted-foreground">Punkte</span>
                    </div>
                    {card.hasRedeemableReward && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-primary font-semibold animate-pulse">
                        <Gift className="h-3 w-3" />
                        <span>Prämie verfügbar!</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </button>
          ))
        )}
      </div>
    </MainLayout>
  );
}

export { AppMyCards };
