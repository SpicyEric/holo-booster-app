import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Merchant {
  id: string;
  name: string;
  company_name: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  city: string | null;
  industry: string | null;
}

interface UserStampCard {
  merchant_customer_id: string;
  current_points: number;
  customer: Merchant;
}

export const AppHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stampCards, setStampCards] = useState<UserStampCard[]>([]);
  const [nearbyMerchants, setNearbyMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    console.log('[AppHome] Loading data for user:', user?.id);
    
    try {
      // Load user's stamp cards
      const { data: cards, error: cardsError } = await supabase
        .from('user_stamp_cards')
        .select(`
          merchant_customer_id,
          current_points,
          customer:customers!merchant_customer_id (
            id, name, company_name, logo_url, cover_image_url, city, industry
          )
        `)
        .eq('user_id', user?.id);

      console.log('[AppHome] Stamp cards:', cards, 'Error:', cardsError);
      
      if (!cardsError && cards) {
        setStampCards(cards as unknown as UserStampCard[]);
      }

      // Load nearby/featured merchants
      const { data: merchants, error: merchantsError } = await supabase
        .from('customers')
        .select('id, name, company_name, logo_url, cover_image_url, city, industry')
        .eq('active', true)
        .limit(10);

      console.log('[AppHome] Merchants:', merchants?.length, 'Error:', merchantsError);
      
      if (!merchantsError && merchants) {
        setNearbyMerchants(merchants);
      }
    } catch (err) {
      console.error('[AppHome] Error loading app data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredMerchants = nearbyMerchants.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-foreground">Willkommen zurück!</h1>
        <p className="text-muted-foreground">Sammle Punkte bei deinen Lieblingsläden</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Geschäfte suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* My Stamp Cards */}
      {stampCards.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Meine Stempelkarten</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/app/rewards')}>
              Alle
            </Button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
            {stampCards.map((card) => (
              <Card 
                key={card.merchant_customer_id}
                className="min-w-[200px] snap-start cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/app/merchant/${card.merchant_customer_id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    {card.customer.logo_url ? (
                      <img 
                        src={card.customer.logo_url} 
                        alt={card.customer.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{card.customer.company_name || card.customer.name}</p>
                      <p className="text-sm text-muted-foreground">{card.customer.city}</p>
                    </div>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-2 text-center">
                    <span className="text-2xl font-bold text-primary">{card.current_points}</span>
                    <span className="text-sm text-muted-foreground ml-1">Punkte</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Nearby Merchants */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Geschäfte entdecken
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/discover')}>
            Karte
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredMerchants.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Keine Geschäfte gefunden
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredMerchants.map((merchant) => (
              <Card 
                key={merchant.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/app/merchant/${merchant.id}`)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  {merchant.logo_url ? (
                    <img 
                      src={merchant.logo_url} 
                      alt={merchant.name}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary-foreground">
                        {(merchant.company_name || merchant.name).charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{merchant.company_name || merchant.name}</h3>
                    <p className="text-sm text-muted-foreground">{merchant.industry || 'Geschäft'}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {merchant.city || 'Unbekannt'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AppHome;
