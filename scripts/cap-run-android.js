#!/usr/bin/env node

/**
 * Safe Android runner for this repo.
 *
 * Why:
 * - `npx cap run android` performs a sync first, which can re-introduce Java
 *   settings incompatible with Capacitor 7 in generated Android modules.
 * - Our `configure-android-nfc.js` script enforces Java 21, Gradle 8.11.1, and SDK 35.
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
