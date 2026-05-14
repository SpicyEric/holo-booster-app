/**
 * Privacy-Screen-Helfer.
 *
 * Aktiviert den nativen Screenshot-/Recording-Schutz NUR auf dem
 * Prämien-Einlöse-Screen. Das Plugin (@capacitor-community/privacy-screen)
 * wird dynamisch geladen, damit Web-Builds und CI-Umgebungen ohne das
 * native Modul nicht brechen (siehe Memory: Capacitor private deps).
 *
 * Verhalten:
 *  - Android: Screenshots/Aufnahmen → schwarzes Bild, App-Switcher schwarz
 *  - iOS: App-Switcher verdeckt; bei aktiver Bildschirmaufnahme blendet
 *    der Aufrufer den sensiblen Inhalt zusätzlich aus (siehe useScreenCaptureDetection)
 */

import { Capacitor } from '@capacitor/core';

let activeCount = 0;

async function loadPlugin(): Promise<any | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    // dynamic import → fehlt das Modul, fallen wir still zurück
    const mod: any = await import(
      /* @vite-ignore */ '@capacitor-community/privacy-screen'
    );
    return mod?.PrivacyScreen ?? null;
  } catch {
    return null;
  }
}

export async function enablePrivacyScreen(): Promise<void> {
  activeCount += 1;
  const plugin = await loadPlugin();
  if (!plugin) return;
  try {
    await plugin.enable?.();
  } catch {
    /* noop */
  }
}

export async function disablePrivacyScreen(): Promise<void> {
  activeCount = Math.max(0, activeCount - 1);
  if (activeCount > 0) return; // andere Caller halten ihn noch aktiv
  const plugin = await loadPlugin();
  if (!plugin) return;
  try {
    await plugin.disable?.();
  } catch {
    /* noop */
  }
}

/**
 * iOS: erkennt aktive Bildschirmaufnahme via UIScreen.isCaptured.
 * Web/Android-Fallback liefert immer `false`.
 *
 * Wir versuchen das gleiche Plugin → falls es eine Capture-API anbietet
 * nutzen wir sie, sonst liefern wir `false` zurück.
 */
export async function isScreenBeingCaptured(): Promise<boolean> {
  const plugin = await loadPlugin();
  if (!plugin) return false;
  try {
    const res = await plugin.isScreenRecording?.();
    return Boolean(res?.value ?? res);
  } catch {
    return false;
  }
}
