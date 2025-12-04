#!/usr/bin/env node

/**
 * Capacitor Build Hooks
 * 
 * Dieses Skript wird automatisch nach `npx cap sync` ausgeführt
 * um plattformspezifische Konfigurationen anzuwenden.
 * 
 * Füge folgendes zu package.json hinzu:
 * "scripts": {
 *   "cap:sync": "npx cap sync && node scripts/capacitor-hooks.js"
 * }
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLATFORM_IOS = path.join(__dirname, '..', 'ios');
const PLATFORM_ANDROID = path.join(__dirname, '..', 'android');

/**
 * iOS Post-Sync Hook
 */
function runIOSHooks() {
  if (!fs.existsSync(PLATFORM_IOS)) {
    console.log('ℹ️  iOS Plattform nicht vorhanden, überspringe iOS Hooks');
    return;
  }

  console.log('\n🍎 Führe iOS Hooks aus...');
  
  try {
    // NFC Konfiguration
    execSync('node scripts/configure-ios-nfc.js', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
  } catch (error) {
    console.error('❌ iOS Hook Fehler:', error.message);
  }
}

/**
 * Android Post-Sync Hook
 */
function runAndroidHooks() {
  if (!fs.existsSync(PLATFORM_ANDROID)) {
    console.log('ℹ️  Android Plattform nicht vorhanden, überspringe Android Hooks');
    return;
  }

  console.log('\n🤖 Führe Android Hooks aus...');
  
  try {
    // Android NFC Konfiguration mit Intent-Filtern
    execSync('node scripts/configure-android-nfc.js', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
  } catch (error) {
    console.error('❌ Android Hook Fehler:', error.message);
  }
}

/**
 * Hauptfunktion
 */
function main() {
  console.log('🔄 Capacitor Post-Sync Hooks');
  console.log('============================');

  runIOSHooks();
  runAndroidHooks();

  console.log('\n============================');
  console.log('✅ Alle Hooks abgeschlossen\n');
}

// Ausführen
main();
