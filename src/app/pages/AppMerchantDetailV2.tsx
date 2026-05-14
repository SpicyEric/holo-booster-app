import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Gift, Check, UserPlus, Sparkles, Rocket, Cake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { BottomNav } from '@/app/components/layout/BottomNav';
import { useMerchantBrand } from '@/hooks/useMerchantBrand';
import { setActiveBrandColor } from '@/lib/activeBrandColor';
import { DEFAULT_DEMO_MERCHANT_CUSTOMER_ID } from '@/lib/demoMerchant';
import {
  getActivatedReward,
  setActivatedReward as persistActivatedReward,
  clearActivatedReward,
} from '@/lib/activeMerchantReward';

/**
 * Backstube König – Treuepass (V2 Prototype)
 *
 * - Wording: "Check-ins" statt Stempel
 * - Vergangene Knoten zeigen Haken + optionales Label (Boost/Geburtstag)
 * - Markenfarbe pro Händler (CSS-Variablen, BottomNav reagiert)
 * - Pre-Activation: max 1 Check-in/Tag, Prämie vorher aktivieren, beim
 *   nächsten Check-in automatisch einlösen.
 */

type CheckInSource = 'normal' | 'boost' | 'birthday';

interface CheckInEntry {
  visit: number;
  source: CheckInSource;
}

interface MockReward {
  visitNumber: number;
  label: string;
  redeemed: boolean;
}

const NODE_SPACING = 110;
const SNAKE_HEIGHT = 220;
const AMPLITUDE = 55;
const WAVELENGTH = 4;

function isRepeatingRewardVisit(visit: number): boolean {
  return visit >= 15 && (visit - 10) % 5 === 0;
}

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

