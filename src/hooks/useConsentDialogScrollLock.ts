import { useEffect } from 'react';

const CONSENT_DIALOG_SELECTOR = 'dialog.ccm-dialog-open';
const CONSENT_SCROLL_LOCK_CLASS = 'ccm19-modal-open';

const syncConsentScrollLock = () => {
  const html = document.documentElement;
  const body = document.body;
  const hasOpenConsentDialog = Boolean(document.querySelector(CONSENT_DIALOG_SELECTOR));

  html.classList.toggle(CONSENT_SCROLL_LOCK_CLASS, hasOpenConsentDialog);
  body.classList.toggle(CONSENT_SCROLL_LOCK_CLASS, hasOpenConsentDialog);
};

export const useConsentDialogScrollLock = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const preventBackgroundScroll = (event: WheelEvent | TouchEvent) => {
      const dialog = document.querySelector(CONSENT_DIALOG_SELECTOR);
      if (!dialog) return;

      const target = event.target as Node | null;
      if (target && dialog.contains(target)) return;

      event.preventDefault();
    };

    const observer = new MutationObserver(() => {
      syncConsentScrollLock();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    syncConsentScrollLock();

    window.addEventListener('wheel', preventBackgroundScroll, {
      passive: false,
      capture: true,
    });
    window.addEventListener('touchmove', preventBackgroundScroll, {
      passive: false,
      capture: true,
    });

    return () => {
      observer.disconnect();
      window.removeEventListener('wheel', preventBackgroundScroll, true);
      window.removeEventListener('touchmove', preventBackgroundScroll, true);
      document.documentElement.classList.remove(CONSENT_SCROLL_LOCK_CLASS);
      document.body.classList.remove(CONSENT_SCROLL_LOCK_CLASS);
    };
  }, []);
};

export default useConsentDialogScrollLock;
