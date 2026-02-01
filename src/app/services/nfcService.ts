// NFC Service for Eloyo App
// 
// Uses @exxili/capacitor-nfc (Free Community Plugin) for native Android/iOS NFC
// Format on NFC chip: "XXXXX-XXXXX-XXXXX:grün" (Box-ID:StampColor)

import { Capacitor, registerPlugin } from '@capacitor/core';

interface NfcReadResult {
  chipData: string;
  success: boolean;
  error?: string;
}

type NfcReadCallback = (result: NfcReadResult) => void;

// Check if running in Capacitor native context
const isNativePlatform = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

const getPlatform = (): string => {
  try {
    return Capacitor.getPlatform() || 'web';
  } catch {
    return 'web';
  }
};

type ExxiliNfcPlugin = {
  isSupported: () => Promise<any>;
  startScan: () => Promise<void>;
  cancelScan?: () => Promise<void>;
  stopScan?: () => Promise<void>;
  addListener: (
    eventName: string,
    listenerFunc: (data: any) => void
  ) => Promise<{ remove: () => Promise<void> | void }>;
  removeAllListeners?: (eventName?: string) => Promise<void>;
  // Some builds expose this, but it's not guaranteed
  isEnabled?: () => Promise<any>;
};

// IMPORTANT:
// Do NOT import { NFC } from '@exxili/capacitor-nfc' here.
// That package runs a top-level addListener() on import, which can create
// an unhandled rejection during app startup. We register a Capacitor proxy
// directly instead.
let NfcPluginInstance: ExxiliNfcPlugin | null = null;

const loadNfcPlugin = async (): Promise<ExxiliNfcPlugin | null> => {
  if (NfcPluginInstance) return NfcPluginInstance;

  const platform = getPlatform();
  if (platform !== 'android' && platform !== 'ios') return null;

  // Avoid triggering "plugin is not implemented" promise rejections when the
  // native build has not registered the plugin (e.g. missing MainActivity registration).
  // This also prevents unhandled rejections during app startup.
  try {
    const isAvailableFn = (Capacitor as any).isPluginAvailable as undefined | ((name: string) => boolean);
    if (typeof isAvailableFn === 'function' && !isAvailableFn('NFC')) {
      const available = Object.keys((Capacitor as any).Plugins ?? {});
      console.log(
        '[NFC] Plugin not available in native runtime. Available plugins:',
        available.length ? available.join(', ') : '(none)'
      );
      return null;
    }
  } catch {
    // ignore
  }

  try {
    NfcPluginInstance = registerPlugin<ExxiliNfcPlugin>('NFC');
    console.log('[NFC] Capacitor NFC plugin proxy registered');
    return NfcPluginInstance;
  } catch (error) {
    console.log('[NFC] Could not register NFC plugin proxy:', error);
    return null;
  }
};

class NfcService {
  private isNative = isNativePlatform();
  private isScanning = false;
  private webNdefReader: any = null;
  private currentCallback: NfcReadCallback | null = null;
  private abortController: AbortController | null = null;
  private nfcListenerHandle: any = null;
  private nfcErrorListenerHandle: any = null;

  private pickBoolean(result: any, keys: string[]): boolean | undefined {
    if (typeof result === 'boolean') return result;
    if (result && typeof result === 'object') {
      for (const k of keys) {
        if (typeof result[k] === 'boolean') return result[k];
      }
    }
    return undefined;
  }

  /**
   * Check if NFC hardware is supported on this device
   */
  async isSupported(): Promise<boolean> {
    const platform = getPlatform();
    
    if (platform === 'android' || platform === 'ios') {
      try {
        const nfc = await loadNfcPlugin();
        if (nfc) {
          const result = await nfc.isSupported();
          console.log('[NFC] isSupported result:', result);
          const supported = this.pickBoolean(result, ['supported', 'isSupported']);
          if (supported !== undefined) return supported;
          // If typings / native bridge differs, assume supported when plugin loads.
          return true;
        }
      } catch (error) {
        console.log('[NFC] isSupported check failed:', error);
        // If the plugin is missing in the native build, do not pretend NFC works.
        const msg = String((error as any)?.message || error);
        if (msg.toLowerCase().includes('not implemented')) return false;
      }
      // If we are native but cannot load the plugin, NFC scan won't work.
      return false;
    } else {
      // Web browser: Check for Web NFC API
      return 'NDEFReader' in window;
    }
  }

