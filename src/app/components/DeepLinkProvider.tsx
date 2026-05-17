import { useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractInviteCodeFromUrl, notifyPendingInvite, storePendingInvite } from '@/app/lib/pendingInvite';
import { consumeQueuedNativeDeepLinks, DEEP_LINK_EVENT } from '@/app/lib/nativeDeepLinkBootstrap';

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

  const handleDeepLink = useCallback((url: string) => {
    console.log('🔗 Deep Link empfangen:', url);

    try {
      let targetPath: string | null = null;

      const inviteCode = extractInviteCodeFromUrl(url);
      if (inviteCode) {
        console.log('🎁 Invite Code erkannt:', inviteCode);
        const storedCode = storePendingInvite(inviteCode);
        if (storedCode) {
          try {
            notifyPendingInvite(storedCode);
          } catch {
            // ignore
          }
        }
        navigate('/app', { replace: true });
        return;
      }

      if (url.includes('/i/') || url.includes('invite')) {
        console.warn('⚠️ Invite Deep Link ohne erkannten Code:', url);
      }

      // === Custom Scheme: eloyo://invite/CODE ===
      // Capacitor liefert diese als ungültige URL — manuell parsen
      const inviteSchemeMatch = url.match(/^eloyo:\/\/invite\/([A-Za-z0-9]{4,})/i);
      if (inviteSchemeMatch) {
        const code = inviteSchemeMatch[1];
        console.log('🎁 Invite Code aus eloyo:// erkannt:', code);
        storePendingInvite(code);
        // In den App-Bereich wechseln, damit der PendingInviteDialog rendert
        // (oder zur Auth, falls noch nicht eingeloggt — Dialog erscheint nach Login)
        try {
          window.dispatchEvent(new CustomEvent('eloyo:pending-invite', { detail: code }));
        } catch {
          // ignore
        }
        navigate('/app', { replace: true });
        return;
      }

      // Versuche URL zu parsen
      try {
        const parsedUrl = new URL(url);
        const pathname = parsedUrl.pathname;

        // === Web-Link: https://eloyo.de/i/CODE ===
        const inviteWebMatch = pathname.match(/^\/i\/([A-Za-z0-9]{4,})/);
        if (inviteWebMatch) {
          const code = inviteWebMatch[1];
          console.log('🎁 Invite Code aus Web-Link erkannt:', code);
          storePendingInvite(code);
          try {
            window.dispatchEvent(new CustomEvent('eloyo:pending-invite', { detail: code }));
          } catch {
            // ignore
          }
          navigate('/app', { replace: true });
          return;
        }

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
    const handleQueuedUrl = (event: Event) => {
      const url = (event as CustomEvent).detail as string | undefined;
      if (url) handleDeepLink(url);
    };

    window.addEventListener(DEEP_LINK_EVENT, handleQueuedUrl);
    consumeQueuedNativeDeepLinks().forEach(handleDeepLink);

    const setupDeepLinkListeners = async () => {
      const App = await getCapacitorApp();
      if (!App) {
        console.log('📱 Deep Links: Web-Modus (keine native App)');
        return;
      }

      try {
        const initialLaunchUrl = await App.getLaunchUrl();
        if (initialLaunchUrl?.url) {
          console.log('📱 App mit Deep Link gestartet:', initialLaunchUrl.url);
          handleDeepLink(initialLaunchUrl.url);
        }

        // Listener für eingehende URLs (App im Hintergrund)
        const urlListener = await App.addListener('appUrlOpen', (event) => {
          console.log('📱 App URL Open:', event.url);
          handleDeepLink(event.url);
        });

        cleanup = () => {
          urlListener.remove();
        };

        console.log('✅ Deep Link Listener aktiv');
      } catch (error) {
        console.error('Deep Link Setup Fehler:', error);
      }
    };

    setupDeepLinkListeners();

    return () => {
      window.removeEventListener(DEEP_LINK_EVENT, handleQueuedUrl);
      cleanup?.();
    };
  }, [handleDeepLink]);

  // NFC Events werden NICHT global verarbeitet.
  // Punkte werden ausschließlich über den aktiven Scan-Bildschirm (AppScan) vergeben.

  return (
    <DeepLinkContext.Provider value={{ handleDeepLink }}>
      {children}
    </DeepLinkContext.Provider>
  );
}
