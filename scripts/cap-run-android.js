#!/usr/bin/env node

/**
 * Safe Android runner for this repo.
 *
 * Why:
 * - `npx cap run android` performs a sync first, which can re-introduce Java 21
 *   settings in generated Android modules (e.g. `capacitor-cordova-android-plugins`).
 * - Our `configure-android-nfc.js` script patches ALL Gradle files back to Java 17.
 *
 * This helper enforces the correct order:
 *   1) cap sync android
 *   2) run post-sync hooks (Android/iOS) -> includes Java 17 patching
 *   3) cap run android --no-sync
 */

import { execSync } from 'child_process';

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

function main() {
  run('npx cap sync android');
  run('node scripts/capacitor-hooks.js');
  run('npx cap run android --no-sync');
}

main();
