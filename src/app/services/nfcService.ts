// NFC Service for Eloyo App
// 
// Uses @capawesome-team/capacitor-nfc (Premium Plugin) for native Android/iOS NFC
// Identification is based SOLELY on the chip's hardware UID (TAG-only mode for iOS compatibility).
// NDEF text data is still written during registration (for external readers) but NOT read by the app.
//
// The capawesome NFC package is NOT in package.json (private registry auth fails in CI).
// It is installed locally via .npmrc and loaded dynamically at runtime on native platforms.

import { Capacitor, registerPlugin } from '@capacitor/core';
import type { NfcPlugin } from './nfcTypes';

export interface NfcReadResult {
  /** @deprecated No longer used for identification. Use hardwareUid instead. */
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

// Lazily-loaded reference to the native NFC plugin
let _nfcPlugin: NfcPlugin | null = null;

const NFC_PLUGIN_NAME_CANDIDATES = ['Nfc', 'CapacitorNfc', 'CapacitorNFC', 'NFC'] as const;

type NativeNfcPluginName = (typeof NFC_PLUGIN_NAME_CANDIDATES)[number];
type NfcSupportedResult = { nfc?: boolean; isSupported?: boolean };

const getErrorText = (rawError: unknown): string => {
  if (typeof rawError === 'string') return rawError;
  return (rawError as any)?.error?.message || (rawError as any)?.message || '';
};

const isMissingNativePluginError = (rawError: unknown): boolean => {
  const errMsg = getErrorText(rawError).toLowerCase();

  return (
    errMsg.includes('plugin not available') ||
    errMsg.includes('not implemented') ||
    errMsg.includes('unimplemented') ||
    errMsg.includes('could not find') ||
    errMsg.includes('cannot find module')
  );
};

const parseSupportedResult = (result: NfcSupportedResult | null | undefined): boolean | null => {
  if (typeof result?.nfc === 'boolean') return result.nfc;
  if (typeof result?.isSupported === 'boolean') return result.isSupported;
  return null;
};

function resolveNativeNfcPluginName(): NativeNfcPluginName {
  const pluginHeaders = ((window as any)?.Capacitor?.PluginHeaders || []) as Array<{ name?: string }>;

  for (const pluginName of NFC_PLUGIN_NAME_CANDIDATES) {
    try {
      if (Capacitor.isPluginAvailable(pluginName)) {
        return pluginName;
      }

      if (pluginHeaders.some((header) => header?.name === pluginName)) {
        return pluginName;
      }
    } catch {
      // Ignore and try next candidate.
    }
  }

  console.warn('[NFC] No native NFC plugin header reported, falling back to default plugin name: Nfc');
  return 'Nfc';
}

function getNfcPlugin(): NfcPlugin {
  if (_nfcPlugin) return _nfcPlugin;

  const pluginName = resolveNativeNfcPluginName();

  try {
    _nfcPlugin = registerPlugin<NfcPlugin>(pluginName);
    console.log('[NFC] Using native Capacitor plugin:', pluginName);
    return _nfcPlugin;
  } catch (e) {
    console.error('[NFC] Failed to initialize native NFC plugin proxy:', e);
    throw new Error('NFC plugin not available');
  }
}

class NfcService {
  private isNative = isNativePlatform();
  private isScanning = false;
  private webNdefReader: any = null;
  private currentCallback: NfcReadCallback | null = null;
  private abortController: AbortController | null = null;
  private nfcListenerHandles: any[] = [];
  private scanStartedAt: number = 0;

  isNativeApp(): boolean {
    return this.isNative;
  }

  async isSupported(): Promise<boolean> {
    const platform = getPlatform();
    console.log('[NFC] Checking support on platform:', platform);

    if (platform === 'android' || platform === 'ios') {
      if (platform === 'ios') {
        console.log('[NFC] iOS detected – assuming NFC supported (iPhone 7+)');
        return true;
      }
      try {
        const Nfc = getNfcPlugin();
        const result = await Promise.race([
          Nfc.isSupported(),
          new Promise<NfcSupportedResult>((resolve) => setTimeout(() => {
            console.warn('[NFC] isSupported timed out, assuming supported on native platform');
            resolve({ nfc: true });
          }, 3000)),
        ]);
        console.log('[NFC] isSupported result:', result);

        const supported = parseSupportedResult(result);
        if (supported !== null) {
          return supported;
        }

        console.warn('[NFC] isSupported returned an unexpected result, assuming supported on native platform');
        return true;
      } catch (error) {
        console.log('[NFC] isSupported check failed:', error);

        if (isMissingNativePluginError(error)) {
          console.log('[NFC] Native plugin missing on this build - reporting NFC as unavailable');
          return false;
        }

        console.log('[NFC] Assuming supported on native platform despite error');
        return true;
      }
    }

    return 'NDEFReader' in window;
  }

