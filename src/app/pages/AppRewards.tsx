import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { MainLayout } from '@/app/components/layout/MainLayout';

interface Reward {
  id: string;
  title: string;
  description: string | null;
  points_required: number;
  image_url: string | null;
  merchant_customer_id: string;
  customer: {
    name: string;
    company_name: string | null;
    logo_url: string | null;
  };
}

interface UserPoints {
  merchant_customer_id: string;
  current_points: number;
}

export const AppRewards = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [userPoints, setUserPoints] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadRewards();
    }
  }, [user]);

  const loadRewards = async () => {
    setLoading(true);
    try {
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('rewards')
        .select(`
          id, title, description, points_required, image_url, merchant_customer_id,
          customer:customers!merchant_customer_id (name, company_name, logo_url)
        `)
        .eq('is_active', true)
        .order('points_required', { ascending: true });

      if (!rewardsError && rewardsData) {
        setRewards(rewardsData as unknown as Reward[]);
      }

      const { data: pointsData, error: pointsError } = await supabase
        .from('user_stamp_cards')
        .select('merchant_customer_id, current_points')
        .eq('user_id', user?.id);

      if (!pointsError && pointsData) {
        const pointsMap = new Map<string, number>();
        pointsData.forEach((p: UserPoints) => {
          pointsMap.set(p.merchant_customer_id, p.current_points || 0);
        });
        setUserPoints(pointsMap);
      }
    } catch (err) {
      console.error('Error loading rewards:', err);
    } finally {
      setLoading(false);
    }
  };

  const canRedeem = (reward: Reward) => {
    const points = userPoints.get(reward.merchant_customer_id) || 0;
    return points >= reward.points_required;
  };

  if (loading) {
    return (
      <MainLayout title="Prämien">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </MainLayout>
    );
  }

  const rewardsByMerchant = rewards.reduce((acc, reward) => {
    const key = reward.merchant_customer_id;
    if (!acc[key]) {
      acc[key] = {
        merchant: reward.customer,
        merchantId: key,
        rewards: [],
        userPoints: userPoints.get(key) || 0,
      };
    }
    acc[key].rewards.push(reward);
    return acc;
  }, {} as Record<string, { merchant: Reward['customer']; merchantId: string; rewards: Reward[]; userPoints: number }>);

  return (
    <MainLayout title="Prämien">
      <div className="space-y-6">
        {Object.keys(rewardsByMerchant).length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Noch keine Prämien verfügbar</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/app/stores')}>
                Geschäfte entdecken
              </Button>
            </CardContent>
          </Card>
        ) : (
          Object.values(rewardsByMerchant).map(({ merchant, merchantId, rewards, userPoints }) => (
            <Card key={merchantId}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {merchant.logo_url ? (
                      <img 
                        src={merchant.logo_url} 
                        alt={merchant.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Gift className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <CardTitle className="text-base">
                      {merchant.company_name || merchant.name}
                    </CardTitle>
                  </div>
                  <Badge variant="secondary">{userPoints} Punkte</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {rewards.map((reward) => (
                  <div 
                    key={reward.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      canRedeem(reward) 
                        ? 'bg-primary/5 border-primary cursor-pointer hover:bg-primary/10' 
                        : 'bg-muted/50 border-border'
                    }`}
                    onClick={() => canRedeem(reward) && navigate(`/app/merchant/${merchantId}?reward=${reward.id}`)}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{reward.title}</p>
                      {reward.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{reward.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={canRedeem(reward) ? 'default' : 'outline'}>
                        {reward.points_required} Punkte
                      </Badge>
                      {canRedeem(reward) && <ChevronRight className="h-4 w-4 text-primary" />}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </MainLayout>
  );
};

export default AppRewards;
