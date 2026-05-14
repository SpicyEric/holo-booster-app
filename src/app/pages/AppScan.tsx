import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Nfc, XCircle, Settings, CheckCircle2, Sparkles, X, ScanLine } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BottomNav } from '@/app/components/layout/BottomNav';
import { nfcService, type NfcReadResult } from '@/app/services/nfcService';
import { useNetworkStatus } from '@/app/hooks/useNetworkStatus';
import { offlineScanQueue } from '@/app/lib/offlineScanQueue';
import { NfcPermissionDialog } from '@/app/components/NfcPermissionDialog';
import { OfflineBanner } from '@/app/components/OfflineBanner';
import Particles from '@/components/Particles';
import { maybeAwardReferralBonus } from '@/app/lib/referralBonus';
import { maybeUnlockNewCustomerOffer } from '@/app/lib/newCustomerOffer';
import { useMerchantBrand } from '@/hooks/useMerchantBrand';
import { setActiveBrandColor } from '@/lib/activeBrandColor';
import {
  getActivatedReward,
  clearActivatedReward,
  type ActivatedReward,
} from '@/lib/activeMerchantReward';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ScanResult = {
  success: boolean;
  points?: number;
  totalPoints?: number;
  merchantName?: string;
  merchantCustomerId?: string;
  error?: string;
  isOffline?: boolean;
};

type FlipPhase = 'idle' | 'armed' | 'flipping' | 'navigating';

type TransitionMerchant = {
  id: string;
  name: string;
  company_name: string | null;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  city: string | null;
  street: string | null;
  house_number: string | null;
  postal_code: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  opening_hours: any;
  google_review_url: string | null;
  latitude: number | null;
  longitude: number | null;
};

type TransitionReward = {
  id: string;
  title: string;
  description: string | null;
  points_required: number;
  image_url: string | null;
};

type MerchantTransitionState = {
  fromScan: true;
  initialMerchant: TransitionMerchant;
  initialRewards: TransitionReward[];
  initialUserPoints: number;
  scanAwardedPoints?: number;
};

