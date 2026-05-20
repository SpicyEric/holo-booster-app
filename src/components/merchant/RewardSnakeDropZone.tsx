import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, GripVertical, Sparkles, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDemoMerchant } from '@/hooks/useDemoMerchant';
import {
  getDemoPlacements,
  setDemoPlacements,
  subscribeDemoPlacements,
} from '@/lib/demoRewardPlacements';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Reward {
  id: string;
  title: string;
  description: string | null;
  points_required: number;
  image_url: string | null;
  is_active: boolean | null;
}

interface Placement {
  id: string;
  reward_id: string;
  visit: number;
}

interface Props {
  rewards: Reward[];
  brandColor: string;
  customerId: string | null;
  passLength: number;
  onPassLengthChange: (n: number) => void;
  onChanged?: () => void;
}

const NODE_SPACING = 90;
const SNAKE_HEIGHT = 200;
const AMPLITUDE = 50;
const WAVELENGTH = 4;

// What kind of payload we drag — either a reward from the palette,
// or an existing placement (which can also be moved or deleted).
type DragPayload =
  | { kind: 'reward'; rewardId: string }
  | { kind: 'placement'; placementId: string; rewardId: string };

function nodeY(index: number): number {
  return SNAKE_HEIGHT / 2 + Math.sin((index / WAVELENGTH) * Math.PI * 2) * AMPLITUDE;
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    d += ` Q ${midX} ${p0.y}, ${midX} ${(p0.y + p1.y) / 2}`;
    d += ` Q ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

const PASS_LENGTH_OPTIONS = [10, 15, 20, 25, 30, 35, 40, 50];

export const RewardSnakeDropZone = ({
  rewards,
  brandColor,
  customerId,
  passLength,
  onPassLengthChange,
  onChanged,
}: Props) => {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const [hoverVisit, setHoverVisit] = useState<number | null>(null);
  const [trashHover, setTrashHover] = useState(false);
  const [busy, setBusy] = useState(false);
  const isDemo = useDemoMerchant();

  const padding = 50;
  const totalWidth = padding * 2 + NODE_SPACING * (passLength - 1);

  const loadPlacements = async () => {
    if (!customerId) return;
    if (isDemo) {
      setPlacements(getDemoPlacements(customerId));
      return;
    }
    const { data } = await supabase
      .from('reward_placements')
      .select('id, reward_id, visit')
      .eq('customer_id', customerId)
      .order('visit', { ascending: true });
    setPlacements((data as Placement[]) || []);
  };

  useEffect(() => {
    loadPlacements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, isDemo]);

  // Im Demo-Modus auf Änderungen aus anderen Komponenten/Mounts horchen.
  useEffect(() => {
    if (!isDemo || !customerId) return;
    return subscribeDemoPlacements(() => {
      setPlacements(getDemoPlacements(customerId));
    });
  }, [isDemo, customerId]);

  const points = Array.from({ length: passLength }, (_, i) => ({
    x: padding + i * NODE_SPACING,
    y: nodeY(i),
  }));

  const placementForVisit = (v: number) => placements.find((p) => p.visit === v) || null;
  const rewardById = (id: string) => rewards.find((r) => r.id === id) || null;

  const handleDropOnVisit = async (visit: number) => {
    if (!drag || !customerId) return;
    const existing = placementForVisit(visit);

    // Demo-Modus: in den gemeinsamen Demo-Store schreiben (kein DB-Write).
    if (isDemo) {
      setBusy(true);
      try {
        setDemoPlacements(customerId, (prev) => {
          if (drag.kind === 'placement' && drag.placementId === existing?.id) {
            return prev;
          }
          if (drag.kind === 'placement') {
            const moving = prev.find((p) => p.id === drag.placementId);
            if (!moving) return prev;
            if (existing) {
              return prev.map((p) => {
                if (p.id === moving.id) return { ...p, visit };
                if (p.id === existing.id) return { ...p, visit: moving.visit };
                return p;
              });
            }
            return prev.map((p) => (p.id === moving.id ? { ...p, visit } : p));
          }
          const without = existing ? prev.filter((p) => p.id !== existing.id) : prev;
          return [
            ...without,
            { id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, reward_id: drag.rewardId, visit },
          ];
        });
        toast.success(`Prämie auf Check-in #${visit} platziert (Demo)`);
        onChanged?.();
      } finally {
        setBusy(false);
        setDrag(null);
        setHoverVisit(null);
      }
      return;
    }

    setBusy(true);
    try {
      if (drag.kind === 'placement' && drag.placementId === existing?.id) {
        // dropped on its own slot — no-op
      } else if (drag.kind === 'placement') {
        // Moving an existing placement
        if (existing) {
          // Swap: existing one takes old slot
          const oldPlacement = placements.find((p) => p.id === drag.placementId);
          if (!oldPlacement) return;
          const { error: e1 } = await supabase
            .from('reward_placements')
            .update({ visit: -Math.abs(oldPlacement.visit) }) // temp
            .eq('id', existing.id);
          if (e1) throw e1;
          const { error: e2 } = await supabase
            .from('reward_placements')
            .update({ visit })
            .eq('id', drag.placementId);
          if (e2) throw e2;
          const { error: e3 } = await supabase
            .from('reward_placements')
            .update({ visit: oldPlacement.visit })
            .eq('id', existing.id);
          if (e3) throw e3;
        } else {
          const { error } = await supabase
            .from('reward_placements')
            .update({ visit })
            .eq('id', drag.placementId);
          if (error) throw error;
        }
      } else {
        // New placement from palette
        if (existing) {
          // Replace: delete existing first
          const { error: delErr } = await supabase
            .from('reward_placements')
            .delete()
            .eq('id', existing.id);
          if (delErr) throw delErr;
        }
        const { error } = await supabase
          .from('reward_placements')
          .insert({ customer_id: customerId, reward_id: drag.rewardId, visit });
        if (error) throw error;
      }
      toast.success(`Prämie auf Check-in #${visit} platziert`);
      await loadPlacements();
      onChanged?.();
    } catch (e: any) {
      console.error(e);
      toast.error('Konnte Prämie nicht platzieren');
    } finally {
      setBusy(false);
      setDrag(null);
      setHoverVisit(null);
    }
  };

  const handleDropOnTrash = async () => {
    if (!drag || drag.kind !== 'placement') {
      setDrag(null);
      setTrashHover(false);
      return;
    }
    if (isDemo) {
      if (customerId) {
        setDemoPlacements(customerId, (prev) => prev.filter((p) => p.id !== drag.placementId));
      }
      toast.success('Prämie entfernt (Demo)');
      onChanged?.();
      setDrag(null);
      setTrashHover(false);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from('reward_placements')
        .delete()
        .eq('id', drag.placementId);
      if (error) throw error;
      toast.success('Prämie entfernt');
      await loadPlacements();
      onChanged?.();
    } catch {
      toast.error('Konnte Prämie nicht entfernen');
    } finally {
      setBusy(false);
      setDrag(null);
      setTrashHover(false);
    }
  };

  return (
    <Card className="rounded-2xl shadow-sm border border-primary/10 bg-primary/[0.03]">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${brandColor}22` }}
            >
              <Sparkles className="h-5 w-5" style={{ color: brandColor }} />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Treuepass-Belegung</CardTitle>
              <CardDescription>
                Ziehe Prämien per Drag &amp; Drop auf einen Check-in. Nach {passLength} Check-ins beginnt der Pass von vorne.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Pass-Länge</span>
            <Select
              value={String(passLength)}
              onValueChange={(v) => onPassLengthChange(parseInt(v, 10))}
            >
              <SelectTrigger className="h-9 w-[120px] rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PASS_LENGTH_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} Check-ins
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Snake — horizontal scroll (forced visible scrollbar) */}
        <style>{`
          .reward-snake-scroll::-webkit-scrollbar { height: 12px; }
          .reward-snake-scroll::-webkit-scrollbar-track { background: ${brandColor}1a; border-radius: 8px; }
          .reward-snake-scroll::-webkit-scrollbar-thumb { background: ${brandColor}; border-radius: 8px; border: 2px solid transparent; background-clip: padding-box; }
          .reward-snake-scroll::-webkit-scrollbar-thumb:hover { background: ${brandColor}dd; background-clip: padding-box; border: 2px solid transparent; }
        `}</style>
        <div
          className="reward-snake-scroll overflow-x-scroll overflow-y-hidden rounded-2xl bg-card/60 border border-border/30"
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'auto',
            scrollbarColor: `${brandColor} ${brandColor}22`,
          }}
        >
          <div className="relative" style={{ width: totalWidth, height: SNAKE_HEIGHT + 40, padding: '20px 0' }}>
            <svg width={totalWidth} height={SNAKE_HEIGHT} className="absolute inset-x-0 top-5">
              <path
                d={buildSmoothPath(points)}
                fill="none"
                stroke={brandColor}
                strokeOpacity={0.25}
                strokeWidth={12}
                strokeLinecap="round"
              />
            </svg>

            {points.map((pt, i) => {
              const visit = i + 1;
              const placement = placementForVisit(visit);
              const reward = placement ? rewardById(placement.reward_id) : null;
              const isHover = hoverVisit === visit;
              return (
                <div
                  key={visit}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: pt.x, top: pt.y + 20 }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setHoverVisit(visit);
                  }}
                  onDragLeave={() => {
                    if (hoverVisit === visit) setHoverVisit(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDropOnVisit(visit);
                  }}
                >
                  {placement && reward ? (
                    <div
                      draggable
                      onDragStart={() => setDrag({ kind: 'placement', placementId: placement.id, rewardId: reward.id })}
                      onDragEnd={() => setDrag(null)}
                      className="flex flex-col items-center gap-1.5 cursor-grab active:cursor-grabbing"
                      title="Ziehen zum Verschieben oder in den Papierkorb"
                    >
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg ring-4 ring-white"
                        style={{ background: brandColor }}
                      >
                        {reward.image_url ? (
                          <img src={reward.image_url} alt={reward.title} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <Gift className="h-6 w-6 text-white" />
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-foreground bg-white/90 px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                        #{visit}
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground max-w-[90px] truncate text-center">
                        {reward.title}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center border-2 border-dashed transition-all ${
                          isHover ? 'scale-125 bg-white' : 'bg-white/60'
                        }`}
                        style={{
                          borderColor: isHover ? brandColor : `${brandColor}55`,
                        }}
                      >
                        <span className="text-xs font-bold" style={{ color: brandColor }}>
                          {visit}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Reward palette + Trash zone */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch">
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground mb-2">Deine Prämien</p>
            {rewards.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Noch keine Prämien — erstelle oben eine, um sie hier zu platzieren.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {rewards.map((reward) => {
                  const placedCount = placements.filter((p) => p.reward_id === reward.id).length;
                  return (
                    <div
                      key={reward.id}
                      draggable
                      onDragStart={() => setDrag({ kind: 'reward', rewardId: reward.id })}
                      onDragEnd={() => setDrag(null)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border/40 shadow-sm cursor-grab active:cursor-grabbing transition-all hover:shadow-md"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      {reward.image_url ? (
                        <img src={reward.image_url} alt={reward.title} className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: `${brandColor}22` }}
                        >
                          <Gift className="h-4 w-4" style={{ color: brandColor }} />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground leading-tight">{reward.title}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {placedCount > 0 ? `${placedCount}× platziert` : 'Noch nicht platziert'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Trash drop zone */}
          <div
            onDragOver={(e) => {
              if (drag?.kind === 'placement') {
                e.preventDefault();
                setTrashHover(true);
              }
            }}
            onDragLeave={() => setTrashHover(false)}
            onDrop={(e) => {
              e.preventDefault();
              handleDropOnTrash();
            }}
            className={`shrink-0 md:w-44 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-4 transition-all ${
              trashHover
                ? 'bg-destructive/10 border-destructive scale-[1.02]'
                : 'bg-muted/40 border-border/50'
            }`}
          >
            <Trash2 className={`h-7 w-7 ${trashHover ? 'text-destructive' : 'text-muted-foreground'}`} />
            <p className={`text-xs font-medium mt-2 text-center ${trashHover ? 'text-destructive' : 'text-muted-foreground'}`}>
              Hier ablegen, um eine platzierte Prämie zu entfernen
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Tipp: Du kannst eine Prämie mehrfach platzieren — zieh sie einfach aus der Liste auf weitere Check-ins.
          Zum Entfernen die platzierte Prämie in den Papierkorb ziehen.
        </p>
        {busy && <p className="text-xs text-muted-foreground">Aktualisiere…</p>}
      </CardContent>
    </Card>
  );
};

export default RewardSnakeDropZone;
