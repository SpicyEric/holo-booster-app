#!/usr/bin/env node

/**
 * Automatisches iOS NFC Konfigurationsskript
 * 
 * Dieses Skript aktualisiert automatisch:
 * - Info.plist mit NFC-Berechtigungen
 * - App.entitlements mit NFC-Capabilities
 * 
 * Verwendung:
 * node scripts/configure-ios-nfc.js
 * 
 * Oder als npm script:
 * npm run configure:ios:nfc
 */

const fs = require('fs');
const path = require('path');

// Pfade
const IOS_APP_PATH = path.join(__dirname, '..', 'ios', 'App', 'App');
const INFO_PLIST_PATH = path.join(IOS_APP_PATH, 'Info.plist');
const ENTITLEMENTS_PATH = path.join(IOS_APP_PATH, 'App.entitlements');

// NFC Konfiguration
const NFC_CONFIG = {
  NFCReaderUsageDescription: 'Diese App nutzt NFC um Treuepunkte bei teilnehmenden Händlern zu sammeln.',
  iso7816SelectIdentifiers: ['D276000085010100'],
  felicaSystemCodes: ['0000'],
  readerSessionFormats: ['NDEF', 'TAG'],
};

/**
 * Prüft ob iOS Plattform existiert
 */
function checkiOSPlatform() {
  if (!fs.existsSync(IOS_APP_PATH)) {
    console.error('❌ iOS Plattform nicht gefunden!');
    console.log('   Führe zuerst aus: npx cap add ios');
    process.exit(1);
  }
  console.log('✅ iOS Plattform gefunden');
}

/**
 * Liest eine Plist-Datei als String
 */
function readPlist(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Schreibt eine Plist-Datei
 */
function writePlist(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * Fügt einen Key-Value Eintrag zur Plist hinzu (falls nicht vorhanden)
 */
function addPlistEntry(plistContent, key, value) {
  // Prüfen ob Key bereits existiert
  if (plistContent.includes(`<key>${key}</key>`)) {
    console.log(`   ⏭️  ${key} bereits vorhanden`);
    return plistContent;
  }

  // Position vor </dict> finden (letztes Vorkommen)
  const insertPosition = plistContent.lastIndexOf('</dict>');
  if (insertPosition === -1) {
    console.error(`   ❌ Konnte Position für ${key} nicht finden`);
    return plistContent;
  }

  // Neuen Eintrag erstellen
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

  // Eintrag einfügen
  const newContent = 
    plistContent.slice(0, insertPosition) + 
    newEntry + 
    plistContent.slice(insertPosition);

  console.log(`   ✅ ${key} hinzugefügt`);
  return newContent;
}

/**
 * Konfiguriert Info.plist
 */
function configureInfoPlist() {
  console.log('\n📝 Konfiguriere Info.plist...');
  
  let plist = readPlist(INFO_PLIST_PATH);
  if (!plist) {
    console.error('❌ Info.plist nicht gefunden!');
    return false;
  }

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

  writePlist(INFO_PLIST_PATH, plist);
  console.log('✅ Info.plist aktualisiert');
  return true;
}

/**
 * Konfiguriert App.entitlements
 */
function configureEntitlements() {
  console.log('\n📝 Konfiguriere App.entitlements...');
  
  let entitlements = readPlist(ENTITLEMENTS_PATH);
  
  // Falls Datei nicht existiert, erstelle sie
  if (!entitlements) {
    console.log('   📄 Erstelle neue App.entitlements Datei...');
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
  console.log('✅ App.entitlements aktualisiert');
  return true;
}

/**
 * Hauptfunktion
 */
function main() {
  console.log('🔧 Eloyo iOS NFC Konfiguration');
  console.log('================================\n');

  // Prüfe iOS Plattform
  checkiOSPlatform();

  // Konfiguriere Dateien
  const infoPlistOk = configureInfoPlist();
  const entitlementsOk = configureEntitlements();

  // Zusammenfassung
  console.log('\n================================');
  if (infoPlistOk && entitlementsOk) {
    console.log('✅ iOS NFC Konfiguration abgeschlossen!\n');
    console.log('Nächste Schritte:');
    console.log('1. Öffne Xcode: npx cap open ios');
    console.log('2. Gehe zu Signing & Capabilities');
    console.log('3. Füge "Near Field Communication Tag Reading" hinzu');
    console.log('4. Stelle sicher, dass dein Provisioning Profile NFC unterstützt');
    console.log('5. Baue und teste auf einem echten Gerät (iPhone 7+)\n');
  } else {
    console.log('⚠️  Konfiguration mit Fehlern abgeschlossen');
    console.log('   Überprüfe die Dateien manuell.\n');
  }
}

// Skript ausführen
main();
