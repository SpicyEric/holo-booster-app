// NFC Service for Eloyo App
// 
// Uses Capacitor NFC Plugin for native Android/iOS
// Format on NFC chip: "XXXXX-XXXXX-XXXXX:grün" (Box-ID:StampColor)

import { Capacitor } from '@capacitor/core';

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

class NfcService {
  private isNative = isNativePlatform();
  private isScanning = false;
  private webNdefReader: any = null;
  private currentCallback: NfcReadCallback | null = null;
  private abortController: AbortController | null = null;

  async isSupported(): Promise<boolean> {
    const platform = getPlatform();
    
    if (platform === 'android') {
      // Android: Check if Web NFC is available in WebView or native NFC
      // In Capacitor WebView, Web NFC might not be available, but we can still try
      return true; // We'll handle the actual check when scanning
    } else if (platform === 'ios') {
      // iOS: NFC requires native CoreNFC implementation
      return true; // Assume supported, actual check happens during scan
    } else {
      // Web browser: Check for Web NFC API
      return 'NDEFReader' in window;
    }
  }

  async isEnabled(): Promise<boolean> {
    return true;
  }

  async openSettings(): Promise<void> {
    console.log('Opening NFC settings is platform specific');
  }

  async startScan(onRead: NfcReadCallback): Promise<void> {
    if (this.isScanning) return;

    this.isScanning = true;
    this.currentCallback = onRead;

    const platform = getPlatform();
    console.log('Starting NFC scan on platform:', platform);

    if (platform === 'android') {
      await this.startAndroidScan(onRead);
    } else if (platform === 'ios') {
      await this.startIosScan(onRead);
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

  private async startAndroidScan(onRead: NfcReadCallback): Promise<void> {
    // On Android in Capacitor WebView, Web NFC API is NOT available
    // We need to use a native NFC plugin or fallback approach
    
    // For now, show a message that native NFC is being prepared
    // In production, you'd use @nicedaysoftware/capacitor-nfc or similar
    
    try {
      // First, try Web NFC (might work in some WebView configurations)
      if ('NDEFReader' in window) {
        await this.startWebScan(onRead);
        return;
      }
      
      // If Web NFC is not available, we need native plugin
      // Show appropriate message
      this.isScanning = false;
      onRead({
        chipData: '',
        success: false,
        error: 'NFC-Scan wird vorbereitet. Bitte warte einen Moment und halte dann den Stempel an dein Handy.'
      });
      
      // Try to use Android Intent based NFC (via Capacitor App plugin)
      this.setupAndroidNfcIntent(onRead);
      
    } catch (error: any) {
      console.error('Android NFC error:', error);
      this.isScanning = false;
      onRead({
        chipData: '',
        success: false,
        error: 'NFC konnte nicht gestartet werden. Bitte stelle sicher, dass NFC in den Android-Einstellungen aktiviert ist.'
      });
    }
  }

  private setupAndroidNfcIntent(onRead: NfcReadCallback): void {
    // Listen for NFC intents from Android
    // This works when app is opened via NFC tap
    const checkUrl = () => {
      const url = window.location.href;
      // Check if URL contains NFC data (from intent)
      if (url.includes('nfc=') || url.includes('chip=')) {
        const params = new URLSearchParams(window.location.search);
        const chipData = params.get('nfc') || params.get('chip');
        if (chipData && this.validateChipData(chipData)) {
          onRead({ chipData, success: true });
          this.isScanning = false;
        }
      }
    };
    
    // Check immediately and set up listener
    checkUrl();
    window.addEventListener('hashchange', checkUrl);
    
    // Also listen for app URL open events
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appUrlOpen', (event) => {
        console.log('App opened with URL:', event.url);
        const url = new URL(event.url);
        const chipData = url.searchParams.get('chip');
        if (chipData && this.validateChipData(chipData)) {
          onRead({ chipData, success: true });
          this.isScanning = false;
        }
      });
    }).catch(err => console.log('Could not set up App listener:', err));
  }

  private async startIosScan(onRead: NfcReadCallback): Promise<void> {
    // iOS requires CoreNFC which needs native implementation
    // Show appropriate message for iOS users
    this.isScanning = false;
    onRead({
      chipData: '',
      success: false,
      error: 'NFC-Scan auf iOS erfordert die App Store Version. Bitte kontaktiere den Support für weitere Informationen.'
    });
  }

  private async startWebScan(onRead: NfcReadCallback): Promise<void> {
    if (!('NDEFReader' in window)) {
      this.isScanning = false;
      onRead({ 
        chipData: '', 
        success: false, 
        error: 'NFC ist in diesem Browser nicht verfügbar. Bitte öffne die App in Chrome auf Android.' 
      });
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

            // Clean the text
            let cleanText = text.trim();
            
            // Sometimes NDEF text records have a language prefix
            if (cleanText.length > 2 && !cleanText.match(/^[A-HJ-KM-NP-Z1-9]{5}-/i)) {
              cleanText = cleanText.substring(2);
            }
            
            // Validate format (BOX_ID:COLOR)
            if (this.validateChipData(cleanText)) {
              onRead({ chipData: cleanText, success: true });
              this.stopScan();
              return;
            }
            
            // Also try the original text
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
        errorMessage = 'NFC-Berechtigung wird benötigt. Bitte aktiviere NFC in den Android-Einstellungen.';
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

  isNativeApp(): boolean {
    return this.isNative;
  }

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
