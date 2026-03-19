#!/usr/bin/env node

/**
 * Safe Android runner for this repo.
 *
 * Why:
 * - `npx cap run android` performs a sync first, which can re-introduce Java
 *   settings incompatible with Capacitor 7 in generated Android modules.
 * - `cap sync` copies assets from `dist`. If `dist` is stale, old app code (incl. old map logic)
 *   is shipped to Android even when source files were updated.
 *
 * This helper enforces the correct order:
 *   1) npm run build
 *   2) cap sync android
 *   3) run post-sync hooks (Android/iOS)
 *   4) cap run android --no-sync
 */

import { execSync } from 'child_process';

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

function main() {
  run('npm run build');
  run('npx cap sync android');
  run('npx cap run android --no-sync');
}

main();
