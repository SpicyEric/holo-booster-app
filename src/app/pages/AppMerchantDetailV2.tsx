import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Gift, Check, UserPlus, Sparkles, Rocket, Cake, X, CheckCircle2 } from 'lucide-react';
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
import { generateVerificationCode } from '@/lib/verificationCode';
import {
  enablePrivacyScreen,
  disablePrivacyScreen,
  isScreenBeingCaptured,
} from '@/lib/privacyScreen';
import { EyeOff } from 'lucide-react';

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
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const merchantId = id || DEFAULT_DEMO_MERCHANT_CUSTOMER_ID;
  const brand = useMerchantBrand(merchantId);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [passLength, setPassLength] = useState<number>(35);
  const [dbRewards, setDbRewards] = useState<{ visitNumber: number; label: string; imageUrl: string | null }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const [{ data: cust }, { data: placements }] = await Promise.all([
        supabase.from('customers').select('cover_image_url, pass_length').eq('id', merchantId).maybeSingle(),
        supabase
          .from('reward_placements')
          .select('visit, rewards:reward_id(title, image_url)')
          .eq('customer_id', merchantId)
          .order('visit', { ascending: true }),
      ]);
      if (cancelled) return;
      setCoverImageUrl((cust?.cover_image_url as string | null) || null);
      if (cust?.pass_length) setPassLength(cust.pass_length as number);
      const mapped = (placements || [])
        .filter((p: any) => p.rewards)
        .map((p: any) => ({
          visitNumber: p.visit as number,
          label: p.rewards.title as string,
          imageUrl: (p.rewards.image_url as string | null) || null,
        }));
      setDbRewards(mapped);
    })();
    return () => { cancelled = true; };
  }, [merchantId]);

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

  // Trigger Eincheck-Overlay, wenn von der Scan-Seite mit triggerCheckIn=true navigiert wurde
  useEffect(() => {
    const state = location.state as { triggerCheckIn?: boolean } | null;
    if (!state?.triggerCheckIn) return;
    const stored = getActivatedReward(merchantId);
    const reward = stored ? { visitNumber: stored.visitNumber, label: stored.label, redeemed: false } : null;
    setCheckInOverlay({ code: generateVerificationCode(5), reward });
    setConfirmStage(false);
    // State konsumieren, damit der Overlay nicht bei jedem Re-Mount neu öffnet
    navigate(location.pathname, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, merchantId]);

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

  const [rewards, setRewards] = useState<MockReward[]>([]);

  // Sync DB-Prämien in den Mock-State (vergangene gelten als eingelöst)
  useEffect(() => {
    setRewards((prev) => {
      const redeemedSet = new Set(prev.filter((r) => r.redeemed).map((r) => r.visitNumber));
      return dbRewards.map((r) => ({
        visitNumber: r.visitNumber,
        label: r.label,
        redeemed: redeemedSet.has(r.visitNumber) || r.visitNumber < currentVisit,
      }));
    });
  }, [dbRewards, currentVisit]);

  const [activatedReward, setActivatedReward] = useState<MockReward | null>(null);
  const [tappedReward, setTappedReward] = useState<MockReward | null>(null);
  const [redemptionScreen, setRedemptionScreen] = useState<MockReward | null>(null);
  const [boostFlash, setBoostFlash] = useState(false);
  const [lastCheckInDate, setLastCheckInDate] = useState<string | null>(null);

  // Orange Eincheck-Overlay (Vollbild, mit Code-Marquee)
  const [checkInOverlay, setCheckInOverlay] = useState<{
    code: string;
    reward: MockReward | null;
  } | null>(null);
  const [confirmStage, setConfirmStage] = useState(false);
  const [screenCaptured, setScreenCaptured] = useState(false);

  // Privacy-Screen NUR aktivieren, wenn die sensible Einlöse-Ansicht
  // (oranges Vollbild mit Code-Marquee + Prämie) sichtbar ist.
  const isRedemptionScreenVisible = Boolean(checkInOverlay?.reward);

  useEffect(() => {
    if (!isRedemptionScreenVisible) return;
    enablePrivacyScreen();
    let cancelled = false;
    const poll = setInterval(async () => {
      const captured = await isScreenBeingCaptured();
      if (!cancelled) setScreenCaptured(captured);
    }, 1500);
    // initialer Check
    isScreenBeingCaptured().then((v) => !cancelled && setScreenCaptured(v));
    return () => {
      cancelled = true;
      clearInterval(poll);
      setScreenCaptured(false);
      disablePrivacyScreen();
    };
  }, [isRedemptionScreenVisible]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [showJumpToNow, setShowJumpToNow] = useState(false);

  // ================= Sichtbares Fenster =================
  // Vom ersten Check-in bis 50 Check-ins in die Zukunft (gesamter Pass-Zyklus)
  const windowStart = 1;
  const windowEnd = currentVisit + 50;

  const visibleNodes = useMemo(() => {
    const arr: number[] = [];
    for (let i = windowStart; i <= windowEnd; i++) arr.push(i);
    return arr;
  }, [windowStart, windowEnd]);

  const sourceForVisit = (v: number): CheckInSource | null => {
    return checkIns.find((c) => c.visit === v)?.source ?? null;
  };

  const rewardForVisit = (v: number): MockReward | undefined => {
    return rewards.find((r) => r.visitNumber === v);
  };

  // ================= Effekte =================
  const scrollToCurrent = (smooth = true) => {
    const el = scrollerRef.current;
    if (!el) return;
    const indexInWindow = currentVisit - windowStart;
    const targetX = indexInWindow * NODE_SPACING + NODE_SPACING / 2 - el.clientWidth / 2;
    el.scrollTo({ left: Math.max(0, targetX), behavior: smooth ? 'smooth' : 'auto' });
  };

  // Initial / on currentVisit change: zentriere "Jetzt"
  useEffect(() => {
    scrollToCurrent(true);
  }, [currentVisit]);

  // Track scroll-Distanz zum "Jetzt"-Knoten → Button einblenden
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const indexInWindow = currentVisit - windowStart;
      const currentX = indexInWindow * NODE_SPACING + NODE_SPACING / 2;
      const viewCenter = el.scrollLeft + el.clientWidth / 2;
      setShowJumpToNow(Math.abs(viewCenter - currentX) > el.clientWidth * 0.6);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [currentVisit, windowStart]);

  // Drag-to-scroll mit Maus (Desktop)
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let isDown = false;
    let startX = 0;
    let startScroll = 0;
    let moved = false;

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      isDown = true;
      moved = false;
      startX = e.pageX;
      startScroll = el.scrollLeft;
      el.style.cursor = 'grabbing';
    };
    const onMove = (e: MouseEvent) => {
      if (!isDown) return;
      const dx = e.pageX - startX;
      if (Math.abs(dx) > 4) moved = true;
      el.scrollLeft = startScroll - dx;
    };
    const stop = () => {
      isDown = false;
      el.style.cursor = 'grab';
    };
    const onClickCapture = (e: MouseEvent) => {
      if (moved) {
        e.stopPropagation();
        e.preventDefault();
        moved = false;
      }
    };

    el.style.cursor = 'grab';
    el.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', stop);
    el.addEventListener('click', onClickCapture, true);
    return () => {
      el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', stop);
      el.removeEventListener('click', onClickCapture, true);
    };
  }, []);

  // ================= Aktionen =================
  const todayKey = () => new Date().toISOString().slice(0, 10);

  const performCheckIn = (source: CheckInSource, suppressLimit = false, opts?: { autoRedeem?: boolean; silent?: boolean }) => {
    if (!suppressLimit && lastCheckInDate === todayKey()) {
      toast.info('Heute schon eingecheckt. Bis morgen! 👋');
      return;
    }
    const next = currentVisit + 1;
    setCheckIns((prev) => [...prev, { visit: next, source }]);
    if (!suppressLimit) setLastCheckInDate(todayKey());

    // Aktivierte Prämie automatisch einlösen (z.B. wenn intern aufgerufen)
    if (opts?.autoRedeem && activatedReward) {
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
      return;
    }

    if (opts?.silent) return;

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
            className="px-3 h-12 rounded-2xl flex flex-col items-center justify-center text-white shadow-sm leading-none"
            style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND}cc)`, minWidth: 64 }}
          >
            <span className="text-[9px] font-semibold uppercase tracking-wider opacity-90">Check-ins</span>
            <div className="text-xl font-extrabold mt-1 h-5 overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={currentVisit}
                  initial={{ y: 14, opacity: 0, scale: 0.7 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: -14, opacity: 0, scale: 0.7 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                  className="inline-block"
                >
                  {currentVisit}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Snake */}
      <div className="mt-1 relative overflow-hidden">
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
        <AnimatePresence>
          {showJumpToNow && (
            <motion.button
              initial={{ opacity: 0, y: -8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.9 }}
              onClick={() => scrollToCurrent(true)}
              className="absolute top-2 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full text-white text-xs font-bold shadow-lg flex items-center gap-1.5"
              style={{ background: BRAND }}
            >
              <span>↺</span> Zu „Jetzt" springen
            </motion.button>
          )}
        </AnimatePresence>

        <motion.div
          animate={boostFlash ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 0.6 }}
          ref={scrollerRef}
          className="overflow-x-auto overflow-y-hidden no-scrollbar"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x', overscrollBehaviorX: 'contain' }}
        >
          <div className="relative" style={{ width: totalWidth, height: SNAKE_HEIGHT + 14 }}>
            <svg width={totalWidth} height={SNAKE_HEIGHT} className="absolute inset-x-0 top-3">
              <path
                d={buildSmoothPath(futurePoints)}
                fill="none"
                stroke={BRAND}
                strokeOpacity={0.18}
                strokeWidth={14}
                strokeLinecap="round"
              />
              <motion.path
                key={`completed-${currentVisit}`}
                d={buildSmoothPath(completedPoints)}
                fill="none"
                stroke={BRAND}
                strokeWidth={14}
                strokeLinecap="round"
                initial={{ pathLength: 0.85 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              />
            </svg>

            {visibleNodes.map((visit, i) => {
              const reward = rewardForVisit(visit);
              const isPast = visit < currentVisit;
              const isCurrent = visit === currentVisit;
              const cx = points[i].x;
              const cy = points[i].y + 12; // kleiner Offset (Labels nutzen jetzt oben/unten je nach Position)
              const source = sourceForVisit(visit);
              const label = sourceLabel(source);
              const isActivatedHere = activatedReward?.visitNumber === visit;
              // Top-Knoten der Welle (visit 3, 7, 11, …) → Label unter dem Knoten,
              // sonst über dem Knoten (mehr Platz nach oben sparen)
              const labelBelow = visit % 4 === 3;

              if (reward) {
                const unlocked = visit <= currentVisit && !reward.redeemed;
                const isRedeemed = reward.redeemed;
                return (
                  <div key={visit} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: cx, top: cy }}>
                    {label && (
                      <div
                        className={`absolute left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-neutral-900/85 text-white text-[10px] font-semibold flex items-center gap-1 whitespace-nowrap ${
                          labelBelow ? 'top-full mt-2' : '-top-9'
                        }`}
                      >
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
                        className="w-16 h-16 rounded-full flex items-center justify-center border-4 bg-white shadow-md relative"
                        style={{
                          borderColor: isActivatedHere ? '#F5A623' : BRAND,
                          boxShadow: isActivatedHere ? '0 0 0 4px #F5A62333' : undefined,
                        }}
                      >
                        <Gift
                          className="w-7 h-7"
                          style={{ color: BRAND }}
                        />
                      </motion.div>
                      {isRedeemed && (
                        <div className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center border-[3px] border-white shadow-lg">
                          <Check className="w-5 h-5 text-white" strokeWidth={3.5} />
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
                    <div
                      className={`absolute left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-neutral-900/85 text-white text-[10px] font-semibold flex items-center gap-1 whitespace-nowrap ${
                        labelBelow ? 'top-full mt-2' : '-top-8'
                      }`}
                    >
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

      {/* Hinweis Pre-Activation / Aktivierte Prämie */}
      <div className="px-4 mt-6">
        <Card
          className="p-4 border transition-colors"
          style={{
            borderColor: activatedReward ? '#F5A62355' : `${BRAND}33`,
            background: activatedReward ? '#FFF6E5' : `${BRAND}0a`,
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {activatedReward ? (
              <motion.div
                key="activated"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="flex gap-3 items-start"
              >
                <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-amber-700">
                    Für den nächsten Check-in aktiviert
                  </p>
                  <p className="text-base font-extrabold text-neutral-900 mt-0.5 leading-tight">
                    {activatedReward.label}
                  </p>
                  <button
                    onClick={removeActivation}
                    className="mt-2 text-xs font-semibold text-amber-700 underline-offset-2 hover:underline"
                  >
                    Aktivierung entfernen
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="info"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="flex gap-3"
              >
                <Sparkles className="w-5 h-5 mt-0.5 shrink-0" style={{ color: BRAND }} />
                <div>
                  <p className="text-sm font-semibold text-neutral-900">So funktioniert das Einlösen</p>
                  <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                    Tippe vor deinem nächsten Check-in auf eine freigeschaltete Prämie, um sie zu aktivieren.
                    Beim Check-in wird sie automatisch eingelöst. Pro Tag nur ein Check-in pro Geschäft.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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

      {/* Vollbild-Einlöseansicht (Legacy / nach Auto-Einlösung) */}
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

      {/* Eincheck-Overlay (Vollbild, nach Simulation von der Scan-Seite) */}
      <AnimatePresence>
        {checkInOverlay && (
          <motion.div
            key="checkin-overlay"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 text-center text-white overflow-hidden"
            style={{ background: `linear-gradient(160deg, ${BRAND}, ${BRAND}cc)` }}
          >
            <button
              onClick={() => {
                if (checkInOverlay.reward) {
                  // Mit Prämie: X togglet zum Confirm-Screen
                  setConfirmStage((v) => !v);
                } else {
                  // Ohne Prämie: X schließt direkt + löst Check-in aus
                  setCheckInOverlay(null);
                  setConfirmStage(false);
                  performCheckIn('normal', false, { silent: true });
                }
              }}
              className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur"
              aria-label="Schließen"
            >
              <X className="w-5 h-5" />
            </button>

            <AnimatePresence mode="wait">
              {checkInOverlay.reward && confirmStage ? (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col items-center text-center max-w-xs"
                >
                  <p className="text-sm font-medium uppercase tracking-widest text-white/80 mb-3">
                    Bist du sicher?
                  </p>
                  <h2 className="text-3xl font-extrabold mb-4 leading-tight">
                    Hast du deine Prämie eingelöst?
                  </h2>
                  <p className="text-base text-white/90 mb-8">
                    Bestätige nur, wenn ein Mitarbeiter die Einlösung gesehen hat. Diese Aktion kann nicht rückgängig gemacht werden.
                  </p>
                  <div className="flex flex-col gap-3 w-full">
                    <button
                      onClick={() => {
                        // Bestätigung: Check-in + automatische Einlösung der Prämie
                        performCheckIn('normal', false, { autoRedeem: true, silent: true });
                        setCheckInOverlay(null);
                        setConfirmStage(false);
                        toast.success('Prämie eingelöst!');
                      }}
                      className="w-full rounded-full bg-white text-black font-bold py-3.5 text-base shadow-lg active:scale-95 transition"
                    >
                      Ja, eingelöst
                    </button>
                    <button
                      onClick={() => setConfirmStage(false)}
                      className="w-full rounded-full bg-white/15 backdrop-blur text-white font-semibold py-3.5 text-base active:scale-95 transition"
                    >
                      Noch nicht
                    </button>
                  </div>
                </motion.div>
              ) : checkInOverlay.reward ? (
                <motion.div
                  key="reward-success"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col items-center text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }}
                    className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-6"
                  >
                    <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={2.5} />
                  </motion.div>
                  <p className="text-sm font-medium uppercase tracking-widest text-white/80 mb-2">
                    Deine Prämie wurde eingelöst
                  </p>
                  <h2 className="text-3xl font-extrabold mb-6 leading-tight">
                    {checkInOverlay.reward.label}
                  </h2>
                  <div className="rounded-2xl bg-white/15 backdrop-blur px-5 py-4 max-w-xs">
                    <p className="text-base font-semibold text-white">
                      Zeige diesen Bildschirm einem Mitarbeiter zur Bestätigung.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="plain-checkin"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col items-center text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }}
                    className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-6"
                  >
                    <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={2.5} />
                  </motion.div>
                  <p className="text-sm font-medium uppercase tracking-widest text-white/80 mb-2">
                    Check-in erfolgreich
                  </p>
                  <h2 className="text-3xl font-extrabold mb-6 leading-tight">
                    Du hast eingecheckt!
                  </h2>
                  <div className="rounded-2xl bg-white/15 backdrop-blur px-5 py-4 max-w-xs">
                    <p className="text-base font-semibold text-white">
                      Zeige diesen Bildschirm einem Mitarbeiter zur Bestätigung.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Code-Marquee am oberen Rand — nur bei eingelöster Prämie */}
            {!confirmStage && checkInOverlay.reward && (
              <div className="absolute left-0 right-0 top-0 pt-16 pb-3 overflow-hidden bg-white/10 backdrop-blur border-b border-white/20">
                <div
                  className="flex whitespace-nowrap will-change-transform"
                  style={{ animation: 'eloyo-marquee 14s linear infinite' }}
                >
                  {Array.from({ length: 2 }).map((_, dup) => (
                    <div key={dup} className="flex shrink-0" aria-hidden={dup === 1}>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <span
                          key={`${dup}-${i}`}
                          className="px-6 text-2xl font-black tracking-[0.4em] tabular-nums text-white"
                        >
                          {checkInOverlay.code}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* iOS: aktive Bildschirmaufnahme erkannt → Inhalt ausblenden */}
            {screenCaptured && checkInOverlay.reward && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/95 text-center px-8">
                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-5">
                  <EyeOff className="w-10 h-10 text-white" strokeWidth={2.5} />
                </div>
                <h3 className="text-2xl font-extrabold text-white mb-3">
                  Bildschirmaufnahme erkannt
                </h3>
                <p className="text-base text-white/80 max-w-xs">
                  Code ausgeblendet. Beende die Aufnahme, um deine Prämie an der Kasse einzulösen.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default AppMerchantDetailV2;
