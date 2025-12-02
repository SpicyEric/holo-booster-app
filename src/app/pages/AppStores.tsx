import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, Store } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MainLayout } from '@/app/components/layout/MainLayout';

interface StoreItem {
  id: string;
  name: string;
  company_name: string | null;
  logo_url: string | null;
  industry: string | null;
  city: string | null;
  street: string | null;
  postal_code: string | null;
}

export const AppStores = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('list');

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, company_name, logo_url, industry, city, street, postal_code')
        .eq('active', true)
        .limit(50);

      if (!error && data) {
        setStores(data);
      }
    } catch (err) {
      console.error('[AppStores] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.industry?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout title="Stores">
      <div className="space-y-4">
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">Liste</TabsTrigger>
            <TabsTrigger value="map">Karte</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            {loading ? (
              <Card className="p-6">
                <p className="text-muted-foreground text-center">Lädt...</p>
              </Card>
            ) : filteredStores.length > 0 ? (
              <div className="space-y-3">
                {filteredStores.map((store) => (
                  <Card
                    key={store.id}
                    className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/app/merchant/${store.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      {store.logo_url ? (
                        <img
                          src={store.logo_url}
                          alt={store.name}
                          className="w-14 h-14 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                          <span className="text-2xl font-bold text-primary-foreground">
                            {(store.company_name || store.name).charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{store.company_name || store.name}</h3>
                        <p className="text-sm text-muted-foreground">{store.industry || 'Geschäft'}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {store.city || 'Unbekannt'}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Store className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Keine Geschäfte gefunden</h3>
                <p className="text-muted-foreground text-sm">
                  Versuche einen anderen Suchbegriff.
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="map" className="mt-4">
            <Card className="p-8 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <MapPin className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Kartenansicht</h3>
              <p className="text-muted-foreground text-sm">
                Die Kartenansicht wird bald verfügbar sein.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default AppStores;
