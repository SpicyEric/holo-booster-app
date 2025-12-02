import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Plus, Package } from 'lucide-react';
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
  box_code: string;
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
        .maybeSingle();

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

      // Load customer boxes with the actual box code
      const { data: boxes } = await supabase
        .from('customer_boxes')
        .select(`
          id,
          box_id,
          assigned_at,
          boxes:box_id (box_id)
        `)
        .eq('customer_id', assignment.customer_id)
        .order('assigned_at', { ascending: false });

      if (boxes) {
        const mappedBoxes: CustomerBox[] = boxes.map((b: any) => ({
          id: b.id,
          box_id: b.box_id,
          box_code: b.boxes?.box_id || 'Unbekannt',
          assigned_at: b.assigned_at
        }));
        setCustomerBoxes(mappedBoxes);
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

  const formatBoxIdInput = (value: string) => {
    // Remove all non-alphanumeric characters and convert to uppercase
    const clean = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    // Insert dashes every 5 characters
    const parts = [];
    for (let i = 0; i < clean.length && i < 15; i += 5) {
      parts.push(clean.slice(i, i + 5));
    }
    return parts.join('-');
  };

  const handleBoxIdInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewBoxId(formatBoxIdInput(e.target.value));
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
      const { data: boxData, error: boxError } = await supabase
        .from('boxes')
        .select('id, box_id')
        .eq('box_id', newBoxId.trim().toUpperCase())
        .maybeSingle();

      if (boxError) {
        console.error('Error checking box:', boxError);
        toast.error('Fehler beim Überprüfen der Box-ID');
        return;
      }

      if (!boxData) {
        toast.error('Diese Box-ID existiert nicht im System. Bitte überprüfen Sie die Eingabe.');
        return;
      }

      // Check if already assigned to this customer
      const { data: ownAssignment } = await supabase
        .from('customer_boxes')
        .select('id')
        .eq('customer_id', customerId)
        .eq('box_id', boxData.id)
        .maybeSingle();

      if (ownAssignment) {
        toast.error('Diese Box-ID ist bereits mit Ihrem Konto verknüpft.');
        return;
      }

      // Check if assigned to another customer (use admin policy via count)
      const { count: otherCount } = await supabase
        .from('customer_boxes')
        .select('id', { count: 'exact', head: true })
        .eq('box_id', boxData.id);

      if (otherCount && otherCount > 0) {
        toast.error('Diese Box-ID ist bereits einem anderen Kunden zugewiesen.');
        return;
      }

      // Assign box to customer
      const { error: insertError } = await supabase
        .from('customer_boxes')
        .insert({
          customer_id: customerId,
          box_id: boxData.id
        });

      if (insertError) {
        console.error('Error inserting box:', insertError);
        toast.error('Fehler beim Hinzufügen der Box-ID');
        return;
      }

      toast.success('Box-ID erfolgreich hinzugefügt!');
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

      {/* Box IDs - First since it's the main action */}
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
              <Label className="text-sm font-medium">Verknüpfte Boxen</Label>
              {customerBoxes.map((box) => (
                <div key={box.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                  <code className="font-mono text-sm font-semibold">{box.box_code}</code>
                  <span className="text-xs text-muted-foreground">
                    Hinzugefügt: {new Date(box.assigned_at).toLocaleDateString('de-DE')}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Neue Box-ID hinzufügen</Label>
            <div className="flex gap-2">
              <Input
                value={newBoxId}
                onChange={handleBoxIdInputChange}
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
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
};

export default Stempel;
