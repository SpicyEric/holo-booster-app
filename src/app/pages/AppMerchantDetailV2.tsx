import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Gift, Check, UserPlus, Sparkles, Cake, X, CheckCircle2, Star, MessageSquare, Calendar as CalendarIcon, Clock, MapPin, Globe, Instagram, Facebook, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { BottomNav } from '@/app/components/layout/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { useMerchantBrand } from '@/hooks/useMerchantBrand';
import { setActiveBrandColor } from '@/lib/activeBrandColor';
import { DEFAULT_DEMO_MERCHANT_CUSTOMER_ID, isDemoMerchantActive } from '@/lib/demoMerchant';
import {
  getActivatedReward,
  getActivatedRewardAsync,
  setActivatedReward as persistActivatedReward,
  setActivatedRewardAsync,
  clearActivatedReward,
} from '@/lib/activeMerchantReward';
import { generateVerificationCode } from '@/lib/verificationCode';
import { EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatTransactionEntry } from '@/app/lib/transactionLabel';

/**
 * Backstube König – Treuepass (V2 Prototype)
 *
 * - Wording: "Check-ins" statt Stempel
 * - Vergangene Knoten zeigen Haken + optionales Label (Boost/Geburtstag)
 * - Markenfarbe pro Händler (CSS-Variablen, BottomNav reagiert)
 * - Pre-Activation: max 1 Check-in/Tag, Prämie vorher aktivieren, beim
 *   nächsten Check-in automatisch einlösen.
 */

type CheckInSource = 'normal' | 'boost' | 'birthday' | 'google_review';

interface CheckInEntry {
  visit: number;
  source: CheckInSource;
  /** ISO timestamp when this check-in happened (optional for legacy entries) */
  at?: string;
  /** Boost only: when the inviter's invitation was accepted */
  invitedAt?: string;
}

interface MockReward {
  visitNumber: number;
  label: string;
  redeemed: boolean;
  imageUrl?: string | null;
  description?: string | null;
}

type RewardPlacementRow = { visit: number; reward_id: string };
type RewardRow = { id: string; title: string; image_url: string | null; description: string | null; marketing_text: string | null; marketing_emoji: string | null };
type MerchantV2RouteState = {
  triggerCheckIn?: boolean;
  checkInAlreadyRecorded?: boolean;
  dbCheckIns?: number;
  welcomeRewardRedeemed?: boolean;
  welcomeRewardLabel?: string | null;
};

const NODE_SPACING = 110;
const SNAKE_HEIGHT = 220;
const AMPLITUDE = 55;
const WAVELENGTH = 4;
const DEMO_PASS_RESET_VERSION = 'checkin7-open-rewards-v4-reset';

