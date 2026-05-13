import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Gift, Check, UserPlus, Sparkles, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { BottomNav } from '@/app/components/layout/BottomNav';

/**
 * Backstube König – Treue-Reise (V2 Prototype)
 *
 * Eigenständige Sandbox-Ansicht. Wird ausschließlich für die
 * Backstube-König-Demo aktiviert. Nutzt komplett gemockte Daten.
 */

interface MockReward {
  visitNumber: number;
  label: string;
  redeemed: boolean;
}

const ORANGE = '#FF6B35';
const GOLD = '#F5A623';
const NODE_SPACING = 110; // px zwischen Knoten
const SNAKE_HEIGHT = 220;
const AMPLITUDE = 55;
const WAVELENGTH = 4; // Knoten pro Sinus-Periode

// Wiederkehrende Belohnungen ab Besuch 10 (alle 5 Schritte)
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

  // ================= Mock-State =================
  const [currentVisit, setCurrentVisit] = useState(4);
  const [rewards, setRewards] = useState<MockReward[]>([
    { visitNumber: 1, label: 'Willkommens-Brötchen 🎁', redeemed: true },
    { visitNumber: 3, label: 'Kaffee gratis ☕', redeemed: false },
    { visitNumber: 6, label: '3 Brötchen gratis 🥐', redeemed: false },
    { visitNumber: 10, label: '5€ Gutschein 🎟️', redeemed: false },
  ]);
  const [referralBoosts] = useState(1);
  const [lastRedemptionDate, setLastRedemptionDate] = useState<string | null>(null);

  const [tappedReward, setTappedReward] = useState<MockReward | null>(null);
  const [redemptionScreen, setRedemptionScreen] = useState<MockReward | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [boostFlash, setBoostFlash] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);

  // ================= Sichtbares Fenster =================
  const windowStart = Math.max(1, currentVisit - 5);
  const windowEnd = currentVisit + 10;

  const visibleNodes = useMemo(() => {
    const arr: number[] = [];
    for (let i = windowStart; i <= windowEnd; i++) arr.push(i);
    return arr;
  }, [windowStart, windowEnd]);

  const rewardForVisit = (v: number): MockReward | undefined => {
    const direct = rewards.find((r) => r.visitNumber === v);
    if (direct) return direct;
    if (isRepeatingRewardVisit(v)) {
      return { visitNumber: v, label: 'Kaffee gratis ☕', redeemed: false };
    }
    return undefined;
  };

  // Aktuell einlösbare Belohnungen: alle Reward-Knoten im sichtbaren Fenster,
  // die bereits erreicht (visitNumber <= currentVisit) und nicht eingelöst sind.
  const redeemableRewards = useMemo(() => {
    return visibleNodes
      .filter((v) => v <= currentVisit)
      .map((v) => rewardForVisit(v))
      .filter((r): r is MockReward => Boolean(r) && !r!.redeemed);
  }, [visibleNodes, currentVisit, rewards]);

  // ================= Effekte =================
  // Auto-Scroll: aktuelle Position zentrieren
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const indexInWindow = currentVisit - windowStart;
    const targetX = indexInWindow * NODE_SPACING + NODE_SPACING / 2 - el.clientWidth / 2;
    el.scrollTo({ left: Math.max(0, targetX), behavior: 'smooth' });
  }, [currentVisit, windowStart]);

  // ================= Aktionen =================
  const todayKey = () => new Date().toISOString().slice(0, 10);

  const simulateCheckIn = () => {
    if (lastRedemptionDate === todayKey() + ':checkin') {
      toast.info('Heute schon eingecheckt. Bis morgen! 👋');
      return;
    }
    setCurrentVisit((v) => v + 1);
    setLastRedemptionDate(todayKey() + ':checkin');
    const next = currentVisit + 2;
    const nextReward = rewardForVisit(next);
    if (nextReward) {
      setTimeout(() => {
        toast(`Nächster Besuch: ${nextReward.label}`, {
          description: 'Komm bald wieder!',
        });
      }, 600);
    }
  };

  const simulateReferralBoost = () => {
    setBoostFlash(true);
    setCurrentVisit((v) => v + 1);
    toast('Lena hat deinen Link genutzt! +1 Bonus-Schritt 🚀');
    setTimeout(() => setBoostFlash(false), 1400);
  };

  const handleRewardTap = (reward: MockReward) => {
    if (reward.redeemed) return;
    if (reward.visitNumber > currentVisit) {
      toast.info('Diese Belohnung ist noch nicht freigeschaltet.');
      return;
    }
    setTappedReward(reward);
  };

  const activateReward = () => {
    if (!tappedReward) return;
    if (lastRedemptionDate === todayKey()) {
      toast.error('Heute schon eine Prämie eingelöst. Komm morgen wieder! 😊');
      setTappedReward(null);
      return;
    }
    const reward = tappedReward;
    setTappedReward(null);
    setRedemptionScreen(reward);
  };

  const confirmRedemption = () => {
    if (!redemptionScreen) return;
    const reward = redemptionScreen;
    setRewards((prev) => {
      const exists = prev.some((r) => r.visitNumber === reward.visitNumber);
      if (exists) {
        return prev.map((r) =>
          r.visitNumber === reward.visitNumber ? { ...r, redeemed: true } : r,
        );
      }
      return [...prev, { ...reward, redeemed: true }];
    });
    setLastRedemptionDate(todayKey());
    setRedemptionScreen(null);
    toast.success('Belohnung eingelöst! 🎉');
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
    } catch {
      /* user cancelled */
    }
  };

  // ================= Render =================
  const points = visibleNodes.map((_, i) => ({
    x: i * NODE_SPACING + NODE_SPACING / 2,
    y: nodeY(i + windowStart),
  }));

  const completedPoints = points.filter((_, i) => visibleNodes[i] <= currentVisit);
  const futurePoints = points.filter((_, i) => visibleNodes[i] >= currentVisit);

  const totalWidth = visibleNodes.length * NODE_SPACING;

  return (
    <div className="min-h-screen bg-[hsl(35,40%,98%)] pb-24" style={{ colorScheme: 'light' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-orange-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('/app/stores')}
            className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center"
            aria-label="Zurück"
          >
            <ArrowLeft className="w-5 h-5 text-orange-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-neutral-900 truncate">Backstube König</h1>
            <p className="text-xs text-orange-600 font-medium">Deine Treue-Reise</p>
          </div>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
            style={{ background: `linear-gradient(135deg, ${ORANGE}, ${GOLD})` }}
          >
            🥐
          </div>
        </div>
      </div>

      {/* Snake */}
      <div className="mt-6">
        <div className="px-4 mb-3 flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-orange-500/80 font-semibold">
              Dein Fortschritt
            </p>
            <p className="text-2xl font-extrabold text-neutral-900">
              Besuch #{currentVisit}
            </p>
          </div>
          {referralBoosts > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
              <Rocket className="w-3.5 h-3.5" />
              {referralBoosts} Boost
            </div>
          )}
        </div>

        <motion.div
          animate={boostFlash ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 0.6 }}
          ref={scrollerRef}
          className="overflow-x-auto overflow-y-hidden no-scrollbar"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div
            className="relative"
            style={{ width: totalWidth, height: SNAKE_HEIGHT }}
          >
            <svg
              width={totalWidth}
              height={SNAKE_HEIGHT}
              className="absolute inset-0"
            >
              {/* Future path (faded) */}
              <path
                d={buildSmoothPath(futurePoints)}
                fill="none"
                stroke={ORANGE}
                strokeOpacity={0.18}
                strokeWidth={14}
                strokeLinecap="round"
              />
              {/* Completed path */}
              <path
                d={buildSmoothPath(completedPoints)}
                fill="none"
                stroke={ORANGE}
                strokeWidth={14}
                strokeLinecap="round"
              />
            </svg>

            {visibleNodes.map((visit, i) => {
              const reward = rewardForVisit(visit);
              const isPast = visit < currentVisit;
              const isCurrent = visit === currentVisit;
              const isFuture = visit > currentVisit;
              const cx = points[i].x;
              const cy = points[i].y;

              if (reward) {
                const unlocked = visit <= currentVisit && !reward.redeemed;
                const isRedeemed = reward.redeemed;
                return (
                  <button
                    key={visit}
                    onClick={() => handleRewardTap(reward)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
                    style={{ left: cx, top: cy }}
                    aria-label={`Belohnung Besuch ${visit}: ${reward.label}`}
                  >
                    <motion.div
                      animate={
                        unlocked
                          ? { scale: [1, 1.08, 1], boxShadow: [
                              `0 0 0 0 ${GOLD}66`,
                              `0 0 0 12px ${GOLD}00`,
                              `0 0 0 0 ${GOLD}00`,
                            ] }
                          : {}
                      }
                      transition={{ duration: 1.6, repeat: unlocked ? Infinity : 0 }}
                      className="w-16 h-16 rounded-full flex flex-col items-center justify-center border-4 bg-white shadow-md"
                      style={{
                        borderColor: GOLD,
                        opacity: isRedeemed ? 0.55 : 1,
                      }}
                    >
                      <Gift
                        className="w-6 h-6"
                        style={{ color: isRedeemed ? '#999' : GOLD }}
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
                  </button>
                );
              }

              return (
                <div
                  key={visit}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: cx, top: cy }}
                >
                  <motion.div
                    animate={
                      isCurrent
                        ? {
                            boxShadow: [
                              `0 0 0 0 ${ORANGE}80`,
                              `0 0 0 14px ${ORANGE}00`,
                            ],
                          }
                        : {}
                    }
                    transition={{ duration: 1.4, repeat: isCurrent ? Infinity : 0 }}
                    className="rounded-full flex items-center justify-center border-4 shadow"
                    style={{
                      width: isCurrent ? 56 : 44,
                      height: isCurrent ? 56 : 44,
                      background: isPast ? ORANGE : '#fff',
                      borderColor: isPast || isCurrent ? ORANGE : '#FFD9C7',
                    }}
                  >
                    <span
                      className="text-sm font-bold"
                      style={{
                        color: isPast ? '#fff' : isCurrent ? ORANGE : '#C9A99A',
                      }}
                    >
                      {isCurrent ? 'Jetzt' : visit}
                    </span>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Meine Belohnungen */}
      <div className="px-4 mt-8">
        <h2 className="text-base font-bold text-neutral-900 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-orange-500" />
          Meine Belohnungen
        </h2>
        {redeemableRewards.length === 0 ? (
          <Card className="p-4 bg-orange-50/50 border-dashed border-orange-200">
            <p className="text-sm text-neutral-600 text-center">
              Aktuell keine Belohnung verfügbar. Sammle weiter Besuche!
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {redeemableRewards.map((r) => (
              <Card
                key={r.visitNumber}
                className="p-4 flex items-center gap-3 border-orange-200 bg-white"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: `${GOLD}22` }}
                >
                  <Gift className="w-6 h-6" style={{ color: GOLD }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-neutral-900 truncate">{r.label}</p>
                  <p className="text-xs text-neutral-500">Freigeschaltet bei Besuch #{r.visitNumber}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setTappedReward(r)}
                  className="text-white"
                  style={{ background: ORANGE }}
                >
                  Einlösen
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Freunde einladen */}
      <div className="px-4 mt-8">
        <Card
          className="p-5 border-0 text-white shadow-lg"
          style={{ background: `linear-gradient(135deg, ${ORANGE}, ${GOLD})` }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Freunde einladen</h3>
              <p className="text-xs text-white/85">
                Für jede erfolgreiche Einladung: +1 Schritt auf deiner Reise
              </p>
            </div>
          </div>
          <Button
            onClick={shareReferral}
            className="w-full bg-white hover:bg-white/90"
            style={{ color: ORANGE }}
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
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={simulateCheckIn}
              className="flex-1"
            >
              Check-in simulieren
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={simulateReferralBoost}
              className="flex-1"
            >
              Boost simulieren
            </Button>
          </div>
        </Card>
      </div>

      {/* Tap-Reward Dialog */}
      <Dialog open={!!tappedReward} onOpenChange={(o) => !o && setTappedReward(null)}>
        <DialogContent className="max-w-[320px] rounded-3xl p-6 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: `${GOLD}22` }}
          >
            <Gift className="w-10 h-10" style={{ color: GOLD }} />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 mb-1">
            {tappedReward?.label}
          </h3>
          <p className="text-sm text-neutral-600 mb-5">
            Jetzt beim Personal einlösen?
          </p>
          <Button
            onClick={activateReward}
            className="w-full text-white"
            style={{ background: ORANGE }}
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

      {/* Vollbild-Einlöseansicht */}
      <AnimatePresence>
        {redemptionScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-6 text-white"
            style={{ background: `linear-gradient(160deg, ${ORANGE}, ${GOLD})` }}
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
                <Check className="w-14 h-14" style={{ color: ORANGE }} strokeWidth={3} />
              </motion.div>
            </motion.div>
            <h2 className="text-2xl font-extrabold mb-2 text-center">
              {redemptionScreen.label}
            </h2>
            <p className="text-white/90 text-center text-base mb-10">
              Zeig diesen Screen dem Personal
            </p>
            <Button
              onClick={confirmRedemption}
              className="bg-white hover:bg-white/90 px-8"
              style={{ color: ORANGE }}
            >
              Bestätigen & schließen
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default AppMerchantDetailV2;
