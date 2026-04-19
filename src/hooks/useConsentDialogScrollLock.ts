import { useEffect } from 'react';

const CONSENT_DIALOG_SELECTOR = 'dialog.ccm-dialog-open';
const CONSENT_SCROLL_LOCK_CLASS = 'ccm19-modal-open';

export const useConsentDialogScrollLock = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const html = document.documentElement;
    const body = document.body;

    let wheelAttached = false;

    const preventBackgroundScroll = (event: WheelEvent | TouchEvent) => {
      const dialog = document.querySelector(CONSENT_DIALOG_SELECTOR);
      if (!dialog) return;
      const target = event.target as Node | null;
      if (target && dialog.contains(target)) return;
      event.preventDefault();
    };

    const attachBlockers = () => {
      if (wheelAttached) return;
      window.addEventListener('wheel', preventBackgroundScroll, {
        passive: false,
        capture: true,
      });
      window.addEventListener('touchmove', preventBackgroundScroll, {
        passive: false,
        capture: true,
      });
      wheelAttached = true;
    };

    const detachBlockers = () => {
      if (!wheelAttached) return;
      window.removeEventListener('wheel', preventBackgroundScroll, true);
      window.removeEventListener('touchmove', preventBackgroundScroll, true);
      wheelAttached = false;
    };

    const syncConsentScrollLock = () => {
      const hasOpenConsentDialog = Boolean(document.querySelector(CONSENT_DIALOG_SELECTOR));
      html.classList.toggle(CONSENT_SCROLL_LOCK_CLASS, hasOpenConsentDialog);
      body.classList.toggle(CONSENT_SCROLL_LOCK_CLASS, hasOpenConsentDialog);
      if (hasOpenConsentDialog) attachBlockers();
      else detachBlockers();
    };

    const observer = new MutationObserver(syncConsentScrollLock);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'open'],
    });

    syncConsentScrollLock();

    return () => {
      observer.disconnect();
      detachBlockers();
      html.classList.remove(CONSENT_SCROLL_LOCK_CLASS);
      body.classList.remove(CONSENT_SCROLL_LOCK_CLASS);
    };
  }, []);
};

export default useConsentDialogScrollLock;