  async isEnabled(): Promise<boolean> {
    const platform = getPlatform();

    if (platform === 'android') {
      try {
        const Nfc = getNfcPlugin();
        const result = await Promise.race([
          Nfc.isEnabled(),
          new Promise<{ isEnabled: boolean }>((resolve) => setTimeout(() => {
            console.warn('[NFC] isEnabled timed out, assuming enabled on native platform');
            resolve({ isEnabled: true });
          }, 2500)),
        ]);
        console.log('[NFC] isEnabled result:', result);

        if (typeof result?.isEnabled === 'boolean') {
          return result.isEnabled;
        }

        console.warn('[NFC] isEnabled returned an unexpected result, assuming enabled on native platform');
        return true;
      } catch (error) {
        if (isMissingNativePluginError(error)) {
          console.log('[NFC] Native plugin missing while checking isEnabled:', error);
          return false;
        }

        console.log('[NFC] isEnabled check failed, assuming enabled on native platform:', error);
        return true;
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
      const Nfc = getNfcPlugin();
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

  private async cleanupPreviousScan(): Promise<void> {
    await this.removeNativeListeners();
    try {
      const Nfc = getNfcPlugin();
      await Nfc.stopScanSession();
    } catch {}
    try {
      const Nfc = getNfcPlugin();
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
    const errorText = getErrorText(rawError);

    const errMsg = errorText.toLowerCase();

    if (isMissingNativePluginError(rawError)) {
      return 'NFC ist in dieser App-Version noch nicht korrekt eingebunden. Bitte die App nach dem neuesten Stand neu synchronisieren und installieren.';
    }

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
      return 'iOS blockiert NFC für diese App. Bitte prüfe in Xcode die Capability „Near Field Communication Tag Reading", verwende ein Provisioning-Profil mit NFC-Entitlement und installiere die App danach neu.';
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
      return 'iOS blockiert NFC für diese App. Bitte prüfe in Xcode die Capability „Near Field Communication Tag Reading", nutze ein NFC-fähiges iPhone und installiere die App danach neu.';
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

  /** @deprecated Only used for legacy web NFC flow. Native uses hardware UID only. */
  private validateChipData(data: string): boolean {
    const pattern = /^[A-HJ-KM-NP-Z1-9]{5}-[A-HJ-KM-NP-Z1-9]{5}-[A-HJ-KM-NP-Z1-9]{5}:(grün|blau|rot)$/i;
    return pattern.test(data);
  }

  private async startNativeScan(onRead: NfcReadCallback): Promise<void> {
    try {
      console.log('[NFC] Setting up Capawesome NFC listener');
      const Nfc = getNfcPlugin();

      this.scanStartedAt = Date.now();

      const tagListener = await Nfc.addListener('nfcTagScanned', (event: any) => {
        const elapsed = Date.now() - this.scanStartedAt;
        console.log('[NFC] Tag scanned, elapsed since scan start:', elapsed, 'ms');

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
        alertMessage: 'Halte dein Handy an den NFC-Karte'
      });

      console.log('[NFC] Scan session started');
    } catch (error: any) {
      await this.notifyNativeScanFailure(onRead, error);
    }
  }

  private extractHardwareUid(nfcTag: any): string | undefined {
    try {
      const tagId = nfcTag?.id;
      if (Array.isArray(tagId) && tagId.length > 0) {
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

      const hardwareUid = this.extractHardwareUid(nfcTag);

      if (!hardwareUid) {
        console.log('[NFC] No hardware UID found on tag');
        onRead({
          chipData: '',
          success: false,
          error: 'NFC-Chip konnte nicht identifiziert werden. Bitte versuche es erneut.'
        });
        return;
      }

      console.log('[NFC] Tag identified - hardwareUid:', hardwareUid);
      onRead({ chipData: '', hardwareUid, success: true });
      this.stopScan();
    } catch (error: any) {
      console.error('[NFC] Error processing tag:', error);
      onRead({
        chipData: '',
        success: false,
        error: 'Fehler beim Lesen des NFC-Kartes'
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
          error: 'Kein gültiger Eloyo-Karte erkannt. Bitte versuche es erneut.'
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
      const Nfc = getNfcPlugin();
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

  /** @deprecated No longer used. Identification is via hardware UID only. */
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
