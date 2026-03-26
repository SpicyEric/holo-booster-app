import { useEffect, useState } from 'react';

// TODO: Replace with actual store URLs once available
const APP_STORE_URL = 'https://apps.apple.com/app/eloyo/id000000000';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.eloyo.app';

type Platform = 'ios' | 'android' | 'unknown';

const detectPlatform = (): Platform => {
  const ua = navigator.userAgent || navigator.vendor || '';
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'unknown';
};

const Download = () => {
  const [platform, setPlatform] = useState<Platform>('unknown');
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const detected = detectPlatform();
    setPlatform(detected);

    if (detected === 'ios') {
      setRedirecting(true);
      window.location.href = APP_STORE_URL;
    } else if (detected === 'android') {
      setRedirecting(true);
      window.location.href = PLAY_STORE_URL;
    }
  }, []);

  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="text-3xl">📱</span>
          </div>
          <p className="text-muted-foreground">Du wirst weitergeleitet…</p>
        </div>
      </div>
    );
  }

  // Fallback for desktop / unknown devices
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0C061E] to-[#1B0E37] px-4">
      <div className="max-w-sm w-full text-center space-y-8">
        <div className="space-y-3">
          <img src="/qrait-logo.svg" alt="eloyo" className="h-12 mx-auto" />
          <h1 className="text-2xl font-bold text-white">eloyo App herunterladen</h1>
          <p className="text-white/60 text-sm">
            Punkte sammeln, Belohnungen kassieren – alles in einer App.
          </p>
        </div>

        <div className="space-y-3">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-3.5 px-6 rounded-xl bg-white text-[#0C061E] font-semibold hover:bg-white/90 transition-colors"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 16.56 2.93 11.3 4.7 7.72C5.57 5.94 7.36 4.86 9.28 4.84C10.56 4.82 11.78 5.72 12.58 5.72C13.38 5.72 14.88 4.63 16.41 4.8C17.05 4.83 18.89 5.08 20.06 6.82C19.96 6.88 17.55 8.27 17.58 11.15C17.61 14.55 20.58 15.63 20.61 15.64C20.58 15.72 20.12 17.35 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/>
            </svg>
            App Store
          </a>

          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-3.5 px-6 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors border border-white/20"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.61 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
            </svg>
            Google Play
          </a>
        </div>

        <p className="text-white/40 text-xs">
          Scanne den QR-Code mit deinem Smartphone für automatische Weiterleitung.
        </p>
      </div>
    </div>
  );
};

export default Download;