export const AppScan = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isOnline = useNetworkStatus();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcEnabled, setNfcEnabled] = useState(true);
  const [checkingNfc, setCheckingNfc] = useState(true);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [permissionDialogType, setPermissionDialogType] = useState<'disabled' | 'permission_denied'>('disabled');
  const [flipPhase, setFlipPhase] = useState<FlipPhase>('idle');
  const [preparingFlip, setPreparingFlip] = useState(false);
  const preparingFlipRef = useRef(false);
  const [merchantImage, setMerchantImage] = useState<string | null>(null);
  const [merchantDisplayName, setMerchantDisplayName] = useState<string>('');
  const [transitionState, setTransitionState] = useState<MerchantTransitionState | null>(null);
  const mainScrollRef = useRef<HTMLElement | null>(null);

  // ===== Merchant-Context (wenn Scan von einer Treuepass-Detailseite kommt) =====
  const contextMerchantId = searchParams.get('merchant');
  const merchantBrand = useMerchantBrand(contextMerchantId);
  const [contextMerchant, setContextMerchant] = useState<{
    id: string;
    name: string;
    cover_image_url: string | null;
    logo_url: string | null;
  } | null>(null);
  const [activatedReward, setActivatedRewardState] = useState<ActivatedReward | null>(null);
  const [redemptionOverlay, setRedemptionOverlay] = useState<ActivatedReward | null>(null);
  const [showRedeemConfirm, setShowRedeemConfirm] = useState(false);
  const [simulatedFlip, setSimulatedFlip] = useState<'idle' | 'flipping'>('idle');

  useEffect(() => {
    if (!contextMerchantId) {
      setContextMerchant(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('customers')
        .select('id, name, company_name, cover_image_url, logo_url')
        .eq('id', contextMerchantId)
        .maybeSingle();
      if (cancelled || !data) return;
      setContextMerchant({
        id: data.id,
        name: (data as any).company_name || data.name,
        cover_image_url: (data as any).cover_image_url ?? null,
        logo_url: (data as any).logo_url ?? null,
      });
      setActivatedRewardState(getActivatedReward(contextMerchantId));
    })();
    return () => { cancelled = true; };
  }, [contextMerchantId]);

  // Markenfarbe global publizieren, damit der BottomNav-Scan-Button die
  // Händlerfarbe behält.
  useEffect(() => {
    if (contextMerchantId && merchantBrand.color) {
      setActiveBrandColor(merchantBrand.color);
      return () => setActiveBrandColor(null);
    }
  }, [contextMerchantId, merchantBrand.color]);

  const BRAND = merchantBrand.color;
  const hasMerchantContext = Boolean(contextMerchantId && contextMerchant);

  // Wenn ein Merchant-Kontext aktiv ist, autostart-NFC nicht ausführen
  // (Nutzer entscheidet selbst zwischen echtem Scan und Simulation).
  const skipAutostart = hasMerchantContext;

  const updatePreparingFlip = useCallback((value: boolean) => {
    preparingFlipRef.current = value;
    setPreparingFlip(value);
  }, []);

  const resetTransitionState = useCallback(() => {
    setFlipPhase('idle');
    updatePreparingFlip(false);
    setResult(null);
    setMerchantImage(null);
    setMerchantDisplayName('');
    setTransitionState(null);
  }, [updatePreparingFlip]);

  const navigateToMerchant = useCallback((
    merchantCustomerId: string,
    options?: {
      fallbackPoints?: number;
      state?: MerchantTransitionState | null;
    },
  ) => {
    const performNavigation = () => {
      navigate(`/app/merchant/${merchantCustomerId}`, {
        replace: true,
        state: options?.state ?? {
          fromScan: true,
          initialUserPoints: options?.fallbackPoints ?? 0,
        },
      });
    };

    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => void;
    };

    if (transitionDocument.startViewTransition) {
      transitionDocument.startViewTransition(() => {
        performNavigation();
      });
    } else {
      performNavigation();
    }

    window.setTimeout(() => {
      resetTransitionState();
    }, 100);
  }, [navigate, resetTransitionState]);

  const preloadMerchantImage = useCallback(async (imageUrl: string | null) => {
    if (!imageUrl) return null;

    const isLoaded = await new Promise<boolean>((resolve) => {
      const img = new Image();
      let settled = false;

      const finalize = (loaded: boolean) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        resolve(loaded);
      };

      const finishLoad = async () => {
        try {
          if (typeof img.decode === 'function') {
            await img.decode();
          }
        } catch {
          // Ignore decode issues and use the already loaded bitmap.
        }

        finalize(true);
      };

      const timeoutId = window.setTimeout(() => {
        finalize(img.complete && img.naturalWidth > 0);
      }, 8000);

      img.onload = () => {
        void finishLoad();
      };
      img.onerror = () => finalize(false);

      const priorityImage = img as HTMLImageElement & { fetchPriority?: 'high' | 'low' | 'auto' };
      priorityImage.fetchPriority = 'high';
      img.src = imageUrl;

      if (img.complete && img.naturalWidth > 0) {
        void finishLoad();
      }
    });

    return isLoaded ? imageUrl : null;
  }, []);

  useEffect(() => {
    const checkNfcSupport = async () => {
      setCheckingNfc(true);
      try {
        const supported = await nfcService.isSupported();
        setNfcSupported(supported);
        if (supported) {
          const enabled = await nfcService.isEnabled();
          setNfcEnabled(enabled);
        }
      } catch (error) {
        console.error('Error checking NFC support:', error);
        setNfcSupported(false);
      } finally {
        setCheckingNfc(false);
      }
    };
    checkNfcSupport();
    return () => { nfcService.stopScan(); };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    mainScrollRef.current?.scrollTo({ top: 0, left: 0 });
  }, []);

  useEffect(() => {
    const autostart = searchParams.get('autostart');
    if (autostart && !checkingNfc && nfcSupported && nfcEnabled && !scanning && !result) {
      startNFCScan();
    }
  }, [searchParams, checkingNfc, nfcSupported, nfcEnabled]);

  // Trigger flip animation when we get a successful online result
  useEffect(() => {
    console.log('[AppScan] Flip useEffect triggered, result:', result?.success, result?.merchantCustomerId, 'flipPhase:', flipPhase, 'preparing:', preparingFlipRef.current);
    if (result?.success && !result.isOffline && result.merchantCustomerId && flipPhase === 'idle' && !preparingFlipRef.current) {
      let cancelled = false;

      const fetchAndFlip = async () => {
        updatePreparingFlip(true);

        try {
          const [merchantResponse, rewardsResponse] = await Promise.allSettled([
            supabase
              .from('customers')
              .select('id, name, company_name, description, logo_url, cover_image_url, city, street, house_number, postal_code, phone, website, instagram, opening_hours, google_review_url, latitude, longitude')
              .eq('id', result.merchantCustomerId!)
              .single(),
            supabase
              .from('rewards')
              .select('id, title, description, points_required, image_url')
              .eq('merchant_customer_id', result.merchantCustomerId!)
              .eq('is_active', true)
              .order('points_required', { ascending: true }),
          ]);

          const merchant = merchantResponse.status === 'fulfilled' && !merchantResponse.value.error
            ? merchantResponse.value.data
            : null;
          const rewards = rewardsResponse.status === 'fulfilled' && !rewardsResponse.value.error
            ? rewardsResponse.value.data ?? []
            : [];

          if (cancelled) return;

          if (merchant) {
            const displayName = merchant.company_name || merchant.name || result.merchantName || 'Händler';
            const coverUrl = await preloadMerchantImage(merchant.cover_image_url || null);

            if (cancelled) return;

            setMerchantDisplayName(displayName);
            const nextTransitionState = {
              fromScan: true,
              initialMerchant: merchant,
              initialRewards: rewards,
              initialUserPoints: result.totalPoints ?? 0,
              scanAwardedPoints: result.points ?? 0,
            } satisfies MerchantTransitionState;

            if (!coverUrl) {
              setMerchantImage(null);
              setMerchantDisplayName(displayName);
              setTransitionState(nextTransitionState);
              updatePreparingFlip(false);
              navigateToMerchant(result.merchantCustomerId, {
                fallbackPoints: result.totalPoints ?? 0,
                state: nextTransitionState,
              });
              return;
            }

            setMerchantImage(coverUrl);
            setMerchantDisplayName(displayName);
            setTransitionState(nextTransitionState);
            updatePreparingFlip(false);
            setFlipPhase('armed');
          } else {
            setMerchantImage(null);
            setMerchantDisplayName(result.merchantName || 'Händler');
            setTransitionState(null);

            updatePreparingFlip(false);
            navigateToMerchant(result.merchantCustomerId, {
              fallbackPoints: result.totalPoints ?? 0,
            });
            return;
          }
        } catch {
          if (cancelled) return;

          setMerchantImage(null);
          setMerchantDisplayName(result.merchantName || 'Händler');
          setTransitionState(null);
          updatePreparingFlip(false);
          navigateToMerchant(result.merchantCustomerId, {
            fallbackPoints: result.totalPoints ?? 0,
          });
          return;
        }
      };

      fetchAndFlip();

      return () => {
        cancelled = true;
      };
    }
  }, [flipPhase, navigateToMerchant, preloadMerchantImage, result, updatePreparingFlip]);

  // Transition armed → flipping via rAF (separate effect so the main effect's cleanup doesn't cancel it)
  useEffect(() => {
    if (flipPhase !== 'armed') return;

    let cancelled = false;
    const armFrame = window.requestAnimationFrame(() => {
      const flipFrame = window.requestAnimationFrame(() => {
        if (cancelled) return;
        console.log('[AppScan] armed → flipping');
        setFlipPhase('flipping');
      });
      // store for cleanup
      (cleanupRef as any).flipFrame = flipFrame;
    });

    const cleanupRef: any = { flipFrame: 0 };

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(armFrame);
      window.cancelAnimationFrame(cleanupRef.flipFrame);
    };
  }, [flipPhase]);

  // After flip completes, navigate to the real merchant page
  useEffect(() => {
    if (flipPhase === 'flipping') {
      const timer = setTimeout(() => {
        setFlipPhase('navigating');

        if (result?.merchantCustomerId) {
          navigateToMerchant(result.merchantCustomerId, {
            fallbackPoints: result.totalPoints ?? 0,
            state: transitionState,
          });
        }
      }, 900);

      return () => clearTimeout(timer);
    }
  }, [flipPhase, navigateToMerchant, result, transitionState]);

  const handleChipScan = useCallback(async (hardwareUid: string) => {
    let currentUserId = user?.id;
    if (!currentUserId) {
      try {
        const { data: { session: freshSession } } = await supabase.auth.getSession();
        currentUserId = freshSession?.user?.id;
      } catch (e) {
        console.error('[AppScan] Failed to get fresh session:', e);
      }
    }
    if (!currentUserId) {
      console.log('[AppScan] No user ID found, aborting');
      toast.error('Session konnte nicht geladen werden. Bitte versuche es erneut.');
      setScanning(false);
      return;
    }

    setResult(null);
    setFlipPhase('idle');
    updatePreparingFlip(false);
    setTransitionState(null);
    setMerchantImage(null);
    setMerchantDisplayName('');

    if (!isOnline || !navigator.onLine) {
      const queued = await offlineScanQueue.addToQueue({
        nfcId: hardwareUid,
        userId: currentUserId,
      });
      if (queued) {
        setResult({ success: true, isOffline: true, merchantName: 'Händler' });
      } else {
        setResult({ success: false, error: 'Für diese Karte gibt es bereits einen Scan in der Warteschlange.' });
      }
      setScanning(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('award_points_via_nfc', {
        p_hardware_uid: hardwareUid,
        p_user_id: currentUserId,
      });
      console.log('[AppScan] RPC result:', JSON.stringify(data), 'error:', error);
      if (error) throw error;
      const response = data as { success: boolean; points_awarded?: number; total_points?: number; merchant_customer_id?: string; merchant_name?: string; error?: string; error_code?: string; };

      if (response.success) {
        let merchantName = response.merchant_name || 'Händler';
        if (!response.merchant_name && response.merchant_customer_id) {
          const { data: merchant } = await supabase.from('customers').select('company_name, name').eq('id', response.merchant_customer_id).single();
          merchantName = merchant?.company_name || merchant?.name || 'Händler';
        }
        setResult({ success: true, points: response.points_awarded, totalPoints: response.total_points, merchantName, merchantCustomerId: response.merchant_customer_id });
        // Toast entfernt — UI zeigt die Punkte bereits visuell an
        console.log('[AppScan] setResult called with merchantCustomerId:', response.merchant_customer_id);

        // Referral-Bonus prüfen (Phase 2: Joint Visit, 7 Tage)
        if (response.merchant_customer_id) {
          await maybeAwardReferralBonus({
            userId: currentUserId,
            merchantCustomerId: response.merchant_customer_id,
          });
          // Neukundenprämie freischalten (idempotent)
          await maybeUnlockNewCustomerOffer({
            userId: currentUserId,
            merchantCustomerId: response.merchant_customer_id,
          });
        }
      } else {
        setResult({ success: false, error: response.error || 'Karte konnte nicht verarbeitet werden.' });
        toast.error(response.error || 'Karte fehlgeschlagen');
      }
    } catch (error: any) {
      if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('Failed')) {
        const queued = await offlineScanQueue.addToQueue({
          nfcId: hardwareUid,
          userId: currentUserId,
        });
        if (queued) {
          setResult({ success: true, isOffline: true, merchantName: 'Händler' });
        } else {
          setResult({ success: false, error: 'Für diese Karte gibt es bereits einen Scan in der Warteschlange.' });
        }
      } else {
        setResult({ success: false, error: error.message || 'Verbindungsfehler' });
        toast.error('Scan fehlgeschlagen');
      }
    } finally {
      if (!preparingFlipRef.current) {
        setScanning(false);
      }
    }
  }, [user, navigate, isOnline]);

  const handleNfcRead = useCallback((nfcResult: NfcReadResult) => {
    if (nfcResult.success && nfcResult.hardwareUid) {
      handleChipScan(nfcResult.hardwareUid);
    } else if (nfcResult.error) {
      const errorLower = nfcResult.error.toLowerCase();
      if (errorLower.includes('permission') || errorLower.includes('denied') || errorLower.includes('berechtigung') || errorLower.includes('disabled') || errorLower.includes('deaktiviert')) {
        setPermissionDialogType('disabled');
        setShowPermissionDialog(true);
        setScanning(false);
      } else {
        toast.error(nfcResult.error);
        setScanning(false);
      }
    }
  }, [handleChipScan]);

  const startNFCScan = async () => {
    const enabled = await nfcService.isEnabled();
    if (!enabled) {
      setNfcEnabled(false);
      setPermissionDialogType('disabled');
      setShowPermissionDialog(true);
      return;
    }
    setScanning(true);
    setResult(null);
    setFlipPhase('idle');
    updatePreparingFlip(false);
    setTransitionState(null);
    setMerchantImage(null);
    setMerchantDisplayName('');
    try {
      await nfcService.startScan(handleNfcRead);
    } catch (error: any) {
      if (error.message?.toLowerCase().includes('permission') || error.message?.toLowerCase().includes('denied') || error.message?.toLowerCase().includes('berechtigung')) {
        setPermissionDialogType('permission_denied');
        setShowPermissionDialog(true);
        setScanning(false);
      } else {
        toast.error(error.message || 'NFC Scan konnte nicht gestartet werden');
        setScanning(false);
      }
    }
  };

  const handlePermissionRetry = async () => {
    setShowPermissionDialog(false);
    const enabled = await nfcService.isEnabled();
    setNfcEnabled(enabled);
    if (enabled) { startNFCScan(); }
  };

  const handleOpenNfcSettings = async () => {
    await nfcService.openSettings();
    setTimeout(async () => {
      const enabled = await nfcService.isEnabled();
      setNfcEnabled(enabled);
      if (enabled) { setNfcSupported(true); }
    }, 1000);
  };

  const cancelScan = () => {
    nfcService.stopScan();
    setScanning(false);
    updatePreparingFlip(false);
    setFlipPhase('idle');
    setTransitionState(null);
    setMerchantImage(null);
    setMerchantDisplayName('');
  };




  const isNfcUnavailable = !checkingNfc && !nfcSupported;
  const isNfcDisabled = !checkingNfc && nfcSupported && !nfcEnabled;
  const isIdle = !checkingNfc && nfcSupported && nfcEnabled && !scanning && !result;
  const showFrontCard = flipPhase === 'idle' || flipPhase === 'armed';

  const bottomInsetOffset = 'calc(7rem + env(safe-area-inset-bottom, 0px))';

  return (
    <div
      className="bg-gradient-to-b from-background to-muted/30 overflow-visible"
      style={{ height: '100dvh', paddingBottom: bottomInsetOffset }}
    >
      <Particles
        particleColors={['#6366F1', '#8B5CF6', '#A855F7']}
        particleCount={400}
        particleSpread={10}
        speed={0.03}
        particleBaseSize={120}
        sizeRandomness={1.8}
        moveParticlesOnHover={true}
        alphaParticles={true}
        disableRotation={false}
        cameraDistance={20}
      />
      <OfflineBanner />

      <main
        ref={mainScrollRef}
        className="relative z-10 h-full overflow-y-auto overflow-x-hidden scrollbar-hide"
        style={{ overscrollBehavior: 'none', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        {/* ── Flip Card Container ── */}
        <motion.div
          className="px-4 pt-4"
          style={{ perspective: '1200px' }}
          initial={{ y: '28vh', opacity: 0, scale: 0.92 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 120,
            damping: 18,
            mass: 0.8,
            delay: 0.05,
          }}
        >
          <div
            className="relative rounded-2xl shadow-lg"
            style={{
              aspectRatio: '1.55 / 1',
              transformStyle: 'preserve-3d',
              WebkitTransformStyle: 'preserve-3d',
              transition: 'transform 0.7s ease-in-out',
              transform: showFrontCard ? 'rotateY(0deg)' : 'rotateY(180deg)',
            }}
          >
            {/* ── FRONT: Purple NFC card ── */}
            <div
              className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-secondary"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                {(checkingNfc || scanning || preparingFlip) && (
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                    className="w-28 h-28 rounded-full bg-white/15 flex items-center justify-center"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="w-20 h-20 rounded-full bg-white/15 flex items-center justify-center"
                    >
                      <Nfc className="h-10 w-10 text-white/90" />
                    </motion.div>
                  </motion.div>
                )}

                {(isIdle || isNfcUnavailable || isNfcDisabled) && !scanning && !preparingFlip && (
                  <motion.div
                    animate={{ scale: [1, 1.05, 1], opacity: [0.6, 0.9, 0.6] }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="w-20 h-20 rounded-full bg-white/15 flex items-center justify-center">
                      {isNfcUnavailable ? (
                        <XCircle className="h-10 w-10 text-white/70" />
                      ) : isNfcDisabled ? (
                        <Settings className="h-10 w-10 text-white/70" />
                      ) : (
                        <Nfc className="h-10 w-10 text-white/80" />
                      )}
                    </div>
                    <p className="text-white/70 text-sm font-medium">
                      {isNfcUnavailable ? 'NFC nicht verfügbar' : isNfcDisabled ? 'NFC deaktiviert' : 'Bereit zum Scannen'}
                    </p>
                  </motion.div>
                )}
              </div>

            </div>

            {/* ── BACK: Merchant image card ── */}
            <div
              className="absolute inset-0 rounded-2xl"
              role="img"
              aria-label={merchantDisplayName || 'Geschäftskarte'}
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                backgroundImage: merchantImage ? `url("${merchantImage}")` : undefined,
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
              }}
            >
              {!merchantImage && (
                <div className="w-full h-full bg-gradient-to-br from-primary to-secondary" />
              )}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 via-black/25 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <h1 className="text-lg font-bold text-white drop-shadow-md">
                  {merchantDisplayName}
                </h1>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Content below the card ── */}
        <motion.div
          className="px-4 pt-6 pb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <AnimatePresence mode="wait">
            {isNfcUnavailable && flipPhase === 'idle' && (
              <motion.div key="unsupported" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center space-y-3">
                <h2 className="text-xl font-bold">NFC nicht verfügbar</h2>
                <p className="text-muted-foreground text-sm">
                  Dein Gerät unterstützt kein NFC. Um Eloyo zu nutzen, benötigst du ein Smartphone mit NFC-Funktion.
                </p>
                <Button variant="outline" onClick={() => navigate('/app')}>Zurück</Button>
              </motion.div>
            )}

            {isNfcDisabled && flipPhase === 'idle' && (
              <motion.div key="disabled" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center space-y-3">
                <h2 className="text-xl font-bold">NFC deaktiviert</h2>
                <p className="text-muted-foreground text-sm">
                  Bitte aktiviere NFC in deinen Geräteeinstellungen, um Punkte zu sammeln.
                </p>
                <Button onClick={handleOpenNfcSettings} className="w-full max-w-xs">NFC-Einstellungen öffnen</Button>
              </motion.div>
            )}

            {isIdle && flipPhase === 'idle' && (
              <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center space-y-3">
                <h2 className="text-xl font-bold">Bereit zum Scannen</h2>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Tippe auf den Button und halte dein Handy an die Eloyo-Karte
                </p>
                <Button onClick={startNFCScan} className="w-full max-w-xs">
                  <Nfc className="h-4 w-4 mr-2" />
                  Jetzt scannen
                </Button>
              </motion.div>
            )}

            {scanning && !result && flipPhase === 'idle' && (
              <motion.div key="scanning" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center space-y-3">
                <h2 className="text-xl font-bold">Handy an Karte halten</h2>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Halte jetzt die obere Rückseite deines Handys an die Eloyo-Karte
                </p>
                <Button variant="outline" onClick={cancelScan}>Abbrechen</Button>
              </motion.div>
            )}

            {preparingFlip && result?.success && !result.isOffline && flipPhase === 'idle' && (
              <motion.div key="preparing-flip" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center space-y-3">
                <h2 className="text-xl font-bold">Geschäft wird geladen</h2>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Wir bereiten gerade das Ladenbild vor, dann dreht sich die Karte sauber weiter.
                </p>
              </motion.div>
            )}

            {checkingNfc && (
              <motion.div key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center space-y-3">
                <p className="text-muted-foreground">Prüfe NFC...</p>
              </motion.div>
            )}

            {result && !result.success && flipPhase === 'idle' && (
              <motion.div key="error-result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center space-y-3">
                <h2 className="text-xl font-bold">Fehler</h2>
                <p className="text-muted-foreground text-sm">{result.error}</p>
                <Button onClick={() => { setResult(null); }} className="w-full max-w-xs">
                  Erneut versuchen
                </Button>
              </motion.div>
            )}

            {result?.isOffline && flipPhase === 'idle' && (
              <motion.div key="offline-result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center space-y-3">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>
                <h2 className="text-xl font-bold">Scan gespeichert ✓</h2>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Punkte werden gutgeschrieben sobald du wieder online bist.
                </p>
                <Button onClick={() => { setResult(null); }} variant="outline" className="w-full max-w-xs">
                  Fertig
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      <BottomNav />

      <NfcPermissionDialog
        open={showPermissionDialog}
        onOpenChange={setShowPermissionDialog}
        onRetry={handlePermissionRetry}
        type={permissionDialogType}
      />
    </div>
  );
};

export default AppScan;
