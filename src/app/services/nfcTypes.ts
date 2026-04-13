// Type declarations for @capawesome-team/capacitor-nfc
// The actual package is installed locally via .npmrc token and loaded dynamically at runtime.

export interface NfcPlugin {
  isSupported(): Promise<{ nfc?: boolean; isSupported?: boolean }>;
  isEnabled(): Promise<{ isEnabled: boolean }>;
  openSettings(): Promise<void>;
  startScanSession(options?: { alertMessage?: string }): Promise<void>;
  stopScanSession(): Promise<void>;
  addListener(eventName: 'nfcTagScanned', callback: (event: { nfcTag: any }) => void): Promise<{ remove: () => Promise<void> }>;
  addListener(eventName: 'scanSessionError', callback: (event: any) => void): Promise<{ remove: () => Promise<void> }>;
  addListener(eventName: 'scanSessionCanceled', callback: () => void): Promise<{ remove: () => Promise<void> }>;
  removeAllListeners(): Promise<void>;
}
