// NFC Service for Eloyo App
// 
// Uses @capawesome-team/capacitor-nfc (Premium Plugin) for native Android/iOS NFC
// Format on NFC chip: "XXXXX-XXXXX-XXXXX:grün" (Box-ID:StampColor)

import { Capacitor } from '@capacitor/core';

interface NfcReadResult {
  chipData: string;
  success: boolean;
  error?: string;
}

type NfcReadCallback = (result: NfcReadResult) => void;

// Dynamic import for NFC plugin (only available on native)
// Uses @capawesome-team/capacitor-nfc which must be installed via npm
// with .npmrc configured for the private registry
let NfcPluginInstance: any = null;

const loadNfcPlugin = async (): Promise<any> => {
  if (NfcPluginInstance) return NfcPluginInstance;
  
  try {
    // Dynamic import with string literal to avoid TypeScript checking
    // The plugin is installed locally via npm with .npmrc configured for private registry
    const pluginName = '@capawesome-team/capacitor-nfc';
    const module = await Function('modulePath', 'return import(modulePath)')(pluginName);
    NfcPluginInstance = module.Nfc;
    console.log('[NFC] Capawesome Premium Plugin loaded successfully');
    return NfcPluginInstance;
  } catch (error) {
    console.log('[NFC] Premium plugin not available, will use Web NFC fallback:', error);
    return null;
  }
};

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

class NfcService {
  private isNative = isNativePlatform();
  private isScanning = false;
  private webNdefReader: any = null;
  private currentCallback: NfcReadCallback | null = null;
  private abortController: AbortController | null = null;
  private nfcListenerHandle: any = null;

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
          return result.isSupported;
        }
      } catch (error) {
        console.log('[NFC] isSupported check failed:', error);
      }
      return true; // Assume supported on native if plugin loads
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
      try {
        const nfc = await loadNfcPlugin();
        if (nfc) {
          const result = await nfc.isEnabled();
          return result.isEnabled;
        }
      } catch (error) {
        console.log('[NFC] isEnabled check failed:', error);
      }
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
        optionIOS: IOSSettings.App, // iOS doesn't have NFC settings, use App settings as fallback
      });
      console.log('[NFC] Opened NFC settings via NativeSettings');
    } catch (error) {
      console.log('[NFC] Could not open NFC settings:', error);
      
      // Fallback: Try plugin's built-in openSettings
      try {
        const nfc = await loadNfcPlugin();
        if (nfc) {
          await nfc.openSettings();
        }
      } catch (fallbackError) {
        console.log('[NFC] Fallback openSettings also failed:', fallbackError);
      }
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
   * Start native NFC scan using Capawesome Premium Plugin
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

      // Android: Check if NFC is enabled
      if (platform === 'android') {
        const enabledResult = await nfc.isEnabled();
        if (!enabledResult.isEnabled) {
          this.isScanning = false;
          onRead({
            chipData: '',
            success: false,
            error: 'NFC ist deaktiviert. Bitte aktiviere NFC in den Android-Einstellungen.'
          });
          return;
        }
      }

      // Add listener for NFC tag detection (Capawesome uses 'nfcTagScanned')
      this.nfcListenerHandle = await nfc.addListener('nfcTagScanned', (event: any) => {
        console.log('[NFC] Tag scanned:', event);
        this.processNfcTag(event, onRead);
      });

      // Start scan session with iOS-specific alert message
      const scanOptions: any = {};
      
      if (platform === 'ios') {
        scanOptions.alertMessage = 'Halte den NFC-Stempel an dein iPhone';
      }

      await nfc.startScanSession(scanOptions);
      console.log('[NFC] Native scan session started');

    } catch (error: any) {
      console.error('[NFC] Native scan error:', error);
      this.isScanning = false;
      
      let errorMessage = 'NFC konnte nicht gestartet werden';
      
      if (error.message?.includes('permission') || error.message?.includes('Permission')) {
        errorMessage = 'NFC-Berechtigung wird benötigt. Bitte aktiviere NFC in den Einstellungen.';
      } else if (error.message?.includes('disabled') || error.message?.includes('Disabled')) {
        errorMessage = 'NFC ist deaktiviert. Bitte aktiviere NFC in den Android-Einstellungen.';
      } else if (error.message?.includes('unavailable') || error.message?.includes('Unavailable')) {
        errorMessage = 'NFC ist auf diesem Gerät nicht verfügbar.';
      } else if (error.message?.includes('canceled') || error.message?.includes('Canceled')) {
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
      // Capawesome plugin structure: event.nfcTag.message.records
      const nfcTag = event.nfcTag || event;
      const message = nfcTag.message;
      
      if (message && message.records && message.records.length > 0) {
        for (const record of message.records) {
          // Process Text Records (TNF=1, RTD="T")
          if (record.type === 'T' || record.tnf === 1) {
            let text = '';
            
            if (record.payload) {
              // Decode NDEF text payload
              text = this.decodeNdefTextPayload(record.payload);
            }
            
            console.log('[NFC] Text payload:', text);
            
            // Clean and validate the text
            let cleanText = text.trim();
            
            // Remove language prefix if present (e.g., "en" or "de")
            if (cleanText.length > 2 && !cleanText.match(/^[A-HJ-KM-NP-Z1-9]{5}-/i)) {
              cleanText = cleanText.substring(cleanText.indexOf('-') > 0 ? 0 : 2);
              if (!cleanText.match(/^[A-HJ-KM-NP-Z1-9]{5}-/i)) {
                cleanText = text.trim().substring(2);
              }
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
   * First byte: Status byte (bit 7 = encoding, bits 5-0 = language code length)
   * Following bytes: Language code
   * Remaining bytes: Text content
   */
  private decodeNdefTextPayload(payload: number[] | Uint8Array | string): string {
    try {
      // Handle string payload (already decoded)
      if (typeof payload === 'string') {
        return payload;
      }
      
      const bytes = payload instanceof Uint8Array ? payload : new Uint8Array(payload);
      
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
        // Malformed payload, try decoding everything
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

    try {
      const nfc = await loadNfcPlugin();
      if (nfc) {
        await nfc.stopScanSession();
        console.log('[NFC] Native scan session stopped');
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
   * Check if currently scanning
   */
  getIsScanning(): boolean {
    return this.isScanning;
  }

  /**
   * Check if running in native app
   */
  isNativeApp(): boolean {
    return this.isNative;
  }

  /**
   * Get platform information
   */
  getPlatformInfo(): { isNative: boolean; platform: string } {
    return {
      isNative: this.isNative,
      platform: getPlatform(),
    };
  }
}

// Singleton instance
export const nfcService = new NfcService();
export type { NfcReadResult };
