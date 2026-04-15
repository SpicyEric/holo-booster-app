import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Search, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BoxInfo {
  id: string;
  box_id: string;
  status: string;
  frist_ablauf: string | null;
  paket_id: string | null;
  vertriebler_name: string;
  haendler_name: string | null;
}

export default function BoxReturns() {
  const [searchId, setSearchId] = useState('');
  const [searching, setSearching] = useState(false);
  const [boxInfo, setBoxInfo] = useState<BoxInfo | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = async () => {
    if (!searchId.trim()) return;
    setSearching(true);
    setNotFound(false);
    setBoxInfo(null);
    try {
      const { data: box } = await supabase
        .from('eloyo_boxes')
        .select('id, box_id, status, frist_ablauf, paket_id, vertriebler_id, haendler_id')
        .eq('box_id', searchId.trim().toUpperCase())
        .maybeSingle();

      if (!box) {
        setNotFound(true);
        return;
      }

      let vertriebler_name = 'Unbekannt';
      if (box.vertriebler_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, first_name, last_name')
          .eq('user_id', box.vertriebler_id)
          .maybeSingle();
        if (profile) {
          vertriebler_name = profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Unbekannt';
        }
      }

      let haendler_name: string | null = null;
      if (box.haendler_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('name')
          .eq('id', box.haendler_id)
          .maybeSingle();
        haendler_name = customer?.name || null;
      }

      setBoxInfo({
        id: box.id,
        box_id: box.box_id,
        status: box.status,
        frist_ablauf: box.frist_ablauf,
        paket_id: box.paket_id,
        vertriebler_name,
        haendler_name,
      });
    } catch (e) {
      console.error(e);
      toast.error('Fehler bei der Suche');
    } finally {
      setSearching(false);
    }
  };

  const handleReturn = async () => {
    if (!boxInfo) return;
    setConfirming(true);
    try {
      const { error } = await supabase
        .from('eloyo_boxes')
        .update({ status: 'retourniert', retour_datum: new Date().toISOString() })
        .eq('id', boxInfo.id);
      if (error) throw error;

      // Check if all boxes in paket are done
      if (boxInfo.paket_id) {
        const { data: siblings } = await supabase
          .from('eloyo_boxes')
          .select('status')
          .eq('paket_id', boxInfo.paket_id);

        const allDone = (siblings || []).every(s => s.status === 'abgeschlossen' || s.status === 'retourniert');
        if (allDone) {
          await supabase.from('box_pakete').update({ status: 'abgeschlossen' }).eq('id', boxInfo.paket_id);
        }
      }

      toast.success(`Box ${boxInfo.box_id} als retourniert markiert`);
      setBoxInfo(null);
      setSearchId('');
    } catch (e: any) {
      toast.error(e.message || 'Fehler bei der Rücknahme');
    } finally {
      setConfirming(false);
    }
  };

  const STATUS_LABELS: Record<string, string> = {
    verfuegbar: 'Verfügbar',
    versendet: 'Versendet',
    abgeschlossen: 'Abgeschlossen',
    retourniert: 'Retourniert',
    in_rechnung_gestellt: 'In Rechnung gestellt',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2"><RotateCcw className="w-5 h-5" /> Boxenrücknahme</h1>
        <p className="text-xs text-muted-foreground">Box-ID eingeben um eine Rücknahme zu verarbeiten</p>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="flex gap-2">
            <Input
              value={searchId}
              onChange={e => setSearchId(e.target.value.toUpperCase())}
              placeholder="Box-ID eingeben (z.B. BOX-2026-0001)"
              className="font-mono"
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={searching || !searchId.trim()}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          {notFound && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200 text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4" />
              Box-ID nicht gefunden
            </div>
          )}

          {boxInfo && (
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Box-ID</p>
                  <p className="font-mono font-semibold">{boxInfo.box_id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline">{STATUS_LABELS[boxInfo.status] || boxInfo.status}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vertriebler</p>
                  <p className="font-medium">{boxInfo.vertriebler_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fristablauf</p>
                  <p>{boxInfo.frist_ablauf ? new Date(boxInfo.frist_ablauf).toLocaleDateString('de-DE') : '—'}</p>
                </div>
                {boxInfo.haendler_name && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Händler</p>
                    <p className="font-medium">{boxInfo.haendler_name}</p>
                  </div>
                )}
              </div>

              {boxInfo.status === 'versendet' ? (
                <Button onClick={handleReturn} disabled={confirming} className="w-full">
                  {confirming ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                  Rücknahme bestätigen
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="w-4 h-4" />
                  Rücknahme nur für Boxen mit Status „Versendet" möglich
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