// Demo-Daten: Backdated Timestamps, damit Klick-Pop-ups plausible Zeiten zeigen.
const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;
const ts = (daysAgo: number, hour = 10, minute = 30) => {
  const d = new Date(NOW - daysAgo * DAY);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const DEMO_DEFAULT_CHECK_INS: CheckInEntry[] = [
  { visit: 1, source: 'normal', at: ts(28, 9, 15) },
  { visit: 2, source: 'google_review', at: ts(25, 14, 5) },
  { visit: 3, source: 'birthday', at: ts(20, 12, 0) },
  { visit: 4, source: 'normal', at: ts(16, 8, 45) },
  { visit: 5, source: 'boost', at: ts(12, 17, 20), invitedAt: ts(14, 19, 10) },
  { visit: 6, source: 'normal', at: ts(7, 11, 5) },
  { visit: 7, source: 'normal', at: ts(2, 16, 40) },
];

// Standard: Gratisbreze (Visit 4) und Gratiskaffee (Visit 8) sind beide noch offen.
const DEMO_DEFAULT_REDEEMED: number[] = [];

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

interface MerchantInfo {
  name: string;
  description: string | null;
  openingHours: Record<string, { open?: string; close?: string; closed?: boolean }> | null;
  address: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  twitter: string | null;
}

export const AppMerchantDetailV2 = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const merchantId = id || DEFAULT_DEMO_MERCHANT_CUSTOMER_ID;
  const isDemoMerchant = merchantId === DEFAULT_DEMO_MERCHANT_CUSTOMER_ID && isDemoMerchantActive();
  const brand = useMerchantBrand(merchantId);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [passLength, setPassLength] = useState<number>(35);
  const [dbRewards, setDbRewards] = useState<{ visitNumber: number; label: string; imageUrl: string | null; description: string | null; marketingText: string | null; marketingEmoji: string | null }[]>([]);
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo>({
    name: 'Backstube König',
    description: null,
    openingHours: null,
    address: null,
    website: null,
    instagram: null,
    facebook: null,
    twitter: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const [{ data: cust }, { data: placements }, { data: rewardRows }] = await Promise.all([
        supabase
          .from('customers')
          .select('cover_image_url, pass_length, name, company_name, description, opening_hours, street, house_number, postal_code, city, website, instagram, facebook, twitter')
          .eq('id', merchantId)
          .maybeSingle(),
        supabase
          .from('reward_placements')
          .select('visit, reward_id')
          .eq('customer_id', merchantId)
          .order('visit', { ascending: true }),
        supabase
          .from('rewards')
          .select('id, title, image_url, description, marketing_text, marketing_emoji')
          .eq('merchant_customer_id', merchantId)
          .eq('is_active', true),
      ]);
      if (cancelled) return;
      setCoverImageUrl((cust?.cover_image_url as string | null) || null);
      if (cust?.pass_length) setPassLength(cust.pass_length as number);
      if (cust) {
        const street = [cust.street, cust.house_number].filter(Boolean).join(' ');
        const address = [street, cust.postal_code, cust.city].filter(Boolean).join(', ');
        const oh = cust.opening_hours && typeof cust.opening_hours === 'object'
          ? (cust.opening_hours as Record<string, { open?: string; close?: string; closed?: boolean }>)
          : null;
        setMerchantInfo({
          name: (cust.company_name as string) || (cust.name as string) || 'Geschäft',
          description: (cust.description as string) || null,
          openingHours: oh,
          address: address || null,
          website: (cust.website as string) || null,
          instagram: (cust.instagram as string) || null,
          facebook: (cust.facebook as string) || null,
          twitter: (cust.twitter as string) || null,
        });
      }
      const rewardsById = new Map(((rewardRows || []) as RewardRow[]).map((r) => [r.id, r]));
      const mapped = ((placements || []) as RewardPlacementRow[]).flatMap((p) => {
        const reward = rewardsById.get(p.reward_id);
        if (!reward) return [];
        return [{
          visitNumber: p.visit,
          label: reward.title,
          imageUrl: reward.image_url || null,
          description: reward.description || null,
          marketingText: reward.marketing_text || null,
          marketingEmoji: reward.marketing_emoji || null,
        }];
      });
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
    let cancelled = false;
    getActivatedRewardAsync(merchantId).then((stored) => {
      if (!cancelled && stored) {
        setActivatedReward({ ...stored, redeemed: false });
      }
    });
    return () => { cancelled = true; };
  }, [merchantId]);

  // Trigger Eincheck-Overlay, wenn von der Scan-Seite mit triggerCheckIn=true navigiert wurde
  useEffect(() => {
    const state = location.state as MerchantV2RouteState | null;
    if (!state?.triggerCheckIn) return;
    const reward = state.welcomeRewardRedeemed && state.welcomeRewardLabel
      ? { visitNumber: 1, label: state.welcomeRewardLabel, redeemed: false }
      : null;
    setCheckInOverlay({ code: generateVerificationCode(5), reward });
    setConfirmStage(false);
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, merchantId]);

  const BRAND = brand.color;
  const BRAND_SOFT = `${BRAND}22`; // Alpha-Wash via HEX 8-stellig

  // ================= Persistierter State (per Merchant in localStorage) =================
  const storageScope = isDemoMerchant ? 'demo' : (user?.id ?? 'anonymous');
  const checkInsKey = `eloyo:v2:checkins:${storageScope}:${merchantId}`;
  const redeemedKey = `eloyo:v2:redeemed:${storageScope}:${merchantId}`;
  const resetKey = `eloyo:v2:demo-reset:${merchantId}`;
  const lastDateKey = `eloyo:v2:lastcheckin:${storageScope}:${merchantId}`;

  const defaultCheckIns = isDemoMerchant ? DEMO_DEFAULT_CHECK_INS : [];
  const defaultRedeemed = isDemoMerchant ? DEMO_DEFAULT_REDEEMED : [];

  const [checkIns, setCheckIns] = useState<CheckInEntry[]>(() => {
    if (typeof window === 'undefined') return defaultCheckIns;
    try {
      const raw = localStorage.getItem(checkInsKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = (parsed as CheckInEntry[]).map((entry) => {
            if (entry.visit === 5) return { ...entry, source: 'boost' as CheckInSource };
            if (entry.visit === 2) return { ...entry, source: 'google_review' as CheckInSource };
            return entry;
          });
          return normalized;
        }
      }
    } catch { /* noop */ }
    return defaultCheckIns;
  });
  const currentVisit = checkIns[checkIns.length - 1]?.visit ?? 0;

  // Roh-Transaktionen (für History-Modal mit Zeitstempeln je Eintrag).
  type RawTx = { transaction_type: string; description: string | null; created_at: string };
  const [historyTx, setHistoryTx] = useState<RawTx[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [redeemedVisits, setRedeemedVisits] = useState<number[]>(() => {
    if (typeof window === 'undefined') return defaultRedeemed;
    try {
      const raw = localStorage.getItem(redeemedKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as number[];
      }
    } catch { /* noop */ }
    return defaultRedeemed;
  });

  useEffect(() => {
    if (isDemoMerchant || !user?.id || !merchantId) return;
    let cancelled = false;
    (async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: account } = await supabase
        .from('loyalty_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('merchant_customer_id', merchantId)
        .maybeSingle();

      if (cancelled) return;
      if (!account?.id) {
        setCheckIns([]);
        setRedeemedVisits([]);
        return;
      }

      const { data: tx } = await supabase
        .from('point_transactions')
        .select('transaction_type, description, created_at, points_change')
        .eq('loyalty_account_id', account.id)
        .in('transaction_type', ['check_in', 'nfc_stamp', 'referral_bonus', 'reward_redeemed', 'google_review_bonus'])
        .order('created_at', { ascending: true });

      if (cancelled) return;
      setHistoryTx(
        (tx || []).map((row) => ({
          transaction_type: row.transaction_type as string,
          description: (row.description as string | null) ?? null,
          created_at: row.created_at as string,
        })),
      );
      const hasReviewBonus = (tx || []).some((row) => row.transaction_type === 'google_review_bonus');
      const realCheckIns = (tx || [])
        .filter((row) => row.transaction_type === 'check_in' || row.transaction_type === 'nfc_stamp')
        .map((row, index) => {
          const desc = typeof row.description === 'string' ? row.description : '';
          const isReview = desc.includes('Google-Bewertung');
          // Bonus-Check-in durch Empfehlung wird als transaction_type='check_in'
          // mit Beschreibung 'Bonus-Check-in: …' gespeichert.
          const isBoost =
            row.transaction_type === 'referral_bonus' ||
            /^bonus[- ]?check[- ]?in/i.test(desc) ||
            /empfehlung/i.test(desc);
          return {
            visit: index + 1,
            source: (isBoost ? 'boost' : isReview ? 'google_review' : 'normal') as CheckInSource,
            at: row.created_at as string,
          };
        });
      const redeemed = (tx || [])
        .filter((row) => row.transaction_type === 'reward_redeemed')
        .map((row) => Number(String(row.description || '').match(/Visit (\d+)/)?.[1]))
        .filter((visit) => Number.isFinite(visit));

      setCheckIns(realCheckIns);
      if (hasReviewBonus) {
        try { localStorage.setItem(googleReviewKey, '1'); } catch { /* noop */ }
        setGoogleReviewDone(true);
      }
      const uniqRedeemed = Array.from(new Set(redeemed));
      setRedeemedVisits(uniqRedeemed);
      // Wenn die in localStorage gespeicherte aktivierte Prämie laut DB
      // bereits eingelöst wurde, Aktivierung sofort entfernen.
      const persisted = getActivatedReward(merchantId);
      if (persisted && uniqRedeemed.includes(persisted.visitNumber)) {
        clearActivatedReward(merchantId);
        setActivatedReward(null);
      }
    })();
    return () => { cancelled = true; };
  }, [isDemoMerchant, merchantId, user?.id]);

  useEffect(() => {
    if (merchantId !== DEFAULT_DEMO_MERCHANT_CUSTOMER_ID || typeof window === 'undefined') return;
    try {
      if (localStorage.getItem(resetKey) === DEMO_PASS_RESET_VERSION) return;

      const resetCheckIns = [...DEMO_DEFAULT_CHECK_INS];
      const resetRedeemed = [...DEMO_DEFAULT_REDEEMED];
      localStorage.setItem(checkInsKey, JSON.stringify(resetCheckIns));
      localStorage.setItem(redeemedKey, JSON.stringify(resetRedeemed));
      localStorage.setItem(resetKey, DEMO_PASS_RESET_VERSION);
      localStorage.removeItem(lastDateKey);
      clearActivatedReward(merchantId);
      setCheckIns(resetCheckIns);
      setRedeemedVisits(resetRedeemed);
      setActivatedReward(null);
    } catch { /* noop */ }
  }, [checkInsKey, lastDateKey, merchantId, redeemedKey, resetKey]);

  const [rewards, setRewards] = useState<MockReward[]>([]);

  // Persist
  useEffect(() => {
    try { localStorage.setItem(checkInsKey, JSON.stringify(checkIns)); } catch { /* noop */ }
  }, [checkIns, checkInsKey]);
  useEffect(() => {
    try { localStorage.setItem(redeemedKey, JSON.stringify(redeemedVisits)); } catch { /* noop */ }
  }, [redeemedVisits, redeemedKey]);

  // Sync DB-Prämien in den Mock-State. Eine Prämie gilt nur als eingelöst,
  // wenn sie EXPLIZIT in `redeemedVisits` steht – nicht automatisch durch
  // einen späteren Check-in. So bleibt z.B. die Gratisbreze bei Check-in 4
  // auch nach Check-in 7 noch sichtbar einlösbar.
  useEffect(() => {
    setRewards(() =>
      dbRewards.map((r) => ({
        visitNumber: r.visitNumber,
        label: r.label,
        redeemed: redeemedVisits.includes(r.visitNumber),
        imageUrl: r.imageUrl,
        description: r.description,
      })),
    );
  }, [dbRewards, redeemedVisits]);

  const [activatedReward, setActivatedReward] = useState<MockReward | null>(null);
  const [tappedReward, setTappedReward] = useState<MockReward | null>(null);
  const [tappedRewardActivatable, setTappedRewardActivatable] = useState(true);
  const [redemptionScreen, setRedemptionScreen] = useState<MockReward | null>(null);
  const [boostFlash, setBoostFlash] = useState(false);
  const [boostInfoOpen, setBoostInfoOpen] = useState(false);
  const [nextBoostPreview, setNextBoostPreview] = useState<{ successful_referrals: number; next_boost: number; is_new_cycle: boolean } | null>(null);

  useEffect(() => {
    if (!merchantId || !user?.id || isDemoMerchant) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc('get_next_boost_reward', { p_merchant_customer_id: merchantId });
        if (!error && !cancelled && data) {
          setNextBoostPreview(data as unknown as { successful_referrals: number; next_boost: number; is_new_cycle: boolean });
        }
      } catch { /* noop */ }
    })();
    return () => { cancelled = true; };
  }, [merchantId, user?.id, isDemoMerchant, checkIns.length]);
  const [lastCheckInDate, setLastCheckInDate] = useState<string | null>(null);
  const [lastRedeemDate, setLastRedeemDate] = useState<string | null>(null);
  const [limitModal, setLimitModal] = useState<null | 'checkin' | 'reward'>(null);

  // Auto-Aktivierung der ersten Prämie beim allerersten Check-in:
  // Wenn der User noch nie eingecheckt hat und der Händler eine Prämie auf
  // Visit 1 hinterlegt hat, wird diese automatisch als aktivierte Prämie
  // gesetzt – ohne Nachfrage. Beim ersten Scan wird sie dann mit eingelöst.
  useEffect(() => {
    if (currentVisit !== 0) return;
    if (activatedReward) return;
    if (getActivatedReward(merchantId)) return;
    const firstReward = dbRewards.find((r) => r.visitNumber === 1);
    if (!firstReward) return;
    const reward: MockReward = {
      visitNumber: firstReward.visitNumber,
      label: firstReward.label,
      redeemed: false,
    };
    setActivatedReward(reward);
    persistActivatedReward(merchantId, {
      visitNumber: reward.visitNumber,
      label: reward.label,
    });
  }, [merchantId, currentVisit, dbRewards, activatedReward]);

  // Orange Eincheck-Overlay (Vollbild, mit Code-Marquee)
  const [checkInOverlay, setCheckInOverlay] = useState<{
    code: string;
    reward: MockReward | null;
  } | null>(null);
  const [confirmStage, setConfirmStage] = useState(false);
  const [screenCaptured, setScreenCaptured] = useState(false);

  // ===== Entry-Transition vom Home-Pass =====
  // Phasen:
  //  flying    – Cover-Bild fliegt + skaliert + verblasst gleichzeitig (eine smoothe Bewegung)
  //  sectionsIn – Sektionen unterhalb (Hinweis, Freunde) faden Step-by-Step ein
  //  snakeIn   – Schlange wischt von links nach rechts ein
  //  done      – fertig
  type EntryPhase = 'idle' | 'flying' | 'sectionsIn' | 'snakeIn' | 'done' | 'exiting';
  const readEntryPayload = () => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem('treuepass-transition');
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data.merchantId !== merchantId) return null;
      if (Date.now() - data.timestamp > 1500) return null;
      return data as { rect: { top: number; left: number; width: number; height: number }; coverUrl: string | null };
    } catch { return null; }
  };
  const [entryPhase, setEntryPhase] = useState<EntryPhase>(() => (readEntryPayload() ? 'flying' : 'done'));
  const [entryOrigin, setEntryOrigin] = useState<{ top: number; left: number; width: number; height: number } | null>(() => readEntryPayload()?.rect ?? null);
  const [entryTarget, setEntryTarget] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [entryCover, setEntryCover] = useState<string | null>(() => readEntryPayload()?.coverUrl ?? null);
  const snakeBandRef = useRef<HTMLDivElement>(null);

  // ===== Exit-Transition zum Scan-Screen =====
  // exitStage: 0 = snake collapse, 1 = info card weg, 2 = freunde weg, 3 = navigate
  const [exitStage, setExitStage] = useState(0);
  const [exitOrigin, setExitOrigin] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [exitTarget, setExitTarget] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [exitScanUrl, setExitScanUrl] = useState<string | null>(null);

  useEffect(() => {
    try { sessionStorage.removeItem('treuepass-transition'); } catch { void 0; }
  }, [merchantId]);

  // Ziel-Rect ermitteln, sobald Snake-Band gemountet ist
  useEffect(() => {
    if (entryPhase !== 'flying' || entryTarget) return;
    const measure = () => {
      const r = snakeBandRef.current?.getBoundingClientRect();
      if (r && r.height > 0) {
        setEntryTarget({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else {
        requestAnimationFrame(measure);
      }
    };
    requestAnimationFrame(measure);
  }, [entryPhase, entryTarget]);

  // Exit-Trigger: BottomNav Scan-Button auf Merchant-Detail-Seite
  // Hard-Cut auf Scan-Seite (keine Morph-Animation mehr).
  useEffect(() => {
    const handler = (ev: Event) => {
      const e = ev as CustomEvent<{ merchantId: string; scanUrl: string }>;
      if (!e.detail || e.detail.merchantId !== merchantId) return;
      e.preventDefault();
      // Scan-Screen direkt mit fertiger Karte zeigen, ohne Slide-Up-Intro
      try { sessionStorage.setItem('scan-skip-intro', String(Date.now())); } catch { void 0; }
      navigate(e.detail.scanUrl);
    };
    window.addEventListener('app:treuepass-exit-to-scan', handler as EventListener);
    return () => window.removeEventListener('app:treuepass-exit-to-scan', handler as EventListener);
  }, [merchantId, navigate]);

  // Eigentliche Navigation, sobald Exit-Animation fertig ist
  useEffect(() => {
    if (entryPhase === 'exiting' && exitStage >= 3 && exitScanUrl) {
      navigate(exitScanUrl);
    }
  }, [entryPhase, exitStage, exitScanUrl, navigate]);

  const isEntering = entryPhase !== 'done' && entryPhase !== 'exiting';
  const isExiting = entryPhase === 'exiting';
  // Sektionen sichtbar wenn Entry abgeschlossen UND noch nicht im Exit-Stage > Sektion
  const infoVisible = entryPhase === 'done' || (entryPhase === 'exiting' && exitStage < 1)
    || entryPhase === 'sectionsIn' || entryPhase === 'snakeIn';
  const friendsVisible = entryPhase === 'done' || (entryPhase === 'exiting' && exitStage < 2)
    || entryPhase === 'sectionsIn' || entryPhase === 'snakeIn';
  const sectionsRevealed = entryPhase === 'sectionsIn' || entryPhase === 'snakeIn' || entryPhase === 'done';
  const snakeRevealed = entryPhase === 'snakeIn' || entryPhase === 'done';
  // Snake wird beim Exit sofort komplett weg-clipped

  // Privacy-Screen entfernt: Screenshots auf Android sind wieder erlaubt.
  const isRedemptionScreenVisible = Boolean(checkInOverlay?.reward);

  useEffect(() => {
    setScreenCaptured(false);
  }, [isRedemptionScreenVisible]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [showJumpToNow, setShowJumpToNow] = useState(false);

  // ================= Sichtbares Fenster =================
  // Immer von Check-in 1 bis 50 Check-ins in die Zukunft – Prämien wiederholen
  // sich anhand der eingestellten Passlänge (z.B. passLength=10 → Check-in 11
  // zeigt dieselbe Prämie wie Check-in 1).
  const windowStart = 1;
  const windowEnd = Math.max(50, currentVisit + 50);

  const visibleNodes = useMemo(() => {
    const arr: number[] = [];
    for (let i = windowStart; i <= windowEnd; i++) arr.push(i);
    return arr;
  }, [windowStart, windowEnd]);

  const sourceForVisit = (v: number): CheckInSource | null => {
    return checkIns.find((c) => c.visit === v)?.source ?? null;
  };

  const rewardForVisit = (v: number): MockReward | undefined => {
    // Direkte Belegung an dieser Visit-Nummer (innerhalb der ersten Passlänge)
    const direct = rewards.find((r) => r.visitNumber === v);
    if (direct) return direct;
    // Wiederholungs-Logik: Prämien wiederholen sich mit Periode = passLength
    if (passLength > 0 && v > passLength) {
      const cycleVisit = ((v - 1) % passLength) + 1;
      const base = rewards.find((r) => r.visitNumber === cycleVisit);
      if (base) {
        return {
          ...base,
          visitNumber: v,
          redeemed: redeemedVisits.includes(v),
        };
      }
    }
    return undefined;
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
    let ready = false;
    const readyTimer = window.setTimeout(() => { ready = true; }, 600);
    const onScroll = () => {
      if (!ready) return;
      const indexInWindow = currentVisit - windowStart;
      const currentX = indexInWindow * NODE_SPACING + NODE_SPACING / 2;
      const viewCenter = el.scrollLeft + el.clientWidth / 2;
      setShowJumpToNow(Math.abs(viewCenter - currentX) > el.clientWidth * 0.6);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(readyTimer);
      el.removeEventListener('scroll', onScroll);
    };
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
      setLimitModal('checkin');
      return;
    }
    const next = currentVisit + 1;
    setCheckIns((prev) => [...prev, { visit: next, source }]);
    if (!suppressLimit) setLastCheckInDate(todayKey());

    // Aktivierte Prämie automatisch einlösen (z.B. wenn intern aufgerufen)
    if (opts?.autoRedeem && activatedReward) {
      if (lastRedeemDate === todayKey()) {
        setLimitModal('reward');
        return;
      }
      const reward = activatedReward;
      setActivatedReward(null);
      clearActivatedReward(merchantId);
      setLastRedeemDate(todayKey());
      setRedeemedVisits((prev) => prev.includes(reward.visitNumber) ? prev : [...prev, reward.visitNumber]);
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
    if (reward.redeemed) {
      // Bereits eingelöste Prämie → Detail-Pop-up zeigen
      const entry = checkIns.find((c) => c.visit === reward.visitNumber);
      setNodeDetail({ kind: 'reward-redeemed', label: reward.label, at: entry?.at });
      return;
    }
    // Aktivierbar nur, wenn Prämie in der Vergangenheit/jetzt liegt (noch nicht eingelöst)
    // ODER beim direkt nächsten Check-in (currentVisit + 1).
    const isPastOrCurrent = reward.visitNumber <= currentVisit;
    const isNextCheckIn = reward.visitNumber === currentVisit + 1;
    const activatable = isPastOrCurrent || isNextCheckIn;
    setTappedRewardActivatable(activatable);
    setTappedReward(reward);
  };

  const activateRewardForNextCheckIn = async () => {
    if (!tappedReward) return;
    setActivatedReward(tappedReward);
    await setActivatedRewardAsync(merchantId, {
      visitNumber: tappedReward.visitNumber,
      label: tappedReward.label,
    });
    console.log('[TreuepassV2] Activated reward persisted:', merchantId, tappedReward.visitNumber, tappedReward.label);
    setTappedReward(null);
    return;
  };

  const removeActivation = () => {
    setActivatedReward(null);
    clearActivatedReward(merchantId);
    toast('Aktivierung entfernt.');
  };

  // Erzeugt einen echten Einladungslink + WhatsApp-Text auf Basis der ersten Prämie.
  const buildReferralPayload = async (): Promise<{ link: string; text: string } | null> => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.rpc('create_invitation', {
        p_merchant_customer_id: merchantId,
      });
      if (error) throw error;
      const result = data as { success: boolean; share_code?: string; error?: string };
      if (!result.success || !result.share_code) {
        toast.error(result.error || 'Einladung konnte nicht erstellt werden');
        return null;
      }
      const link = `https://eloyo.de/i/${result.share_code}`;
      const firstReward = dbRewards.find((r) => r.visitNumber === 1) || dbRewards[0];
      const rewardText = (firstReward?.marketingText || '').trim();
      const rewardEmoji = (firstReward?.marketingEmoji || '').trim() || '🎁';
      const rewardPart = rewardText
        ? ` gibt's beim ersten Check-in ${rewardText} ${rewardEmoji}`
        : ` gibt's coole Belohnungen beim Punkte-Sammeln ${rewardEmoji}`;
      const text = `Yo, bei ${merchantInfo.name}${rewardPart}. App laden, einchecken, fertig: ${link}`;
      // Statistik: als verschickt markieren
      void supabase.rpc('mark_invitation_shared', { p_share_code: result.share_code });
      return { link, text };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
      toast.error(msg);
      return null;
    }
  };

  const shareReferral = async () => {
    const payload = await buildReferralPayload();
    if (!payload) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: merchantInfo.name,
          text: payload.text,
          url: payload.link,
        });
      } else {
        await navigator.clipboard.writeText(payload.link);
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
    if (s === 'google_review') return 'Bewertung';
    if (s === 'normal') return 'Check-in';
    return null;
  };

  // Kein Emoji/Icon im Label – das Symbol steckt schon im Kreis selbst
  const sourceIcon = (_s: CheckInSource | null) => null;

  const sourceNodeIcon = (s: CheckInSource | null) => {
    if (s === 'boost') return <UserPlus className="w-5 h-5 text-white" strokeWidth={2.8} />;
    if (s === 'birthday') return <Cake className="w-5 h-5 text-white" strokeWidth={2.8} />;
    if (s === 'google_review') return <Star className="w-5 h-5 text-white" strokeWidth={2.8} fill="white" />;
    return <Check className="w-5 h-5 text-white" strokeWidth={3} />;
  };

  // ============== Node-Detail-Pop-up & Google-Review-Demo ==============
  type NodeDetail =
    | { kind: 'check-in'; visit: number; source: CheckInSource; at?: string; invitedAt?: string; redeemed?: { label: string; at?: string } | null }
    | { kind: 'reward-redeemed'; label: string; at?: string };
  const [nodeDetail, setNodeDetail] = useState<NodeDetail | null>(null);
  const [googleReviewOpen, setGoogleReviewOpen] = useState(false);
  const googleReviewKey = `eloyo:v2:google-review-done:${merchantId}`;
  const [googleReviewDone, setGoogleReviewDone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(googleReviewKey) === '1';
  });
  // Reset auch das Google-Review-Flag bei Demo-Reset (nur für Demo-Merchant)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (merchantId !== DEFAULT_DEMO_MERCHANT_CUSTOMER_ID) return;
    if (localStorage.getItem(resetKey) !== DEMO_PASS_RESET_VERSION) {
      try { localStorage.removeItem(googleReviewKey); } catch { /* noop */ }
      setGoogleReviewDone(false);
    }
  }, [resetKey, googleReviewKey, merchantId]);

  const formatDateTime = (iso?: string) => {
    if (!iso) return '–';
    try {
      return new Date(iso).toLocaleString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return '–'; }
  };

  const openNodeDetail = (visit: number) => {
    const entry = checkIns.find((c) => c.visit === visit);
    if (!entry) return;
    const reward = rewards.find((r) => r.visitNumber === visit);
    setNodeDetail({
      kind: 'check-in',
      visit,
      source: entry.source,
      at: entry.at,
      invitedAt: entry.invitedAt,
      redeemed: reward?.redeemed ? { label: reward.label, at: entry.at } : null,
    });
  };

  const openRewardRedeemedDetail = (reward: MockReward) => {
    const entry = checkIns.find((c) => c.visit === reward.visitNumber);
    setNodeDetail({ kind: 'reward-redeemed', label: reward.label, at: entry?.at });
  };

  const handleGoogleReviewClick = () => {
    if (googleReviewDone) return;
    void (async () => {
      let rpcOk = isDemoMerchant; // Demo bypassed RPC
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase.rpc('award_google_review_bonus', { p_merchant_customer_id: merchantId });
        if (!error && (data as any)?.success) rpcOk = true;
        if (!error && (data as any)?.error_code === 'already_redeemed') {
          // Bereits eingelöst → Flag setzen, kein neuer Check-in
          try { localStorage.setItem(googleReviewKey, '1'); } catch { /* noop */ }
          setGoogleReviewDone(true);
          setGoogleReviewOpen(false);
          window.open(`https://www.google.com/search?q=${encodeURIComponent('Backstube König Bewertung')}`, '_blank');
          return;
        }
      } catch { /* Demo: ignorieren */ }

      if (!rpcOk) {
        setGoogleReviewOpen(false);
        return;
      }

      try { localStorage.setItem(googleReviewKey, '1'); } catch { /* noop */ }
      setGoogleReviewDone(true);
      const next = currentVisit + 1;
      setCheckIns((prev) => [...prev, { visit: next, source: 'google_review', at: new Date().toISOString() }]);
      setGoogleReviewOpen(false);
      window.open(`https://www.google.com/search?q=${encodeURIComponent('Backstube König Bewertung')}`, '_blank');
    })();
  };


  return (
    <div
      className="bg-[#faf8f5] dark:bg-background dark:bg-gradient-to-b dark:from-background dark:to-muted/30 overflow-hidden"
      style={{
        ['--brand' as string]: BRAND,
        height: '100dvh',
      }}
    >
      <div
        className="h-full overflow-y-auto overflow-x-hidden pb-40"
        style={{ overscrollBehavior: 'none', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-card backdrop-blur">
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
            <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 truncate">{merchantInfo.name}</h1>
            <p className="text-xs font-medium" style={{ color: BRAND }}>Dein Treuepass</p>
          </div>
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            aria-label="Verlauf anzeigen"
            className="px-3 h-12 rounded-2xl flex flex-col items-center justify-center text-white shadow-sm leading-none active:scale-95 transition-transform"
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
          </button>
        </div>
      </div>

      {/* Snake */}
      <div ref={snakeBandRef} className="mt-1 relative overflow-hidden">
        {coverImageUrl && (
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none transition-opacity duration-300"
            style={{
              backgroundImage: `url(${coverImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: entryPhase === 'flying' ? 0 : 0.18,
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
          style={{
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-x',
            overscrollBehaviorX: 'contain',
            clipPath: snakeRevealed && !isExiting ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
            transition: 'clip-path 800ms cubic-bezier(0.22,1,0.36,1)',
          }}
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
                    {/* Hinweis: Auf Prämien-Knoten kein "Check-in"-Label – die Prämie steht im Vordergrund. */}
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
                        className="w-16 h-16 rounded-full flex items-center justify-center border-4 bg-white dark:bg-neutral-800 shadow-md relative"
                        style={{
                          borderColor: isActivatedHere ? '#F5A623' : BRAND,
                          boxShadow: isActivatedHere ? '0 0 0 4px #F5A62333' : undefined,
                        }}
                      >
                        {reward.imageUrl ? (
                          <img
                            src={reward.imageUrl}
                            alt={reward.label}
                            className="w-full h-full rounded-full object-cover"
                            style={{ opacity: isRedeemed ? 0.6 : 1 }}
                          />
                        ) : (
                          <Gift
                            className="w-7 h-7"
                            style={{ color: BRAND, opacity: isRedeemed ? 0.6 : 1 }}
                          />
                        )}
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
                    <div
                      className={`absolute left-1/2 -translate-x-1/2 ${labelBelow ? '-top-7' : 'top-full mt-2'} px-2 py-0.5 rounded-full bg-white dark:bg-neutral-800 shadow-sm text-[10px] font-semibold text-neutral-800 dark:text-neutral-100 max-w-[110px] truncate text-center pointer-events-none`}
                      title={reward.label}
                    >
                      {reward.label}
                    </div>
                  </div>
                );
              }

              return (
                <div key={visit} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: cx, top: cy }}>
                  {label && (
                    <div
                      className={`absolute left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-neutral-900/85 dark:bg-neutral-100/90 text-white dark:text-neutral-900 text-[10px] font-semibold flex items-center gap-1 whitespace-nowrap ${
                        labelBelow ? 'top-full mt-2' : '-top-8'
                      }`}
                    >
                      {sourceIcon(source)}
                      {label}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={isPast ? () => openNodeDetail(visit) : undefined}
                    disabled={!isPast}
                    aria-label={isPast ? `Check-in ${visit} Details` : `Check-in ${visit}`}
                    className="focus:outline-none"
                  >
                    <motion.div
                      animate={isCurrent ? { scale: [1, 1.06, 1] } : {}}
                      transition={{ duration: 1.4, repeat: isCurrent ? Infinity : 0 }}
                      className="rounded-full flex items-center justify-center border-4 shadow dark:[--node-bg:theme(colors.neutral.800)]"
                      style={{
                        width: isCurrent ? 56 : 44,
                        height: isCurrent ? 56 : 44,
                        background: isPast ? BRAND : 'var(--node-bg, #fff)',
                        borderColor: isPast || isCurrent ? BRAND : `${BRAND}55`,
                      }}
                    >
                      {isPast ? (
                        sourceNodeIcon(source)
                      ) : (
                        <span
                          className="text-sm font-bold"
                          style={{ color: isCurrent ? BRAND : `${BRAND}99` }}
                        >
                          {isCurrent ? 'Jetzt' : visit}
                        </span>
                      )}
                    </motion.div>
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Aktivierte Prämie / Tipp-Hinweis unter dem Treuepass-Pfad */}
      {activatedReward ? (
        <motion.div
          className="px-4 mt-6"
          initial={isEntering ? { opacity: 0, y: 10 } : false}
          animate={infoVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card
            className="p-4 border transition-colors"
            style={{ borderColor: '#F5A62355', background: '#FFF6E5' }}
          >
            <div className="flex gap-3 items-start">
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
            </div>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          className="px-4 mt-3 mb-2"
          initial={isEntering ? { opacity: 0, y: 6 } : false}
          animate={infoVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="rounded-lg px-3 py-2 text-[13px] leading-snug font-medium"
            style={{
              background: `${BRAND}14`,
              color: `color-mix(in srgb, ${BRAND} 75%, black)`,
            }}
          >
            <span className="mr-1.5">💡</span>
            Tippe eine Prämie an, um sie beim nächsten Check-in einzulösen
          </div>
        </motion.div>
      )}

      {/* Boost holen */}
      <motion.div
        className="px-4 mt-4"
        initial={isEntering ? { opacity: 0, y: 10 } : false}
        animate={friendsVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: sectionsRevealed && !isExiting ? 0.25 : 0 }}
      >
        <Card
          className="relative p-5 border-0 text-white shadow-lg overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND}cc)` }}
        >
          {nextBoostPreview && nextBoostPreview.next_boost > 0 && (
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/95 text-[11px] font-bold shadow-sm flex items-center gap-1" style={{ color: BRAND }}>
              <span>{nextBoostPreview.next_boost === 3 ? '🚀🚀🚀' : nextBoostPreview.next_boost === 2 ? '🚀🚀' : '🚀'}</span>
              <span>+{nextBoostPreview.next_boost} Check-in{nextBoostPreview.next_boost === 1 ? '' : 's'}</span>
            </div>
          )}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Boost holen</h3>
              <p className="text-xs text-white/85">
                Lade Freunde ein
              </p>
            </div>
          </div>
          <Button
            onClick={() => setBoostInfoOpen(true)}
            className="w-full bg-white hover:bg-white/90"
            style={{ color: BRAND }}
          >
            Jetzt boosten
          </Button>
        </Card>
      </motion.div>

      {/* Geschäfts-Infos — vor allem für Stores ohne eigenen Treuepass relevant */}
      {currentVisit === 0 && (
        <MerchantInfoSection info={merchantInfo} brand={BRAND} />
      )}

      {/* Google-Bewertung abgeben — nur wenn min. 1 Check-in & noch nicht abgegeben */}
      {currentVisit >= 1 && !googleReviewDone && (
        <motion.div
          className="px-4 mt-4"
          initial={isEntering ? { opacity: 0, y: 10 } : false}
          animate={friendsVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: sectionsRevealed && !isExiting ? 0.3 : 0 }}
        >
          <Card
            className="p-5 border-0 text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND}cc)` }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
                <Star className="w-5 h-5" fill="white" />
              </div>
              <div>
                <h3 className="font-bold text-base">Hol dir einen Check-in</h3>
                <p className="text-xs text-white/85">Bewerte uns bei Google</p>
              </div>
            </div>
            <Button
              onClick={() => setGoogleReviewOpen(true)}
              className="w-full bg-white hover:bg-white/90"
              style={{ color: BRAND }}
            >
              Bewerten
            </Button>
          </Card>
        </motion.div>
      )}

      {/* Google-Bewertungs-Pop-up */}
      <Dialog open={googleReviewOpen} onOpenChange={setGoogleReviewOpen}>
        <DialogContent className="max-w-[320px] rounded-3xl p-6 gap-4">
          <div className="text-center space-y-2">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
              style={{ background: BRAND_SOFT }}
            >
              <Star className="w-7 h-7" style={{ color: BRAND }} fill={BRAND} />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Bewertung abgeben</h2>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">So funktioniert's</p>
          </div>
          <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed text-center">
            Bewerte <span className="font-semibold text-neutral-900 dark:text-neutral-100">{merchantInfo.name}</span> bei Google.
            Du bekommst <span className="font-semibold text-neutral-900 dark:text-neutral-100">+1 Check-in</span> geschenkt.
            <br />
            <span className="text-xs text-neutral-500 dark:text-neutral-400">Nur einmal pro Geschäft möglich.</span>
          </p>
          <Button
            onClick={handleGoogleReviewClick}
            className="w-full h-11 rounded-xl text-white"
            style={{ background: BRAND }}
          >
            Bei Google bewerten
          </Button>
        </DialogContent>
      </Dialog>

      {/* Knoten-Detail-Pop-up (Check-in / Boost / Geburtstag / Bewertung / Prämie) */}
      <Dialog open={!!nodeDetail} onOpenChange={(o) => !o && setNodeDetail(null)}>
        <DialogContent className="max-w-[320px] rounded-3xl p-6 gap-3">
          {nodeDetail?.kind === 'check-in' && (
            <>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                  style={{ background: BRAND }}
                >
                  {sourceNodeIcon(nodeDetail.source)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                    {nodeDetail.source === 'boost' ? 'Boost'
                      : nodeDetail.source === 'birthday' ? 'Geburtstag'
                      : nodeDetail.source === 'google_review' ? 'Bewertung'
                      : 'Check-in'}
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Check-in #{nodeDetail.visit}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300 mt-2">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-neutral-400" />
                  <span>
                    {nodeDetail.source === 'boost' ? 'Boost erhalten am ' : 'Eingecheckt am '}
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">{formatDateTime(nodeDetail.at)}</span>
                  </span>
                </div>
                {nodeDetail.source === 'boost' && nodeDetail.invitedAt && (
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-neutral-400" />
                    <span>
                      Einladung angenommen am{' '}
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">{formatDateTime(nodeDetail.invitedAt)}</span>
                    </span>
                  </div>
                )}
                {nodeDetail.source === 'normal' && (
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-neutral-400" />
                    <span>
                      Prämie eingelöst:{' '}
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {nodeDetail.redeemed ? `Ja – ${nodeDetail.redeemed.label}` : 'Nein'}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
          {nodeDetail?.kind === 'reward-redeemed' && (
            <>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: BRAND_SOFT }}
                >
                  <Gift className="w-6 h-6" style={{ color: BRAND }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Prämie eingelöst</h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{nodeDetail.label}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 mt-2">
                <CalendarIcon className="w-4 h-4 text-neutral-400" />
                <span>Eingelöst am <span className="font-semibold text-neutral-900 dark:text-neutral-100">{formatDateTime(nodeDetail.at)}</span></span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Boost-Info Popup */}
      <Dialog open={boostInfoOpen} onOpenChange={setBoostInfoOpen}>
        <DialogContent className="max-w-[320px] rounded-3xl p-6 gap-4">
          <div className="text-center space-y-2">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
              style={{ background: BRAND_SOFT }}
            >
              <UserPlus className="w-7 h-7" style={{ color: BRAND }} />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Jetzt boosten</h2>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              So funktioniert's
            </p>
          </div>

          <ol className="space-y-2.5 text-sm text-neutral-700 dark:text-neutral-300">
            <li className="flex gap-2.5">
              <span
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: BRAND }}
              >1</span>
              <span>Teile deinen Einladungslink.</span>
            </li>
            <li className="flex gap-2.5">
              <span
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: BRAND }}
              >2</span>
              <span>Dein Freund checkt bei <span className="font-semibold text-neutral-900 dark:text-neutral-100">{merchantInfo.name}</span> ein.</span>
            </li>
            <li className="flex gap-2.5">
              <span
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: BRAND }}
              >3</span>
              <span>
                {(() => {
                  const n = nextBoostPreview?.next_boost ?? 1;
                  const prev = nextBoostPreview?.successful_referrals ?? 0;
                  if (n >= 2) {
                    return (
                      <>
                        Da das deine <span className="font-semibold text-neutral-900 dark:text-neutral-100">{prev + 1}. erfolgreiche Empfehlung</span> wird, bekommst <span className="font-semibold text-neutral-900 dark:text-neutral-100">du +{n} Boost{n === 1 ? '' : 's'}</span> auf deinem Treuepass. Dein Freund bekommt <span className="font-semibold text-neutral-900 dark:text-neutral-100">+1 Boost</span>.
                      </>
                    );
                  }
                  return (
                    <>
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">Ihr beide</span> bekommt jeweils <span className="font-semibold text-neutral-900 dark:text-neutral-100">+1 Boost</span> auf eurem Treuepass.
                    </>
                  );
                })()}
              </span>
            </li>
          </ol>

          <div className="space-y-2 pt-1">
            <Button
              onClick={async () => {
                const payload = await buildReferralPayload();
                if (!payload) return;
                window.open(`https://wa.me/?text=${encodeURIComponent(payload.text)}`, '_blank', 'noopener,noreferrer');
              }}
              className="w-full h-11 rounded-xl text-white"
              style={{ background: BRAND }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
              </svg>
              Per WhatsApp teilen
            </Button>
            <Button
              onClick={async () => {
                const payload = await buildReferralPayload();
                if (!payload) return;
                try {
                  await navigator.clipboard.writeText(payload.link);
                  toast.success('Link kopiert!');
                } catch {
                  toast.error('Link konnte nicht kopiert werden');
                }
              }}
              variant="outline"
              className="w-full h-10 rounded-xl"
            >
              Link kopieren
            </Button>
            <Button
              onClick={shareReferral}
              variant="ghost"
              className="w-full h-10 rounded-xl text-neutral-600"
            >
              Mehr Optionen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!tappedReward} onOpenChange={(o) => !o && setTappedReward(null)}>
        <DialogContent className="max-w-[320px] rounded-3xl p-6 text-center">
          {tappedReward?.imageUrl ? (
            <img
              src={tappedReward.imageUrl}
              alt={tappedReward.label}
              className="w-24 h-24 rounded-2xl object-cover mx-auto mb-4"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: BRAND_SOFT }}
            >
              <Gift className="w-10 h-10" style={{ color: BRAND }} />
            </div>
          )}
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1">
            {tappedReward?.label}
          </h3>
          {tappedReward?.description && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
              {tappedReward.description}
            </p>
          )}
          {tappedRewardActivatable ? (
            <>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-5">
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
            </>
          ) : (
            <>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-5">
                Du kannst diese Prämie erst aktivieren, wenn du dem Check-in näher bist.
              </p>
              <Button
                onClick={() => setTappedReward(null)}
                className="w-full text-white"
                style={{ background: BRAND }}
              >
                Verstanden
              </Button>
            </>
          )}
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
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 text-center text-white overflow-hidden touch-none overscroll-none"
            style={{
              background: `linear-gradient(180deg, ${BRAND} 0%, ${BRAND} 60%, ${BRAND}e6 100%)`,
              touchAction: 'none',
              overscrollBehavior: 'none',
            }}
            onTouchMove={(e) => e.preventDefault()}
          >
            <button
              onClick={() => {
                // Der Check-in (und ggf. die Willkommensprämie) wurden bereits
                // beim NFC-Scan in der DB gespeichert. Hier NIEMALS einen
                // zusätzlichen Check-in lokal erzeugen – wir schließen nur das
                // Overlay bzw. zeigen den Confirm-Schritt für Prämien.
                if (checkInOverlay.reward) {
                  setConfirmStage((v) => !v);
                } else {
                  setCheckInOverlay(null);
                  setConfirmStage(false);
                }
              }}
              className="absolute right-5 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur"
              style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}
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
                      onClick={async () => {
                        // Check-in + Prämie sind bereits in der DB.
                        // Hier nur lokalen UI-State synchron halten (Aktivierung
                        // entfernen, Prämie als eingelöst markieren) – KEIN
                        // zusätzlicher performCheckIn-Aufruf!
                        const reward = checkInOverlay?.reward;
                        const code = checkInOverlay?.code;
                        if (reward) {
                          setActivatedReward(null);
                          clearActivatedReward(merchantId);
                          setRedeemedVisits((prev) =>
                            prev.includes(reward.visitNumber) ? prev : [...prev, reward.visitNumber],
                          );
                          // Persistiere die Einlösung inkl. Bestätigungs-Code,
                          // damit der Code im Backoffice-Verlauf des Händlers sichtbar wird.
                          try {
                            await supabase.rpc('redeem_activated_reward', {
                              p_merchant_customer_id: merchantId,
                              p_visit_number: reward.visitNumber,
                              p_reward_label: reward.label,
                              p_verification_code: code ?? null,
                            });
                          } catch (e) {
                            console.error('[V2] redeem_activated_reward failed', e);
                          }
                        }
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
                  <motion.div
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                    className="rounded-2xl bg-white/15 backdrop-blur px-5 py-4 max-w-xs shadow-[0_0_24px_rgba(255,255,255,0.18)]"
                  >
                    <p className="text-base font-semibold text-white">
                      Zeige diesen Bildschirm einem Mitarbeiter zur Bestätigung.
                    </p>
                  </motion.div>
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
                </motion.div>
              )}
            </AnimatePresence>

            {/* Code-Marquee — direkt über dem Häkchen, groß & gut lesbar */}
            {!confirmStage && checkInOverlay.reward && (
              <div className="absolute left-0 right-0 top-[calc(50%-256px)] py-4 overflow-hidden bg-white/10 backdrop-blur border-y border-white/20">
                <div
                  className="flex whitespace-nowrap will-change-transform"
                  style={{ animation: 'eloyo-marquee 22s linear infinite' }}
                >
                  {Array.from({ length: 2 }).map((_, dup) => (
                    <div key={dup} className="flex shrink-0" aria-hidden={dup === 1}>
                      {Array.from({ length: 24 }).map((_, i) => (
                        <span
                          key={`${dup}-${i}`}
                          className="px-7 text-3xl font-extrabold tracking-[0.4em] tabular-nums text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)]"
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

      {/* Entry-Transition vom Home-Pass: Cover fliegt + skaliert + verblasst gleichzeitig */}
      <AnimatePresence>
        {isEntering && entryOrigin && entryCover && entryPhase === 'flying' && (
          <motion.div
            key="cover-fly"
            className="fixed z-[60] pointer-events-none shadow-xl"
            initial={{
              top: entryOrigin.top,
              left: entryOrigin.left,
              width: entryOrigin.width,
              height: entryOrigin.height,
              opacity: 1,
            }}
            animate={
              entryTarget
                ? {
                    top: entryTarget.top,
                    left: entryTarget.left,
                    width: entryTarget.width,
                    height: entryTarget.height,
                    opacity: 0.18,
                  }
                : undefined
            }
            transition={{
              duration: 0.75,
              ease: [0.22, 1, 0.36, 1],
              opacity: { duration: 0.75, ease: [0.4, 0, 0.6, 1] },
            }}
            onAnimationComplete={() => {
              if (entryPhase === 'flying') {
                setEntryPhase('sectionsIn');
                setTimeout(() => setEntryPhase('snakeIn'), 700);
                setTimeout(() => setEntryPhase('done'), 1600);
              }
            }}
            style={{
              backgroundImage: `url(${entryCover})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: 20,
              filter: 'saturate(0.9)',
              // Weicher, feathered Rand der während des gesamten Flugs erhalten bleibt
              WebkitMaskImage:
                'radial-gradient(ellipse 95% 92% at 50% 50%, #000 55%, rgba(0,0,0,0.85) 75%, rgba(0,0,0,0) 100%)',
              maskImage:
                'radial-gradient(ellipse 95% 92% at 50% 50%, #000 55%, rgba(0,0,0,0.85) 75%, rgba(0,0,0,0) 100%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Exit-Transition zum Scan-Screen: Cover morpht von Snake-Band zur Scan-Card */}
      <AnimatePresence>
        {isExiting && exitOrigin && exitTarget && coverImageUrl && (
          <motion.div
            key="cover-fly-exit"
            className="fixed z-[60] pointer-events-none overflow-hidden shadow-2xl"
            initial={{
              top: exitOrigin.top,
              left: exitOrigin.left,
              width: exitOrigin.width,
              height: exitOrigin.height,
              borderRadius: 0,
              opacity: 0.5,
            }}
            animate={{
              top: exitTarget.top,
              left: exitTarget.left,
              width: exitTarget.width,
              height: exitTarget.height,
              borderRadius: 16,
              opacity: 1,
            }}
            transition={{
              duration: 0.55,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              backgroundImage: `url(${coverImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: BRAND,
            }}
          >
            {/* Brand tint fades in during flight so the landing matches the scan card */}
            <motion.div
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND}cc)` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.85 }}
              transition={{ duration: 0.55, ease: [0.4, 0, 0.6, 1] }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={!!limitModal} onOpenChange={(open) => !open && setLimitModal(null)}>
        <DialogContent
          className="max-w-[320px] rounded-2xl border-0 p-0 overflow-hidden"
          style={{ background: '#fff' }}
        >
          <div className="px-6 pt-6 pb-5 text-center">
            <div className="text-4xl mb-3">
              {limitModal === 'reward' ? '🎁' : '⏰'}
            </div>
            <h3 className="text-base font-bold text-neutral-900 mb-2">
              {limitModal === 'reward' ? 'Schon eine Prämie heute' : 'Schon eingecheckt heute'}
            </h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              {limitModal === 'reward'
                ? 'Du kannst maximal eine Prämie pro Tag einlösen. Komm morgen wieder!'
                : 'Du kannst pro Tag einmal bei jedem Geschäft einchecken. Komm morgen wieder!'}
            </p>
          </div>
          <div className="px-4 pb-4">
            <Button
              onClick={() => setLimitModal(null)}
              className="w-full rounded-xl text-white font-semibold"
              style={{ background: BRAND }}
            >
              Verstanden
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ Verlaufs-Modal ============ */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent
          className="max-w-[360px] rounded-3xl p-0 gap-0 overflow-hidden"
          style={{ borderTop: `4px solid ${BRAND}` }}
        >
          <div
            className="px-5 pt-5 pb-4 text-white relative"
            style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND}cc)` }}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-90">
              Dein Verlauf
            </div>
            <div className="mt-1 text-lg font-bold leading-tight truncate">
              {merchantInfo.name}
            </div>
            <div className="mt-1 text-xs opacity-90">
              {currentVisit} Check-in{currentVisit === 1 ? '' : 's'} insgesamt
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto px-2 py-2">
            {(() => {
              type Entry = {
                key: string;
                kind: 'check_in' | 'boost' | 'review' | 'redeem';
                primary: string;
                secondary?: string;
                at: string;
              };
              const entries: Entry[] = [];

              if (isDemoMerchant) {
                checkIns.forEach((c, i) => {
                  const at = c.at ?? new Date(NOW - (checkIns.length - i) * DAY).toISOString();
                  if (c.source === 'boost') {
                    entries.push({ key: `c-${i}`, kind: 'boost', primary: 'Boost durch Empfehlung', at });
                  } else if (c.source === 'google_review') {
                    entries.push({ key: `c-${i}`, kind: 'review', primary: 'Check-in für Google-Bewertung', at });
                  } else {
                    entries.push({ key: `c-${i}`, kind: 'check_in', primary: 'Check-in durch Besuch', at });
                  }
                  if (redeemedVisits.includes(c.visit)) {
                    const rw = rewardForVisit(c.visit);
                    entries.push({
                      key: `r-${c.visit}`,
                      kind: 'redeem',
                      primary: `Prämie eingelöst bei Check-in: ${c.visit}`,
                      secondary: rw?.label,
                      at,
                    });
                  }
                });
              } else {
                historyTx.forEach((row, i) => {
                  const fmt = formatTransactionEntry(row.transaction_type, row.description);
                  let kind: Entry['kind'] = 'check_in';
                  if (row.transaction_type === 'check_in' || row.transaction_type === 'nfc_stamp') {
                    const desc = (row.description || '').toLowerCase();
                    if (/bonus[- ]?check[- ]?in|empfehlung/.test(desc)) kind = 'boost';
                    else if (desc.includes('google-bewertung')) kind = 'review';
                    else kind = 'check_in';
                  } else if (row.transaction_type === 'reward_redeemed') {
                    kind = 'redeem';
                  } else if (row.transaction_type === 'google_review_bonus') {
                    kind = 'review';
                  } else if (row.transaction_type === 'referral_bonus') {
                    kind = 'boost';
                  }
                  entries.push({
                    key: `tx-${i}`,
                    kind,
                    primary: fmt.primary,
                    secondary: fmt.secondary,
                    at: row.created_at,
                  });
                });
              }

              entries.sort((a, b) => +new Date(b.at) - +new Date(a.at));

              if (entries.length === 0) {
                return (
                  <div className="px-4 py-10 text-center text-sm text-neutral-500">
                    Noch keine Aktivität.
                  </div>
                );
              }

              const iconFor = (k: Entry['kind']) => {
                if (k === 'redeem') return <Gift className="h-4 w-4" style={{ color: BRAND }} />;
                if (k === 'review') return <Star className="h-4 w-4" style={{ color: BRAND }} />;
                if (k === 'boost') return <Sparkles className="h-4 w-4" style={{ color: BRAND }} />;
                return <Check className="h-4 w-4" style={{ color: BRAND }} />;
              };

              const fmtDate = (iso: string) => {
                try {
                  const d = new Date(iso);
                  const day = String(d.getDate()).padStart(2, '0');
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const year = d.getFullYear();
                  const hh = String(d.getHours()).padStart(2, '0');
                  const mm = String(d.getMinutes()).padStart(2, '0');
                  return `${day}.${month}.${year} · ${hh}:${mm} Uhr`;
                } catch {
                  return '';
                }
              };

              return (
                <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {entries.map((e) => (
                    <li key={e.key} className="flex gap-3 px-3 py-3">
                      <div
                        className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center"
                        style={{ background: BRAND_SOFT }}
                      >
                        {iconFor(e.kind)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 leading-tight">
                          {e.primary}
                        </div>
                        {e.secondary && (
                          <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 leading-tight">
                            {e.secondary}
                          </div>
                        )}
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-500 mt-1">
                          {fmtDate(e.at)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </div>
          <div className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-800">
            <Button
              onClick={() => setHistoryOpen(false)}
              className="w-full h-10 rounded-xl text-white"
              style={{ background: BRAND }}
            >
              Schließen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      </div>
      <BottomNav />
    </div>
  );
};


const INFO_DAY_LABELS: { key: string; label: string }[] = [
  { key: 'monday', label: 'Mo' },
  { key: 'tuesday', label: 'Di' },
  { key: 'wednesday', label: 'Mi' },
  { key: 'thursday', label: 'Do' },
  { key: 'friday', label: 'Fr' },
  { key: 'saturday', label: 'Sa' },
  { key: 'sunday', label: 'So' },
];

function normalizeWebUrl(value: string | null): string | null {
  const t = value?.trim();
  if (!t) return null;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}
function normalizeIgUrl(value: string | null): string | null {
  const t = value?.trim().replace(/^@/, '');
  if (!t) return null;
  return /^https?:\/\//i.test(t) ? t : `https://instagram.com/${t}`;
}

function MerchantInfoSection({ info, brand }: { info: MerchantInfo; brand: string }) {
  const web = normalizeWebUrl(info.website);
  const ig = normalizeIgUrl(info.instagram);
  const fb = normalizeWebUrl(info.facebook);
  const tw = normalizeWebUrl(info.twitter);
  const links: { href: string; label: string; Icon: typeof Globe }[] = [];
  if (web) links.push({ href: web, label: 'Website', Icon: Globe });
  if (ig) links.push({ href: ig, label: 'Instagram', Icon: Instagram });
  if (fb) links.push({ href: fb, label: 'Facebook', Icon: Facebook });
  if (tw) links.push({ href: tw, label: 'Twitter', Icon: Twitter });

  const visibleHours = info.openingHours
    ? INFO_DAY_LABELS.map(({ key, label }) => {
        const day = info.openingHours?.[key];
        if (!day) return null;
        return {
          label,
          time: day.closed ? 'Geschlossen' : [day.open, day.close].filter(Boolean).join(' – '),
        };
      }).filter((e): e is { label: string; time: string } => !!e && !!e.time)
    : [];

  if (!info.description && visibleHours.length === 0 && !info.address && links.length === 0) {
    return null;
  }

  return (
    <div className="px-4 mt-4 space-y-3">
      {info.description && (
        <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-line">
          {info.description}
        </p>
      )}

      {visibleHours.length > 0 && (
        <div className="rounded-xl border bg-white/70 dark:bg-neutral-900/60 p-3" style={{ borderColor: `${brand}33` }}>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
            <Clock className="h-4 w-4" style={{ color: brand }} />
            Öffnungszeiten
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            {visibleHours.map((entry) => (
              <div key={entry.label} className="contents">
                <span className="text-neutral-500 dark:text-neutral-400">{entry.label}</span>
                <span className="text-neutral-800 dark:text-neutral-200">{entry.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {info.address && (
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(info.address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300"
        >
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: brand }} />
          <span>{info.address}</span>
        </a>
      )}

      {links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {links.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ backgroundColor: `${brand}1f`, color: brand }}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default AppMerchantDetailV2;
