import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function PartnerNewLead() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    shop_name: '',
    contact_person: '',
    phone: '',
    email: '',
    street: '',
    house_number: '',
    postal_code: '',
    city: '',
    industry: '',
    priority: 'normal',
    notes: '',
  });

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !form.shop_name.trim()) {
      toast.error('Shopname ist erforderlich');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('sales_leads')
        .insert({
          partner_user_id: user.id,
          shop_name: form.shop_name.trim(),
          contact_person: form.contact_person || null,
          phone: form.phone || null,
          email: form.email || null,
          street: form.street || null,
          house_number: form.house_number || null,
          postal_code: form.postal_code || null,
          city: form.city || null,
          industry: form.industry || null,
          priority: form.priority,
          notes: form.notes || null,
          status: 'new',
        });

      if (error) throw error;

      toast.success('Lead erfolgreich erstellt!');
      navigate('/partner/leads');
    } catch (err: any) {
      console.error('Error:', err);
      toast.error('Fehler beim Erstellen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/partner/leads')}>
        <ArrowLeft className="w-4 h-4 mr-1" />
        Zurück
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Neuen Lead erstellen</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Shopname *</Label>
              <Input value={form.shop_name} onChange={(e) => update('shop_name', e.target.value)} placeholder="z.B. Café Milano" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ansprechpartner</Label>
                <Input value={form.contact_person} onChange={(e) => update('contact_person', e.target.value)} placeholder="Max Mustermann" />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+49 123 456789" />
              </div>
            </div>

            <div>
              <Label>E-Mail</Label>
              <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="info@cafe-milano.de" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label>Straße</Label>
                <Input value={form.street} onChange={(e) => update('street', e.target.value)} />
              </div>
              <div>
                <Label>Hausnr.</Label>
                <Input value={form.house_number} onChange={(e) => update('house_number', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>PLZ</Label>
                <Input value={form.postal_code} onChange={(e) => update('postal_code', e.target.value)} />
              </div>
              <div>
                <Label>Stadt</Label>
                <Input value={form.city} onChange={(e) => update('city', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Branche</Label>
                <Input value={form.industry} onChange={(e) => update('industry', e.target.value)} placeholder="z.B. Gastronomie" />
              </div>
              <div>
                <Label>Priorität</Label>
                <Select value={form.priority} onValueChange={(v) => update('priority', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Niedrig</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Hoch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notizen</Label>
              <Textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Erste Eindrücke, nächste Schritte..." rows={3} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate('/partner/leads')}>Abbrechen</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Lead erstellen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
