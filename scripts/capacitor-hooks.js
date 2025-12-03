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

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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
  
  // Android NFC ist bereits durch das Plugin konfiguriert
  // Hier können zusätzliche Anpassungen hinzugefügt werden
  
  const manifestPath = path.join(PLATFORM_ANDROID, 'app', 'src', 'main', 'AndroidManifest.xml');
  if (fs.existsSync(manifestPath)) {
    let manifest = fs.readFileSync(manifestPath, 'utf8');
    
    // Prüfe ob NFC Berechtigung vorhanden
    if (manifest.includes('android.permission.NFC')) {
      console.log('✅ Android NFC Berechtigung bereits vorhanden');
    } else {
      console.log('⚠️  Android NFC Berechtigung fehlt - wird vom Plugin hinzugefügt');
    }
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
