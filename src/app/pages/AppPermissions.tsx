import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Wifi, Check, ArrowRight, Settings, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/app/hooks/usePermissions';
import { toast } from 'sonner';

type PermissionStep = 'intro' | 'location' | 'nfc' | 'complete';

export const AppPermissions = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<PermissionStep>('intro');
  const { 
    permissions, 
    isLoading, 
    isNative,
    requestLocation, 
    checkNfc, 
    openNfcSettings,
    checkAllPermissions 
  } = usePermissions();

  // If not native, skip permissions
  useEffect(() => {
    if (!isNative && !isLoading) {
      navigate('/app', { replace: true });
    }
  }, [isNative, isLoading, navigate]);

  // Check if all permissions are already granted
  useEffect(() => {
    if (!isLoading && isNative) {
      if (permissions.location === 'granted' && permissions.nfc === 'supported') {
        // All permissions already granted, go to app
        navigate('/app', { replace: true });
      }
    }
  }, [isLoading, isNative, permissions, navigate]);

  const handleRequestLocation = async () => {
    const granted = await requestLocation();
    if (granted) {
      toast.success('Standortzugriff erlaubt!');
      setStep('nfc');
    } else {
      toast.error('Standortzugriff benötigt für die Kartenansicht');
    }
  };

  const handleCheckNfc = async () => {
    const available = await checkNfc();
    if (available) {
      toast.success('NFC ist bereit!');
      setStep('complete');
    } else {
      // NFC might be disabled - offer settings
      if (permissions.nfc === 'disabled') {
        toast.error('Bitte aktiviere NFC in den Einstellungen');
      } else {
        toast.error('NFC wird auf diesem Gerät nicht unterstützt');
        // Still continue - user can use app without NFC for browsing
        setStep('complete');
      }
    }
  };

  const handleOpenNfcSettings = async () => {
    await openNfcSettings();
    // Re-check after user returns from settings
    setTimeout(async () => {
      await checkAllPermissions();
    }, 1000);
  };

  const handleComplete = () => {
    // Mark permissions as completed in localStorage
    localStorage.setItem('eloyo_permissions_completed', 'true');
    navigate('/app', { replace: true });
  };

  const handleSkip = () => {
    localStorage.setItem('eloyo_permissions_completed', 'true');
    navigate('/app', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress indicator */}
      <div className="p-4 flex gap-2">
        {['intro', 'location', 'nfc', 'complete'].map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              ['intro', 'location', 'nfc', 'complete'].indexOf(step) >= i
                ? 'bg-primary'
                : 'bg-muted'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-8 max-w-sm"
            >
              <div className="h-24 w-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-12 w-12 text-primary" />
              </div>
              
              <div>
                <h1 className="text-2xl font-bold mb-3">Berechtigungen einrichten</h1>
                <p className="text-muted-foreground">
                  Für das beste Eloyo-Erlebnis benötigen wir ein paar Berechtigungen.
                </p>
              </div>

              <div className="space-y-4 text-left">
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Standort</p>
                    <p className="text-xs text-muted-foreground">Um Geschäfte in deiner Nähe zu finden</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Wifi className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">NFC</p>
                    <p className="text-xs text-muted-foreground">Um Punkte bei Eloyo-Partnern zu sammeln</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  className="w-full h-12" 
                  onClick={() => setStep('location')}
                >
                  Einrichtung starten
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                
                <button 
                  onClick={handleSkip}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Später einrichten
                </button>
              </div>
            </motion.div>
          )}

          {step === 'location' && (
            <motion.div
              key="location"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-8 max-w-sm"
            >
              <div className="h-24 w-24 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center">
                <MapPin className="h-12 w-12 text-blue-500" />
              </div>
              
              <div>
                <h1 className="text-2xl font-bold mb-3">Standortzugriff</h1>
                <p className="text-muted-foreground">
                  Mit deinem Standort zeigen wir dir Eloyo-Partner in deiner Nähe auf der Karte.
                </p>
              </div>

              {permissions.location === 'denied' && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <p className="text-sm text-destructive">
                    Standortzugriff wurde verweigert. Bitte aktiviere ihn in den Geräteeinstellungen.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <Button 
                  className="w-full h-12" 
                  onClick={handleRequestLocation}
                >
                  Standort erlauben
                  <MapPin className="ml-2 h-4 w-4" />
                </Button>
                
                <button 
                  onClick={() => setStep('nfc')}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Überspringen
                </button>
              </div>
            </motion.div>
          )}

          {step === 'nfc' && (
            <motion.div
              key="nfc"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-8 max-w-sm"
            >
              <div className="h-24 w-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Wifi className="h-12 w-12 text-primary" />
              </div>
              
              <div>
                <h1 className="text-2xl font-bold mb-3">NFC aktivieren</h1>
                <p className="text-muted-foreground">
                  Mit NFC kannst du bei teilnehmenden Händlern Punkte sammeln, indem du dein Handy an den Stempel hältst.
                </p>
              </div>

              {permissions.nfc === 'disabled' && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    NFC ist auf deinem Gerät deaktiviert. Bitte aktiviere es in den Einstellungen.
                  </p>
                </div>
              )}

              {permissions.nfc === 'unsupported' && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <p className="text-sm text-destructive">
                    Dein Gerät unterstützt kein NFC. Du kannst die App trotzdem nutzen, aber keine Punkte sammeln.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {permissions.nfc === 'disabled' ? (
                  <>
                    <Button 
                      className="w-full h-12" 
                      onClick={handleOpenNfcSettings}
                    >
                      NFC-Einstellungen öffnen
                      <Settings className="ml-2 h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full h-12" 
                      onClick={handleCheckNfc}
                    >
                      Erneut prüfen
                    </Button>
                  </>
                ) : permissions.nfc === 'unsupported' ? (
                  <Button 
                    className="w-full h-12" 
                    onClick={() => setStep('complete')}
                  >
                    Weiter ohne NFC
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    className="w-full h-12" 
                    onClick={handleCheckNfc}
                  >
                    NFC prüfen
                    <Wifi className="ml-2 h-4 w-4" />
                  </Button>
                )}
                
                <button 
                  onClick={() => setStep('complete')}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Überspringen
                </button>
              </div>
            </motion.div>
          )}

          {step === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-8 max-w-sm"
            >
              <div className="h-24 w-24 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="h-12 w-12 text-green-500" />
              </div>
              
              <div>
                <h1 className="text-2xl font-bold mb-3">Alles bereit!</h1>
                <p className="text-muted-foreground">
                  Du kannst jetzt Punkte sammeln und von exklusiven Angeboten profitieren.
                </p>
              </div>

              <div className="space-y-2 text-left">
                <div className="flex items-center gap-2 text-sm">
                  {permissions.location === 'granted' ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted" />
                  )}
                  <span className={permissions.location === 'granted' ? 'text-foreground' : 'text-muted-foreground'}>
                    Standort
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {permissions.nfc === 'supported' ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted" />
                  )}
                  <span className={permissions.nfc === 'supported' ? 'text-foreground' : 'text-muted-foreground'}>
                    NFC
                  </span>
                </div>
              </div>

              <Button 
                className="w-full h-12" 
                onClick={handleComplete}
              >
                Los geht's!
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
