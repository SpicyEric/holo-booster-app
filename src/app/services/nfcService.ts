// NFC Service for Eloyo App
// 
// Uses @capawesome-team/capacitor-nfc (Premium Plugin) for native Android/iOS NFC
// Format on NFC chip: "XXXXX-XXXXX-XXXXX:grün" (Box-ID:StampColor)

import { Capacitor } from '@capacitor/core';
import { Nfc } from '@capawesome-team/capacitor-nfc';

export interface NfcReadResult {
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

class NfcService {
  private isNative = isNativePlatform();
  private isScanning = false;
  private webNdefReader: any = null;
  private currentCallback: NfcReadCallback | null = null;
  private abortController: AbortController | null = null;
  private nfcListenerHandle: any = null;

  /**
   * Check if this is running in native app context
   */
  isNativeApp(): boolean {
    return this.isNative;
  }

  /**
   * Check if NFC hardware is supported on this device
   */
  async isSupported(): Promise<boolean> {
    const platform = getPlatform();
    console.log('[NFC] Checking support on platform:', platform);
    
    if (platform === 'android' || platform === 'ios') {
      try {
        // Race against timeout - if plugin bridge doesn't respond, assume supported on native
        const result = await Promise.race([
          Nfc.isSupported(),
          new Promise<{ isSupported: boolean }>((resolve) => setTimeout(() => {
            console.warn('[NFC] isSupported timed out, assuming supported on native platform');
            resolve({ isSupported: true });
          }, 3000)),
        ]);
        console.log('[NFC] isSupported result:', result);
        return result?.isSupported === true;
      } catch (error) {
        console.log('[NFC] isSupported check failed:', error);
        // On native platforms, assume NFC is supported if the check fails
        // The actual scan will fail gracefully if NFC truly isn't available
        console.log('[NFC] Assuming supported on native platform despite error');
        return true;
      }
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
        const result = await Nfc.isEnabled();
        console.log('[NFC] isEnabled result:', result);
        return result?.isEnabled === true;
      } catch (error) {
        console.log('[NFC] isEnabled check failed:', error);
        return false;
      }
    }
    
    // iOS always returns true (NFC cannot be disabled system-wide)
    return true;
  }

  /**
   * Open device NFC settings (Android only)
   */
  async openSettings(): Promise<void> {
    const platform = getPlatform();
    
    if (platform !== 'android') {
      console.log('[NFC] Opening settings not supported on', platform);
      return;
    }
    
    try {
      if (typeof Nfc.openSettings === 'function') {
        await Nfc.openSettings();
        console.log('[NFC] Opened NFC settings via Capawesome');
        return;
      }
    } catch (error) {
      console.log('[NFC] Capawesome openSettings failed, using fallback:', error);
    }
    
    // Fallback to capacitor-native-settings
    try {
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
   * Start native NFC scan using Capawesome Premium Plugin
   */
  private async startNativeScan(onRead: NfcReadCallback): Promise<void> {
    try {
      console.log('[NFC] Setting up Capawesome NFC listener');

      // Add listener for NFC tag detection
      this.nfcListenerHandle = await Nfc.addListener('nfcTagScanned', (event: any) => {
        console.log('[NFC] Tag scanned:', JSON.stringify(event));
        this.processNfcTag(event.nfcTag, onRead);
      });

      // Start the scan session
      await Nfc.startScanSession({
        alertMessage: 'Halte dein Handy an den NFC-Stempel' // iOS only
      });
      
      console.log('[NFC] Scan session started');

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
      } else if (errMsg.includes('canceled') || errMsg.includes('cancelled') || errMsg.includes('session invalidated')) {
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
  private processNfcTag(nfcTag: any, onRead: NfcReadCallback): void {
    try {
      console.log('[NFC] Processing tag:', JSON.stringify(nfcTag));
      
      // Capawesome structure: nfcTag.message.records[]
      const message = nfcTag?.message;
      const records = message?.records || [];
      
      for (const record of records) {
        // Check for Text Record (TNF = 1, type = "T")
        const tnf = record?.tnf;
        const type = record?.type;
        
        // Text record: TNF 1 (Well Known) and type [84] = 'T'
        const isTextRecord = 
          tnf === 1 && 
          Array.isArray(type) && 
          type.length === 1 && 
          type[0] === 84; // 'T' = 84 in ASCII
        
        if (isTextRecord && record.payload) {
          const text = this.decodeNdefTextPayload(record.payload);
          
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
   * Decode NDEF Text Record payload (number array)
   */
  private decodeNdefTextPayload(payload: number[]): string {
    try {
      if (!Array.isArray(payload) || payload.length === 0) {
        return '';
      }
      
      const bytes = new Uint8Array(payload);
      
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

    // Remove Capawesome listener
    if (this.nfcListenerHandle) {
      try {
        await this.nfcListenerHandle.remove();
      } catch (error) {
        console.log('[NFC] Error removing listener:', error);
      }
      this.nfcListenerHandle = null;
    }

    // Stop Capawesome scan session
    try {
      await Nfc.stopScanSession();
      console.log('[NFC] Scan session stopped');
    } catch (error) {
      console.log('[NFC] Error stopping scan session:', error);
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
}

// Export singleton and types
export const nfcService = new NfcService();
export type { NfcReadCallback };
