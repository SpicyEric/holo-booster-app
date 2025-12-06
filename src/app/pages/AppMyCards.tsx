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
        // Fetch user's stamp cards with merchant info
        const { data: userCards, error } = await supabase
          .from('user_stamp_cards')
          .select(`
            id,
            current_points,
            merchant_customer_id,
            customers:merchant_customer_id (
              id,
              name,
              logo_url,
              stamps_required,
              stamp_reward_text
            )
          `)
          .eq('user_id', user.id)
          .gt('current_points', 0);

        if (error) throw error;

        const transformedCards: StampCard[] = (userCards || []).map((card: any) => ({
          id: card.id,
          merchantId: card.merchant_customer_id,
          merchantName: card.customers?.name || 'Unbekannter Händler',
          merchantLogo: card.customers?.logo_url,
          currentPoints: card.current_points || 0,
          stampsRequired: card.customers?.stamps_required,
          rewardText: card.customers?.stamp_reward_text,
        }));

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
      <MainLayout title="Meine Stempelkarten" showBack>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Meine Stempelkarten" showBack>
      <div className="space-y-4">
        {cards.length === 0 ? (
          <Card className="p-8 text-center">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Keine Stempelkarten</h3>
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
                    {card.stampsRequired && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Gift className="h-3 w-3" />
                        <span>
                          {card.currentPoints >= card.stampsRequired
                            ? 'Prämie verfügbar!'
                            : `Noch ${card.stampsRequired - card.currentPoints} bis zur Prämie`}
                        </span>
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
