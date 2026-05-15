import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Gift, Check, UserPlus, Sparkles, Cake, Home, Search, MessageSquare, Settings, Nfc, X, Copy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * MerchantTreuepassPreviewV2
 *
 * Live-Vorschau der V2 "Treuepass"-Seite, exakt visuell wie in der App
 * (inkl. Cover-Bild im Hintergrund hinter der Snake und fake BottomNav
 * mit Scan-Button am unteren Rand).
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
  logoEmoji?: string;
  /** Cover-Bild des Geschäfts (für den dezenten Hintergrund hinter der Snake). */
  coverImageUrl?: string | null;
  rewards: PreviewReward[];
  placements?: { reward_id: string; visit: number }[];
  passLength?: number;
  /** Angenommener aktueller Check-in (für die Vorschau-Visualisierung). Default 4. */
  currentVisit?: number;
}

const NODE_SPACING = 70;
const SNAKE_HEIGHT = 150;
const AMPLITUDE = 36;
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
  coverImageUrl,
  rewards,
  placements,
  passLength = 15,
  currentVisit = 4,
}: Props) => {
  const BRAND = brandColor;
  const BRAND_SOFT = `${BRAND}22`;

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

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const indexInWindow = currentVisit - windowStart;
    const targetX = indexInWindow * NODE_SPACING + NODE_SPACING / 2 - el.clientWidth / 2;
    el.scrollTo({ left: Math.max(0, targetX), behavior: 'auto' });
  }, [currentVisit, windowStart]);

  return (
    <div
      className="relative h-full flex flex-col"
      style={{ background: '#faf8f5', colorScheme: 'light' }}
    >
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-[68px]">
        {/* Header */}
        <div
          className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b"
          style={{ borderColor: `${BRAND}22` }}
        >
          <div className="flex items-center gap-2 px-3 py-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: BRAND_SOFT }}
            >
              <ArrowLeft className="w-4 h-4" style={{ color: BRAND }} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-neutral-900 truncate leading-tight">
                {merchantName || 'Dein Geschäft'}
              </h1>
              <p className="text-[10px] font-medium leading-tight" style={{ color: BRAND }}>
                Dein Treuepass
              </p>
            </div>
            <div
              className="px-2 h-9 rounded-xl flex flex-col items-center justify-center text-white shadow-sm leading-none shrink-0"
              style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND}cc)`, minWidth: 50 }}
            >
              <span className="text-[8px] font-semibold uppercase tracking-wider opacity-90">Check-ins</span>
              <span className="text-base font-extrabold mt-0.5">{currentVisit}</span>
            </div>
          </div>
        </div>

        {/* Snake mit Cover-Bild Hintergrund */}
        <div className="mt-2 relative overflow-hidden">
          {coverImageUrl && (
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `url(${coverImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.18,
                filter: 'saturate(0.9)',
                maskImage: 'linear-gradient(to bottom, transparent 0%, #000 20%, #000 80%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 20%, #000 80%, transparent 100%)',
              }}
            />
          )}

          <div
            ref={scrollerRef}
            className="overflow-x-auto overflow-y-hidden no-scrollbar cursor-grab active:cursor-grabbing select-none"
            style={{ WebkitOverflowScrolling: 'touch' }}
            onWheel={(e) => {
              const el = e.currentTarget;
              if (e.deltaY !== 0 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                el.scrollLeft += e.deltaY;
              }
            }}
            onPointerDown={(e) => {
              if (e.pointerType === 'touch') return;
              const el = e.currentTarget;
              const startX = e.clientX;
              const startScroll = el.scrollLeft;
              el.setPointerCapture(e.pointerId);
              const onMove = (ev: PointerEvent) => {
                el.scrollLeft = startScroll - (ev.clientX - startX);
              };
              const onUp = (ev: PointerEvent) => {
                try { el.releasePointerCapture(ev.pointerId); } catch {}
                el.removeEventListener('pointermove', onMove);
                el.removeEventListener('pointerup', onUp);
                el.removeEventListener('pointercancel', onUp);
              };
              el.addEventListener('pointermove', onMove);
              el.addEventListener('pointerup', onUp);
              el.addEventListener('pointercancel', onUp);
            }}
          >
            <div className="relative" style={{ width: totalWidth, height: SNAKE_HEIGHT + 20 }}>
              <svg width={totalWidth} height={SNAKE_HEIGHT} className="absolute inset-x-0 top-3">
                <path
                  d={buildSmoothPath(futurePoints)}
                  fill="none"
                  stroke={BRAND}
                  strokeOpacity={0.18}
                  strokeWidth={10}
                  strokeLinecap="round"
                />
                <path
                  d={buildSmoothPath(completedPoints)}
                  fill="none"
                  stroke={BRAND}
                  strokeWidth={10}
                  strokeLinecap="round"
                />
              </svg>

              {visibleNodes.map((visit, i) => {
                const reward = rewardForVisit(visit);
                const isPast = visit < currentVisit;
                const isCurrent = visit === currentVisit;
                const cx = points[i].x;
                const cy = points[i].y + 12;
                const source = checkInSources[visit] ?? null;
                const label = sourceLabel(source);
                const labelBelow = visit % 4 === 3;

                if (reward) {
                  const isRedeemed = visit < currentVisit;
                  return (
                    <div
                      key={visit}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{ left: cx, top: cy }}
                    >
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center border-[3px] bg-white shadow-md relative"
                        style={{
                          borderColor: BRAND,
                          opacity: isRedeemed ? 0.55 : 1,
                        }}
                      >
                        {reward.image_url ? (
                          <img
                            src={reward.image_url}
                            alt={reward.title}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <Gift className="w-5 h-5" style={{ color: isRedeemed ? '#999' : BRAND }} />
                        )}
                        {isRedeemed && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-white">
                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <div
                        className={`absolute left-1/2 -translate-x-1/2 ${labelBelow ? '-top-5' : 'top-full mt-1.5'} px-1.5 py-0.5 rounded-full bg-white shadow-sm text-[8px] font-semibold text-neutral-800 max-w-[90px] truncate text-center pointer-events-none`}
                        title={reward.title}
                      >
                        {reward.title}
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
                      <div className={`absolute left-1/2 -translate-x-1/2 ${labelBelow ? 'top-full mt-1.5' : '-top-5'} px-1.5 py-0.5 rounded-full bg-neutral-900/85 text-white text-[8px] font-semibold flex items-center gap-1 whitespace-nowrap`}>
                        {sourceIcon(source)}
                        {label}
                      </div>
                    )}
                    <motion.div
                      animate={isCurrent ? { scale: [1, 1.06, 1] } : {}}
                      transition={{ duration: 1.4, repeat: isCurrent ? Infinity : 0 }}
                      className="rounded-full flex items-center justify-center border-[3px] shadow"
                      style={{
                        width: isCurrent ? 42 : 32,
                        height: isCurrent ? 42 : 32,
                        background: isPast ? BRAND : '#fff',
                        borderColor: isPast || isCurrent ? BRAND : `${BRAND}55`,
                      }}
                    >
                      {isPast ? (
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                      ) : (
                        <span
                          className="text-[10px] font-bold"
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
        <div className="px-3 mt-3">
          <Card className="p-2.5 border" style={{ borderColor: `${BRAND}33`, background: `${BRAND}0a` }}>
            <div className="flex gap-2">
              <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: BRAND }} />
              <div>
                <p className="text-[11px] font-semibold text-neutral-900 leading-tight">So funktioniert das Einlösen</p>
                <p className="text-[9px] text-neutral-600 mt-0.5 leading-snug">
                  Tippe vor deinem nächsten Check-in auf eine Prämie, um sie zu aktivieren. Beim Check-in wird sie automatisch eingelöst.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Freunde einladen */}
        <div className="px-3 mt-2 pb-3">
          <Card
            className="p-3 border-0 text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND}cc)` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <UserPlus className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-xs leading-tight">Freunde einladen</h3>
                <p className="text-[9px] text-white/85 leading-snug">
                  Empfehlung = +1 Boost auf deinem Treuepass
                </p>
              </div>
            </div>
            <Button
              onClick={() => setInviteOpen(true)}
              className="w-full h-7 text-[10px] bg-white hover:bg-white/90"
              style={{ color: BRAND }}
            >
              Einladungslink teilen
            </Button>
          </Card>
        </div>
      </div>

      {/* Invite-Popup Vorschau (rein dekorativ, nur X schließt) */}
      {inviteOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setInviteOpen(false)}
          />
          <div
            className="relative bg-white rounded-3xl p-5 w-full max-w-[280px] shadow-2xl"
            style={{ colorScheme: 'light' }}
          >
            <button
              onClick={() => setInviteOpen(false)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-neutral-500 hover:bg-neutral-100"
              aria-label="Schließen"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center gap-2">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: `${BRAND}26` }}
              >
                <Gift className="w-5 h-5" style={{ color: BRAND }} />
              </div>
              <h3 className="text-sm font-bold text-neutral-900">Freund einladen</h3>
              <p className="text-[10px] text-neutral-600 leading-snug px-1">
                Lade eine Person zu <span className="font-semibold text-neutral-900">{merchantName || 'deinem Geschäft'}</span> ein.
                Sammelt sie in <span className="font-semibold text-neutral-900">7 Tagen</span> ihre ersten Punkte,
                bekommt ihr <span className="font-semibold text-neutral-900">beide</span> einen Bonus:
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1.5 mt-3">
              <div className="rounded-xl bg-neutral-100 px-2 py-2 text-center">
                <div className="text-[9px] text-neutral-500">Du bekommst</div>
                <div className="text-sm font-bold leading-tight" style={{ color: BRAND }}>+1 Boost</div>
                <div className="text-[8px] text-neutral-500 mt-0.5 leading-tight">Empfehlungs-Bonus</div>
              </div>
              <div className="rounded-xl bg-neutral-100 px-2 py-2 text-center">
                <div className="text-[9px] text-neutral-500">Dein Freund</div>
                <div className="text-sm font-bold leading-tight" style={{ color: BRAND }}>Punkte ×2</div>
                <div className="text-[8px] text-neutral-500 mt-0.5 leading-tight">erste Punkte</div>
              </div>
            </div>

            <div className="space-y-1.5 mt-3 pointer-events-none">
              <Button
                className="w-full h-8 rounded-xl text-[10px] text-white"
                style={{ background: BRAND }}
              >
                <svg viewBox="0 0 24 24" className="h-3 w-3 mr-1" fill="currentColor">
                  <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                </svg>
                Über WhatsApp einladen
              </Button>
              <Button
                variant="outline"
                className="w-full h-7 rounded-xl text-[10px]"
              >
                <Copy className="w-3 h-3 mr-1" />
                Link kopieren
              </Button>
              <p className="text-center text-[9px] text-neutral-500 pt-0.5">
                Link gültig 90 Tage
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Fake BottomNav (rein dekorativ, exakt wie in der App) */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-neutral-200 pointer-events-none">
        <div className="flex items-center justify-around h-12 px-2 relative">
          <div className="flex flex-col items-center justify-center flex-1 text-neutral-400">
            <Home className="h-4 w-4" />
          </div>
          <div className="flex flex-col items-center justify-center flex-1 text-neutral-400">
            <Search className="h-4 w-4" />
          </div>
          {/* Scan-Button (mittig, hochgehoben) */}
          <div className="flex flex-col items-center justify-center -mt-7">
            <div
              className="relative flex items-center justify-center rounded-full shadow-lg text-white"
              style={{
                height: '44px',
                width: '44px',
                background: BRAND
                  ? `linear-gradient(135deg, ${BRAND}, ${BRAND}cc)`
                  : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))',
              }}
              aria-label="Scannen"
            >
              <Nfc className="h-6 w-6" strokeWidth={2.2} />
            </div>
          </div>
          <div className="flex flex-col items-center justify-center flex-1 text-neutral-400">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div className="flex flex-col items-center justify-center flex-1 text-neutral-400">
            <Settings className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MerchantTreuepassPreviewV2;
