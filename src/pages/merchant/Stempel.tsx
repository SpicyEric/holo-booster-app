import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Plus, Trash2, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NfcChip {
  id: string;
  chip_uid: string;
  stamp_name: string | null;
  stamp_color: string | null;
  points_value: number | null;
  is_active: boolean | null;
  is_default: boolean | null;
}

interface CustomerBox {
  id: string;
  box_id: string;
  assigned_at: string;
}

const Stempel = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [nfcChips, setNfcChips] = useState<NfcChip[]>([]);
  const [customerBoxes, setCustomerBoxes] = useState<CustomerBox[]>([]);
  const [newBoxId, setNewBoxId] = useState('');
  const [addingBox, setAddingBox] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get merchant assignment
      const { data: assignment } = await supabase
        .from('merchant_assignments')
        .select('customer_id')
        .eq('merchant_user_id', user.id)
        .single();

      if (!assignment) {
        setLoading(false);
        return;
      }

      setCustomerId(assignment.customer_id);

      // Load NFC chips
      const { data: chips } = await supabase
        .from('nfc_chips')
        .select('*')
        .eq('merchant_customer_id', assignment.customer_id)
        .order('created_at', { ascending: true });

      if (chips) {
        setNfcChips(chips);
      }

      // Load customer boxes
      const { data: boxes } = await supabase
        .from('customer_boxes')
        .select('id, box_id, assigned_at')
        .eq('customer_id', assignment.customer_id)
        .order('assigned_at', { ascending: false });

      if (boxes) {
        setCustomerBoxes(boxes);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleChipChange = (chipId: string, field: keyof NfcChip, value: any) => {
    setNfcChips(chips => 
      chips.map(chip => 
        chip.id === chipId ? { ...chip, [field]: value } : chip
      )
    );
  };

  const handleSaveChips = async () => {
    if (!customerId) return;
    
    setSaving(true);
    try {
      for (const chip of nfcChips) {
        const { error } = await supabase
          .from('nfc_chips')
          .update({
            stamp_name: chip.stamp_name,
            stamp_color: chip.stamp_color,
            points_value: chip.points_value,
            is_active: chip.is_active
          })
          .eq('id', chip.id);

        if (error) throw error;
      }
      toast.success('Stempel gespeichert');
    } catch (error) {
      console.error('Error saving chips:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleAddBox = async () => {
    if (!customerId || !newBoxId.trim()) return;

    // Validate format XXXXX-XXXXX-XXXXX
    const boxIdPattern = /^[A-Za-z0-9]{5}-[A-Za-z0-9]{5}-[A-Za-z0-9]{5}$/;
    if (!boxIdPattern.test(newBoxId.trim())) {
      toast.error('Ungültiges Format. Bitte verwenden Sie: XXXXX-XXXXX-XXXXX');
      return;
    }

    setAddingBox(true);
    try {
      // Check if box exists in registry
      const { data: boxExists } = await supabase
        .from('boxes')
        .select('id')
        .eq('box_id', newBoxId.trim().toUpperCase())
        .single();

      if (!boxExists) {
        toast.error('Diese Box-ID existiert nicht im System');
        return;
      }

      // Check if already assigned
      const { data: alreadyAssigned } = await supabase
        .from('customer_boxes')
        .select('id')
        .eq('box_id', boxExists.id)
        .single();

      if (alreadyAssigned) {
        toast.error('Diese Box-ID ist bereits einem Kunden zugewiesen');
        return;
      }

      // Assign box
      const { error } = await supabase
        .from('customer_boxes')
        .insert({
          customer_id: customerId,
          box_id: boxExists.id
        });

      if (error) throw error;

      toast.success('Box-ID hinzugefügt');
      setNewBoxId('');
      loadData();
    } catch (error) {
      console.error('Error adding box:', error);
      toast.error('Fehler beim Hinzufügen der Box-ID');
    } finally {
      setAddingBox(false);
    }
  };

  const getColorBadge = (color: string | null) => {
    const colorMap: Record<string, string> = {
      'grün': 'bg-green-500',
      'green': 'bg-green-500',
      'blau': 'bg-blue-500',
      'blue': 'bg-blue-500',
      'rot': 'bg-red-500',
      'red': 'bg-red-500',
      'gelb': 'bg-yellow-500',
      'yellow': 'bg-yellow-500',
      'lila': 'bg-purple-500',
      'purple': 'bg-purple-500',
    };
    return colorMap[color?.toLowerCase() || ''] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!customerId) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Kein Händlerprofil gefunden.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Stempelverwaltung</h1>
        <p className="text-muted-foreground">Verwalten Sie Ihre NFC-Stempel und Box-IDs</p>
      </div>

      {/* NFC Chips / Stamps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg">🔖</span>
            </div>
            Stempelfarben & Punkte
          </CardTitle>
          <CardDescription>
            Konfigurieren Sie, wie viele Punkte jede Stempelfarbe vergibt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {nfcChips.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Noch keine Stempel konfiguriert. Stempel werden automatisch hinzugefügt, wenn Sie eine Box-ID verknüpfen.
            </p>
          ) : (
            <>
              {nfcChips.map((chip) => (
                <div key={chip.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className={`h-10 w-10 rounded-full ${getColorBadge(chip.stamp_color)}`} />
                  
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={chip.stamp_name || ''}
                        onChange={(e) => handleChipChange(chip.id, 'stamp_name', e.target.value)}
                        placeholder="z.B. Standard"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Farbe</Label>
                      <Input
                        value={chip.stamp_color || ''}
                        onChange={(e) => handleChipChange(chip.id, 'stamp_color', e.target.value)}
                        placeholder="z.B. grün"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Punkte</Label>
                      <Input
                        type="number"
                        min="1"
                        value={chip.points_value || 1}
                        onChange={(e) => handleChipChange(chip.id, 'points_value', parseInt(e.target.value) || 1)}
                        className="h-9"
                      />
                    </div>
                  </div>
                  
                  <Badge variant={chip.is_active ? "default" : "secondary"}>
                    {chip.is_active ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </div>
              ))}
              
              <Button onClick={handleSaveChips} disabled={saving} className="w-full sm:w-auto">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Stempel speichern
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Box IDs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Box-IDs
          </CardTitle>
          <CardDescription>
            Die Box-ID finden Sie auf der Innenseite des Deckels Ihrer Starterbox
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {customerBoxes.length > 0 && (
            <div className="space-y-2">
              {customerBoxes.map((box) => (
                <div key={box.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                  <code className="font-mono text-sm">{box.box_id}</code>
                  <span className="text-xs text-muted-foreground">
                    Hinzugefügt: {new Date(box.assigned_at).toLocaleDateString('de-DE')}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={newBoxId}
              onChange={(e) => setNewBoxId(e.target.value.toUpperCase())}
              placeholder="XXXXX-XXXXX-XXXXX"
              className="font-mono"
              maxLength={17}
            />
            <Button onClick={handleAddBox} disabled={addingBox || !newBoxId.trim()}>
              {addingBox ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Format: XXXXX-XXXXX-XXXXX (15 Zeichen mit Bindestrichen)
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Stempel;
