import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Package, Loader2, CheckCircle2, Clock, Truck, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OrderWithProfile {
  id: string;
  vertriebler_id: string;
  paket_typ: string;
  anzahl_boxen: number;
  bestelldatum: string;
  status: string;
  notizen: string | null;
  vertriebler_name?: string;
  vertriebler_email?: string;
}

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  offen: { label: 'Offen', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  versendet: { label: 'Versendet', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  abgeschlossen: { label: 'Abgeschlossen', color: 'bg-green-100 text-green-800 border-green-200' },
};

export default function BoxOrders() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderWithProfile[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithProfile | null>(null);
  const [boxIdInputs, setBoxIdInputs] = useState<string[]>([]);
  const [validating, setValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<Record<number, boolean | null>>({});
  const [shipping, setShipping] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data: pakete, error } = await supabase
        .from('box_pakete')
        .select('*')
        .order('bestelldatum', { ascending: false });
      if (error) throw error;

      // Get profiles for vertriebler names
      if (pakete && pakete.length > 0) {
        const userIds = [...new Set(pakete.map(p => p.vertriebler_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, first_name, last_name')
          .in('user_id', userIds);

        const profileMap = new Map((profiles || []).map(p => [
          p.user_id,
          p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unbekannt'
        ]));

        // Get emails
        const { data: emailData } = await supabase.functions.invoke('getUserEmails', {
          body: { userIds },
        });

        const emailsObj = emailData?.emails || {};
        const emailMap = new Map(Object.entries(emailsObj));

        const enriched: OrderWithProfile[] = pakete.map(p => ({
          ...p,
          vertriebler_name: profileMap.get(p.vertriebler_id) || 'Unbekannt',
          vertriebler_email: (emailMap.get(p.vertriebler_id) as string) || '',
        }));
        setOrders(enriched);
      } else {
        setOrders([]);
      }
    } catch (e) {
      console.error(e);
      toast.error('Fehler beim Laden der Bestellungen');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  const openOrder = (order: OrderWithProfile) => {
    setSelectedOrder(order);
    setBoxIdInputs(Array(order.anzahl_boxen).fill(''));
    setValidationResults({});
  };

  const validateBoxId = async (index: number, value: string) => {
    const newInputs = [...boxIdInputs];
    newInputs[index] = value.toUpperCase();
    setBoxIdInputs(newInputs);

    if (value.trim().length < 3) {
      setValidationResults(prev => ({ ...prev, [index]: null }));
      return;
    }

    const { data } = await supabase
      .from('eloyo_boxes')
      .select('id, status')
      .eq('box_id', value.trim().toUpperCase())
      .maybeSingle();

    setValidationResults(prev => ({
      ...prev,
      [index]: data?.status === 'verfuegbar' ? true : false,
    }));
  };

  const allValid = boxIdInputs.every((v, i) => v.trim() !== '' && validationResults[i] === true);
  const hasDuplicates = new Set(boxIdInputs.filter(v => v.trim())).size !== boxIdInputs.filter(v => v.trim()).length;

  const handleShip = async () => {
    if (!selectedOrder || !allValid || hasDuplicates) return;
    setShipping(true);
    try {
      const now = new Date().toISOString();
      const frist = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

      // Update each box
      for (const boxId of boxIdInputs) {
        const { error } = await supabase
          .from('eloyo_boxes')
          .update({
            status: 'versendet',
            paket_id: selectedOrder.id,
            vertriebler_id: selectedOrder.vertriebler_id,
            bestelldatum: selectedOrder.bestelldatum,
            versanddatum: now,
            frist_ablauf: frist,
          })
          .eq('box_id', boxId.trim().toUpperCase());
        if (error) throw error;
      }

      // Update paket status
      const { error: paketError } = await supabase
        .from('box_pakete')
        .update({ status: 'versendet' })
        .eq('id', selectedOrder.id);
      if (paketError) throw paketError;

      toast.success('Bestellung als versendet markiert');
      setSelectedOrder(null);
      loadOrders();
    } catch (e: any) {
      toast.error(e.message || 'Fehler beim Versenden');
    } finally {
      setShipping(false);
    }
  };

  const filteredOrders = filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><Package className="w-5 h-5" /> Bestellungen</h1>
          <p className="text-xs text-muted-foreground">Box-Pakete der Vertriebspartner verwalten</p>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="offen">Offen</SelectItem>
            <SelectItem value="versendet">Versendet</SelectItem>
            <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filteredOrders.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Keine Bestellungen vorhanden</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map(order => {
            const sb = STATUS_BADGES[order.status] || STATUS_BADGES.offen;
            return (
              <Card key={order.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => order.status === 'offen' ? openOrder(order) : null}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{order.vertriebler_name}</span>
                      <Badge className={`${sb.color} border text-[10px]`}>{sb.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {order.paket_typ === 'starter' ? 'Starterpaket' : 'Vertriebspaket'} · {order.anzahl_boxen} Boxen ·{' '}
                      {new Date(order.bestelldatum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {order.status === 'offen' && (
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openOrder(order); }}>
                      <Truck className="w-3.5 h-3.5 mr-1" />
                      Versenden
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Ship Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bestellung versenden</DialogTitle>
            <DialogDescription>
              {selectedOrder?.vertriebler_name} — {selectedOrder?.paket_typ === 'starter' ? 'Starterpaket' : 'Vertriebspaket'} ({selectedOrder?.anzahl_boxen} Boxen)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {boxIdInputs.map((val, i) => (
              <div key={i} className="space-y-1">
                <Label className="text-xs">Box-ID {i + 1}</Label>
                <div className="relative">
                  <Input
                    value={val}
                    onChange={e => validateBoxId(i, e.target.value)}
                    placeholder="z.B. A3K7M"
                    className={`font-mono pr-8 ${validationResults[i] === true ? 'border-green-500' : validationResults[i] === false ? 'border-red-500' : ''}`}
                  />
                  {validationResults[i] === true && <CheckCircle2 className="w-4 h-4 text-green-500 absolute right-2.5 top-1/2 -translate-y-1/2" />}
                  {validationResults[i] === false && <span className="text-red-500 text-xs absolute right-2.5 top-1/2 -translate-y-1/2">✕</span>}
                </div>
                {validationResults[i] === false && (
                  <p className="text-xs text-red-500">Box-ID nicht gefunden oder nicht verfügbar</p>
                )}
              </div>
            ))}
            {hasDuplicates && (
              <p className="text-xs text-red-500">Duplikate erkannt — jede Box-ID darf nur einmal verwendet werden</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOrder(null)}>Abbrechen</Button>
            <Button onClick={handleShip} disabled={!allValid || hasDuplicates || shipping}>
              {shipping ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Truck className="w-4 h-4 mr-2" />}
              Als versendet markieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
