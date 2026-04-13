import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Nfc, CheckCircle, XCircle, Sparkles, Settings, WifiOff, CloudUpload } from 'lucide-react';
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
  merchantCoverImage?: string | null;
  error?: string;
  isOffline?: boolean;
};

type FlipPhase = 'idle' | 'flipping' | 'revealed' | 'transitioning';

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
  const [merchantImage, setMerchantImage] = useState<string | null>(null);
  const [merchantDisplayName, setMerchantDisplayName] = useState<string>('');

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

  // Trigger flip animation when we get a successful result
  useEffect(() => {
    if (result?.success && !result.isOffline && result.merchantCustomerId && flipPhase === 'idle') {
      // Fetch merchant cover image then flip
      const fetchAndFlip = async () => {
        try {
          const { data: merchant } = await supabase
            .from('customers')
            .select('cover_image_url, company_name, name')
            .eq('id', result.merchantCustomerId!)
            .single();
          setMerchantImage(merchant?.cover_image_url || null);
          setMerchantDisplayName(merchant?.company_name || merchant?.name || result.merchantName || 'Händler');
        } catch {
          setMerchantImage(null);
          setMerchantDisplayName(result.merchantName || 'Händler');
        }
        setFlipPhase('flipping');
      };
      fetchAndFlip();
    }
  }, [result]);

  // Handle flip animation phases
  useEffect(() => {
    if (flipPhase === 'flipping') {
      // After flip completes (600ms), show revealed state
      const timer = setTimeout(() => setFlipPhase('revealed'), 700);
      return () => clearTimeout(timer);
    }
    if (flipPhase === 'revealed') {
      // After a brief pause, start transitioning to merchant page
      const timer = setTimeout(() => setFlipPhase('transitioning'), 800);
      return () => clearTimeout(timer);
    }
    if (flipPhase === 'transitioning') {
      // Navigate after fade animation
      const timer = setTimeout(() => {
        if (result?.merchantCustomerId) {
          navigate(`/app/merchant/${result.merchantCustomerId}`);
        }
        // Reset state
        setFlipPhase('idle');
        setResult(null);
        setMerchantImage(null);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [flipPhase, result, navigate]);

  const handleChipScan = useCallback(async (hardwareUid: string) => {
    console.log('[AppScan] handleChipScan called, hardwareUid:', hardwareUid, 'user from hook:', user?.id, 'online:', isOnline);
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
      console.error('[AppScan] Scan error:', error);
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
  };

  // ── DEMO: Simulate a successful scan ──
  const handleDemoScan = async () => {
    setScanning(true);
    setResult(null);
    setFlipPhase('idle');

    // Fetch a real merchant "Backstube König" or use first active merchant
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

  /* ── Determine what to show on/below the card ── */
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
            className="relative rounded-2xl shadow-lg"
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
                {(checkingNfc || scanning) && (
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

                {(isIdle || isNfcUnavailable || isNfcDisabled) && !scanning && (
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
                  src={merchantImage}
                  alt={merchantDisplayName}
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
              {result?.points && (
                <div className="absolute top-3 right-3 z-10 bg-white/60 backdrop-blur-md rounded-full px-3 py-1 shadow-md">
                  <span className="font-bold text-primary">+{result.points}</span>
                  <span className="text-sm text-muted-foreground ml-1">Punkte</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Content below the card ── */}
        <AnimatePresence mode="wait">
          {flipPhase === 'transitioning' ? (
            <motion.div
              key="transitioning"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="px-4 pt-6 pb-8 text-center"
            >
              <p className="text-muted-foreground text-sm">Lade Geschäft...</p>
            </motion.div>
          ) : flipPhase !== 'idle' ? (
            <motion.div
              key="flipped"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="px-4 pt-6 pb-8 text-center space-y-2"
            >
              <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                +{result?.points} Punkte
              </h2>
              <p className="text-muted-foreground text-sm">bei {merchantDisplayName}</p>
            </motion.div>
          ) : (
            <div className="px-4 pt-6 pb-8">
              <AnimatePresence mode="wait">
                {isNfcUnavailable && (
                  <motion.div key="unsupported" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center space-y-3">
                    <h2 className="text-xl font-bold">NFC nicht verfügbar</h2>
                    <p className="text-muted-foreground text-sm">
                      Dein Gerät unterstützt kein NFC. Um Eloyo zu nutzen, benötigst du ein Smartphone mit NFC-Funktion.
                    </p>
                    <Button variant="outline" onClick={() => navigate('/app')}>Zurück</Button>
                    {/* DEMO BUTTON – temporary */}
                    <Button onClick={handleDemoScan} variant="outline" className="w-full max-w-xs border-dashed border-2 border-primary/40 text-primary">
                      🧪 Demo: Scannen
                    </Button>
                  </motion.div>
                )}

                {isNfcDisabled && (
                  <motion.div key="disabled" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center space-y-3">
                    <h2 className="text-xl font-bold">NFC deaktiviert</h2>
                    <p className="text-muted-foreground text-sm">
                      Bitte aktiviere NFC in deinen Geräteeinstellungen, um Punkte zu sammeln.
                    </p>
                    <Button onClick={handleOpenNfcSettings} className="w-full max-w-xs">NFC-Einstellungen öffnen</Button>
                  </motion.div>
                )}

                {isIdle && (
                  <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center space-y-3">
                    <h2 className="text-xl font-bold">Bereit zum Stempeln</h2>
                    <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                      Tippe auf den Button und halte dein Handy an den Eloyo-Stempel
                    </p>
                    <Button onClick={startNFCScan} className="w-full max-w-xs">
                      <Nfc className="h-4 w-4 mr-2" />
                      Jetzt scannen
                    </Button>
                    {/* DEMO BUTTON – temporary */}
                    <Button onClick={handleDemoScan} variant="outline" className="w-full max-w-xs border-dashed border-2 border-primary/40 text-primary">
                      🧪 Demo: Scannen
                    </Button>
                  </motion.div>
                )}

                {scanning && !result && (
                  <motion.div key="scanning" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center space-y-3">
                    <h2 className="text-xl font-bold">Handy an Stempel halten</h2>
                    <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                      Halte jetzt die obere Rückseite deines Handys an den Eloyo-Stempel
                    </p>
                    <Button variant="outline" onClick={cancelScan}>Abbrechen</Button>
                  </motion.div>
                )}

                {checkingNfc && (
                  <motion.div key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center space-y-3">
                    <p className="text-muted-foreground">Prüfe NFC...</p>
                  </motion.div>
                )}

                {result && !result.success && (
                  <motion.div key="error-result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center space-y-3">
                    <h2 className="text-xl font-bold">Fehler</h2>
                    <p className="text-muted-foreground text-sm">{result.error}</p>
                    <Button onClick={() => { setResult(null); setFlipPhase('idle'); }} className="w-full max-w-xs">
                      Erneut versuchen
                    </Button>
                  </motion.div>
                )}

                {result?.isOffline && (
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
          )}
        </AnimatePresence>
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
