// NFC Service that reads NDEF text records containing Box-ID:Color data
// Format on NFC chip: "XXXXX-XXXXX-XXXXX:grün" (Box-ID:StampColor)
// 
// IMPORTANT: For native iOS/Android, install the Capacitor NFC plugin:
// npm install @capawesome-team/capacitor-nfc
// Then run: npx cap sync

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

  async isSupported(): Promise<boolean> {
    if (this.isNative) {
      // Try to load native Capacitor NFC plugin dynamically
      try {
        const nfcModule = await (Function('return import("@capawesome-team/capacitor-nfc")')() as Promise<any>);
        this.nfcPlugin = nfcModule.Nfc;
        const result = await this.nfcPlugin.isSupported();
        this.nfcPluginAvailable = true;
        return result.isSupported;
      } catch (error) {
        console.log('Capacitor NFC plugin not installed or unavailable:', error);
        this.nfcPluginAvailable = false;
        return false;
      }
    } else {
      // Web NFC API (Android Chrome 89+ only)
      return 'NDEFReader' in window;
    }
  }

  async isEnabled(): Promise<boolean> {
    if (this.isNative && this.nfcPlugin) {
      try {
        const result = await this.nfcPlugin.isEnabled();
        return result.isEnabled;
      } catch {
        return false;
      }
    }
    // Web NFC doesn't have enable check
    return true;
  }

  async openSettings(): Promise<void> {
    if (this.isNative && this.nfcPlugin) {
      try {
        await this.nfcPlugin.openSettings();
      } catch (error) {
        console.error('Failed to open NFC settings:', error);
      }
    }
  }

  async startScan(onRead: NfcReadCallback): Promise<void> {
    if (this.isScanning) return;

    const supported = await this.isSupported();
    if (!supported) {
      onRead({ chipData: '', success: false, error: 'NFC nicht unterstützt' });
      return;
    }

    const enabled = await this.isEnabled();
    if (!enabled) {
      onRead({ 
        chipData: '', 
        success: false, 
        error: 'NFC ist deaktiviert. Bitte in den Einstellungen aktivieren.' 
      });
      return;
    }

    this.isScanning = true;

    if (this.isNative && this.nfcPlugin) {
      await this.startNativeScan(onRead);
    } else {
      await this.startWebScan(onRead);
    }
  }

  private extractNdefText(nfcTag: any): string | null {
    // Extract text from NDEF message records
    try {
      const message = nfcTag.message || nfcTag.ndefMessage;
      if (!message || !message.records) return null;
      
      for (const record of message.records) {
        // TNF 0x01 = Well-Known, RTD = "T" for Text
        if (record.tnf === 1 && record.type) {
          const typeStr = typeof record.type === 'string' 
            ? record.type 
            : new TextDecoder().decode(new Uint8Array(record.type));
          
          if (typeStr === 'T') {
            // Text record: first byte is language code length, rest is text
            const payload = record.payload instanceof Uint8Array 
              ? record.payload 
              : new Uint8Array(record.payload);
            const langLength = payload[0] & 0x3F;
            const text = new TextDecoder().decode(payload.slice(1 + langLength));
            return text;
          }
        }
        
        // Also check for plain text payload
        if (record.payload) {
          try {
            const payload = record.payload instanceof Uint8Array 
              ? record.payload 
              : new Uint8Array(record.payload);
            const text = new TextDecoder().decode(payload);
            // Check if it looks like our format (BOX_ID:COLOR)
            if (text.includes(':') && text.match(/^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}:/i)) {
              return text;
            }
          } catch {
            // Not valid text
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
      // Add listener for NFC tag scanned
      await this.nfcPlugin.addListener('nfcTagScanned', (event: any) => {
        const nfcTag = event.nfcTag;
        const chipData = this.extractNdefText(nfcTag);
        
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

      // Start scanning session
      await this.nfcPlugin.startScanSession();
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

    if (this.isNative && this.nfcPlugin) {
      try {
        await this.nfcPlugin.stopScanSession();
        await this.nfcPlugin.removeAllListeners();
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
