import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Nfc, CheckCircle, XCircle, Sparkles, Settings, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { MainLayout } from '@/app/components/layout/MainLayout';
import { nfcService, type NfcReadResult } from '@/app/services/nfcService';
import { NfcPermissionDialog } from '@/app/components/NfcPermissionDialog';

type ScanResult = {
  success: boolean;
  points?: number;
  totalPoints?: number;
  merchantName?: string;
  error?: string;
};

export const AppScan = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcEnabled, setNfcEnabled] = useState(true);
  const [checkingNfc, setCheckingNfc] = useState(true);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [permissionDialogType, setPermissionDialogType] = useState<'disabled' | 'permission_denied'>('disabled');

  // Check for NFC support on mount
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

    return () => {
      nfcService.stopScan();
    };
  }, []);

  // Handle direct chip_data from URL (for Deep Link / NFC Intent)
  useEffect(() => {
    const chipData = searchParams.get('chip');
    if (chipData && user) {
      handleChipScan(chipData);
    }
  }, [searchParams, user]);

  const handleChipScan = useCallback(async (chipData: string) => {
    if (!user) {
      toast.error('Bitte melde dich an');
      navigate('/app/auth');
      return;
    }

    setScanning(true);
    setResult(null);

    try {
      const { data, error } = await supabase.rpc('award_points_via_nfc', {
        p_chip_data: chipData,
        p_user_id: user.id,
      });

      if (error) throw error;

      const response = data as { 
        success: boolean; 
        points_awarded?: number; 
        total_points?: number; 
        merchant_customer_id?: string; 
        error?: string 
      };

      if (response.success) {
        let merchantName = 'Händler';
        if (response.merchant_customer_id) {
          const { data: merchant } = await supabase
            .from('customers')
            .select('company_name, name')
            .eq('id', response.merchant_customer_id)
            .single();
          merchantName = merchant?.company_name || merchant?.name || 'Händler';
        }

        setResult({
          success: true,
          points: response.points_awarded,
          totalPoints: response.total_points,
          merchantName,
        });

        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });

        toast.success(`+${response.points_awarded} Punkte gesammelt!`);
      } else {
        setResult({
          success: false,
          error: response.error || 'Unbekannter Fehler',
        });
        toast.error(response.error || 'Scan fehlgeschlagen');
      }
    } catch (error: any) {
      console.error('Scan error:', error);
      setResult({
        success: false,
        error: error.message || 'Verbindungsfehler',
      });
      toast.error('Scan fehlgeschlagen');
    } finally {
      setScanning(false);
    }
  }, [user, navigate]);

  const handleNfcRead = useCallback((nfcResult: NfcReadResult) => {
    if (nfcResult.success && nfcResult.chipData) {
      handleChipScan(nfcResult.chipData);
    } else if (nfcResult.error) {
      // Check if it's a permission-related error
      const errorLower = nfcResult.error.toLowerCase();
      if (errorLower.includes('permission') || 
          errorLower.includes('denied') ||
          errorLower.includes('berechtigung') ||
          errorLower.includes('disabled') ||
          errorLower.includes('deaktiviert')) {
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
    // Check if NFC is enabled
    const enabled = await nfcService.isEnabled();
    if (!enabled) {
      setNfcEnabled(false);
      setPermissionDialogType('disabled');
      setShowPermissionDialog(true);
      return;
    }

    setScanning(true);
    setResult(null);
    
    try {
      await nfcService.startScan(handleNfcRead);
    } catch (error: any) {
      console.error('NFC scan start error:', error);
      // Check if it's a permission error
      if (error.message?.toLowerCase().includes('permission') || 
          error.message?.toLowerCase().includes('denied') ||
          error.message?.toLowerCase().includes('berechtigung')) {
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
    // Re-check NFC status
    const enabled = await nfcService.isEnabled();
    setNfcEnabled(enabled);
    if (enabled) {
      // Try starting scan again
      startNFCScan();
    }
  };

  const handleOpenNfcSettings = async () => {
    await nfcService.openSettings();
    setTimeout(async () => {
      const enabled = await nfcService.isEnabled();
      setNfcEnabled(enabled);
      if (enabled) {
        setNfcSupported(true);
      }
    }, 1000);
  };

  const cancelScan = () => {
    nfcService.stopScan();
    setScanning(false);
  };

  const resetScan = () => {
    nfcService.stopScan();
    setResult(null);
    setScanning(false);
  };

  // NFC not supported - show error state
  if (!checkingNfc && !nfcSupported) {
    return (
      <MainLayout title="Punkte sammeln">
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <Card className="w-full max-w-sm">
            <CardContent className="pt-8 pb-6 text-center">
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
              <h2 className="text-xl font-bold mb-2">NFC nicht verfügbar</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Dein Gerät unterstützt kein NFC. Um Eloyo zu nutzen, benötigst du ein Smartphone mit NFC-Funktion.
              </p>
              <Button variant="outline" onClick={() => navigate('/app')}>
                Zurück
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // NFC disabled - prompt to enable
  if (!checkingNfc && nfcSupported && !nfcEnabled) {
    return (
      <MainLayout title="Punkte sammeln">
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <Card className="w-full max-w-sm">
            <CardContent className="pt-8 pb-6 text-center">
              <div className="w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-4">
                <Settings className="h-10 w-10 text-orange-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">NFC deaktiviert</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Bitte aktiviere NFC in deinen Geräteeinstellungen, um Punkte zu sammeln.
              </p>
              <Button onClick={handleOpenNfcSettings} className="w-full">
                NFC-Einstellungen öffnen
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Punkte sammeln">
      <AnimatePresence mode="wait">
        {/* Result View */}
        {result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center justify-center min-h-[60vh] px-4"
          >
            <Card className="w-full max-w-sm">
              <CardContent className="pt-8 pb-6 text-center">
                {result.success ? (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', bounce: 0.5 }}
                    >
                      <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                      </div>
                    </motion.div>
                    <h2 className="text-2xl font-bold mb-2">Geschafft!</h2>
                    <p className="text-muted-foreground mb-4">
                      bei {result.merchantName}
                    </p>
                    <div className="flex items-center justify-center gap-2 text-3xl font-bold text-primary mb-2">
                      <Sparkles className="h-6 w-6" />
                      +{result.points} Punkte
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Gesamt: {result.totalPoints} Punkte
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                      <XCircle className="h-10 w-10 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Fehler</h2>
                    <p className="text-muted-foreground">{result.error}</p>
                  </>
                )}
                <Button onClick={() => navigate('/app')} className="mt-6 w-full">
                  Weiter
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* NFC Scanning Modal/Pop-up */}
        {scanning && !result && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-6"
          >
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4"
              onClick={cancelScan}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* NFC Animation */}
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 2,
                ease: "easeInOut"
              }}
              className="w-40 h-40 rounded-full bg-primary/20 flex items-center justify-center mb-8"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-28 h-28 rounded-full bg-primary/30 flex items-center justify-center"
              >
                <Nfc className="h-14 w-14 text-primary" />
              </motion.div>
            </motion.div>

            {/* Instructions */}
            <h2 className="text-2xl font-bold mb-3 text-center">
              NFC-Stempel scannen
            </h2>
            <p className="text-muted-foreground text-center max-w-xs mb-2">
              Halte dein Handy jetzt an den Eloyo-Stempel
            </p>
            {nfcService.isNativeApp() && (
              <p className="text-xs text-muted-foreground text-center">
                Halte die Rückseite deines Handys an den Stempel
              </p>
            )}

            {/* Cancel button */}
            <Button 
              variant="outline" 
              onClick={cancelScan} 
              className="mt-8 w-full max-w-xs"
            >
              Abbrechen
            </Button>
          </motion.div>
        )}

        {/* Idle State - Start Scan Button */}
        {!scanning && !result && !checkingNfc && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center min-h-[60vh] px-4"
          >
            {/* Main NFC Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startNFCScan}
              className="w-40 h-40 rounded-full bg-primary flex items-center justify-center shadow-lg mb-6"
            >
              <Nfc className="h-16 w-16 text-primary-foreground" />
            </motion.button>

            <h2 className="text-xl font-bold mb-2 text-center">
              Punkte sammeln
            </h2>
            <p className="text-muted-foreground text-center max-w-xs">
              Tippe auf den Button und halte dein Handy an den Eloyo-Stempel
            </p>
          </motion.div>
        )}

        {/* Loading state */}
        {checkingNfc && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[60vh]"
          >
            <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
            <p className="text-muted-foreground">Prüfe NFC...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NFC Permission Fallback Dialog */}
      <NfcPermissionDialog
        open={showPermissionDialog}
        onOpenChange={setShowPermissionDialog}
        onRetry={handlePermissionRetry}
        type={permissionDialogType}
      />
    </MainLayout>
  );
};

export default AppScan;