  /**
   * Check if NFC is enabled on Android (always true on iOS)
   */
  async isEnabled(): Promise<boolean> {
    const platform = getPlatform();
    
    if (platform === 'android') {
      // @exxili/capacitor-nfc does not provide a reliable API to check
      // whether NFC is currently enabled on Android.
      // We treat it as enabled and rely on tag events (or the user) instead.
      return true;
    }
    
    // iOS always returns true (NFC cannot be disabled system-wide)
    return true;
  }

  /**
   * Open device NFC settings (Android only)
   * Uses capacitor-native-settings for reliable settings navigation
   */
  async openSettings(): Promise<void> {
    const platform = getPlatform();
    
    if (platform !== 'android') {
      console.log('[NFC] Opening settings not supported on', platform);
      return;
    }
    
    try {
      // Use capacitor-native-settings for reliable settings navigation
      const { NativeSettings, AndroidSettings, IOSSettings } = await import('capacitor-native-settings');
      await NativeSettings.open({
        optionAndroid: AndroidSettings.NfcSettings,
        optionIOS: IOSSettings.App,
      });
      console.log('[NFC] Opened NFC settings via NativeSettings');
    } catch (error) {
      console.log('[NFC] Could not open NFC settings:', error);
    }
  }

  /**
   * Start NFC scanning session
   * @param onRead Callback function when NFC tag is read
   */
  async startScan(onRead: NfcReadCallback): Promise<void> {
    if (this.isScanning) {
      console.log('[NFC] Scan already in progress');
      return;
    }

    this.isScanning = true;
    this.currentCallback = onRead;

    const platform = getPlatform();
    console.log('[NFC] Starting scan on platform:', platform);

    if (platform === 'android' || platform === 'ios') {
      await this.startNativeScan(onRead);
    } else {
      await this.startWebScan(onRead);
    }
  }

  /**
   * Validate chip data format: XXXXX-XXXXX-XXXXX:color
   */
  private validateChipData(data: string): boolean {
    // Box-ID format: 5 chars - 5 chars - 5 chars, uppercase A-Z (no I,L,O), digits 1-9
    // Color: grün, blau, or rot (lowercase German)
    const pattern = /^[A-HJ-KM-NP-Z1-9]{5}-[A-HJ-KM-NP-Z1-9]{5}-[A-HJ-KM-NP-Z1-9]{5}:(grün|blau|rot)$/i;
    return pattern.test(data);
  }

  /**
   * Start native NFC scan using Exxili Community Plugin
   */
  private async startNativeScan(onRead: NfcReadCallback): Promise<void> {
    try {
      const nfc = await loadNfcPlugin();
      
      if (!nfc) {
        console.log('[NFC] Plugin not available, trying Web NFC fallback');
        
        if ('NDEFReader' in window) {
          await this.startWebScan(onRead);
          return;
        }
        
        this.isScanning = false;
        onRead({
          chipData: '',
          success: false,
          error: 'NFC ist auf diesem Gerät nicht verfügbar.'
        });
        return;
      }

      const platform = getPlatform();
      console.log('[NFC] Setting up NFC listeners on platform:', platform);

      // Add listener for NFC tag detection (Exxili uses 'nfcTag')
      this.nfcListenerHandle = await nfc.addListener('nfcTag', (event: any) => {
        console.log('[NFC] Tag scanned:', JSON.stringify(event));
        this.processNfcTag(event, onRead);
      });

      // Listen for NFC errors (e.g., NFC disabled, permission problems)
      this.nfcErrorListenerHandle = await nfc.addListener('nfcError', (err: any) => {
        const message = err?.error || err?.message || 'NFC Fehler';
        console.log('[NFC] Error event:', message);
        onRead({ chipData: '', success: false, error: message });
        void this.stopScan();
      });

      // IMPORTANT: startScan() is iOS ONLY according to @exxili/capacitor-nfc docs
      // On Android, devices are always in reading mode once listeners are attached
      if (platform === 'ios') {
        await nfc.startScan();
        console.log('[NFC] iOS scan session started');
      } else {
        console.log('[NFC] Android NFC listeners active - ready to scan');
      }

    } catch (error: any) {
      console.error('[NFC] Native scan error:', error);
      this.isScanning = false;
      
      let errorMessage = 'NFC konnte nicht gestartet werden';
      
      // Parse error message for user-friendly feedback
      const errMsg = error?.message?.toLowerCase() || '';
      
      if (errMsg.includes('permission') || errMsg.includes('denied')) {
        errorMessage = 'NFC-Berechtigung wird benötigt. Bitte aktiviere NFC in den Einstellungen.';
      } else if (errMsg.includes('disabled') || errMsg.includes('not enabled')) {
        errorMessage = 'NFC ist deaktiviert. Bitte aktiviere NFC in den Android-Einstellungen.';
      } else if (errMsg.includes('unavailable') || errMsg.includes('not supported')) {
        errorMessage = 'NFC ist auf diesem Gerät nicht verfügbar.';
      } else if (errMsg.includes('canceled') || errMsg.includes('cancelled')) {
        errorMessage = 'NFC-Scan wurde abgebrochen.';
      }
      
      onRead({
        chipData: '',
        success: false,
        error: errorMessage
      });
    }
  }

