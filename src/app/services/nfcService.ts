// NFC Service for Eloyo App
// 
// Uses @capawesome-team/capacitor-nfc (Premium Plugin) for native Android/iOS NFC
// Format on NFC chip: "XXXXX-XXXXX-XXXXX:grün" (Box-ID:StampColor)

import { Capacitor } from '@capacitor/core';
import { Nfc } from '@capawesome-team/capacitor-nfc';

export interface NfcReadResult {
  chipData: string;
  hardwareUid?: string;
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
  private nfcListenerHandles: any[] = [];
  private scanStartedAt: number = 0; // Timestamp when scan session was started

  isNativeApp(): boolean {
    return this.isNative;
  }

  async isSupported(): Promise<boolean> {
    const platform = getPlatform();
    console.log('[NFC] Checking support on platform:', platform);
    
    // On native platforms (especially iOS), always assume NFC is supported.
    // All iPhones 7+ have NFC hardware. The actual entitlement/capability
    // check happens when startScanSession() is called – errors are shown then.
    if (platform === 'android' || platform === 'ios') {
      if (platform === 'ios') {
        console.log('[NFC] iOS detected – assuming NFC supported (iPhone 7+)');
        return true;
      }
      try {
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
        console.log('[NFC] Assuming supported on native platform despite error');
        return true;
      }
    } else {
      return 'NDEFReader' in window;
    }
  }

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
    
