import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Scan, Nfc, QrCode, CheckCircle, XCircle, ArrowLeft, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

type ScanMode = 'idle' | 'qr' | 'nfc';
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
  const [scanMode, setScanMode] = useState<ScanMode>('idle');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [nfcSupported, setNfcSupported] = useState(false);

  // Check for NFC support
  useEffect(() => {
    if ('NDEFReader' in window) {
      setNfcSupported(true);
    }
  }, []);

  // Handle direct chip_uid from URL (for NFC redirect)
  useEffect(() => {
    const chipUid = searchParams.get('chip');
    if (chipUid && user) {
      handleChipScan(chipUid);
    }
  }, [searchParams, user]);

  const handleChipScan = async (chipUid: string) => {
    if (!user) {
      toast.error('Bitte melde dich an');
      navigate('/app/auth');
      return;
    }

    setScanning(true);
    setResult(null);

    try {
      // Call the database function to award points
      const { data, error } = await supabase.rpc('award_points_via_nfc', {
        p_chip_uid: chipUid,
        p_user_id: user.id,
      });

      if (error) throw error;

      const response = data as { success: boolean; points_awarded?: number; total_points?: number; merchant_customer_id?: string; error?: string };

      if (response.success) {
        // Get merchant name
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

        // Celebration animation
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
      setScanMode('idle');
    }
  };

  const handleQRScan = (result: string) => {
    // Extract chip_uid from QR code URL or direct value
    let chipUid = result;
    
    // If it's a URL, extract the chip parameter
    try {
      const url = new URL(result);
      const chip = url.searchParams.get('chip');
      if (chip) chipUid = chip;
    } catch {
      // Not a URL, use as-is
    }

    handleChipScan(chipUid);
  };

  const startNFCScan = async () => {
    if (!('NDEFReader' in window)) {
      toast.error('NFC wird auf diesem Gerät nicht unterstützt');
      return;
    }

    setScanMode('nfc');
    setScanning(true);

    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();

      ndef.addEventListener('reading', ({ serialNumber }: { serialNumber: string }) => {
        handleChipScan(serialNumber);
      });

      ndef.addEventListener('readingerror', () => {
        toast.error('NFC Lesefehler');
        setScanning(false);
        setScanMode('idle');
      });
    } catch (error: any) {
      console.error('NFC error:', error);
      toast.error('NFC konnte nicht gestartet werden');
      setScanning(false);
      setScanMode('idle');
    }
  };

  const resetScan = () => {
    setResult(null);
    setScanMode('idle');
    setScanning(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Punkte sammeln</h1>
      </div>

      <AnimatePresence mode="wait">
        {/* Result View */}
        {result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center justify-center min-h-[60vh]"
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
                <Button onClick={resetScan} className="mt-6 w-full">
                  Erneut scannen
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* QR Scanner View */}
        {scanMode === 'qr' && !result && (
          <motion.div
            key="qr"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-square relative">
                  <Scanner
                    onScan={(result) => {
                      if (result?.[0]?.rawValue) {
                        handleQRScan(result[0].rawValue);
                      }
                    }}
                    onError={(error) => {
                      console.error('QR Scanner error:', error);
                    }}
                    styles={{
                      container: { width: '100%', height: '100%' },
                      video: { width: '100%', height: '100%', objectFit: 'cover' },
                    }}
                  />
                  {/* Scan overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 border-[60px] border-black/50" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-primary rounded-lg" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <p className="text-center text-muted-foreground">
              Halte die Kamera auf den QR-Code
            </p>
            <Button variant="outline" onClick={() => setScanMode('idle')} className="w-full">
              Abbrechen
            </Button>
          </motion.div>
        )}

        {/* NFC Scan View */}
        {scanMode === 'nfc' && !result && (
          <motion.div
            key="nfc"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[60vh] space-y-6"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <Nfc className="h-16 w-16 text-primary" />
            </motion.div>
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">NFC bereit</h2>
              <p className="text-muted-foreground">
                Halte dein Handy an den Eloyo-Stempel
              </p>
            </div>
            <Button variant="outline" onClick={() => setScanMode('idle')} className="w-full max-w-xs">
              Abbrechen
            </Button>
          </motion.div>
        )}

        {/* Mode Selection View */}
        {scanMode === 'idle' && !result && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Instructions */}
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Scan className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-lg font-semibold mb-2">So sammelst du Punkte</h2>
                <p className="text-muted-foreground text-sm">
                  Scanne den Eloyo-Stempel beim Händler per NFC oder QR-Code
                </p>
              </CardContent>
            </Card>

            {/* Scan Options */}
            <div className="grid gap-4">
              {nfcSupported && (
                <Button
                  onClick={startNFCScan}
                  className="h-auto py-6 flex-col gap-2"
                  size="lg"
                >
                  <Nfc className="h-8 w-8" />
                  <span className="text-lg font-semibold">NFC Scan</span>
                  <span className="text-xs opacity-80">Halte dein Handy an den Stempel</span>
                </Button>
              )}

              <Button
                onClick={() => setScanMode('qr')}
                variant={nfcSupported ? 'outline' : 'default'}
                className="h-auto py-6 flex-col gap-2"
                size="lg"
              >
                <QrCode className="h-8 w-8" />
                <span className="text-lg font-semibold">QR-Code scannen</span>
                <span className="text-xs opacity-80">Scanne den QR-Code mit der Kamera</span>
              </Button>
            </div>

            {!nfcSupported && (
              <p className="text-center text-xs text-muted-foreground">
                NFC wird auf diesem Gerät nicht unterstützt
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AppScan;
