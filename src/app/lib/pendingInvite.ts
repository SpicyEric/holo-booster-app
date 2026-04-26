const PENDING_INVITE_KEY = 'eloyo_pending_invite';
const INVITE_CODE_PATTERN = /^[A-Za-z0-9]{4,}$/;

const normalizeInviteCode = (value: string | null | undefined) => {
  if (!value) return null;
  const decoded = decodeURIComponent(value).trim().replace(/^\/+|\/+$/g, '');
  const code = decoded.split(/[?#/&]/)[0];
  return INVITE_CODE_PATTERN.test(code) ? code.toUpperCase() : null;
};

const extractFromPath = (pathname: string) => {
  const match = pathname.match(/(?:^|\/)i\/([A-Za-z0-9]{4,})\/?$/i)
    || pathname.match(/(?:^|\/)invite\/([A-Za-z0-9]{4,})\/?$/i)
    || pathname.match(/^\/([A-Za-z0-9]{4,})\/?$/i);
  return normalizeInviteCode(match?.[1]);
};

export function extractInviteCodeFromUrl(rawUrl: string | null | undefined) {
  if (!rawUrl) return null;

  const directMatch = rawUrl.match(/(?:^|[/?#&])(code|invite|share_code)=([A-Za-z0-9]{4,})/i)
    || rawUrl.match(/(?:eloyo|intent):\/\/(?:invite|i)\/([A-Za-z0-9]{4,})/i)
    || rawUrl.match(/https?:\/\/(?:www\.)?eloyo\.de\/i\/([A-Za-z0-9]{4,})/i);
  const directCode = normalizeInviteCode(directMatch?.[2] ?? directMatch?.[1]);
  if (directCode) return directCode;

  try {
    const parsedUrl = new URL(rawUrl);
    const paramCode = normalizeInviteCode(
      parsedUrl.searchParams.get('code')
        || parsedUrl.searchParams.get('invite')
        || parsedUrl.searchParams.get('share_code')
    );
    if (paramCode) return paramCode;

    if (parsedUrl.hostname === 'invite' || parsedUrl.hostname === 'i') {
      return extractFromPath(parsedUrl.pathname);
    }

    return extractFromPath(parsedUrl.pathname);
  } catch {
    return extractFromPath(rawUrl);
  }
}

export function getPendingInviteCode() {
  try {
    return normalizeInviteCode(localStorage.getItem(PENDING_INVITE_KEY))
      || normalizeInviteCode(sessionStorage.getItem(PENDING_INVITE_KEY));
  } catch {
    return null;
  }
}

export function storePendingInvite(codeOrUrl: string) {
  const code = extractInviteCodeFromUrl(codeOrUrl) || normalizeInviteCode(codeOrUrl);
  if (!code) return null;

  try {
    localStorage.setItem(PENDING_INVITE_KEY, code);
    sessionStorage.setItem(PENDING_INVITE_KEY, code);
  } catch {
    // ignore
  }

  return code;
}

export function clearPendingInvite() {
  try {
    localStorage.removeItem(PENDING_INVITE_KEY);
    sessionStorage.removeItem(PENDING_INVITE_KEY);
  } catch {
    // ignore
  }
}

export function notifyPendingInvite(code: string) {
  window.dispatchEvent(new CustomEvent('eloyo:pending-invite', { detail: code }));
}