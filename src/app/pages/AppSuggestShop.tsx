import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/app/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Store, CheckCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AppSuggestShop() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [shopName, setShopName] = useState('');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [contactPerson, setContactPerson] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !shopName.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('shop_suggestions')
        .insert({
          user_id: user.id,
          shop_name: shopName.trim(),
          street: street.trim() || null,
          house_number: houseNumber.trim() || null,
          postal_code: postalCode.trim() || null,
          city: city.trim() || null,
          contact_person: contactPerson.trim() || null,
        });

      if (error) throw error;

      setSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting suggestion:', error);
      toast.error('Fehler beim Absenden. Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <MainLayout title="Shop vorschlagen" showBack>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Vielen Dank!
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xs">
            Dein Vorschlag wurde erfolgreich übermittelt. Wir werden uns den Laden anschauen!
          </p>
          <Button
            onClick={() => navigate('/app')}
            className="bg-gradient-to-r from-primary to-secondary"
          >
            Zurück zur Startseite
          </Button>
        </motion.div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Shop vorschlagen" showBack>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <Store className="h-7 w-7 text-primary" />
            </div>
            <CardTitle>Neuen Shop vorschlagen</CardTitle>
            <CardDescription>
              Dir fehlt dein Lieblingsladen bei Eloyo? Schlage ihn hier vor und wir kontaktieren das Geschäft!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shopName">Name des Ladens *</Label>
                <Input
                  id="shopName"
                  placeholder="z.B. Café Sonnenschein"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="street">Straße</Label>
                  <Input
                    id="street"
                    placeholder="Musterstraße"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="houseNumber">Nr.</Label>
                  <Input
                    id="houseNumber"
                    placeholder="12"
                    value={houseNumber}
                    onChange={(e) => setHouseNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="postalCode">PLZ</Label>
                  <Input
                    id="postalCode"
                    placeholder="12345"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Stadt</Label>
                  <Input
                    id="city"
                    placeholder="Berlin"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPerson">Ansprechpartner (optional)</Label>
                <Input
                  id="contactPerson"
                  placeholder="Kennst du jemanden aus dem Geschäft?"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Wenn du den Inhaber oder einen Mitarbeiter kennst, schreibe hier den Namen.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-secondary"
                disabled={loading || !shopName.trim()}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Vorschlag absenden
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

export { AppSuggestShop };
