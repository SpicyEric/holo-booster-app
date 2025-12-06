#!/usr/bin/env node

/**
 * iOS NFC + Geolocation Configuration Script
 * 
 * This script automatically configures:
 * - Info.plist with NFC and Geolocation permissions
 * - App.entitlements with NFC capabilities
 * 
 * Compatible with Capacitor 5+ and iOS 16/17
 * 
 * Usage: node scripts/configure-ios-nfc.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const IOS_APP_PATH = path.join(__dirname, '..', 'ios', 'App', 'App');
const INFO_PLIST_PATH = path.join(IOS_APP_PATH, 'Info.plist');
const ENTITLEMENTS_PATH = path.join(IOS_APP_PATH, 'App.entitlements');

// NFC Configuration
const NFC_CONFIG = {
  NFCReaderUsageDescription: 'Diese App nutzt NFC um Treuepunkte bei teilnehmenden Händlern zu sammeln.',
  iso7816SelectIdentifiers: ['D276000085010100'],
  felicaSystemCodes: ['0000'],
  readerSessionFormats: ['NDEF', 'TAG'],
};

// Geolocation Configuration
const LOCATION_CONFIG = {
  NSLocationWhenInUseUsageDescription: 'Eloyo benötigt deinen Standort um Stores in deiner Nähe zu finden.',
  NSLocationAlwaysAndWhenInUseUsageDescription: 'Eloyo benötigt deinen Standort um Stores in deiner Nähe zu finden und dich über Angebote in der Nähe zu informieren.',
};

/**
 * Check if iOS platform exists
 */
function checkiOSPlatform() {
  if (!fs.existsSync(IOS_APP_PATH)) {
    console.error('❌ iOS platform not found!');
    console.log('   Run first: npx cap add ios');
    process.exit(1);
  }
  console.log('✅ iOS platform found');
}

/**
 * Read a plist file as string
 */
function readPlist(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Write a plist file
 */
function writePlist(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * Add a key-value entry to plist (if not present)
 */
function addPlistEntry(plistContent, key, value) {
  // Check if key already exists
  if (plistContent.includes(`<key>${key}</key>`)) {
    console.log(`   ⏭️  ${key} already present`);
    return plistContent;
  }

  // Find position before </dict> (last occurrence)
  const insertPosition = plistContent.lastIndexOf('</dict>');
  if (insertPosition === -1) {
    console.error(`   ❌ Could not find position for ${key}`);
    return plistContent;
  }

  // Create new entry
  let newEntry = `\t<key>${key}</key>\n`;
  
  if (typeof value === 'string') {
    newEntry += `\t<string>${value}</string>\n`;
  } else if (Array.isArray(value)) {
    newEntry += `\t<array>\n`;
    value.forEach(item => {
      newEntry += `\t\t<string>${item}</string>\n`;
    });
    newEntry += `\t</array>\n`;
  }

  // Insert entry
  const newContent = 
    plistContent.slice(0, insertPosition) + 
    newEntry + 
    plistContent.slice(insertPosition);

  console.log(`   ✅ ${key} added`);
  return newContent;
}

/**
 * Configure Info.plist - NFC
 */
function configureNfcInPlist(plist) {
  console.log('\n📡 Configuring NFC in Info.plist...');

  // NFC Reader Usage Description
  plist = addPlistEntry(plist, 'NFCReaderUsageDescription', NFC_CONFIG.NFCReaderUsageDescription);

  // ISO7816 Select Identifiers
  plist = addPlistEntry(
    plist, 
    'com.apple.developer.nfc.readersession.iso7816.select-identifiers', 
    NFC_CONFIG.iso7816SelectIdentifiers
  );

  // FeliCa System Codes
  plist = addPlistEntry(
    plist, 
    'com.apple.developer.nfc.readersession.felica.systemcodes', 
    NFC_CONFIG.felicaSystemCodes
  );

  return plist;
}

/**
 * Configure Info.plist - Geolocation
 */
function configureGeolocationInPlist(plist) {
  console.log('\n📍 Configuring Geolocation in Info.plist...');

  // When In Use Description
  plist = addPlistEntry(
    plist, 
    'NSLocationWhenInUseUsageDescription', 
    LOCATION_CONFIG.NSLocationWhenInUseUsageDescription
  );

  // Always and When In Use Description
  plist = addPlistEntry(
    plist, 
    'NSLocationAlwaysAndWhenInUseUsageDescription', 
    LOCATION_CONFIG.NSLocationAlwaysAndWhenInUseUsageDescription
  );

  return plist;
}

/**
 * Configure Info.plist
 */
function configureInfoPlist() {
  console.log('\n📝 Configuring Info.plist...');
  
  let plist = readPlist(INFO_PLIST_PATH);
  if (!plist) {
    console.error('❌ Info.plist not found!');
    return false;
  }

  // NFC Configuration
  plist = configureNfcInPlist(plist);
  
  // Geolocation Configuration
  plist = configureGeolocationInPlist(plist);

  writePlist(INFO_PLIST_PATH, plist);
  console.log('✅ Info.plist updated');
  return true;
}

/**
 * Configure App.entitlements
 */
function configureEntitlements() {
  console.log('\n📝 Configuring App.entitlements...');
  
  let entitlements = readPlist(ENTITLEMENTS_PATH);
  
  // Create file if it doesn't exist
  if (!entitlements) {
    console.log('   📄 Creating new App.entitlements file...');
    entitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
</dict>
</plist>
`;
  }

  // NFC Reader Session Formats
  entitlements = addPlistEntry(
    entitlements, 
    'com.apple.developer.nfc.readersession.formats', 
    NFC_CONFIG.readerSessionFormats
  );

  writePlist(ENTITLEMENTS_PATH, entitlements);
  console.log('✅ App.entitlements updated');
  return true;
}

/**
 * Main function
 */
function main() {
  console.log('━'.repeat(60));
  console.log('  iOS NFC + Geolocation Configuration Script');
  console.log('  Capacitor 5+ compatible');
  console.log('━'.repeat(60));
  console.log('');

  // Check iOS platform
  checkiOSPlatform();

  // Configure files
  const infoPlistOk = configureInfoPlist();
  const entitlementsOk = configureEntitlements();

  // Summary
  console.log('\n' + '━'.repeat(60));
  if (infoPlistOk && entitlementsOk) {
    console.log('  ✅ iOS configuration complete!\n');
    console.log('NFC Features:');
    console.log('  • NFCReaderUsageDescription set');
    console.log('  • ISO7816 Select Identifiers configured');
    console.log('  • NFC Reader Session Formats enabled\n');
    console.log('Geolocation Features:');
    console.log('  • NSLocationWhenInUseUsageDescription set');
    console.log('  • NSLocationAlwaysAndWhenInUseUsageDescription set\n');
    console.log('📋 Next steps:');
    console.log('  1. npx cap sync ios');
    console.log('  2. npx cap open ios');
    console.log('  3. In Xcode: Signing & Capabilities');
    console.log('  4. Add "Near Field Communication Tag Reading" capability');
    console.log('  5. Ensure Provisioning Profile supports NFC');
    console.log('  6. Build and test on real device (iPhone 7+)\n');
  } else {
    console.log('  ⚠️  Configuration completed with errors');
    console.log('     Check files manually.\n');
  }
  console.log('━'.repeat(60));
}

// Run script
main();
