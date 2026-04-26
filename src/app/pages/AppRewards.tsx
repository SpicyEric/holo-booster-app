import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
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
      // Load user points first
      const { data: pointsData } = await supabase
        .from('loyalty_accounts')
        .select('merchant_customer_id, current_points_balance')
        .eq('user_id', user?.id)
        .gt('current_points_balance', 0);

      const pointsMap = new Map<string, number>();
      if (pointsData) {
        pointsData.forEach(p => {
          pointsMap.set(p.merchant_customer_id, p.current_points_balance || 0);
        });
      }
      setUserPoints(pointsMap);

      if (pointsMap.size === 0) {
        setRewards([]);
        setLoading(false);
        return;
      }

      const merchantIds = Array.from(pointsMap.keys());

      const { data: rewardsData } = await supabase
        .from('rewards')
        .select(`
          id, title, description, points_required, image_url, merchant_customer_id,
          customer:customers!merchant_customer_id (name, company_name, logo_url, active)
        `)
        .eq('is_active', true)
        .in('merchant_customer_id', merchantIds)
        .order('points_required', { ascending: true });

      if (rewardsData) {
        // Only keep rewards from active merchants that the user can actually afford
        const redeemable = (rewardsData as unknown as (Reward & { customer: Reward['customer'] & { active?: boolean } })[]).filter(r => 
          (r.customer as any)?.active !== false &&
          (pointsMap.get(r.merchant_customer_id) || 0) >= r.points_required
        );
        setRewards(redeemable);
      }
    } catch (err) {
      console.error('Error loading rewards:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRewardClick = (reward: Reward) => {
    // Navigate to merchant stamp card / detail page
    navigate(`/app/merchant/${reward.merchant_customer_id}`);
  };

  if (loading) {
    return (
      <MainLayout title="Einlösbare Prämien">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Einlösbare Prämien">
      <div className="space-y-3">
        {rewards.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Keine einlösbaren Prämien vorhanden</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/app/stores')}>
                Geschäfte entdecken
              </Button>
            </CardContent>
          </Card>
        ) : (
          rewards.map((reward) => (
            <Card
              key={reward.id}
              className="cursor-pointer active:scale-[0.98] border-primary/30"
              onClick={() => handleRewardClick(reward)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                {reward.customer?.logo_url ? (
                  <img
                    src={reward.customer.logo_url}
                    alt={reward.customer.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Gift className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{reward.title}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {reward.customer.company_name || reward.customer.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">{reward.points_required} Punkte</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </MainLayout>
  );
};

export default AppRewards;
