#!/usr/bin/env node

/**
 * Automatisches Android Konfigurationsskript
 * 
 * Dieses Skript aktualisiert automatisch:
 * - AndroidManifest.xml mit NFC Intent-Filtern
 * - AndroidManifest.xml mit Geolocation-Berechtigungen
 * 
 * Verwendung:
 * node scripts/configure-android-nfc.js
 */

const fs = require('fs');
const path = require('path');

// Pfade
const ANDROID_PATH = path.join(__dirname, '..', 'android');
const MANIFEST_PATH = path.join(ANDROID_PATH, 'app', 'src', 'main', 'AndroidManifest.xml');

// NFC Intent-Filter Konfiguration
const NFC_INTENT_FILTERS = `
        <!-- NFC Intent Filters für automatisches Öffnen -->
        <!-- NDEF Discovery - Öffnet bei NDEF formatierten Tags -->
        <intent-filter>
            <action android:name="android.nfc.action.NDEF_DISCOVERED"/>
            <category android:name="android.intent.category.DEFAULT"/>
            <data android:mimeType="application/vnd.eloyo.stamp"/>
        </intent-filter>
        
        <!-- Tech Discovery - Öffnet bei NFC-A/B Tags (häufigste Tag-Typen) -->
        <intent-filter>
            <action android:name="android.nfc.action.TECH_DISCOVERED"/>
            <category android:name="android.intent.category.DEFAULT"/>
        </intent-filter>
        
        <!-- Tag Discovery - Fallback für alle anderen NFC Tags -->
        <intent-filter>
            <action android:name="android.nfc.action.TAG_DISCOVERED"/>
            <category android:name="android.intent.category.DEFAULT"/>
        </intent-filter>
        
        <!-- Deep Link URL Scheme: eloyo://scan?chip=XXX -->
        <intent-filter>
            <action android:name="android.intent.action.VIEW"/>
            <category android:name="android.intent.category.DEFAULT"/>
            <category android:name="android.intent.category.BROWSABLE"/>
            <data android:scheme="eloyo"/>
        </intent-filter>
        
        <!-- Universal Links: https://eloyo.de/app/* -->
        <intent-filter android:autoVerify="true">
            <action android:name="android.intent.action.VIEW"/>
            <category android:name="android.intent.category.DEFAULT"/>
            <category android:name="android.intent.category.BROWSABLE"/>
            <data android:scheme="https" android:host="eloyo.de" android:pathPrefix="/app"/>
        </intent-filter>`;

const NFC_TECH_LIST = `<?xml version="1.0" encoding="utf-8"?>
<resources xmlns:xliff="urn:oasis:names:tc:xliff:document:1.2">
    <!-- NFC Tech Filter - Unterstützte Tag-Technologien -->
    <tech-list>
        <tech>android.nfc.tech.NfcA</tech>
    </tech-list>
    <tech-list>
        <tech>android.nfc.tech.NfcB</tech>
    </tech-list>
    <tech-list>
        <tech>android.nfc.tech.NfcF</tech>
    </tech-list>
    <tech-list>
        <tech>android.nfc.tech.NfcV</tech>
    </tech-list>
    <tech-list>
        <tech>android.nfc.tech.Ndef</tech>
    </tech-list>
    <tech-list>
        <tech>android.nfc.tech.NdefFormatable</tech>
    </tech-list>
    <tech-list>
        <tech>android.nfc.tech.MifareClassic</tech>
    </tech-list>
    <tech-list>
        <tech>android.nfc.tech.MifareUltralight</tech>
    </tech-list>
    <tech-list>
        <tech>android.nfc.tech.IsoDep</tech>
    </tech-list>
</resources>
`;

const META_DATA_TECH_LIST = `
        <!-- NFC Tech-List Referenz -->
        <meta-data android:name="android.nfc.action.TECH_DISCOVERED"
            android:resource="@xml/nfc_tech_filter"/>`;

/**
 * Prüft ob Android Plattform existiert
 */
function checkAndroidPlatform() {
  if (!fs.existsSync(ANDROID_PATH)) {
    console.error('❌ Android Plattform nicht gefunden!');
    console.log('   Führe zuerst aus: npx cap add android');
    process.exit(1);
  }
  console.log('✅ Android Plattform gefunden');
}