  /**
   * Process scanned NFC tag and extract NDEF text payload
   */
  private processNfcTag(event: any, onRead: NfcReadCallback): void {
    try {
      console.log('[NFC] Processing tag event:', JSON.stringify(event));
      
      // Exxili plugin structure: event.messages[].records[]
      const messages = event.messages || event.ndefMessages || [];
      
      for (const message of messages) {
        const records = message.records || [];
        
        for (const record of records) {
          // Process Text Records
          const type = String(record?.type ?? '').toLowerCase();
          const isTextRecord = type === 'text' || type === 't' || type.includes('text');

          if (isTextRecord) {
            const payload = (record as any)?.payload ?? (record as any)?.text;
            const text = this.decodeNdefTextPayload(payload);
            
            console.log('[NFC] Text payload:', text);
            
            // Clean and validate the text
            let cleanText = text.trim();
            
            // Remove language prefix if present (e.g., "en" or "de")
            if (cleanText.length > 2 && !cleanText.match(/^[A-HJ-KM-NP-Z1-9]{5}-/i)) {
              cleanText = cleanText.substring(2);
            }
            
            // Validate against Eloyo format
            if (this.validateChipData(cleanText)) {
              console.log('[NFC] Valid Eloyo chip data:', cleanText);
              onRead({ chipData: cleanText, success: true });
              this.stopScan();
              return;
            }
            
            // Try original text without cleaning
            if (this.validateChipData(text)) {
              console.log('[NFC] Valid Eloyo chip data (raw):', text);
              onRead({ chipData: text, success: true });
              this.stopScan();
              return;
            }
          }
        }
      }
      
      // No valid data found
      console.log('[NFC] No valid Eloyo data in tag');
      onRead({
        chipData: '',
        success: false,
        error: 'Kein gültiger Eloyo-Stempel erkannt. Bitte versuche es erneut.'
      });
      
    } catch (error: any) {
      console.error('[NFC] Error processing tag:', error);
      onRead({
        chipData: '',
        success: false,
        error: 'Fehler beim Lesen des NFC-Stempels'
      });
    }
  }

  /**
   * Decode NDEF Text Record payload
   */
  private decodeNdefTextPayload(payload: number[] | Uint8Array | string): string {
    try {
      let bytes: Uint8Array;

      if (typeof payload === 'string') {
        // Android plugin sends Base64 for record.payload. Detect and decode.
        const looksLikeBase64 =
          payload.length % 4 === 0 &&
          /^[A-Za-z0-9+/]+=*$/.test(payload) &&
          !payload.includes('-') &&
          !payload.includes(':');

        if (!looksLikeBase64) return payload;

        const atobFn = (globalThis as any).atob as undefined | ((s: string) => string);
        if (!atobFn) return payload;

        try {
          const bin = atobFn(payload);
          bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        } catch {
          return payload;
        }
      } else {
        bytes = payload instanceof Uint8Array ? payload : new Uint8Array(payload);
      }
      
      if (bytes.length === 0) {
        return '';
      }
      
      // First byte contains status and language code length
      const statusByte = bytes[0];
      const languageCodeLength = statusByte & 0x3F;
      const isUtf16 = (statusByte & 0x80) !== 0;
      
      // Extract text (skip status byte and language code)
      const textStartIndex = 1 + languageCodeLength;
      
      if (textStartIndex >= bytes.length) {
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(bytes);
      }
      
      const textBytes = bytes.slice(textStartIndex);
      const decoder = new TextDecoder(isUtf16 ? 'utf-16be' : 'utf-8');
      return decoder.decode(textBytes);
      
    } catch (error) {
      console.error('[NFC] Error decoding NDEF payload:', error);
      return '';
    }
  }

