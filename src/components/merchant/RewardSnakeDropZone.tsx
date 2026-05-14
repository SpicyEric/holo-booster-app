import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, GripVertical, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Reward {
  id: string;
  title: string;
  description: string | null;
  points_required: number;
  image_url: string | null;
  is_active: boolean | null;
}

interface Props {
  rewards: Reward[];
  brandColor: string;
  onChanged: () => void;
  maxVisits?: number;
}

const NODE_SPACING = 90;
const SNAKE_HEIGHT = 200;
const AMPLITUDE = 50;
const WAVELENGTH = 4;

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

export const RewardSnakeDropZone = ({ rewards, brandColor, onChanged, maxVisits = 15 }: Props) => {
  const [draggedReward, setDraggedReward] = useState<Reward | null>(null);
  const [hoverVisit, setHoverVisit] = useState<number | null>(null);
  const [updating, setUpdating] = useState(false);
  const padding = 50;
  const totalWidth = padding * 2 + NODE_SPACING * (maxVisits - 1);

  const points = Array.from({ length: maxVisits }, (_, i) => ({
    x: padding + i * NODE_SPACING,
    y: nodeY(i),
  }));

  const rewardForVisit = (visit: number) => rewards.find(r => r.points_required === visit) || null;

  const handleDrop = async (visit: number) => {
    if (!draggedReward) return;
    if (draggedReward.points_required === visit) {
      setDraggedReward(null);
      setHoverVisit(null);
      return;
    }
    // Check if there's already a reward at that visit
    const existing = rewardForVisit(visit);
    if (existing && existing.id !== draggedReward.id) {
      toast.error(`Auf Check-in #${visit} liegt bereits eine Prämie.`);
      setDraggedReward(null);
      setHoverVisit(null);
      return;
    }
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('rewards')
        .update({ points_required: visit })
        .eq('id', draggedReward.id);
      if (error) throw error;
      toast.success(`Prämie auf Check-in #${visit} platziert`);
      onChanged();
    } catch (e: any) {
      toast.error('Konnte Prämie nicht verschieben');
    } finally {
      setUpdating(false);
      setDraggedReward(null);
      setHoverVisit(null);
    }
  };

  return (
    <Card className="rounded-2xl shadow-sm border border-primary/10 bg-primary/[0.03]">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${brandColor}22` }}
          >
            <Sparkles className="h-5 w-5" style={{ color: brandColor }} />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">Treuepass-Belegung</CardTitle>
            <CardDescription>Ziehe deine Prämien per Drag &amp; Drop auf den gewünschten Check-in.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Snake */}
        <div
          className="overflow-x-auto overflow-y-hidden rounded-2xl bg-card/60 border border-border/30"
          style={{ WebkitOverflowScrolling: 'touch' }}
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
              const reward = rewardForVisit(visit);
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
                    handleDrop(visit);
                  }}
                >
                  {reward ? (
                    <div
                      draggable
                      onDragStart={() => setDraggedReward(reward)}
                      onDragEnd={() => setDraggedReward(null)}
                      className="flex flex-col items-center gap-1.5 cursor-grab active:cursor-grabbing"
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

        {/* Reward palette */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Deine Prämien</p>
          {rewards.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Noch keine Prämien — erstelle oben eine, um sie hier zu platzieren.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  draggable
                  onDragStart={() => setDraggedReward(reward)}
                  onDragEnd={() => setDraggedReward(null)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border/40 shadow-sm cursor-grab active:cursor-grabbing transition-all ${
                    draggedReward?.id === reward.id ? 'opacity-50' : 'hover:shadow-md'
                  }`}
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
                    <span className="text-[10px] text-muted-foreground">Check-in #{reward.points_required}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Tipp: Du kannst auch eine bereits platzierte Prämie auf einen anderen Knoten ziehen.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RewardSnakeDropZone;
