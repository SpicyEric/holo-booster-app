import { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Nfc, XCircle, Settings, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BottomNav } from '@/app/components/layout/BottomNav';
import { nfcService, type NfcReadResult } from '@/app/services/nfcService';
import { useNetworkStatus } from '@/app/hooks/useNetworkStatus';
import { offlineQueueService } from '@/app/services/offlineQueueService';
import { NfcPermissionDialog } from '@/app/components/NfcPermissionDialog';
import { OfflineBanner } from '@/app/components/OfflineBanner';
import Particles from '@/components/Particles';

type ScanResult = {
  success: boolean;
  points?: number;
  totalPoints?: number;
  merchantName?: string;
  merchantCustomerId?: string;
  error?: string;
  isOffline?: boolean;
};

type FlipPhase = 'idle' | 'flipping' | 'navigating';

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
  const backFaceImageRef = useRef<HTMLImageElement | null>(null);
  const [merchantImage, setMerchantImage] = useState<string | null>(null);
  const [merchantDisplayName, setMerchantDisplayName] = useState<string>('');
  const [transitionState, setTransitionState] = useState<MerchantTransitionState | null>(null);

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

  const waitForBackFaceImagePaint = useCallback(async () => {
    return await new Promise<boolean>((resolve) => {
      let settled = false;
      let frameId = 0;

      const finalize = (ready: boolean) => {
        if (settled) return;
        settled = true;
        if (frameId) {
          cancelAnimationFrame(frameId);
        }
        window.clearTimeout(timeoutId);
        resolve(ready);
      };

      const confirmPaint = async () => {
        const img = backFaceImageRef.current;

        if (!img) {
          frameId = requestAnimationFrame(() => {
            void confirmPaint();
          });
          return;
        }

        if (!img.complete || img.naturalWidth === 0) {
          frameId = requestAnimationFrame(() => {
            void confirmPaint();
          });
          return;
        }

        try {
          if (typeof img.decode === 'function') {
            await img.decode();
          }
        } catch {
          // Ignore decode errors if the image has already loaded.
        }

        requestAnimationFrame(() => {
          requestAnimationFrame(() => finalize(true));
        });
      };

      const timeoutId = window.setTimeout(() => {
        finalize(Boolean(backFaceImageRef.current?.complete && backFaceImageRef.current?.naturalWidth));
      }, 4000);

      void confirmPaint();
    });
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
    const autostart = searchParams.get('autostart');
    if (autostart && !checkingNfc && nfcSupported && nfcEnabled && !scanning && !result) {
      startNFCScan();
    }
  }, [searchParams, checkingNfc, nfcSupported, nfcEnabled]);

  // Trigger flip animation when we get a successful online result
  useEffect(() => {
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
            } satisfies MerchantTransitionState;

            if (!coverUrl) {
              setMerchantImage(null);
              setTransitionState(nextTransitionState);
              updatePreparingFlip(false);
              navigateToMerchant(result.merchantCustomerId, {
                fallbackPoints: result.totalPoints ?? 0,
                state: nextTransitionState,
              });
              return;
            }

            flushSync(() => {
              setMerchantDisplayName(displayName);
              setTransitionState(nextTransitionState);
              setMerchantImage(coverUrl);
            });

            const backFaceReady = await waitForBackFaceImagePaint();

            if (cancelled) return;

            if (!backFaceReady) {
              setMerchantImage(null);
              updatePreparingFlip(false);
              navigateToMerchant(result.merchantCustomerId, {
                fallbackPoints: result.totalPoints ?? 0,
                state: nextTransitionState,
              });
              return;
            }

            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                if (cancelled) return;
                updatePreparingFlip(false);
                setFlipPhase('flipping');
              });
            });
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
  }, [flipPhase, navigateToMerchant, preloadMerchantImage, result, updatePreparingFlip, waitForBackFaceImagePaint]);

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
      toast.error('Session konnte nicht geladen werden. Bitte versuche es erneut.');
      setScanning(false);
      return;
    }

    setScanning(true);
    setResult(null);
    setFlipPhase('idle');
    updatePreparingFlip(false);
    setTransitionState(null);

    if (!navigator.onLine) {
      if (offlineQueueService.hasPendingStampForUid(hardwareUid)) {
        setResult({ success: false, error: 'Du hast bereits einen Offline-Stempel für diesen Chip in der Warteschlange.' });
        setScanning(false);
        return;
      }
      const pendingStamp = offlineQueueService.addStamp(hardwareUid, currentUserId);
      if (pendingStamp) {
        setResult({ success: true, isOffline: true, merchantName: 'Händler' });
        toast.success('Stempel erkannt! Wird gutgeschrieben sobald Internet da ist.');
      } else {
        setResult({ success: false, error: 'Offline-Stempel konnte nicht gespeichert werden.' });
      }
      setScanning(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('award_points_via_nfc', {
        p_hardware_uid: hardwareUid,
        p_user_id: currentUserId,
      });
      if (error) throw error;
      const response = data as { success: boolean; points_awarded?: number; total_points?: number; merchant_customer_id?: string; merchant_name?: string; error?: string; error_code?: string; };

      if (response.success) {
        let merchantName = response.merchant_name || 'Händler';
        if (!response.merchant_name && response.merchant_customer_id) {
          const { data: merchant } = await supabase.from('customers').select('company_name, name').eq('id', response.merchant_customer_id).single();
          merchantName = merchant?.company_name || merchant?.name || 'Händler';
        }
        setResult({ success: true, points: response.points_awarded, totalPoints: response.total_points, merchantName, merchantCustomerId: response.merchant_customer_id });
        toast.success(`+${response.points_awarded} Punkte gesammelt!`);
      } else {
        setResult({ success: false, error: response.error || 'Stempel konnte nicht verarbeitet werden.' });
        toast.error(response.error || 'Stempel fehlgeschlagen');
      }
    } catch (error: any) {
      if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('Failed')) {
        if (offlineQueueService.hasPendingStampForUid(hardwareUid)) {
          setResult({ success: false, error: 'Du hast bereits einen Offline-Stempel für diesen Chip in der Warteschlange.' });
        } else {
          const pendingStamp = offlineQueueService.addStamp(hardwareUid, currentUserId);
          if (pendingStamp) {
            setResult({ success: true, isOffline: true, merchantName: 'Händler' });
            toast.success('Verbindung fehlgeschlagen – Stempel wird offline gespeichert.');
          } else {
            setResult({ success: false, error: 'Fehler beim Speichern' });
          }
        }
      } else {
        setResult({ success: false, error: error.message || 'Verbindungsfehler' });
        toast.error('Scan fehlgeschlagen');
      }
    } finally {
      setScanning(false);
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
  };

  // ── DEMO: Simulate a successful scan ──
  const handleDemoScan = async () => {
    setScanning(true);
    setResult(null);
    setFlipPhase('idle');
    updatePreparingFlip(false);
    setTransitionState(null);

    try {
      const { data: merchants } = await supabase
        .from('customers')
        .select('id, company_name, name, cover_image_url')
        .eq('active', true)
        .limit(1);

      const demoMerchant = merchants?.[0];
      
      setTimeout(() => {
        setScanning(false);
        setResult({
          success: true,
          points: 5,
          totalPoints: 25,
          merchantName: demoMerchant?.company_name || demoMerchant?.name || 'Backstube König',
          merchantCustomerId: demoMerchant?.id || 'demo',
        });
      }, 500);
    } catch {
      setTimeout(() => {
        setScanning(false);
        setResult({
          success: true,
          points: 5,
          totalPoints: 25,
          merchantName: 'Backstube König',
          merchantCustomerId: 'demo',
        });
      }, 500);
    }
  };

  const isNfcUnavailable = !checkingNfc && !nfcSupported;
  const isNfcDisabled = !checkingNfc && nfcSupported && !nfcEnabled;
  const isIdle = !checkingNfc && nfcSupported && nfcEnabled && !scanning && !result;
  const showFrontCard = flipPhase === 'idle';

  const bottomInsetOffset = 'calc(7rem + env(safe-area-inset-bottom, 0px))';

  return (
    <div
      className="bg-gradient-to-b from-background to-muted/30 overflow-hidden"
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
        className="relative z-10 h-full overflow-y-auto"
        style={{ overscrollBehavior: 'none', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        {/* ── Flip Card Container ── */}
        <div className="px-4 pt-4" style={{ perspective: '1200px' }}>
          <div
            className="scan-merchant-card-transition relative rounded-2xl shadow-lg"
            style={{
              aspectRatio: '1.55 / 1',
              transformStyle: 'preserve-3d',
              transition: 'transform 0.7s ease-in-out',
              transform: showFrontCard ? 'rotateY(0deg)' : 'rotateY(180deg)',
            }}
          >
            {/* ── FRONT: Purple NFC card ── */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden bg-gradient-to-br from-primary to-secondary"
              style={{ backfaceVisibility: 'hidden' }}
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

              <div className="absolute bottom-3 left-4 right-4">
                <p className="text-white/80 text-sm font-medium drop-shadow-sm">Punkte sammeln</p>
              </div>
            </div>

            {/* ── BACK: Merchant image card ── */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              {merchantImage ? (
                <img
                  ref={backFaceImageRef}
                  src={merchantImage}
                  alt={merchantDisplayName}
                  decoding="sync"
                  fetchPriority="high"
                  className="w-full h-full object-cover"
                />
              ) : (
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
        </div>

        {/* ── Content below the card ── */}
        <div className="px-4 pt-6 pb-8">
          <AnimatePresence mode="wait">
            {isNfcUnavailable && flipPhase === 'idle' && (
              <motion.div key="unsupported" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center space-y-3">
                <h2 className="text-xl font-bold">NFC nicht verfügbar</h2>
                <p className="text-muted-foreground text-sm">
                  Dein Gerät unterstützt kein NFC. Um Eloyo zu nutzen, benötigst du ein Smartphone mit NFC-Funktion.
                </p>
                <Button variant="outline" onClick={() => navigate('/app')}>Zurück</Button>
                <Button onClick={handleDemoScan} variant="outline" className="w-full max-w-xs border-dashed border-2 border-primary/40 text-primary">
                  🧪 Demo: Scannen
                </Button>
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
                <h2 className="text-xl font-bold">Bereit zum Stempeln</h2>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Tippe auf den Button und halte dein Handy an den Eloyo-Stempel
                </p>
                <Button onClick={startNFCScan} className="w-full max-w-xs">
                  <Nfc className="h-4 w-4 mr-2" />
                  Jetzt scannen
                </Button>
                <Button onClick={handleDemoScan} variant="outline" className="w-full max-w-xs border-dashed border-2 border-primary/40 text-primary">
                  🧪 Demo: Scannen
                </Button>
              </motion.div>
            )}

            {scanning && !result && flipPhase === 'idle' && (
              <motion.div key="scanning" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center space-y-3">
                <h2 className="text-xl font-bold">Handy an Stempel halten</h2>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Halte jetzt die obere Rückseite deines Handys an den Eloyo-Stempel
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
                <h2 className="text-xl font-bold">Stempel erkannt!</h2>
                <p className="text-muted-foreground text-sm">Du bist gerade offline. Dein Stempel wird automatisch gutgeschrieben, sobald du wieder Internet hast.</p>
                <div className="flex items-center justify-center gap-2 text-amber-600 font-medium">
                  <WifiOff className="h-4 w-4" />
                  Wird synchronisiert...
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
