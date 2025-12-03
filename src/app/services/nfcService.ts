// NFC Service that reads NDEF text records containing Box-ID:Color data
// Format on NFC chip: "XXXXX-XXXXX-XXXXX:grün" (Box-ID:StampColor)
// 
// Uses @exxili/capacitor-nfc for native iOS/Android support

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
  private nfcPlugin: any = null;
  private webNdefReader: any = null;
  private nfcPluginAvailable: boolean | null = null;
  private currentCallback: NfcReadCallback | null = null;
  private removeListener: (() => void) | null = null;

  async isSupported(): Promise<boolean> {
    if (this.isNative) {
      // Try to load @exxili/capacitor-nfc plugin
      try {
        const nfcModule = await import('@exxili/capacitor-nfc');
        this.nfcPlugin = nfcModule.NFC;
        const result = await this.nfcPlugin.isSupported();
        this.nfcPluginAvailable = result.supported;
        console.log('NFC Plugin isSupported:', result);
        return result.supported;
      } catch (error) {
        console.log('NFC plugin not available:', error);
        this.nfcPluginAvailable = false;
        return false;
      }
    } else {
      // Web NFC API (Android Chrome 89+ only)
      return 'NDEFReader' in window;
    }
  }

  async isEnabled(): Promise<boolean> {
    // @exxili/capacitor-nfc doesn't have a separate isEnabled check
    // If isSupported returns true, NFC should be enabled
    if (this.isNative && this.nfcPluginAvailable) {
      return true;
    }
    // Web NFC doesn't have enable check
    return true;
  }

  async openSettings(): Promise<void> {
    // @exxili/capacitor-nfc doesn't have openSettings
    // We could potentially use App plugin to open settings, but for now just log
    console.log('Opening NFC settings is not supported by this plugin');
  }

  async startScan(onRead: NfcReadCallback): Promise<void> {
    if (this.isScanning) return;

    const supported = await this.isSupported();
    if (!supported) {
      onRead({ chipData: '', success: false, error: 'NFC nicht unterstützt' });
      return;
    }

    this.isScanning = true;
    this.currentCallback = onRead;

    if (this.isNative && this.nfcPlugin) {
      await this.startNativeScan(onRead);
    } else {
      await this.startWebScan(onRead);
    }
  }

  private extractTextFromNdefMessages(data: any): string | null {
    try {
      // Use the string() method to get decoded text
      const stringData = data.string();
      console.log('NFC String Data:', JSON.stringify(stringData, null, 2));
      
      if (stringData.messages && stringData.messages.length > 0) {
        for (const message of stringData.messages) {
          if (message.records && message.records.length > 0) {
            for (const record of message.records) {
              const payload = record.payload;
              console.log('Record payload:', payload);
              
              // Check if it matches our format (BOX_ID:COLOR)
              if (payload && typeof payload === 'string') {
                // Remove language code prefix if present (e.g., "enHello" -> "Hello")
                const cleanPayload = payload.replace(/^[a-z]{2}/i, '');
                if (cleanPayload.match(/^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}:.+$/i)) {
                  return cleanPayload;
                }
                // Also check original payload
                if (payload.match(/^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}:.+$/i)) {
                  return payload;
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error extracting NDEF text:', error);
    }
    return null;
  }

  private async startNativeScan(onRead: NfcReadCallback): Promise<void> {
    try {
      console.log('Starting native NFC scan...');
      
      // Set up listener for NFC tag reads
      this.nfcPlugin.onRead((data: any) => {
        console.log('NFC tag read:', data);
        
        const chipData = this.extractTextFromNdefMessages(data);
        
        if (chipData) {
          onRead({ chipData, success: true });
          this.stopScan();
        } else {
          onRead({ 
            chipData: '', 
            success: false, 
            error: 'Kein gültiger Eloyo-Stempel erkannt' 
          });
        }
      });

      // Set up error handler
      this.nfcPlugin.onError((error: any) => {
        console.error('NFC Error:', error);
        this.isScanning = false;
        onRead({ 
          chipData: '', 
          success: false, 
          error: error.message || 'NFC Fehler' 
        });
      });

      // Start the scan session
      await this.nfcPlugin.startScan();
      console.log('NFC scan started');
      
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
      onRead({ chipData: '', success: false, error: 'Web NFC nicht verfügbar' });
      this.isScanning = false;
      return;
    }

    try {
      this.webNdefReader = new (window as any).NDEFReader();
      await this.webNdefReader.scan();

      this.webNdefReader.addEventListener('reading', ({ message }: { message: any }) => {
        // Extract text from NDEF records
        for (const record of message.records) {
          if (record.recordType === 'text') {
            const textDecoder = new TextDecoder(record.encoding || 'utf-8');
            const text = textDecoder.decode(record.data);
            
            // Validate format (BOX_ID:COLOR)
            if (text.match(/^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}:.+$/i)) {
              onRead({ chipData: text, success: true });
              this.stopScan();
              return;
            }
          }
        }
        
        onRead({ 
          chipData: '', 
          success: false, 
          error: 'Kein gültiger Eloyo-Stempel erkannt' 
        });
      });

      this.webNdefReader.addEventListener('readingerror', () => {
        onRead({ chipData: '', success: false, error: 'NFC Lesefehler' });
        this.stopScan();
      });
    } catch (error: any) {
      console.error('Web NFC scan error:', error);
      this.isScanning = false;
      onRead({ 
        chipData: '', 
        success: false, 
        error: error.message || 'NFC konnte nicht gestartet werden' 
      });
    }
  }

  async stopScan(): Promise<void> {
    this.isScanning = false;
    this.currentCallback = null;

    if (this.isNative && this.nfcPlugin) {
      try {
        await this.nfcPlugin.cancelScan();
        console.log('NFC scan cancelled');
      } catch (error) {
        console.error('Error stopping native scan:', error);
      }
    }

    // Web NFC doesn't have a stop method
    this.webNdefReader = null;
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