/**
 * Erstellt das xml Verzeichnis falls nicht vorhanden
 */
function ensureXmlDirectory() {
  const xmlDir = path.join(ANDROID_PATH, 'app', 'src', 'main', 'res', 'xml');
  if (!fs.existsSync(xmlDir)) {
    fs.mkdirSync(xmlDir, { recursive: true });
    console.log('   📁 xml Verzeichnis erstellt');
  }
  return xmlDir;
}

/**
 * Erstellt die NFC Tech Filter XML Datei
 */
function createNfcTechFilter() {
  console.log('\n📝 Erstelle NFC Tech Filter...');
  
  const xmlDir = ensureXmlDirectory();
  const techFilterPath = path.join(xmlDir, 'nfc_tech_filter.xml');
  
  if (fs.existsSync(techFilterPath)) {
    console.log('   ⏭️  nfc_tech_filter.xml bereits vorhanden');
    return true;
  }
  
  fs.writeFileSync(techFilterPath, NFC_TECH_LIST, 'utf8');
  console.log('   ✅ nfc_tech_filter.xml erstellt');
  return true;
}

/**
 * Fügt NFC Berechtigungen zum Manifest hinzu
 */
function addNfcPermissions(manifest) {
  // NFC Permission
  if (!manifest.includes('android.permission.NFC')) {
    const insertPos = manifest.indexOf('<application');
    if (insertPos !== -1) {
      const permission = '    <uses-permission android:name="android.permission.NFC"/>\n';
      manifest = manifest.slice(0, insertPos) + permission + manifest.slice(insertPos);
      console.log('   ✅ NFC Permission hinzugefügt');
    }
  } else {
    console.log('   ⏭️  NFC Permission bereits vorhanden');
  }

  // NFC Feature (optional, damit App auch auf Geräten ohne NFC installiert werden kann)
  if (!manifest.includes('android.hardware.nfc')) {
    const insertPos = manifest.indexOf('<application');
    if (insertPos !== -1) {
      const feature = '    <uses-feature android:name="android.hardware.nfc" android:required="false"/>\n';
      manifest = manifest.slice(0, insertPos) + feature + manifest.slice(insertPos);
      console.log('   ✅ NFC Feature (optional) hinzugefügt');
    }
  } else {
    console.log('   ⏭️  NFC Feature bereits vorhanden');
  }

  return manifest;
}

/**
 * Fügt Geolocation Berechtigungen zum Manifest hinzu
 */
function addGeolocationPermissions(manifest) {
  console.log('\n📍 Konfiguriere Geolocation Berechtigungen...');

  // ACCESS_COARSE_LOCATION
  if (!manifest.includes('android.permission.ACCESS_COARSE_LOCATION')) {
    const insertPos = manifest.indexOf('<application');
    if (insertPos !== -1) {
      const permission = '    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>\n';
      manifest = manifest.slice(0, insertPos) + permission + manifest.slice(insertPos);
      console.log('   ✅ ACCESS_COARSE_LOCATION Permission hinzugefügt');
    }
  } else {
    console.log('   ⏭️  ACCESS_COARSE_LOCATION bereits vorhanden');
  }

  // ACCESS_FINE_LOCATION
  if (!manifest.includes('android.permission.ACCESS_FINE_LOCATION')) {
    const insertPos = manifest.indexOf('<application');
    if (insertPos !== -1) {
      const permission = '    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>\n';
      manifest = manifest.slice(0, insertPos) + permission + manifest.slice(insertPos);
      console.log('   ✅ ACCESS_FINE_LOCATION Permission hinzugefügt');
    }
  } else {
    console.log('   ⏭️  ACCESS_FINE_LOCATION bereits vorhanden');
  }

  // Location Feature (optional)
  if (!manifest.includes('android.hardware.location.gps')) {
    const insertPos = manifest.indexOf('<application');
    if (insertPos !== -1) {
      const feature = '    <uses-feature android:name="android.hardware.location.gps" android:required="false"/>\n';
      manifest = manifest.slice(0, insertPos) + feature + manifest.slice(insertPos);
      console.log('   ✅ GPS Feature (optional) hinzugefügt');
    }
  } else {
    console.log('   ⏭️  GPS Feature bereits vorhanden');
  }

  return manifest;
}

