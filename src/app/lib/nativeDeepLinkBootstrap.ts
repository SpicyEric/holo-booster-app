type NativeDeepLinkWindow = Window & {
  __eloyoPendingDeepLinkUrls?: string[];
};

const DEEP_LINK_EVENT = 'eloyo:native-deep-link-url';

function queueNativeUrl(url: string | null | undefined) {
  if (!url) return;

  const win = window as NativeDeepLinkWindow;
  win.__eloyoPendingDeepLinkUrls = win.__eloyoPendingDeepLinkUrls || [];
  if (!win.__eloyoPendingDeepLinkUrls.includes(url)) {
    win.__eloyoPendingDeepLinkUrls.push(url);
  }

  window.dispatchEvent(new CustomEvent(DEEP_LINK_EVENT, { detail: url }));
}

export function consumeQueuedNativeDeepLinks() {
  const win = window as NativeDeepLinkWindow;
  const urls = win.__eloyoPendingDeepLinkUrls || [];
  win.__eloyoPendingDeepLinkUrls = [];
  return urls;
}

export function registerNativeDeepLinkBootstrap() {
  void import('@capacitor/core').then(({ Capacitor }) => {
    if (!Capacitor.isNativePlatform()) return;

    void import('@capacitor/app').then(async ({ App }) => {
      try {
        const launchUrl = await App.getLaunchUrl();
        queueNativeUrl(launchUrl?.url);
      } catch {
        // ignore
      }

      try {
        void App.addListener('appUrlOpen', (event) => {
          queueNativeUrl(event.url);
        });
      } catch {
        // ignore
      }
    }).catch(() => {});
  }).catch(() => {});
}

export { DEEP_LINK_EVENT };