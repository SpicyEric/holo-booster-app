/**
 * Privacy-Screen entfernt.
 *
 * Das @capacitor-community/privacy-screen-Plugin wurde komplett entfernt,
 * damit Nutzer auf Android wieder normal Screenshots machen können.
 * Die Funktionen bleiben als No-Ops bestehen, damit bestehende Aufrufer
 * nicht brechen.
 */

export async function enablePrivacyScreen(): Promise<void> {
  return;
}

export async function disablePrivacyScreen(): Promise<void> {
  return;
}

export async function isScreenBeingCaptured(): Promise<boolean> {
  return false;
}
