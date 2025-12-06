// NFC Service for Eloyo App
// 
// Uses @monaca/capacitor-nfc-reader for native Android/iOS NFC
// Format on NFC chip: "XXXXX-XXXXX-XXXXX:grün" (Box-ID:StampColor)

import { Capacitor } from '@capacitor/core';

interface NfcReadResult {
  chipData: string;
  success: boolean;
  error?: string;
}

type NfcReadCallback = (result: NfcReadResult) => void;

// Dynamic import for NFC plugin (only available on native)
let NFCReaderInstance: any = null;

const loadNfcPlugin = async () => {
  if (NFCReaderInstance) return NFCReaderInstance;
  
  try {
    const module = await import('@monaca/capacitor-nfc-reader');
    NFCReaderInstance = module.NFCReader;
    return NFCReaderInstance;
  } catch (error) {
    console.log('NFC plugin not available:', error);
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

  async isSupported(): Promise<boolean> {
    const platform = getPlatform();
    
    if (platform === 'android' || platform === 'ios') {
      return true; // Native NFC support via plugin
    } else {
      // Web browser: Check for Web NFC API
      return 'NDEFReader' in window;
    }
  }

  async isEnabled(): Promise<boolean> {
    if (!this.isNative) return true;
    
    try {
      const nfc = await loadNfcPlugin();
      if (nfc) {
        const result = await nfc.isEnabled();
        return result.enabled;
      }
    } catch (error) {
      console.log('Could not check NFC enabled status:', error);
    }
    return true;
  }

  async openSettings(): Promise<void> {
    if (!this.isNative) {
      console.log('Opening NFC settings is not supported in web mode');
      return;
    }
    
    try {
      const nfc = await loadNfcPlugin();
      if (nfc) {
        await nfc.openSettings();
      }
    } catch (error) {
      console.log('Could not open NFC settings:', error);
    }
  }

  async startScan(onRead: NfcReadCallback): Promise<void> {
    if (this.isScanning) return;

    this.isScanning = true;
    this.currentCallback = onRead;

    const platform = getPlatform();
    console.log('Starting NFC scan on platform:', platform);

    if (platform === 'android' || platform === 'ios') {
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

  private async startNativeScan(onRead: NfcReadCallback): Promise<void> {
    try {
      const nfc = await loadNfcPlugin();
      
      if (!nfc) {
        console.log('NFC plugin not available, trying Web NFC fallback');
        // Fallback to Web NFC if plugin not available
        if ('NDEFReader' in window) {
          await this.startWebScan(onRead);
          return;
        }
        
        this.isScanning = false;
        onRead({
          chipData: '',
          success: false,
          error: 'NFC ist auf diesem Gerät nicht verfügbar. Bitte aktiviere NFC in den Einstellungen.'
        });
        return;
      }

      // Check if NFC is enabled
      const enabledResult = await nfc.isEnabled();
      if (!enabledResult.enabled) {
        this.isScanning = false;
        onRead({
          chipData: '',
          success: false,
          error: 'NFC ist deaktiviert. Bitte aktiviere NFC in den Android-Einstellungen.'
        });
        return;
      }

      // Add listener for NFC tag detection
      this.nfcListenerHandle = await nfc.addListener('nfcTagDetected', (event: any) => {
        console.log('NFC tag detected:', event);
        
        try {
          // Extract NDEF message from the event
          const ndefMessage = event.ndefMessage || event.message;
          
          if (ndefMessage && ndefMessage.records) {
            for (const record of ndefMessage.records) {
              // Handle text record
              if (record.type === 'T' || record.tnf === 1) {
                let text = '';
                
                if (record.payload) {
                  // Decode the payload
                  const payload = typeof record.payload === 'string' 
                    ? record.payload 
                    : this.decodeNdefTextPayload(record.payload);
                  text = payload;
                }
                
                console.log('NFC text payload:', text);
                
                // Clean and validate
                let cleanText = text.trim();
                
                // Remove language prefix if present
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
          }
          
          // No valid data found
          onRead({
            chipData: '',
            success: false,
            error: 'Kein gültiger Eloyo-Stempel erkannt. Bitte versuche es erneut.'
          });
        } catch (error: any) {
          console.error('Error processing NFC tag:', error);
          onRead({
            chipData: '',
            success: false,
            error: 'Fehler beim Lesen des NFC-Stempels'
          });
        }
      });

      // Start scanning
      await nfc.startScan();
      console.log('Native NFC scan started');

    } catch (error: any) {
      console.error('Native NFC scan error:', error);
      this.isScanning = false;
      
      let errorMessage = 'NFC konnte nicht gestartet werden';
      
      if (error.message?.includes('permission') || error.message?.includes('Permission')) {
        errorMessage = 'NFC-Berechtigung wird benötigt. Bitte aktiviere NFC in den Einstellungen.';
      } else if (error.message?.includes('disabled') || error.message?.includes('Disabled')) {
        errorMessage = 'NFC ist deaktiviert. Bitte aktiviere NFC in den Android-Einstellungen.';
      }
      
      onRead({
        chipData: '',
        success: false,
        error: errorMessage
      });
    }
  }

  private decodeNdefTextPayload(payload: number[] | Uint8Array): string {
    try {
      const bytes = payload instanceof Uint8Array ? payload : new Uint8Array(payload);
      
      // First byte contains status and language code length
      const statusByte = bytes[0];
      const languageCodeLength = statusByte & 0x3F;
      const isUtf16 = (statusByte & 0x80) !== 0;
      
      // Extract text (skip status byte and language code)
      const textBytes = bytes.slice(1 + languageCodeLength);
      
      const decoder = new TextDecoder(isUtf16 ? 'utf-16be' : 'utf-8');
      return decoder.decode(textBytes);
    } catch (error) {
      console.error('Error decoding NDEF payload:', error);
      return '';
    }
  }

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
      console.log('Web NFC scan started, waiting for tags...');

      this.webNdefReader.addEventListener('reading', ({ message, serialNumber }: { message: any, serialNumber: string }) => {
        console.log('NFC tag detected:', serialNumber);
        
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
            
            console.log('NFC text payload:', text);

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
        console.error('NFC read error');
        onRead({ chipData: '', success: false, error: 'NFC Lesefehler - bitte erneut versuchen' });
      });

    } catch (error: any) {
      console.error('Web NFC scan error:', error);
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

  async stopScan(): Promise<void> {
    this.isScanning = false;
    this.currentCallback = null;

    // Stop native scan
    if (this.nfcListenerHandle) {
      try {
        await this.nfcListenerHandle.remove();
      } catch (error) {
        console.log('Error removing NFC listener:', error);
      }
      this.nfcListenerHandle = null;
    }

    try {
      const nfc = await loadNfcPlugin();
      if (nfc) {
        await nfc.stopScan();
      }
    } catch (error) {
      console.log('Error stopping native NFC scan:', error);
    }

    // Stop web scan
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
