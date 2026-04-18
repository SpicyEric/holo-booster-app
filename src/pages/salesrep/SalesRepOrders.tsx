import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle, Clock, CheckCircle2, RotateCcw, FileWarning, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface BoxPaket {
  id: string;
  paket_typ: string;
  anzahl_boxen: number;
  bestelldatum: string;
  status: string;
  notizen: string | null;
}

interface EloyoBox {
  id: string;
  box_id: string;
  status: string;
  versanddatum: string | null;
  frist_ablauf: string | null;
  haendler_id: string | null;
  abschlussdatum: string | null;
  retour_datum: string | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  offen: { label: 'Offen', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
  versendet: { label: 'Versendet', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Package },
  abgeschlossen: { label: 'Abgeschlossen', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
  retourniert: { label: 'Retourniert', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: RotateCcw },
  in_rechnung_gestellt: { label: 'In Rechnung gestellt', color: 'bg-red-100 text-red-800 border-red-200', icon: FileWarning },
};

function getDaysRemaining(fristAblauf: string | null): number | null {
  if (!fristAblauf) return null;
  const diff = new Date(fristAblauf).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function SalesRepOrders() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [activeCustomerCount, setActiveCustomerCount] = useState(0);
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [orders, setOrders] = useState<BoxPaket[]>([]);
  const [orderBoxes, setOrderBoxes] = useState<Record<string, EloyoBox[]>>({});
  const [confirmModal, setConfirmModal] = useState<'starter' | 'vertrieb' | null>(null);
  const [vertragOutdated, setVertragOutdated] = useState(false);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Vertrag-Outdated check
      const { data: prof } = await (supabase
        .from('sales_rep_profiles') as any)
        .select('vertrag_outdated')
        .eq('user_id', user.id)
        .maybeSingle();
      setVertragOutdated(!!prof?.vertrag_outdated);

      // Active customer count
      const { count: activeCount } = await supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('promoter_id', user.id)
        .eq('active', true);
      setActiveCustomerCount(activeCount || 0);

      // Check for active orders
      const { data: activePakete } = await supabase
        .from('box_pakete')
        .select('id')
        .eq('vertriebler_id', user.id)
        .in('status', ['offen', 'versendet']);

      const { data: activeBoxes } = await supabase
        .from('eloyo_boxes')
        .select('id')
        .eq('vertriebler_id', user.id)
        .eq('status', 'versendet');

      setHasActiveOrder((activePakete?.length || 0) > 0 || (activeBoxes?.length || 0) > 0);

      // All orders
      const { data: pakete } = await supabase
        .from('box_pakete')
        .select('*')
        .eq('vertriebler_id', user.id)
        .order('bestelldatum', { ascending: false });
      setOrders(pakete || []);

      // Boxes per order
      if (pakete && pakete.length > 0) {
        const paketIds = pakete.map(p => p.id);
        const { data: boxes } = await supabase
          .from('eloyo_boxes')
          .select('id, box_id, status, versanddatum, frist_ablauf, haendler_id, abschlussdatum, retour_datum, paket_id')
          .in('paket_id', paketIds);

        const grouped: Record<string, EloyoBox[]> = {};
        (boxes || []).forEach((b: any) => {
          if (!grouped[b.paket_id]) grouped[b.paket_id] = [];
          grouped[b.paket_id].push(b);
        });
        setOrderBoxes(grouped);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const handleOrder = async (typ: 'starter' | 'vertrieb') => {
    if (!user) return;
    if (vertragOutdated) {
      toast.error('Bitte nimm zuerst die neue Vertragsversion an, bevor du Boxen bestellst.');
      setConfirmModal(null);
      return;
    }
    setOrdering(true);
    try {
      const anzahl = typ === 'starter' ? 4 : 7;
      const { error } = await supabase.from('box_pakete').insert({
        vertriebler_id: user.id,
        paket_typ: typ,
        anzahl_boxen: anzahl,
        status: 'offen',
      });
      if (error) throw error;
      toast.success('Bestellung erfolgreich aufgegeben');
      setConfirmModal(null);
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Fehler bei der Bestellung');
    } finally {
      setOrdering(false);
    }
  };

  const canOrderVertrieb = activeCustomerCount >= 4;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bestellung</h1>
        <p className="text-sm text-muted-foreground">Bestelle eloyo Boxen für deinen Vertrieb.</p>
      </div>

      {vertragOutdated && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">
              Bestellungen sind gesperrt — bitte nimm zuerst die neue Vertragsversion an.
            </p>
            <Button variant="destructive" size="sm" className="mt-3" onClick={() => window.location.assign('/vertriebler/mein-vertrag')}>
              Zum Vertrag →
            </Button>
          </div>
        </div>
      )}

      {/* Products */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Starterpaket */}
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Starterpaket</CardTitle>
              <Badge variant="secondary">4 Boxen</Badge>
            </div>
            <CardDescription>4 eloyo Boxen für den Einstieg</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold">120,00 €</div>
            <p className="text-xs text-muted-foreground">Warenwert: 4 × 30,00 € inkl. MwSt.</p>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                Du zahlst nur für Boxen, die du innerhalb von 90 Tagen weder abgeschlossen noch zurückgesendet hast.
              </p>
            </div>
            <Button
              className="w-full"
              disabled={hasActiveOrder}
              onClick={() => setConfirmModal('starter')}
            >
              {hasActiveOrder ? 'Aktive Bestellung vorhanden' : 'Bestellen'}
            </Button>
            {hasActiveOrder && (
              <p className="text-xs text-center text-muted-foreground">Du hast bereits eine aktive Bestellung</p>
            )}
          </CardContent>
        </Card>

        {/* Vertriebspaket */}
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Vertriebspaket</CardTitle>
              <Badge variant="secondary">7 Boxen</Badge>
            </div>
            <CardDescription>7 eloyo Boxen für erfahrene Vertriebspartner</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold">210,00 €</div>
            <p className="text-xs text-muted-foreground">Warenwert: 7 × 30,00 € inkl. MwSt.</p>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                Du zahlst nur für Boxen, die du innerhalb von 90 Tagen weder abgeschlossen noch zurückgesendet hast.
              </p>
            </div>
            {!canOrderVertrieb && !hasActiveOrder && (
              <Badge variant="outline" className="w-full justify-center py-1.5 text-xs">
                Verfügbar ab 4 aktiven Kunden ({activeCustomerCount}/4)
              </Badge>
            )}
            <Button
              className="w-full"
              disabled={hasActiveOrder || !canOrderVertrieb}
              onClick={() => setConfirmModal('vertrieb')}
            >
              {hasActiveOrder ? 'Aktive Bestellung vorhanden' : !canOrderVertrieb ? 'Noch nicht verfügbar' : 'Bestellen'}
            </Button>
            {hasActiveOrder && (
              <p className="text-xs text-center text-muted-foreground">Du hast bereits eine aktive Bestellung</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Orders */}
      {orders.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Meine Bestellungen</h2>
          {orders.map(order => {
            const boxes = orderBoxes[order.id] || [];
            const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS.offen;
            const StatusIcon = statusInfo.icon;
            return (
              <Card key={order.id}>
                <CardContent className="pt-5 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-semibold">
                        {order.paket_typ === 'starter' ? 'Starterpaket' : 'Vertriebspaket'}
                        <span className="text-muted-foreground font-normal ml-2">({order.anzahl_boxen} Boxen)</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Bestellt am {new Date(order.bestelldatum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <Badge className={`${statusInfo.color} border gap-1`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusInfo.label}
                    </Badge>
                  </div>

                  {boxes.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Box-IDs</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {boxes.map(box => {
                          const days = getDaysRemaining(box.frist_ablauf);
                          const boxStatus = STATUS_LABELS[box.status] || STATUS_LABELS.versendet;
                          const BoxIcon = boxStatus.icon;
                          const isUrgent = days !== null && days <= 14 && box.status === 'versendet';
                          const isExpired = days !== null && days <= 0 && box.status === 'versendet';
                          return (
                            <div key={box.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                              <div className="flex items-center gap-2">
                                <code className="text-xs font-mono font-semibold">{box.box_id}</code>
                                <Badge variant="outline" className={`text-[10px] ${boxStatus.color} border gap-0.5`}>
                                  <BoxIcon className="w-2.5 h-2.5" />
                                  {boxStatus.label}
                                </Badge>
                              </div>
                              {days !== null && box.status === 'versendet' && (
                                <span className={`text-xs font-medium ${isExpired ? 'text-red-600 line-through' : isUrgent ? 'text-red-600' : 'text-muted-foreground'}`}>
                                  {isExpired ? 'Abgelaufen' : `Noch ${days} Tag${days !== 1 ? 'e' : ''}`}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      <Dialog open={!!confirmModal} onOpenChange={() => setConfirmModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Verbindliche Bestellung
            </DialogTitle>
            <DialogDescription className="text-left pt-2 space-y-3">
              <p>
                Ab dem Versanddatum läuft ein <strong>90-Tage-Timer</strong> für jede eloyo Box.
              </p>
              <p>
                Jede Box muss innerhalb dieser 90 Tage einem Kunden zugewiesen oder unversehrt zurückgesendet werden.
              </p>
              <p>
                Nicht abgeschlossene und nicht retournierte Boxen werden mit je <strong>30,00 €</strong> in Rechnung gestellt.
              </p>
              <p className="font-semibold text-foreground">Diese Bestellung ist verbindlich.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmModal(null)}>Abbrechen</Button>
            <Button onClick={() => confirmModal && handleOrder(confirmModal)} disabled={ordering}>
              {ordering ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Jetzt verbindlich bestellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
