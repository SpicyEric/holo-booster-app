import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Gift, Check, UserPlus, Sparkles, Cake } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * MerchantTreuepassPreviewV2
 *
 * Live-Vorschau der V2 "Treuepass"-Seite, exakt visuell wie in der App.
 * Wird in der Profil-Phone-Vorschau gerendert, wenn `version === 'v2'`.
 *
 * Statisch / nicht-interaktiv – soll dem Händler zeigen, wie es beim Kunden aussieht.
 */

interface PreviewReward {
  id?: string;
  title: string;
  points_required: number; // = visit number
  image_url?: string | null;
}

interface Props {
  brandColor: string;
  merchantName: string;
  logoEmoji?: string; // optional decorative
  rewards: PreviewReward[];
  /** Optional placements; if provided, used instead of rewards.points_required mapping. */
  placements?: { reward_id: string; visit: number }[];
  /** Total length of the loyalty pass; visible window is capped at this. */
  passLength?: number;
  /** Angenommener aktueller Check-in (für die Vorschau-Visualisierung). Default 4. */
  currentVisit?: number;
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

export const MerchantTreuepassPreviewV2 = ({
  brandColor,
  merchantName,
  logoEmoji = '🥐',
  rewards,
  placements,
  passLength = 15,
  currentVisit = 4,
}: Props) => {
  const BRAND = brandColor;
  const BRAND_SOFT = `${BRAND}22`;

  // Mock check-in sources, identical pattern to AppMerchantDetailV2 sample state
  const checkInSources: Record<number, 'normal' | 'boost' | 'birthday'> = useMemo(
    () => ({ 3: 'birthday' }),
    [],
  );

  const windowStart = Math.max(1, currentVisit - 5);
  const windowEnd = Math.min(passLength, currentVisit + 10);
  const visibleNodes = useMemo(() => {
    const arr: number[] = [];
    for (let i = windowStart; i <= windowEnd; i++) arr.push(i);
    return arr;
  }, [windowStart, windowEnd]);

  const points = visibleNodes.map((_, i) => ({
    x: i * NODE_SPACING + NODE_SPACING / 2,
    y: nodeY(i + windowStart),
  }));
  const completedPoints = points.filter((_, i) => visibleNodes[i] <= currentVisit);
  const futurePoints = points.filter((_, i) => visibleNodes[i] >= currentVisit);
  const totalWidth = visibleNodes.length * NODE_SPACING;

  const rewardForVisit = (v: number): PreviewReward | undefined => {
    if (placements && placements.length > 0) {
      const placement = placements.find((p) => p.visit === v);
      if (!placement) return undefined;
      return rewards.find((r) => r.id === placement.reward_id);
    }
    return rewards.find((r) => r.points_required === v);
  };

  const sourceLabel = (s: 'normal' | 'boost' | 'birthday' | null) => {
    if (s === 'boost') return 'Boost';
    if (s === 'birthday') return 'Geburtstag';
    return null;
  };
  const sourceIcon = (s: 'normal' | 'boost' | 'birthday' | null) => {
    if (s === 'boost') return <Sparkles className="w-3 h-3" />;
    if (s === 'birthday') return <Cake className="w-3 h-3" />;
    return null;
  };

  // Auto-scroll to current
  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const indexInWindow = currentVisit - windowStart;
    const targetX = indexInWindow * NODE_SPACING + NODE_SPACING / 2 - el.clientWidth / 2;
    el.scrollTo({ left: Math.max(0, targetX), behavior: 'auto' });
  }, [currentVisit, windowStart]);

  return (
    <div
      className="min-h-full"
      style={{
        background: '#faf8f5',
        colorScheme: 'light',
      }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b"
        style={{ borderColor: `${BRAND}22` }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: BRAND_SOFT }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: BRAND }} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-neutral-900 truncate">
              {merchantName || 'Dein Geschäft'}
            </h1>
            <p className="text-xs font-medium" style={{ color: BRAND }}>
              Dein Treuepass
            </p>
          </div>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
            style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND}cc)` }}
          >
            {logoEmoji}
          </div>
        </div>
      </div>

      {/* Snake */}
      <div className="mt-6">
        <div className="px-4 mb-3">
          <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: `${BRAND}cc` }}>
            Check-ins
          </p>
          <p className="text-4xl font-extrabold text-neutral-900 leading-none mt-1">
            {currentVisit}
          </p>
        </div>

        <div
          ref={scrollerRef}
          className="overflow-x-auto overflow-y-hidden no-scrollbar"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="relative" style={{ width: totalWidth, height: SNAKE_HEIGHT + 28 }}>
            <svg width={totalWidth} height={SNAKE_HEIGHT} className="absolute inset-x-0 top-7">
              <path
                d={buildSmoothPath(futurePoints)}
                fill="none"
                stroke={BRAND}
                strokeOpacity={0.18}
                strokeWidth={14}
                strokeLinecap="round"
              />
              <path
                d={buildSmoothPath(completedPoints)}
                fill="none"
                stroke={BRAND}
                strokeWidth={14}
                strokeLinecap="round"
              />
            </svg>

            {visibleNodes.map((visit, i) => {
              const reward = rewardForVisit(visit);
              const isPast = visit < currentVisit;
              const isCurrent = visit === currentVisit;
              const cx = points[i].x;
              const cy = points[i].y + 28;
              const source = checkInSources[visit] ?? null;
              const label = sourceLabel(source);

              if (reward) {
                const isRedeemed = visit < currentVisit;
                return (
                  <div
                    key={visit}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: cx, top: cy }}
                  >
                    {label && (
                      <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-neutral-900/85 text-white text-[10px] font-semibold flex items-center gap-1 whitespace-nowrap">
                        {sourceIcon(source)}
                        {label}
                      </div>
                    )}
                    <div
                      className="w-16 h-16 rounded-full flex flex-col items-center justify-center border-4 bg-white shadow-md relative"
                      style={{
                        borderColor: BRAND,
                        opacity: isRedeemed ? 0.55 : 1,
                      }}
                    >
                      {reward.image_url ? (
                        <img
                          src={reward.image_url}
                          alt={reward.title}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <Gift className="w-6 h-6" style={{ color: isRedeemed ? '#999' : BRAND }} />
                      )}
                      <span className="text-[10px] font-bold text-neutral-600 mt-0.5">#{visit}</span>
                      {isRedeemed && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-white">
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={visit}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: cx, top: cy }}
                >
                  {label && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-neutral-900/85 text-white text-[10px] font-semibold flex items-center gap-1 whitespace-nowrap">
                      {sourceIcon(source)}
                      {label}
                    </div>
                  )}
                  <motion.div
                    animate={isCurrent ? { scale: [1, 1.06, 1] } : {}}
                    transition={{ duration: 1.4, repeat: isCurrent ? Infinity : 0 }}
                    className="rounded-full flex items-center justify-center border-4 shadow"
                    style={{
                      width: isCurrent ? 56 : 44,
                      height: isCurrent ? 56 : 44,
                      background: isPast ? BRAND : '#fff',
                      borderColor: isPast || isCurrent ? BRAND : `${BRAND}55`,
                    }}
                  >
                    {isPast ? (
                      <Check className="w-5 h-5 text-white" strokeWidth={3} />
                    ) : (
                      <span
                        className="text-sm font-bold"
                        style={{ color: isCurrent ? BRAND : `${BRAND}99` }}
                      >
                        {isCurrent ? 'Jetzt' : visit}
                      </span>
                    )}
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hinweis Pre-Activation */}
      <div className="px-4 mt-6">
        <Card className="p-4 border" style={{ borderColor: `${BRAND}33`, background: `${BRAND}0a` }}>
          <div className="flex gap-3">
            <Sparkles className="w-5 h-5 mt-0.5 shrink-0" style={{ color: BRAND }} />
            <div>
              <p className="text-sm font-semibold text-neutral-900">So funktioniert das Einlösen</p>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                Tippe vor deinem nächsten Check-in auf eine Prämie, um sie zu aktivieren.
                Beim Check-in wird sie automatisch eingelöst. Pro Tag nur ein Check-in pro Geschäft.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Freunde einladen */}
      <div className="px-4 mt-4 pb-6">
        <Card
          className="p-5 border-0 text-white shadow-lg"
          style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND}cc)` }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Freunde einladen</h3>
              <p className="text-xs text-white/85">
                Erfolgreiche Empfehlung = +1 Boost auf deinem Treuepass
              </p>
            </div>
          </div>
          <Button className="w-full bg-white hover:bg-white/90 pointer-events-none" style={{ color: BRAND }}>
            Einladungslink teilen
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default MerchantTreuepassPreviewV2;