    return true;
  }

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

  async startScan(onRead: NfcReadCallback): Promise<void> {
    if (this.isScanning) {
      console.log('[NFC] Scan already in progress');
      return;
    }

    // Zuerst alle alten Listener/Sessions aufräumen um gecachte Tags zu verwerfen
    await this.cleanupPreviousScan();

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
   * Cleanup any previous scan state to prevent queued tags from firing
   */
  private async cleanupPreviousScan(): Promise<void> {
    await this.removeNativeListeners();
    try {
      await Nfc.stopScanSession();
    } catch {}
    // Remove all Nfc listeners to clear any queued events
    try {
      await Nfc.removeAllListeners();
    } catch {}
  }

  private async removeNativeListeners(): Promise<void> {
    if (this.nfcListenerHandles.length === 0) return;

    const handles = [...this.nfcListenerHandles];
    this.nfcListenerHandles = [];

    await Promise.all(
      handles.map(async (handle) => {
        try {
          await handle?.remove?.();
        } catch {}
      })
    );
  }

  private buildNativeScanErrorMessage(rawError: unknown): string {
    const platform = getPlatform();
    const errorText =
      typeof rawError === 'string'
        ? rawError
        : (rawError as any)?.error?.message || (rawError as any)?.message || '';

    const errMsg = errorText.toLowerCase();

    if (errMsg.includes('permission') || errMsg.includes('denied')) {
      return 'NFC-Berechtigung wird benötigt. Bitte aktiviere NFC in den Einstellungen.';
    }

    if (errMsg.includes('disabled') || errMsg.includes('not enabled')) {
      return 'NFC ist deaktiviert. Bitte aktiviere NFC in den Geräteeinstellungen.';
    }

    if (errMsg.includes('unavailable') || errMsg.includes('not supported')) {
      return 'NFC ist auf diesem Gerät nicht verfügbar.';
    }

    const isLikelyIosCoreNfcIssue =
      platform === 'ios' &&
      (
        errMsg.includes('session invalidated unexpectedly') ||
        errMsg.includes('session terminated unexpectedly') ||
        errMsg.includes('com.apple.nfcd.service.corenfc') ||
        errMsg.includes('xpc error') ||
        errMsg.includes('code=4099') ||
        errMsg.includes('errorcode: 0xca') ||
        errMsg.includes('sandbox restriction')
      );

    if (isLikelyIosCoreNfcIssue) {
      return 'iOS blockiert NFC für diese App. Bitte prüfe in Xcode die Capability „Near Field Communication Tag Reading“, verwende ein Provisioning-Profil mit NFC-Entitlement und installiere die App danach neu.';
    }

    if (errMsg.includes('canceled') || errMsg.includes('cancelled') || errMsg.includes('session invalidated')) {
      return 'NFC-Scan wurde abgebrochen.';
    }

    if (
      errMsg.includes('com.apple.nfcd.service.corenfc') ||
      errMsg.includes('xpc error') ||
      errMsg.includes('code=4099') ||
      errMsg.includes('sandbox restriction')
    ) {
      return 'iOS blockiert NFC für diese App. Bitte prüfe in Xcode die Capability „Near Field Communication Tag Reading“, nutze ein NFC-fähiges iPhone und installiere die App danach neu.';
    }

    return 'NFC konnte nicht gestartet werden';
  }

  private async notifyNativeScanFailure(onRead: NfcReadCallback, rawError: unknown): Promise<void> {
    const errorMessage = this.buildNativeScanErrorMessage(rawError);
    console.error('[NFC] Native scan failure details:', rawError);

    if (!this.isScanning) return;

    onRead({
      chipData: '',
      success: false,
      error: errorMessage,
    });

    await this.stopScan();
  }

  private validateChipData(data: string): boolean {
    const pattern = /^[A-HJ-KM-NP-Z1-9]{5}-[A-HJ-KM-NP-Z1-9]{5}-[A-HJ-KM-NP-Z1-9]{5}:(grün|blau|rot)$/i;
    return pattern.test(data);
  }

  private async startNativeScan(onRead: NfcReadCallback): Promise<void> {
    try {
      console.log('[NFC] Setting up Capawesome NFC listener');

      // Record when we started so we can reject stale/buffered tags
      this.scanStartedAt = Date.now();

      const tagListener = await Nfc.addListener('nfcTagScanned', (event: any) => {
        const elapsed = Date.now() - this.scanStartedAt;
        console.log('[NFC] Tag scanned, elapsed since scan start:', elapsed, 'ms');
        
        // Reject tags that arrive within 600ms of starting - these are buffered/stale
        if (elapsed < 600) {
          console.log('[NFC] Ignoring stale/buffered NFC tag (arrived too quickly after scan start)');
          return;
        }
        
        this.processNfcTag(event.nfcTag, onRead);
      });

      const sessionErrorListener = await Nfc.addListener('scanSessionError', async (event: any) => {
        console.error('[NFC] scanSessionError event:', event);
        await this.notifyNativeScanFailure(onRead, event);
      });

      const sessionCanceledListener = await Nfc.addListener('scanSessionCanceled', async () => {
        console.log('[NFC] scanSessionCanceled event');
        if (!this.isScanning) return;

        onRead({
          chipData: '',
          success: false,
          error: 'NFC-Scan wurde abgebrochen.',
        });

        await this.stopScan();
      });

      this.nfcListenerHandles = [tagListener, sessionErrorListener, sessionCanceledListener];

      await Nfc.startScanSession({
        alertMessage: 'Halte dein Handy an den NFC-Stempel'
      });
      
      console.log('[NFC] Scan session started');

    } catch (error: any) {
      await this.notifyNativeScanFailure(onRead, error);
    }
  }

  /**
   * Extract hardware UID from the NFC tag object
   * Capawesome provides it as nfcTag.id (byte array)
   */
  private extractHardwareUid(nfcTag: any): string | undefined {
    try {
      // Capawesome plugin provides tag ID as number array
      const tagId = nfcTag?.id;
      if (Array.isArray(tagId) && tagId.length > 0) {
        // Convert byte array to hex string (e.g., "04:A3:2B:8F:12:5C:80")
        const hexUid = tagId.map((b: number) => b.toString(16).padStart(2, '0')).join(':');
        console.log('[NFC] Hardware UID:', hexUid);
        return hexUid;
      }
      return undefined;
    } catch (error) {
      console.error('[NFC] Error extracting hardware UID:', error);
      return undefined;
    }
  }

  private processNfcTag(nfcTag: any, onRead: NfcReadCallback): void {
    try {
      console.log('[NFC] Processing tag:', JSON.stringify(nfcTag));
      
      // Extract hardware UID for security verification
      const hardwareUid = this.extractHardwareUid(nfcTag);
      
      const message = nfcTag?.message;
      const records = message?.records || [];
      
      for (const record of records) {
        const tnf = record?.tnf;
        const type = record?.type;
        
        const isTextRecord = 
          tnf === 1 && 
          Array.isArray(type) && 
          type.length === 1 && 
          type[0] === 84;
        
        if (isTextRecord && record.payload) {
          const text = this.decodeNdefTextPayload(record.payload);
          
          console.log('[NFC] Text payload:', text);
          
          let cleanText = text.trim();
          
          if (cleanText.length > 2 && !cleanText.match(/^[A-HJ-KM-NP-Z1-9]{5}-/i)) {
            cleanText = cleanText.substring(2);
          }
          
          if (this.validateChipData(cleanText)) {
            console.log('[NFC] Valid Eloyo chip data:', cleanText, 'UID:', hardwareUid);
            onRead({ chipData: cleanText, hardwareUid, success: true });
            this.stopScan();
            return;
          }
          
          if (this.validateChipData(text)) {
            console.log('[NFC] Valid Eloyo chip data (raw):', text, 'UID:', hardwareUid);
            onRead({ chipData: text, hardwareUid, success: true });
            this.stopScan();
            return;
          }
        }
      }
      
      console.log('[NFC] No valid Eloyo data in tag');
      onRead({
        chipData: '',
        hardwareUid,
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

  private decodeNdefTextPayload(payload: number[]): string {
    try {
      if (!Array.isArray(payload) || payload.length === 0) {
        return '';
      }
      
      const bytes = new Uint8Array(payload);
      const statusByte = bytes[0];
      const languageCodeLength = statusByte & 0x3F;
      const isUtf16 = (statusByte & 0x80) !== 0;
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
        console.log('[NFC] Web tag detected, serial:', serialNumber);
        
        // Web NFC provides serialNumber as the hardware UID
        const hardwareUid = serialNumber || undefined;
        
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
              onRead({ chipData: cleanText, hardwareUid, success: true });
              this.stopScan();
              return;
            }
            
            if (this.validateChipData(text)) {
              onRead({ chipData: text, hardwareUid, success: true });
              this.stopScan();
              return;
            }
          }
        }

        onRead({
          chipData: '',
          hardwareUid,
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

  async stopScan(): Promise<void> {
    this.isScanning = false;
    this.currentCallback = null;

    await this.removeNativeListeners();

    try {
      await Nfc.stopScanSession();
      console.log('[NFC] Scan session stopped');
    } catch (error) {
      console.log('[NFC] Error stopping scan session:', error);
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.webNdefReader = null;
    console.log('[NFC] Scan stopped');
  }

  isScanActive(): boolean {
    return this.isScanning;
  }

  parseChipData(chipData: string): { boxId: string; color: string } | null {
    if (!this.validateChipData(chipData)) {
      return null;
    }
    
    const [boxId, color] = chipData.split(':');
    return { boxId, color };
  }
}

export const nfcService = new NfcService();
export type { NfcReadCallback };