export const AppMerchantDetailV2 = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const merchantId = id || DEFAULT_DEMO_MERCHANT_CUSTOMER_ID;
  const brand = useMerchantBrand(merchantId);

  // ===== Brand-Color global publizieren (für BottomNav-Scan-Button) =====
  useEffect(() => {
    setActiveBrandColor(brand.color);
    return () => setActiveBrandColor(null);
  }, [brand.color]);

  useEffect(() => {
    setActiveBrandColor(brand.color);
    return () => setActiveBrandColor(null);
  }, [brand.color]);

  // Load persisted activated reward on mount
  useEffect(() => {
    const stored = getActivatedReward(merchantId);
    if (stored) {
      setActivatedReward({ ...stored, redeemed: false });
    }
  }, [merchantId]);

  const BRAND = brand.color;
  const BRAND_SOFT = `${BRAND}22`; // Alpha-Wash via HEX 8-stellig

  // ================= Mock-State =================
  const [checkIns, setCheckIns] = useState<CheckInEntry[]>([
    { visit: 1, source: 'normal' },
    { visit: 2, source: 'normal' },
    { visit: 3, source: 'birthday' },
    { visit: 4, source: 'normal' },
  ]);
  const currentVisit = checkIns[checkIns.length - 1]?.visit ?? 0;

  const [rewards, setRewards] = useState<MockReward[]>([
    { visitNumber: 1, label: 'Willkommens-Brötchen 🎁', redeemed: true },
    { visitNumber: 3, label: 'Kaffee gratis ☕', redeemed: false },
    { visitNumber: 6, label: '3 Brötchen gratis 🥐', redeemed: false },
    { visitNumber: 10, label: '5€ Gutschein 🎟️', redeemed: false },
  ]);

  const [activatedReward, setActivatedReward] = useState<MockReward | null>(null);
  const [tappedReward, setTappedReward] = useState<MockReward | null>(null);
  const [redemptionScreen, setRedemptionScreen] = useState<MockReward | null>(null);
  const [boostFlash, setBoostFlash] = useState(false);
  const [lastCheckInDate, setLastCheckInDate] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement>(null);

  // ================= Sichtbares Fenster =================
  const windowStart = Math.max(1, currentVisit - 5);
  const windowEnd = currentVisit + 10;

  const visibleNodes = useMemo(() => {
    const arr: number[] = [];
    for (let i = windowStart; i <= windowEnd; i++) arr.push(i);
    return arr;
  }, [windowStart, windowEnd]);

  const sourceForVisit = (v: number): CheckInSource | null => {
    return checkIns.find((c) => c.visit === v)?.source ?? null;
  };

  const rewardForVisit = (v: number): MockReward | undefined => {
    const direct = rewards.find((r) => r.visitNumber === v);
    if (direct) return direct;
    if (isRepeatingRewardVisit(v)) {
      return { visitNumber: v, label: 'Kaffee gratis ☕', redeemed: false };
    }
    return undefined;
  };

  // ================= Effekte =================
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const indexInWindow = currentVisit - windowStart;
    const targetX = indexInWindow * NODE_SPACING + NODE_SPACING / 2 - el.clientWidth / 2;
    el.scrollTo({ left: Math.max(0, targetX), behavior: 'smooth' });
  }, [currentVisit, windowStart]);

  // ================= Aktionen =================
  const todayKey = () => new Date().toISOString().slice(0, 10);

  const performCheckIn = (source: CheckInSource, suppressLimit = false) => {
    if (!suppressLimit && lastCheckInDate === todayKey()) {
      toast.info('Heute schon eingecheckt. Bis morgen! 👋');
      return;
    }
    const next = currentVisit + 1;
    setCheckIns((prev) => [...prev, { visit: next, source }]);
    if (!suppressLimit) setLastCheckInDate(todayKey());

    // Prüfe aktivierte Prämie → automatisch einlösen
    if (activatedReward) {
      const reward = activatedReward;
      setActivatedReward(null);
      clearActivatedReward(merchantId);
      setRewards((prev) => {
        const exists = prev.some((r) => r.visitNumber === reward.visitNumber);
        if (exists) {
          return prev.map((r) =>
            r.visitNumber === reward.visitNumber ? { ...r, redeemed: true } : r,
          );
        }
        return [...prev, { ...reward, redeemed: true }];
      });
      setTimeout(() => setRedemptionScreen(reward), 400);
      return;
    }

    // Hinweis auf nächste Prämie
    const upcoming = [next + 1, next + 2, next + 3].map(rewardForVisit).find((r) => r && !r.redeemed);
    if (upcoming) {
      setTimeout(() => {
        toast(`Demnächst: ${upcoming.label}`, {
          description: 'Tippe vorher auf die Prämie, um sie zu aktivieren.',
        });
      }, 600);
    }
  };

  const simulateCheckIn = () => performCheckIn('normal');

  const simulateReferralBoost = () => {
    setBoostFlash(true);
    performCheckIn('boost', true);
    toast('Lena hat deinen Link genutzt! +1 Boost 🚀');
    setTimeout(() => setBoostFlash(false), 1400);
  };

  const simulateBirthday = () => {
    performCheckIn('birthday', true);
    toast('Alles Gute zum Geburtstag! 🎂');
  };

  const handleRewardTap = (reward: MockReward) => {
    if (reward.redeemed) return;
    setTappedReward(reward);
  };

  const activateRewardForNextCheckIn = () => {
    if (!tappedReward) return;
    setActivatedReward(tappedReward);
    persistActivatedReward(merchantId, {
      visitNumber: tappedReward.visitNumber,
      label: tappedReward.label,
    });
    toast.success(`„${tappedReward.label}" wird beim nächsten Check-in eingelöst.`);
    setTappedReward(null);
  };

  const removeActivation = () => {
    setActivatedReward(null);
    clearActivatedReward(merchantId);
    toast('Aktivierung entfernt.');
  };

  const shareReferral = async () => {
    const link = `https://eloyo.de/r/backstube-koenig?u=demo`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Backstube König',
          text: 'Sammle mit mir Belohnungen bei Backstube König!',
          url: link,
        });
      } else {
        await navigator.clipboard.writeText(link);
        toast.success('Einladungslink kopiert!');
      }
    } catch { /* user cancelled */ }
  };

  // ================= Render =================
  const points = visibleNodes.map((_, i) => ({
    x: i * NODE_SPACING + NODE_SPACING / 2,
    y: nodeY(i + windowStart),
  }));

  const completedPoints = points.filter((_, i) => visibleNodes[i] <= currentVisit);
  const futurePoints = points.filter((_, i) => visibleNodes[i] >= currentVisit);

  const totalWidth = visibleNodes.length * NODE_SPACING;

  const sourceLabel = (s: CheckInSource | null): string | null => {
    if (s === 'boost') return 'Boost';
    if (s === 'birthday') return 'Geburtstag';
    return null;
  };

  const sourceIcon = (s: CheckInSource | null) => {
    if (s === 'boost') return <Rocket className="w-3 h-3" />;
    if (s === 'birthday') return <Cake className="w-3 h-3" />;
    return null;
  };

  return (
    <div
      className="min-h-screen pb-24"
      style={{
        background: '#faf8f5',
        colorScheme: 'light',
        ['--brand' as string]: BRAND,
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b" style={{ borderColor: `${BRAND}22` }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('/app')}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: BRAND_SOFT }}
            aria-label="Zurück"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: BRAND }} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-neutral-900 truncate">Backstube König</h1>
            <p className="text-xs font-medium" style={{ color: BRAND }}>Dein Treuepass</p>
          </div>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
            style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND}cc)` }}
          >
            🥐
          </div>
        </div>
      </div>

      {/* Snake */}
      <div className="mt-6">
        <div className="px-4 mb-3 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: `${BRAND}cc` }}>
              Check-ins
            </p>
            <p className="text-4xl font-extrabold text-neutral-900 leading-none mt-1">
              {currentVisit}
            </p>
          </div>
          {activatedReward ? (
            <button
              onClick={removeActivation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-sm"
              style={{ background: BRAND }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Aktiv: {activatedReward.label.split(' ')[0]}
            </button>
          ) : null}
        </div>

        <motion.div
          animate={boostFlash ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 0.6 }}
          ref={scrollerRef}
          className="overflow-x-auto overflow-y-hidden no-scrollbar"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x', overscrollBehaviorX: 'contain' }}
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
              const cy = points[i].y + 28; // offset für Labels über den Knoten
              const source = sourceForVisit(visit);
              const label = sourceLabel(source);
              const isActivatedHere = activatedReward?.visitNumber === visit;

              if (reward) {
                const unlocked = visit <= currentVisit && !reward.redeemed;
                const isRedeemed = reward.redeemed;
                return (
                  <div key={visit} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: cx, top: cy }}>
                    {label && (
                      <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-neutral-900/85 text-white text-[10px] font-semibold flex items-center gap-1 whitespace-nowrap">
                        {sourceIcon(source)}
                        {label}
                      </div>
                    )}
                    <button
                      onClick={() => handleRewardTap(reward)}
                      className="focus:outline-none"
                      aria-label={`Belohnung Check-in ${visit}: ${reward.label}`}
                    >
                      <motion.div
                        animate={
                          unlocked || isActivatedHere
                            ? { scale: [1, 1.08, 1] }
                            : {}
                        }
                        transition={{ duration: 1.6, repeat: unlocked || isActivatedHere ? Infinity : 0 }}
                        className="w-16 h-16 rounded-full flex flex-col items-center justify-center border-4 bg-white shadow-md relative"
                        style={{
                          borderColor: isActivatedHere ? '#F5A623' : BRAND,
                          opacity: isRedeemed ? 0.55 : 1,
                          boxShadow: isActivatedHere ? '0 0 0 4px #F5A62333' : undefined,
                        }}
                      >
                        <Gift
                          className="w-6 h-6"
                          style={{ color: isRedeemed ? '#999' : BRAND }}
                        />
                        <span className="text-[10px] font-bold text-neutral-600 mt-0.5">
                          #{visit}
                        </span>
                      </motion.div>
                      {isRedeemed && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-white">
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </div>
                      )}
                      {isActivatedHere && !isRedeemed && (
                        <div className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-bold border-2 border-white">
                          AKTIV
                        </div>
                      )}
                    </button>
                  </div>
                );
              }

              return (
                <div key={visit} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: cx, top: cy }}>
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
        </motion.div>
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
      <div className="px-4 mt-4">
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
          <Button
            onClick={shareReferral}
            className="w-full bg-white hover:bg-white/90"
            style={{ color: BRAND }}
          >
            Einladungslink teilen
          </Button>
        </Card>
      </div>

      {/* Sandbox-Test-Buttons */}
      <div className="px-4 mt-6">
        <Card className="p-3 bg-neutral-100 border-dashed">
          <p className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold mb-2">
            Prototype-Test
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Button size="sm" variant="outline" onClick={simulateCheckIn}>Check-in</Button>
            <Button size="sm" variant="outline" onClick={simulateReferralBoost}>Boost</Button>
            <Button size="sm" variant="outline" onClick={simulateBirthday}>Geburtstag</Button>
          </div>
        </Card>
      </div>

      {/* Pre-Activation Dialog */}
      <Dialog open={!!tappedReward} onOpenChange={(o) => !o && setTappedReward(null)}>
        <DialogContent className="max-w-[320px] rounded-3xl p-6 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: BRAND_SOFT }}
          >
            <Gift className="w-10 h-10" style={{ color: BRAND }} />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 mb-1">
            {tappedReward?.label}
          </h3>
          <p className="text-sm text-neutral-600 mb-5">
            Beim nächsten Check-in einlösen?
          </p>
          <Button
            onClick={activateRewardForNextCheckIn}
            className="w-full text-white"
            style={{ background: BRAND }}
          >
            Aktivieren
          </Button>
          <button
            onClick={() => setTappedReward(null)}
            className="mt-3 text-sm text-neutral-500"
          >
            Abbrechen
          </button>
        </DialogContent>
      </Dialog>

      {/* Vollbild-Einlöseansicht (nur nach Auto-Einlösung beim Check-in) */}
      <AnimatePresence>
        {redemptionScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-6 text-white"
            style={{ background: `linear-gradient(160deg, ${BRAND}, ${BRAND}cc)` }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center mb-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="w-24 h-24 rounded-full bg-white flex items-center justify-center"
              >
                <Check className="w-14 h-14" style={{ color: BRAND }} strokeWidth={3} />
              </motion.div>
            </motion.div>
            <h2 className="text-2xl font-extrabold mb-2 text-center">
              {redemptionScreen.label}
            </h2>
            <p className="text-white/90 text-center text-base mb-10">
              Zeig diesen Screen dem Personal
            </p>
            <Button
              onClick={() => setRedemptionScreen(null)}
              className="bg-white hover:bg-white/90 px-8"
              style={{ color: BRAND }}
            >
              Schließen
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default AppMerchantDetailV2;
