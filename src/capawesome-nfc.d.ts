// Type stub so `import('@capawesome-team/capacitor-nfc')` compiles
// even when the package is not installed in the CI/build environment.
// At runtime on native devices the real package is bundled via the local .npmrc token.
declare module '@capawesome-team/capacitor-nfc' {
  import type { NfcPlugin } from '@/app/services/nfcTypes';
  export const Nfc: NfcPlugin;
}
