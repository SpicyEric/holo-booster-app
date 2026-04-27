import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X } from "lucide-react";

/* ───────────────────────── Types & Storage ───────────────────────── */

export type ConsentCategories = {
  necessary: true; // always true
  statistics: boolean;
  marketing: boolean;
};

const STORAGE_KEY = "eloyo_cookie_consent_v1";
const COOKIE_NAME = "eloyo_cookie_consent";
const COOKIE_MAX_AGE_DAYS = 365;

const writeCookie = (value: string) => {
  try {
    const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
      value,
    )}; max-age=${maxAge}; path=/; SameSite=Lax`;
  } catch {
    /* noop */
  }
};

export const getStoredConsent = (): ConsentCategories | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      necessary: true,
      statistics: Boolean(parsed.statistics),
      marketing: Boolean(parsed.marketing),
    };
  } catch {
    return null;
  }
};

const saveConsent = (consent: ConsentCategories) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    writeCookie(JSON.stringify(consent));
  } catch {
    /* noop */
  }
  // Notify listeners (other tabs / scripts) that consent changed
  window.dispatchEvent(
    new CustomEvent("eloyo:consent-changed", { detail: consent }),
  );
};

/* ───────────────── Public helper to (re)open the modal ───────────────── */

export const openCookieSettings = () => {
  window.dispatchEvent(new CustomEvent("eloyo:open-cookie-settings"));
};

/* ─────────────────────────── Component ─────────────────────────── */

const CookieConsent = () => {
  const [open, setOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [statistics, setStatistics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  // Decide whether to show on first load
  useEffect(() => {
    // Don't show inside the native app or on /app routes
    const isNative = Boolean(
      // @ts-expect-error - Capacitor is injected at runtime in the native app
      window.Capacitor?.isNativePlatform?.(),
    );
    const isAppRoute = window.location.pathname.startsWith("/app");
    if (isNative || isAppRoute) return;

    const stored = getStoredConsent();
    if (!stored) {
      setOpen(true);
      return;
    }
    // Pre-fill toggles from stored values for "settings" reopen
    setStatistics(stored.statistics);
    setMarketing(stored.marketing);
  }, []);

  // Listen for "open settings" trigger from elsewhere (e.g. footer link)
  useEffect(() => {
    const onOpen = () => {
      const stored = getStoredConsent();
      if (stored) {
        setStatistics(stored.statistics);
        setMarketing(stored.marketing);
      }
      setShowDetails(true);
      setOpen(true);
    };
    window.addEventListener("eloyo:open-cookie-settings", onOpen);
    return () =>
      window.removeEventListener("eloyo:open-cookie-settings", onOpen);
  }, []);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const acceptAll = () => {
    saveConsent({ necessary: true, statistics: true, marketing: true });
    setOpen(false);
  };

  const rejectAll = () => {
    saveConsent({ necessary: true, statistics: false, marketing: false });
    setOpen(false);
  };

  const saveSelection = () => {
    saveConsent({ necessary: true, statistics, marketing });
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cookie-consent"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-modal="true"
          role="dialog"
          aria-labelledby="cookie-consent-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl ring-1 ring-black/5"
          >
            <div className="flex items-start gap-4 p-6 sm:p-8">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Cookie className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h2
                    id="cookie-consent-title"
                    className="font-headline text-xl font-bold tracking-tight text-[#1a1b21] sm:text-2xl"
                  >
                    Cookies & Datenschutz
                  </h2>
                  <button
                    type="button"
                    onClick={rejectAll}
                    className="rounded-full p-1 text-[#6b6577] transition-colors hover:bg-[#f4f3fb] hover:text-[#1a1b21]"
                    aria-label="Schließen und alles ablehnen"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-[#4a4455]">
                  Wir verwenden Cookies, um dir die beste Erfahrung auf
                  unserer Website zu bieten. Notwendige Cookies sind für den
                  Betrieb erforderlich. Statistik- und Marketing-Cookies
                  helfen uns, unser Angebot zu verbessern. Du kannst deine
                  Auswahl jederzeit ändern.{" "}
                  <a
                    href="/datenschutz"
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Datenschutzerklärung
                  </a>
                  .
                </p>

                {/* Detail toggles */}
                <AnimatePresence initial={false}>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mt-5 space-y-3">
                        <ConsentRow
                          title="Notwendig"
                          description="Erforderlich für den Betrieb der Website (z.B. Login, Warenkorb)."
                          checked
                          disabled
                          onChange={() => {}}
                        />
                        <ConsentRow
                          title="Statistik"
                          description="Anonymisierte Auswertung der Nutzung, damit wir die Website verbessern können."
                          checked={statistics}
                          onChange={setStatistics}
                        />
                        <ConsentRow
                          title="Marketing"
                          description="Personalisierte Inhalte und Werbung auf dieser und anderen Websites."
                          checked={marketing}
                          onChange={setMarketing}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-3 text-sm">
                    {showDetails ? (
                      <button
                        type="button"
                        onClick={saveSelection}
                        className="font-semibold text-[#4a4455] underline-offset-4 hover:underline"
                      >
                        Auswahl speichern
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowDetails(true)}
                        className="font-semibold text-[#4a4455] underline-offset-4 hover:underline"
                      >
                        Einstellungen
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={rejectAll}
                      className="font-semibold text-[#4a4455] underline-offset-4 hover:underline"
                    >
                      Alle ablehnen
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={acceptAll}
                    className="inline-flex items-center justify-center rounded-2xl bg-[#1a1b21] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-black/10 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Alle akzeptieren
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ───────────────────────── Sub-component ───────────────────────── */

const ConsentRow = ({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) => (
  <label
    className={`flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-[#ece9f4] bg-[#faf8ff] p-4 transition-colors ${
      disabled ? "opacity-90" : "hover:bg-[#f4f3fb]"
    }`}
  >
    <div className="min-w-0">
      <div className="text-sm font-bold text-[#1a1b21]">{title}</div>
      <div className="mt-0.5 text-xs leading-relaxed text-[#6b6577]">
        {description}
      </div>
    </div>
    <span
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        if (disabled) return;
        e.preventDefault();
        onChange(!checked);
      }}
      className={`relative mt-1 inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-[#d8d3e3]"
      } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-[2px]"
        }`}
      />
    </span>
  </label>
);

export default CookieConsent;