  /**
   * Start web-based NFC scan using Web NFC API
   */
  private async startWebScan(onRead: NfcReadCallback): Promise<void> {
    if (!('NDEFReader' in window)) {
      this.isScanning = false;
      onRead({ 
        chipData: '', 
        success: false, 
        error: 'NFC ist in diesem Browser nicht verfügbar. Bitte nutze die Eloyo App auf deinem Smartphone.' 
      });
      return;
    }

    try {
      this.abortController = new AbortController();
      this.webNdefReader = new (window as any).NDEFReader();
      
      await this.webNdefReader.scan({ signal: this.abortController.signal });
      console.log('[NFC] Web scan started');

      this.webNdefReader.addEventListener('reading', ({ message, serialNumber }: { message: any, serialNumber: string }) => {
        console.log('[NFC] Web tag detected:', serialNumber);
        
        for (const record of message.records) {
          if (record.recordType === 'text') {
            const textDecoder = new TextDecoder(record.encoding || 'utf-8');
            const dataView = new DataView(record.data.buffer);
            const languageCodeLength = dataView.getUint8(0) & 0x3F;
            
            let text: string;
            if (record.data.byteLength > languageCodeLength + 1) {
              const textData = new Uint8Array(record.data.buffer, record.data.byteOffset + languageCodeLength + 1);
              text = new TextDecoder('utf-8').decode(textData);
            } else {
              text = textDecoder.decode(record.data);
            }
            
            console.log('[NFC] Web text payload:', text);

            let cleanText = text.trim();
            
            if (cleanText.length > 2 && !cleanText.match(/^[A-HJ-KM-NP-Z1-9]{5}-/i)) {
              cleanText = cleanText.substring(2);
            }
            
            if (this.validateChipData(cleanText)) {
              onRead({ chipData: cleanText, success: true });
              this.stopScan();
              return;
            }
            
            if (this.validateChipData(text)) {
              onRead({ chipData: text, success: true });
              this.stopScan();
              return;
            }
          }
        }

        onRead({
          chipData: '',
          success: false,
          error: 'Kein gültiger Eloyo-Stempel erkannt. Bitte versuche es erneut.'
        });
      });

      this.webNdefReader.addEventListener('readingerror', () => {
        console.error('[NFC] Web read error');
        onRead({ chipData: '', success: false, error: 'NFC Lesefehler - bitte erneut versuchen' });
      });

    } catch (error: any) {
      console.error('[NFC] Web scan error:', error);
      this.isScanning = false;
      
      let errorMessage = 'NFC konnte nicht gestartet werden';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'NFC-Berechtigung wird benötigt. Bitte aktiviere NFC in den Einstellungen.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'NFC wird von diesem Gerät nicht unterstützt.';
      } else if (error.name === 'AbortError') {
        return;
      }
      
      onRead({
        chipData: '',
        success: false,
        error: errorMessage
      });
    }
  }

  /**
   * Stop the active NFC scan session
   */
  async stopScan(): Promise<void> {
    this.isScanning = false;
    this.currentCallback = null;

    // Stop native scan
    if (this.nfcListenerHandle) {
      try {
        await this.nfcListenerHandle.remove();
      } catch (error) {
        console.log('[NFC] Error removing listener:', error);
      }
      this.nfcListenerHandle = null;
    }

    if (this.nfcErrorListenerHandle) {
      try {
        await this.nfcErrorListenerHandle.remove();
      } catch (error) {
        console.log('[NFC] Error removing error listener:', error);
      }
      this.nfcErrorListenerHandle = null;
    }

    try {
      const nfc = await loadNfcPlugin();
      if (nfc) {
        // Different plugins expose different stop APIs
        if (typeof nfc.stopScan === 'function') {
          await nfc.stopScan();
        } else if (typeof nfc.cancelScan === 'function') {
          await nfc.cancelScan();
        } else if (typeof nfc.removeAllListeners === 'function') {
          await nfc.removeAllListeners('nfcTag');
          await nfc.removeAllListeners('nfcError');
        }
        console.log('[NFC] Native scan session stop requested');
      }
    } catch (error) {
      console.log('[NFC] Error stopping native scan:', error);
    }

    // Stop web scan
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.webNdefReader = null;
    console.log('[NFC] Scan stopped');
  }

  /**
   * Get current scan status
   */
  isScanActive(): boolean {
    return this.isScanning;
  }

  /**
   * Parse chip data from scanned NFC tag
   * Returns { boxId, color } or null if invalid
   */
  parseChipData(chipData: string): { boxId: string; color: string } | null {
    if (!this.validateChipData(chipData)) {
      return null;
    }
    
    const [boxId, color] = chipData.split(':');
    return { boxId, color };
  }

  /**
   * Check if running on native platform (Android/iOS)
   */
  isNativeApp(): boolean {
    return isNativePlatform();
  }

  /**
   * Get platform information for debugging
   */
  getPlatformInfo(): { platform: string; isNative: boolean } {
    return {
      platform: getPlatform(),
      isNative: isNativePlatform()
    };
  }
}

// Export singleton instance
export const nfcService = new NfcService();

// Export types
export type { NfcReadResult, NfcReadCallback };
