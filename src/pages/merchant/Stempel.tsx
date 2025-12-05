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

      const { data: chips } = await supabase
        .from('nfc_chips')
        .select('*')
        .eq('merchant_customer_id', assignment.customer_id)
        .order('created_at', { ascending: true });

      if (chips) {
        setNfcChips(chips);
      }

      const { data: boxes } = await supabase
        .from('customer_boxes')
        .select(`
          id,
          box_id,
          assigned_at,
          boxes:box_id (box_id, stamp_preset)
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

        if (boxes.length > 0 && (!chips || chips.length === 0)) {
          const firstBox = boxes[0] as any;
          const preset = firstBox.boxes?.stamp_preset || 'standard_3';
          await createDefaultStamps(preset, assignment.customer_id);
          const { data: newChips } = await supabase
            .from('nfc_chips')
            .select('*')
            .eq('merchant_customer_id', assignment.customer_id)
            .order('created_at', { ascending: true });
          if (newChips) {
            setNfcChips(newChips);
          }
        }
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
    const clean = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const parts = [];
    for (let i = 0; i < clean.length && i < 15; i += 5) {
      parts.push(clean.slice(i, i + 5));
    }
    return parts.join('-');
  };

  const handleBoxIdInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewBoxId(formatBoxIdInput(e.target.value));
  };

  const createDefaultStamps = async (boxPreset: string, merchantCustomerId: string) => {
    const stampConfigs: { stamp_name: string; stamp_color: string; points_value: number }[] = [];
    
    if (boxPreset === 'standard_3') {
      stampConfigs.push(
        { stamp_name: 'Stempel 1', stamp_color: 'grün', points_value: 1 },
        { stamp_name: 'Stempel 2', stamp_color: 'blau', points_value: 1 },
        { stamp_name: 'Stempel 3', stamp_color: 'rot', points_value: 1 }
      );
    } else if (boxPreset === 'standard_5') {
      stampConfigs.push(
        { stamp_name: 'Stempel 1', stamp_color: 'grün', points_value: 1 },
        { stamp_name: 'Stempel 2', stamp_color: 'blau', points_value: 1 },
        { stamp_name: 'Stempel 3', stamp_color: 'rot', points_value: 1 },
        { stamp_name: 'Stempel 4', stamp_color: 'gelb', points_value: 1 },
        { stamp_name: 'Stempel 5', stamp_color: 'lila', points_value: 1 }
      );
    }

    for (let i = 0; i < stampConfigs.length; i++) {
      const config = stampConfigs[i];
      const chipUid = `${merchantCustomerId.substring(0, 8)}-${i + 1}`;
      
      await supabase
        .from('nfc_chips')
        .insert({
          merchant_customer_id: merchantCustomerId,
          chip_uid: chipUid,
          stamp_name: config.stamp_name,
          stamp_color: config.stamp_color,
          points_value: config.points_value,
          is_active: true,
          is_default: i === 0
        });
    }
  };

  const handleAddBox = async () => {
    if (!customerId || !newBoxId.trim()) return;

    const boxIdPattern = /^[A-Za-z0-9]{5}-[A-Za-z0-9]{5}-[A-Za-z0-9]{5}$/;
    if (!boxIdPattern.test(newBoxId.trim())) {
      toast.error('Ungültiges Format. Bitte verwenden Sie: XXXXX-XXXXX-XXXXX');
      return;
    }

    setAddingBox(true);
    try {
      const { data: boxData, error: boxError } = await supabase
        .from('boxes')
        .select('id, box_id, stamp_preset')
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

      const { count: otherCount } = await supabase
        .from('customer_boxes')
        .select('id', { count: 'exact', head: true })
        .eq('box_id', boxData.id);

      if (otherCount && otherCount > 0) {
        toast.error('Diese Box-ID ist bereits einem anderen Kunden zugewiesen.');
        return;
      }

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

      await createDefaultStamps(boxData.stamp_preset || 'standard_3', customerId);

      toast.success('Box-ID erfolgreich hinzugefügt! Stempel wurden automatisch erstellt.');
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!customerId) {
    return (
      <div className="min-h-screen bg-white p-6 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="rounded-2xl shadow-sm border-0 bg-gray-50">
            <CardContent className="p-8 text-center text-muted-foreground">
              Kein Händlerprofil gefunden.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-6 sm:p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stempelverwaltung</h1>
          <p className="text-gray-500 mt-1">Verwalten Sie Ihre NFC-Stempel und Box-IDs</p>
        </div>

        {/* Box IDs */}
        <Card className="rounded-2xl shadow-sm border-0 bg-gray-50/80">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              Box-IDs
            </CardTitle>
            <CardDescription className="text-gray-500">
              Die Box-ID finden Sie auf der Innenseite des Deckels Ihrer Starterbox
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {customerBoxes.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">Verknüpfte Boxen</Label>
                {customerBoxes.map((box) => (
                  <div key={box.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
                    <code className="font-mono text-sm font-semibold text-gray-900">{box.box_code}</code>
                    <span className="text-xs text-gray-500">
                      Hinzugefügt: {new Date(box.assigned_at).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Neue Box-ID hinzufügen</Label>
              <div className="flex gap-3">
                <Input
                  value={newBoxId}
                  onChange={handleBoxIdInputChange}
                  placeholder="XXXXX-XXXXX-XXXXX"
                  className="font-mono rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
                  maxLength={17}
                />
                <Button 
                  onClick={handleAddBox} 
                  disabled={addingBox || !newBoxId.trim()}
                  className="rounded-xl px-4"
                >
                  {addingBox ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Format: XXXXX-XXXXX-XXXXX (15 Zeichen mit Bindestrichen)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* NFC Chips / Stamps */}
        <Card className="rounded-2xl shadow-sm border-0 bg-gray-50/80">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <span className="text-lg">🔖</span>
              </div>
              Stempelfarben & Punkte
            </CardTitle>
            <CardDescription className="text-gray-500">
              Konfigurieren Sie, wie viele Punkte jede Stempelfarbe vergibt
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {nfcChips.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Noch keine Stempel konfiguriert. Stempel werden automatisch hinzugefügt, wenn Sie eine Box-ID verknüpfen.
              </p>
            ) : (
              <>
                {nfcChips.map((chip) => (
                  <div key={chip.id} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100">
                    <div className={`h-10 w-10 rounded-full ${getColorBadge(chip.stamp_color)} shadow-sm`} />
                    
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">Name</Label>
                        <Input
                          value={chip.stamp_name || ''}
                          onChange={(e) => handleChipChange(chip.id, 'stamp_name', e.target.value)}
                          placeholder="z.B. Standard"
                          className="h-9 rounded-lg border-gray-200"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Farbe</Label>
                        <Input
                          value={chip.stamp_color || ''}
                          onChange={(e) => handleChipChange(chip.id, 'stamp_color', e.target.value)}
                          placeholder="z.B. grün"
                          className="h-9 rounded-lg border-gray-200"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Punkte</Label>
                        <Input
                          type="number"
                          min="1"
                          value={chip.points_value || 1}
                          onChange={(e) => handleChipChange(chip.id, 'points_value', parseInt(e.target.value) || 1)}
                          className="h-9 rounded-lg border-gray-200"
                        />
                      </div>
                    </div>
                    
                    <Badge 
                      variant={chip.is_active ? "default" : "secondary"}
                      className="rounded-full"
                    >
                      {chip.is_active ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </div>
                ))}
                
                <Button 
                  onClick={handleSaveChips} 
                  disabled={saving} 
                  className="w-full sm:w-auto rounded-xl"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Stempel speichern
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Stempel;