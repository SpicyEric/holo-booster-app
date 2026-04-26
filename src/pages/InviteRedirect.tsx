import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Gift, Sparkles } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { notifyPendingInvite, storePendingInvite } from '@/app/lib/pendingInvite';

const APP_SCHEME = 'eloyo://invite/';
const ANDROID_PACKAGE = 'com.eloyo.app';
const IOS_STORE_URL = 'https://apps.apple.com/app/eloyo/id0000000000';
const ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.eloyo.app';
const FALLBACK_URL = 'https://eloyo.de/download';

type Platform = 'ios' | 'android' | 'web';

function detectPlatform(): Platform {
  const ua = (navigator.userAgent || '').toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'web';
}

interface InviteData {
  merchant_name: string;
  logo_url: string | null;
  cover_image_url: string | null;
  invitee_points: number;
}

export default function InviteRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const platform = detectPlatform();
  const isNativeApp = Capacitor.isNativePlatform();
  const [data, setData] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(platform === 'web' && !isNativeApp);
  const isMobilePlatform = !isNativeApp && platform !== 'web';

  useEffect(() => {
    if (!code) return;

    // Code für Deferred Deep Link nach Installation persistieren
    const storedCode = storePendingInvite(code);
    try {
      document.cookie = `eloyo_pending_invite=${code}; path=/; max-age=604800; SameSite=Lax`;
    } catch {
      // ignore
    }

    if (isNativeApp) {
      if (storedCode) notifyPendingInvite(storedCode);
      navigate('/app', { replace: true });
      return;
    }

    if (platform === 'web') {
      void loadInvite(code);
    } else {
      setLoading(false);
    }
  }, [code, isNativeApp, navigate, platform]);

  // Mobile: sofort native App öffnen; wenn nicht installiert, Store-Fallback.
  // Wichtig: Nicht auf RPC/UI warten, sonst bleibt Samsung Internet sichtbar.
  useEffect(() => {
    if (!code || platform === 'web' || isNativeApp) return;
    const openedAt = Date.now();
    const storeLink = platform === 'ios' ? IOS_STORE_URL : ANDROID_STORE_URL;
    const appOpenLink = platform === 'android'
      ? `intent://invite/${code}#Intent;scheme=eloyo;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(storeLink)};end`
      : `${APP_SCHEME}${code}`;

    const fallbackTimer = window.setTimeout(() => {
      // Wenn Tab noch sichtbar (App nicht geöffnet) → Store
      if (!document.hidden && Date.now() - openedAt < 2200) {
        window.location.href = storeLink;
      }
    }, 1500);

    const onVis = () => {
      if (document.hidden) window.clearTimeout(fallbackTimer);
    };
    document.addEventListener('visibilitychange', onVis);

    // App-Scheme triggern
    window.location.href = appOpenLink;

    return () => {
      window.clearTimeout(fallbackTimer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [platform, code, isNativeApp]);

  const loadInvite = async (shareCode: string) => {
    try {
      const { data: result, error: rpcError } = await supabase.rpc('lookup_invitation', {
        p_share_code: shareCode,
      });
      if (rpcError) throw rpcError;
      const r = result as {
        success: boolean;
        error?: string;
        merchant_name?: string;
        logo_url?: string | null;
        cover_image_url?: string | null;
        invitee_points?: number;
      };
      if (!r.success) {
        setError(r.error || 'Einladung ungültig');
        return;
      }
      setData({
        merchant_name: r.merchant_name || 'einem Geschäft',
        logo_url: r.logo_url ?? null,
        cover_image_url: r.cover_image_url ?? null,
        invitee_points: r.invitee_points ?? 1,
      });
    } catch (err) {
      console.error('lookup_invitation Fehler:', err);
      setError('Einladung konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const storeLink = platform === 'ios' ? IOS_STORE_URL : platform === 'android' ? ANDROID_STORE_URL : FALLBACK_URL;
  const appLink = platform === 'android'
    ? `intent://invite/${code}#Intent;scheme=eloyo;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(storeLink)};end`
    : `${APP_SCHEME}${code}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Öffne Eloyo …</div>
      </div>
    );
  }

  if (isMobilePlatform) {
    const storeLink = platform === 'ios' ? IOS_STORE_URL : ANDROID_STORE_URL;
    const appLink = platform === 'android'
      ? `intent://invite/${code}#Intent;scheme=eloyo;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(storeLink)};end`
      : `${APP_SCHEME}${code}`;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center">
            <Gift className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Eloyo wird geöffnet …</h1>
          <p className="text-sm text-muted-foreground">Falls nichts passiert, öffne die App direkt.</p>
          <Button asChild className="w-full h-11 rounded-xl">
            <a href={appLink}>In Eloyo öffnen</a>
          </Button>
          <Button asChild variant="outline" className="w-full h-11 rounded-xl">
            <a href={storeLink}>App herunterladen</a>
          </Button>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center space-y-4">
          <h1 className="text-2xl font-bold">{error || 'Einladung nicht gefunden'}</h1>
          <a href="https://eloyo.de" className="text-primary underline">
            Zur Startseite
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-3xl overflow-hidden bg-card shadow-2xl">
        <div
          className="h-40 bg-gradient-to-br from-primary to-primary/60"
          style={
            data.cover_image_url || data.logo_url
              ? {
                  backgroundImage: `url(${data.cover_image_url || data.logo_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : undefined
          }
        />
        <div className="px-6 pb-6 -mt-12 text-center">
          <div className="mx-auto h-20 w-20 rounded-2xl bg-card border-4 border-card shadow-lg overflow-hidden flex items-center justify-center mb-4">
            {data.logo_url ? (
              <img src={data.logo_url} alt={data.merchant_name} className="h-full w-full object-cover" />
            ) : (
              <Gift className="h-10 w-10 text-primary" />
            )}
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            Du wurdest eingeladen
          </div>
          <h1 className="text-xl font-bold leading-tight mb-3">
            Willkommen bei <span className="text-primary">{data.merchant_name}</span> 🎉
          </h1>
          <div className="rounded-xl bg-primary/10 px-3 py-2.5 mb-5">
            <div className="text-xs text-muted-foreground">Dein Willkommensbonus</div>
            <div className="text-base font-bold text-primary">Doppelte Punkte für deinen ersten Stempel</div>
          </div>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            Öffne Eloyo, sammle innerhalb 7 Tagen deinen ersten Stempel — ihr bekommt beide Bonus.
          </p>
          <div className="space-y-2">
            <Button asChild className="w-full h-11 rounded-xl">
              <a href={appLink}>In Eloyo öffnen</a>
            </Button>
            <Button asChild variant="outline" className="w-full h-11 rounded-xl">
              <a href={storeLink}>App herunterladen</a>
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground pt-4">Code: {code} · gültig 7 Tage</p>
        </div>
      </div>
    </div>
  );
}
