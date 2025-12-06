// NFC Service for Eloyo App
// 
// Uses native Web NFC API (Android Chrome 89+) and Capacitor native when available
// Format on NFC chip: "XXXXX-XXXXX-XXXXX:grün" (Box-ID:StampColor)

interface NfcReadResult {
  chipData: string;
  success: boolean;
  error?: string;
}

type NfcReadCallback = (result: NfcReadResult) => void;

// Check if running in Capacitor native context
const isNativePlatform = (): boolean => {
  try {
    const win = window as any;
    return !!(win.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
};

const getPlatform = (): string => {
  try {
    const win = window as any;
    return win.Capacitor?.getPlatform?.() || 'web';
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

  async isSupported(): Promise<boolean> {
    if (this.isNative) {
      // Native platform - NFC should be available if device has NFC hardware
      // The actual availability will be determined when trying to scan
      const platform = getPlatform();
      // iOS and Android native apps have NFC access through native code
      return platform === 'ios' || platform === 'android';
    } else {
      // Web NFC API (Android Chrome 89+ only)
      return 'NDEFReader' in window;
    }
  }

  async isEnabled(): Promise<boolean> {
    // For web and native, we assume enabled if supported
    // Actual NFC state check happens when starting scan
    return true;
  }

  async openSettings(): Promise<void> {
    // Opening NFC settings is platform specific
    // On native, this would require a native plugin
    console.log('Opening NFC settings is not supported in web mode');
  }

  async startScan(onRead: NfcReadCallback): Promise<void> {
    if (this.isScanning) return;

    const supported = await this.isSupported();
    if (!supported) {
      onRead({ chipData: '', success: false, error: 'NFC nicht unterstützt auf diesem Gerät' });
      return;
    }

    this.isScanning = true;
    this.currentCallback = onRead;

    if (this.isNative) {
      await this.startNativeScan(onRead);
    } else {
      await this.startWebScan(onRead);
    }
  }

  private validateChipData(data: string): boolean {
    // Validate format: XXXXX-XXXXX-XXXXX:color
    // Box-ID format: 5 chars - 5 chars - 5 chars, uppercase A-Z (no I,L,O), digits 1-9
    // Color: grün, blau, or rot
    const pattern = /^[A-HJ-KM-NP-Z1-9]{5}-[A-HJ-KM-NP-Z1-9]{5}-[A-HJ-KM-NP-Z1-9]{5}:(grün|blau|rot)$/i;
    return pattern.test(data);
  }

  private extractTextFromNdefRecord(record: any): string | null {
    try {
      if (record.recordType === 'text') {
        const textDecoder = new TextDecoder(record.encoding || 'utf-8');
        // Skip the language code prefix byte(s)
        const dataView = new DataView(record.data.buffer);
        const languageCodeLength = dataView.getUint8(0) & 0x3F;
        const textData = new Uint8Array(record.data.buffer, languageCodeLength + 1);
        return new TextDecoder('utf-8').decode(textData);
      }
      return null;
    } catch (error) {
      console.error('Error decoding NDEF record:', error);
      return null;
    }
  }

  private async startNativeScan(onRead: NfcReadCallback): Promise<void> {
    try {
      console.log('Starting native NFC scan...');
      
      const platform = getPlatform();
      
      if (platform === 'android') {
        // On Android, we use Web NFC API which works in WebView
        await this.startWebScan(onRead);
      } else if (platform === 'ios') {
        // iOS requires CoreNFC which needs native implementation
        // For now, show a message that native iOS NFC requires app store build
        onRead({
          chipData: '',
          success: false,
          error: 'NFC-Scan wird vorbereitet. Bitte halte den NFC-Stempel an dein Handy.'
        });
        
        // Try Web NFC as fallback (won't work on iOS Safari but worth trying)
        if ('NDEFReader' in window) {
          await this.startWebScan(onRead);
        }
      }
    } catch (error: any) {
      console.error('Native NFC scan error:', error);
      this.isScanning = false;
      onRead({
        chipData: '',
        success: false,
        error: error.message || 'NFC Scan fehlgeschlagen'
      });
    }
  }

  private async startWebScan(onRead: NfcReadCallback): Promise<void> {
    if (!('NDEFReader' in window)) {
      onRead({ chipData: '', success: false, error: 'Web NFC nicht verfügbar in diesem Browser' });
      this.isScanning = false;
      return;
    }

    try {
      this.abortController = new AbortController();
      this.webNdefReader = new (window as any).NDEFReader();
      
      await this.webNdefReader.scan({ signal: this.abortController.signal });
      console.log('NFC scan started, waiting for tags...');

      this.webNdefReader.addEventListener('reading', ({ message, serialNumber }: { message: any, serialNumber: string }) => {
        console.log('NFC tag detected:', serialNumber);
        
        // Extract text from NDEF records
        for (const record of message.records) {
          if (record.recordType === 'text') {
            const textDecoder = new TextDecoder(record.encoding || 'utf-8');
            // The first byte contains the language code length
            const dataView = new DataView(record.data.buffer);
            const languageCodeLength = dataView.getUint8(0) & 0x3F;
            
            // Get the actual text content (skip language code prefix)
            let text: string;
            if (record.data.byteLength > languageCodeLength + 1) {
              const textData = new Uint8Array(record.data.buffer, record.data.byteOffset + languageCodeLength + 1);
              text = new TextDecoder('utf-8').decode(textData);
            } else {
              text = textDecoder.decode(record.data);
            }
            
            console.log('NFC text payload:', text);

            // Clean the text - remove any prefix characters
            let cleanText = text.trim();
            
            // Sometimes NDEF text records have a language prefix like "en" before the actual content
            // Check if text starts with 2-char language code followed by our format
            if (cleanText.length > 2 && !cleanText.match(/^[A-HJ-KM-NP-Z1-9]{5}-/i)) {
              cleanText = cleanText.substring(2);
            }
            
            // Validate format (BOX_ID:COLOR)
            if (this.validateChipData(cleanText)) {
              onRead({ chipData: cleanText, success: true });
              this.stopScan();
              return;
            }
            
            // Also try the original text if cleaning didn't work
            if (this.validateChipData(text)) {
              onRead({ chipData: text, success: true });
              this.stopScan();
              return;
            }
          }
        }

        // No valid Eloyo stamp found
        onRead({
          chipData: '',
          success: false,
          error: 'Kein gültiger Eloyo-Stempel erkannt. Bitte versuche es erneut.'
        });
      });

      this.webNdefReader.addEventListener('readingerror', () => {
        console.error('NFC read error');
        onRead({ chipData: '', success: false, error: 'NFC Lesefehler - bitte erneut versuchen' });
      });

    } catch (error: any) {
      console.error('Web NFC scan error:', error);
      this.isScanning = false;
      
      let errorMessage = 'NFC konnte nicht gestartet werden';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'NFC-Berechtigung wurde verweigert. Bitte erlaube NFC in den Browsereinstellungen.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'NFC wird von diesem Browser nicht unterstützt. Bitte verwende Chrome auf Android.';
      } else if (error.name === 'AbortError') {
        // Scan was cancelled, not an error
        return;
      }
      
      onRead({
        chipData: '',
        success: false,
        error: errorMessage
      });
    }
  }

  async stopScan(): Promise<void> {
    this.isScanning = false;
    this.currentCallback = null;

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.webNdefReader = null;
    console.log('NFC scan stopped');
  }

  getIsScanning(): boolean {
    return this.isScanning;
  }

  // Check if running as native app
  isNativeApp(): boolean {
    return this.isNative;
  }

  // Get platform info for debugging
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
