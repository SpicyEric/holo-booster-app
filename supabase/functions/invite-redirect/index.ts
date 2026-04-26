// Invite Redirect Edge Function
// Verarbeitet eloyo.de/i/CODE → öffnet App, leitet zum Store oder zeigt Landingpage
// CORS nicht zwingend nötig (Browser-Navigation), aber für Tests sinnvoll

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APP_SCHEME = 'eloyo://invite/';
const IOS_STORE_URL = 'https://apps.apple.com/app/eloyo/id0000000000'; // TODO: echte ID
const ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.eloyo.app';
const FALLBACK_URL = 'https://eloyo.de/download';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

function detectPlatform(ua: string): 'ios' | 'android' | 'web' {
  const u = ua.toLowerCase();
  if (/iphone|ipad|ipod/.test(u)) return 'ios';
  if (/android/.test(u)) return 'android';
  return 'web';
}

function buildLandingHtml(opts: {
  code: string;
  merchantName: string;
  logoUrl: string | null;
  coverUrl: string | null;
  inviteePoints: number;
  platform: 'ios' | 'android' | 'web';
}): string {
  const { code, merchantName, logoUrl, coverUrl, inviteePoints, platform } = opts;
  const appLink = `${APP_SCHEME}${code}`;
  const androidIntentLink = `intent://invite/${code}#Intent;scheme=eloyo;package=com.eloyo.app;S.browser_fallback_url=${encodeURIComponent(ANDROID_STORE_URL)};end`;
  const storeLink = platform === 'ios' ? IOS_STORE_URL : platform === 'android' ? ANDROID_STORE_URL : FALLBACK_URL;
  const safeName = merchantName.replace(/</g, '&lt;');
  const safeCover = (coverUrl || logoUrl || '').replace(/"/g, '');
  const safeLogo = (logoUrl || '').replace(/"/g, '');

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<title>Einladung zu ${safeName} · Eloyo</title>
<meta property="og:title" content="Einladung zu ${safeName}" />
<meta property="og:description" content="Du wurdest zu ${safeName} eingeladen! Sammle Punkte und erhalte deinen Bonus." />
${safeCover ? `<meta property="og:image" content="${safeCover}" />` : ''}
<style>
  *,*::before,*::after{box-sizing:border-box}
  html,body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0F0E17;color:#FFFFFE;min-height:100vh}
  body{display:flex;align-items:center;justify-content:center;padding:24px}
  .card{max-width:420px;width:100%;background:#1F1B2E;border-radius:24px;overflow:hidden;box-shadow:0 30px 80px -20px rgba(124,58,237,.4)}
  .cover{height:160px;background:${safeCover ? `url('${safeCover}') center/cover` : 'linear-gradient(135deg,#7C3AED,#A78BFA)'}}
  .body{padding:28px 24px 24px;text-align:center}
  .logo{width:72px;height:72px;border-radius:18px;margin:-60px auto 16px;background:#FFF center/cover no-repeat;border:3px solid #1F1B2E;${safeLogo ? `background-image:url('${safeLogo}');` : ''}}
  h1{font-size:22px;margin:0 0 8px;font-weight:700}
  .sub{color:#A1A1AA;font-size:15px;line-height:1.5;margin:0 0 24px}
  .points{display:inline-flex;align-items:center;gap:6px;background:rgba(124,58,237,.18);color:#C4B5FD;font-weight:600;padding:8px 14px;border-radius:999px;font-size:14px;margin-bottom:24px}
  .btn{display:block;width:100%;padding:16px;border-radius:14px;font-size:16px;font-weight:600;text-decoration:none;text-align:center;margin-bottom:12px;transition:transform .15s ease}
  .btn:active{transform:scale(.98)}
  .btn-primary{background:linear-gradient(135deg,#7C3AED,#A78BFA);color:#fff;border:0}
  .btn-secondary{background:transparent;color:#A1A1AA;border:1px solid #2D2640}
  .footer{margin-top:20px;font-size:12px;color:#52525B}
</style>
</head>
<body>
  <div class="card">
    <div class="cover"></div>
    <div class="body">
      <div class="logo"></div>
      <h1>Du wurdest zu<br/><span style="color:#A78BFA">${safeName}</span> eingeladen 🎉</h1>
      <div class="points">+${inviteePoints} Bonuspunkte für dich</div>
      <p class="sub">Öffne die Eloyo-App, besuche das Geschäft mit deiner Einladenden Person und ihr bekommt beide Bonuspunkte!</p>
      <a class="btn btn-primary" href="${appLink}" id="open-app">In Eloyo öffnen</a>
      <a class="btn btn-secondary" href="${storeLink}" id="store">App herunterladen</a>
      <div class="footer">Code: ${code} · gültig 7 Tage</div>
    </div>
  </div>
<script>
(function(){
  // Speichere Code für Deferred Deep Link nach Installation
  try { localStorage.setItem('eloyo_pending_invite', '${code}'); } catch(_) {}
  try { document.cookie = 'eloyo_pending_invite=${code}; path=/; max-age=604800; SameSite=Lax'; } catch(_) {}

  var platform = '${platform}';
  if (platform === 'ios' || platform === 'android') {
    var openedAt = Date.now();
    var fallbackTimer = setTimeout(function(){
      // Wenn die App nicht geöffnet wurde, Store öffnen
      if (Date.now() - openedAt < 2200) {
        window.location.href = '${storeLink}';
      }
    }, 1500);
    // Versuche App zu öffnen
      window.location.href = platform === 'android' ? '${androidIntentLink}' : '${appLink}';
    // Wenn Tab inaktiv wird → App ist geöffnet → Timer canceln
    document.addEventListener('visibilitychange', function(){
      if (document.hidden) clearTimeout(fallbackTimer);
    });
  }
})();
</script>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Path: /invite-redirect/CODE  ODER  /functions/v1/invite-redirect/CODE
    const parts = url.pathname.split('/').filter(Boolean);
    const code = parts[parts.length - 1];

    if (!code || code === 'invite-redirect' || code.length < 4) {
      return new Response('Invalid invite code', { status: 400, headers: corsHeaders });
    }

    // Lookup über Supabase REST (öffentliche RPC)
    const lookupRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/lookup_invitation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify({ p_share_code: code }),
    });

    if (!lookupRes.ok) {
      return new Response('Einladung nicht gefunden', { status: 404, headers: corsHeaders });
    }

    const data = await lookupRes.json();
    if (!data?.success) {
      return new Response(
        `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>${data?.error || 'Einladung ungültig'}</h2><p><a href="https://eloyo.de">Zur Startseite</a></p></body></html>`,
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const ua = req.headers.get('user-agent') ?? '';
    const platform = detectPlatform(ua);

    const html = buildLandingHtml({
      code,
      merchantName: data.merchant_name ?? 'einem Geschäft',
      logoUrl: data.logo_url ?? null,
      coverUrl: data.cover_image_url ?? null,
      inviteePoints: data.invitee_points ?? 1,
      platform,
    });

    return new Response(html, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(`Fehler: ${msg}`, { status: 500, headers: corsHeaders });
  }
});
