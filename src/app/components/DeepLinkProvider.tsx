import { useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

// Check if Capacitor App plugin is available
const getCapacitorApp = async () => {
  try {
    const { App } = await import('@capacitor/app');
    return App;
  } catch {
    return null;
  }
};

interface DeepLinkContextType {
  handleDeepLink: (url: string) => void;
}

const DeepLinkContext = createContext<DeepLinkContextType | null>(null);

export function useDeepLink() {
  return useContext(DeepLinkContext);
}

interface DeepLinkProviderProps {
  children: ReactNode;
}

/**
 * Deep Link Provider
 * 
 * Wrapper-Komponente die Deep Links und NFC-Intents verarbeitet.
 * Sollte innerhalb des BrowserRouter platziert werden.
 */
export function DeepLinkProvider({ children }: DeepLinkProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleDeepLink = useCallback((url: string) => {
    console.log('🔗 Deep Link empfangen:', url);

    try {
      let targetPath: string | null = null;

      // Versuche URL zu parsen
      try {
        const parsedUrl = new URL(url);
        const pathname = parsedUrl.pathname;
        
        // NFC/Chip deep links komplett ignorieren - Punkte werden NUR
        // über den aktiven Scan-Bildschirm vergeben
        const hasChipParam = parsedUrl.searchParams.has('chip') || 
                             parsedUrl.searchParams.has('nfc') ||
                             parsedUrl.searchParams.has('tag');
        
        if (hasChipParam) {
          console.log('📱 NFC Deep Link ignoriert - Punkte nur über aktiven Scan');
          return;
        }

        // Ziel-Pfad bestimmen (nur nicht-NFC Links)
        if (pathname.startsWith('/app') && !pathname.includes('/scan')) {
          targetPath = pathname;
        }
      } catch {
        // Nicht eine gültige URL - ignorieren
        console.log('📱 Ungültige Deep Link URL ignoriert');
      }

      // Allgemeine Navigation (keine Scan-Seite)
      if (targetPath) {
        navigate(targetPath, { replace: true });
      }
    } catch (error) {
      console.error('Deep Link Verarbeitungsfehler:', error);
    }
  }, [navigate]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const setupDeepLinkListeners = async () => {
      const App = await getCapacitorApp();
      if (!App) {
        console.log('📱 Deep Links: Web-Modus (keine native App)');
        return;
      }

      try {
        // Listener für eingehende URLs (App im Hintergrund)
        const urlListener = await App.addListener('appUrlOpen', (event) => {
          console.log('📱 App URL Open:', event.url);
          handleDeepLink(event.url);
        });

        // Listener für App-Rückkehr aus Hintergrund
        const resumeListener = await App.addListener('appStateChange', async (state) => {
          if (state.isActive) {
            // Prüfe ob es einen pending Deep Link gibt
            const launchUrl = await App.getLaunchUrl();
            if (launchUrl?.url) {
              handleDeepLink(launchUrl.url);
            }
          }
        });

        // Prüfe ob App mit Deep Link gestartet wurde
        const launchUrl = await App.getLaunchUrl();
        if (launchUrl?.url) {
          console.log('📱 App mit Deep Link gestartet:', launchUrl.url);
          // Kleine Verzögerung um sicherzustellen dass Router bereit ist
          setTimeout(() => {
            handleDeepLink(launchUrl.url);
          }, 100);
        }

        cleanup = () => {
          urlListener.remove();
          resumeListener.remove();
        };

        console.log('✅ Deep Link Listener aktiv');
      } catch (error) {
        console.error('Deep Link Setup Fehler:', error);
      }
    };

    setupDeepLinkListeners();

    return () => {
      cleanup?.();
    };
  }, [handleDeepLink]);

  // Listener für NFC Events vom Native Plugin
  useEffect(() => {
    const handleNfcEvent = (event: CustomEvent) => {
      const tagId = event.detail?.tagId || event.detail?.id || event.detail?.serialNumber;
      if (tagId) {
        console.log('📱 NFC Event empfangen:', tagId);
        handleDeepLink(`eloyo://scan?chip=${tagId}`);
      }
    };

    window.addEventListener('capacitor-nfc-tag' as any, handleNfcEvent);
    window.addEventListener('nfc-tag-scanned' as any, handleNfcEvent);

    return () => {
      window.removeEventListener('capacitor-nfc-tag' as any, handleNfcEvent);
      window.removeEventListener('nfc-tag-scanned' as any, handleNfcEvent);
    };
  }, [handleDeepLink]);

  return (
    <DeepLinkContext.Provider value={{ handleDeepLink }}>
      {children}
    </DeepLinkContext.Provider>
  );
}
