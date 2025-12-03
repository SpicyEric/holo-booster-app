import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { toast } from 'sonner';

/**
 * Deep Link Handler Hook
 * 
 * Verarbeitet eingehende Deep Links und NFC-Intents:
 * - eloyo://scan?chip=XXXX - Direkter Scan-Link
 * - https://eloyo.de/app/scan?chip=XXXX - Web-Link
 * - NFC Intent mit Tag-ID
 */
export function useDeepLinkHandler() {
  const navigate = useNavigate();

  const handleDeepLink = useCallback((url: string) => {
    console.log('Deep Link empfangen:', url);

    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname;
      const chip = parsedUrl.searchParams.get('chip');
      const nfcTag = parsedUrl.searchParams.get('nfc');

      // NFC Tag ID aus verschiedenen Quellen
      const tagId = chip || nfcTag;

      if (tagId) {
        // Direkt zur Scan-Seite mit Tag-ID navigieren
        console.log('NFC Tag erkannt:', tagId);
        navigate(`/app/scan?chip=${encodeURIComponent(tagId)}`);
        return;
      }

      // Allgemeine Deep-Link Navigation
      if (pathname.startsWith('/app')) {
        navigate(pathname + parsedUrl.search);
      } else if (pathname === '/scan' || pathname.startsWith('/s/')) {
        // Legacy Scan-Links
        navigate(`/app/scan${parsedUrl.search}`);
      }
    } catch (error) {
      console.error('Deep Link Parse Fehler:', error);
      
      // Fallback: Wenn URL nicht parsebar, könnte es eine reine Tag-ID sein
      if (url && !url.includes('://') && !url.includes('/')) {
        console.log('Direkter Tag-ID erkannt:', url);
        navigate(`/app/scan?chip=${encodeURIComponent(url)}`);
      }
    }
  }, [navigate]);

  useEffect(() => {
    // Listener für App-URL-Öffnung (Deep Links)
    const setupListeners = async () => {
      try {
        // Listener für eingehende URLs
        await App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
          console.log('App URL Open Event:', event);
          handleDeepLink(event.url);
        });

        // Prüfe ob App mit einem Deep Link gestartet wurde
        const launchUrl = await App.getLaunchUrl();
        if (launchUrl?.url) {
          console.log('App mit Deep Link gestartet:', launchUrl.url);
          handleDeepLink(launchUrl.url);
        }
      } catch (error) {
        // Nicht in nativer Umgebung - ignorieren
        console.log('Deep Link Handler: Nicht in nativer Umgebung');
      }
    };

    setupListeners();

    return () => {
      // Cleanup listeners
      App.removeAllListeners().catch(() => {});
    };
  }, [handleDeepLink]);

  return { handleDeepLink };
}

/**
 * NFC Intent Handler
 * Verarbeitet NFC-Daten die direkt vom Android Intent kommen
 */
export function useNfcIntentHandler(onTagScanned: (tagId: string) => void) {
  useEffect(() => {
    const handleNfcIntent = async () => {
      try {
        // Prüfe ob wir in einer nativen Umgebung sind
        const win = window as any;
        if (!win.Capacitor?.isNativePlatform?.()) return;

        // Android NFC Intent Daten werden oft als Extra übergeben
        // Das Capacitor NFC Plugin sollte diese automatisch verarbeiten
        // Aber wir können auch auf window events hören
        
        const handleNfcData = (event: CustomEvent) => {
          const tagId = event.detail?.tagId || event.detail?.serialNumber;
          if (tagId) {
            console.log('NFC Intent Data:', tagId);
            onTagScanned(tagId);
          }
        };

        window.addEventListener('nfc-tag-scanned', handleNfcData as EventListener);

        return () => {
          window.removeEventListener('nfc-tag-scanned', handleNfcData as EventListener);
        };
      } catch (error) {
        console.log('NFC Intent Handler nicht verfügbar');
      }
    };

    handleNfcIntent();
  }, [onTagScanned]);
}