/**
 * Fügt Intent-Filter zur MainActivity hinzu
 */
function addIntentFilters(manifest) {
  // Prüfe ob Intent-Filter bereits vorhanden
  if (manifest.includes('android.nfc.action.NDEF_DISCOVERED')) {
    console.log('   ⏭️  NFC Intent-Filter bereits vorhanden');
    return manifest;
  }

  // Finde die MainActivity und füge Intent-Filter ein
  const mainActivityPattern = /<activity[^>]*android:name="\.MainActivity"[^>]*>/;
  const match = manifest.match(mainActivityPattern);
  
  if (!match) {
    console.error('   ❌ MainActivity nicht gefunden!');
    return manifest;
  }

  // Finde das Ende des activity-Tags oder den Beginn des nächsten Elements
  const activityStart = manifest.indexOf(match[0]);
  const activityTagEnd = manifest.indexOf('>', activityStart) + 1;
  
  // Prüfe ob es ein selbstschließendes Tag ist
  if (manifest.substring(activityStart, activityTagEnd).includes('/>')) {
    // Selbstschließendes Tag - muss umgewandelt werden
    const openTag = manifest.substring(activityStart, activityTagEnd).replace('/>', '>');
    manifest = manifest.substring(0, activityStart) + 
               openTag + 
               NFC_INTENT_FILTERS + 
               META_DATA_TECH_LIST +
               '\n        </activity>' +
               manifest.substring(activityTagEnd);
    console.log('   ✅ NFC Intent-Filter hinzugefügt (selbstschließendes Tag konvertiert)');
  } else {
    // Normales Tag - füge vor </activity> ein
    const activityEnd = manifest.indexOf('</activity>', activityStart);
    if (activityEnd !== -1) {
      manifest = manifest.substring(0, activityEnd) + 
                 NFC_INTENT_FILTERS + 
                 META_DATA_TECH_LIST +
                 '\n        ' +
                 manifest.substring(activityEnd);
      console.log('   ✅ NFC Intent-Filter hinzugefügt');
    }
  }

  return manifest;
}

/**
 * Konfiguriert AndroidManifest.xml
 */
function configureAndroidManifest() {
  console.log('\n📝 Konfiguriere AndroidManifest.xml...');
  
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('❌ AndroidManifest.xml nicht gefunden!');
    return false;
  }

  let manifest = fs.readFileSync(MANIFEST_PATH, 'utf8');
  
  // NFC Berechtigungen
  manifest = addNfcPermissions(manifest);
  
  // Geolocation Berechtigungen
  manifest = addGeolocationPermissions(manifest);
  
  // Intent-Filter
  manifest = addIntentFilters(manifest);
  
  // Speichern
  fs.writeFileSync(MANIFEST_PATH, manifest, 'utf8');
  console.log('✅ AndroidManifest.xml aktualisiert');
  return true;
}

/**
 * Hauptfunktion
 */
function main() {
  console.log('🔧 Eloyo Android Konfiguration (NFC + Geolocation)');
  console.log('==================================================\n');

  // Prüfe Android Plattform
  checkAndroidPlatform();

  // Konfiguriere Dateien
  const techFilterOk = createNfcTechFilter();
  const manifestOk = configureAndroidManifest();

  // Zusammenfassung
  console.log('\n==================================================');
  if (techFilterOk && manifestOk) {
    console.log('✅ Android Konfiguration abgeschlossen!\n');
    console.log('NFC Features:');
    console.log('• Die App öffnet sich automatisch bei NFC-Tag Scans');
    console.log('• NDEF, Tech, und Tag Discovery aktiviert\n');
    console.log('Geolocation Features:');
    console.log('• ACCESS_COARSE_LOCATION aktiviert');
    console.log('• ACCESS_FINE_LOCATION aktiviert');
    console.log('• App fragt nach Standort-Berechtigung\n');
    console.log('Nächste Schritte:');
    console.log('1. npx cap sync android');
    console.log('2. npx cap run android');
    console.log('3. Teste NFC und Standort-Features\n');
  } else {
    console.log('⚠️  Konfiguration mit Fehlern abgeschlossen');
    console.log('   Überprüfe die Dateien manuell.\n');
  }
}

// Skript ausführen
main();
