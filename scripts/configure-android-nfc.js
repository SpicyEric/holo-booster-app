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

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pfade
const ANDROID_PATH = path.join(__dirname, '..', 'android');
const MANIFEST_PATH = path.join(ANDROID_PATH, 'app', 'src', 'main', 'AndroidManifest.xml');
const BUILD_GRADLE_PATH = path.join(ANDROID_PATH, 'build.gradle');
const APP_BUILD_GRADLE_PATH = path.join(ANDROID_PATH, 'app', 'build.gradle');
const GRADLE_WRAPPER_PATH = path.join(ANDROID_PATH, 'gradle', 'wrapper', 'gradle-wrapper.properties');

// Versionen - kompatibel mit Java 21 (Gradle 8.5+ erforderlich!)
const KOTLIN_VERSION = '1.9.22';
const AGP_VERSION = '8.3.2';
const GRADLE_VERSION = '8.5';
const SETTINGS_GRADLE_PATH = path.join(ANDROID_PATH, 'settings.gradle');
const GRADLE_PROPERTIES_PATH = path.join(ANDROID_PATH, 'gradle.properties');

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
 * Konfiguriert Gradle Wrapper Version
 */
function configureGradleWrapper() {
  console.log('\n📦 Konfiguriere Gradle Wrapper...');
  
  if (!fs.existsSync(GRADLE_WRAPPER_PATH)) {
    console.log('   ⚠️  gradle-wrapper.properties nicht gefunden');
    return true; // Nicht kritisch
  }

  let wrapperProps = fs.readFileSync(GRADLE_WRAPPER_PATH, 'utf8');
  
  // Update Gradle Version
  const gradleUrlPattern = /distributionUrl=.*gradle-[\d.]+-.*\.zip/;
  const newUrl = `distributionUrl=https\\://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip`;
  
  if (gradleUrlPattern.test(wrapperProps)) {
    wrapperProps = wrapperProps.replace(gradleUrlPattern, newUrl);
    console.log(`   ✅ Gradle Version aktualisiert auf ${GRADLE_VERSION}`);
  } else {
    console.log('   ⚠️  Konnte Gradle URL nicht finden');
  }
  
  fs.writeFileSync(GRADLE_WRAPPER_PATH, wrapperProps, 'utf8');
  return true;
}

/**
 * Konfiguriert die Kotlin und AGP Versionen in build.gradle
 */
function configureGradleVersions() {
  console.log('\n📦 Konfiguriere Kotlin und AGP Versionen...');
  
  if (!fs.existsSync(BUILD_GRADLE_PATH)) {
    console.error('   ❌ build.gradle nicht gefunden!');
    return false;
  }

  let buildGradle = fs.readFileSync(BUILD_GRADLE_PATH, 'utf8');
  
  // Update Kotlin Version
  const kotlinVersionPattern = /kotlinVersion\s*=\s*['"][\d.]+['"]/;
  if (kotlinVersionPattern.test(buildGradle)) {
    buildGradle = buildGradle.replace(kotlinVersionPattern, `kotlinVersion = '${KOTLIN_VERSION}'`);
    console.log(`   ✅ Kotlin Version → ${KOTLIN_VERSION}`);
  } else {
    // Add kotlinVersion to ext block
    const extBlockPattern = /ext\s*\{/;
    if (extBlockPattern.test(buildGradle)) {
      buildGradle = buildGradle.replace(extBlockPattern, `ext {\n        kotlinVersion = '${KOTLIN_VERSION}'`);
      console.log(`   ✅ Kotlin Version ${KOTLIN_VERSION} hinzugefügt`);
    }
  }
  
  // Update AGP Version
  const agpPattern = /classpath\s*['"]com\.android\.tools\.build:gradle:[\d.]+['"]/g;
  if (agpPattern.test(buildGradle)) {
    buildGradle = buildGradle.replace(agpPattern, `classpath 'com.android.tools.build:gradle:${AGP_VERSION}'`);
    console.log(`   ✅ AGP Version → ${AGP_VERSION}`);
  }
  
  // Ensure Java 17 compatibility
  if (!buildGradle.includes('JavaVersion.VERSION_17')) {
    console.log('   ℹ️  Java Version wird in app/build.gradle konfiguriert');
  }
  
  fs.writeFileSync(BUILD_GRADLE_PATH, buildGradle, 'utf8');
  console.log('   ✅ build.gradle aktualisiert');
  return true;
}

/**
 * Konfiguriert app/build.gradle für Java 17
 */
function configureAppBuildGradle() {
  console.log('\n📦 Konfiguriere app/build.gradle...');
  
  if (!fs.existsSync(APP_BUILD_GRADLE_PATH)) {
    console.log('   ⚠️  app/build.gradle nicht gefunden');
    return true;
  }

  let appBuildGradle = fs.readFileSync(APP_BUILD_GRADLE_PATH, 'utf8');
  
  // Update Java Version to 17
  const javaVersionPattern = /JavaVersion\.VERSION_\d+/g;
  if (javaVersionPattern.test(appBuildGradle)) {
    appBuildGradle = appBuildGradle.replace(javaVersionPattern, 'JavaVersion.VERSION_17');
    console.log('   ✅ Java Version → 17');
  }
  
  // Update sourceCompatibility/targetCompatibility
  const sourceCompatPattern = /sourceCompatibility\s+JavaVersion\.VERSION_\d+/g;
  const targetCompatPattern = /targetCompatibility\s+JavaVersion\.VERSION_\d+/g;
  
  appBuildGradle = appBuildGradle.replace(sourceCompatPattern, 'sourceCompatibility JavaVersion.VERSION_17');
  appBuildGradle = appBuildGradle.replace(targetCompatPattern, 'targetCompatibility JavaVersion.VERSION_17');
  
  fs.writeFileSync(APP_BUILD_GRADLE_PATH, appBuildGradle, 'utf8');
  console.log('   ✅ app/build.gradle aktualisiert');
  return true;
}

/**
 * Konfiguriert gradle.properties für optimale Kompatibilität
 */
function configureGradleProperties() {
  console.log('\n🔧 Konfiguriere gradle.properties...');
  
  if (!fs.existsSync(GRADLE_PROPERTIES_PATH)) {
    console.log('   ⚠️  gradle.properties nicht gefunden');
    return true;
  }

  let propsContent = fs.readFileSync(GRADLE_PROPERTIES_PATH, 'utf8');
  
  // Entferne explizite Java Home falls vorhanden (lässt Android Studio entscheiden)
  propsContent = propsContent.replace(/org\.gradle\.java\.home=.*/g, '');
  
  // Füge wichtige Properties hinzu falls nicht vorhanden
  const requiredProps = [
    'android.useAndroidX=true',
    'android.enableJetifier=true',
    'org.gradle.jvmargs=-Xmx4096m -Dfile.encoding=UTF-8',
    'org.gradle.parallel=true',
    'org.gradle.caching=true',
    'kotlin.code.style=official',
    'android.nonTransitiveRClass=true'
  ];

  for (const prop of requiredProps) {
    const propKey = prop.split('=')[0];
    if (!propsContent.includes(propKey)) {
      propsContent += `\n${prop}`;
    }
  }

  fs.writeFileSync(GRADLE_PROPERTIES_PATH, propsContent.trim() + '\n', 'utf8');
  console.log('   ✅ gradle.properties konfiguriert');
  return true;
}

/**
 * Deaktiviert androidTest Tasks für NFC Plugin um Kotlin-Kompilierungsfehler zu vermeiden
 */
function disableNfcAndroidTests() {
  console.log('\n🔧 Deaktiviere androidTest für NFC Plugin...');
  
  if (!fs.existsSync(SETTINGS_GRADLE_PATH)) {
    console.log('   ⚠️  settings.gradle nicht gefunden');
    return true;
  }

  let settingsContent = fs.readFileSync(SETTINGS_GRADLE_PATH, 'utf8');
  
  // Check if already configured
  if (settingsContent.includes('Disable androidTest for capacitor-nfc')) {
    console.log('   ⏭️  androidTest Deaktivierung bereits konfiguriert');
    return true;
  }

  // Add gradle hook to disable androidTest tasks for NFC plugin - more aggressive approach
  const disableTestsBlock = `

// Disable androidTest for capacitor-nfc to avoid Kotlin compilation issues
gradle.beforeProject { project ->
    if (project.name.contains('capacitor-nfc') || project.name.contains('nfc') || project.name.contains('exxili')) {
        project.afterEvaluate {
            // Disable all test-related tasks
            project.tasks.matching { task ->
                task.name.toLowerCase().contains('test') || 
                task.name.toLowerCase().contains('androidtest') ||
                task.name.toLowerCase().contains('unittest')
            }.configureEach { task ->
                task.enabled = false
            }
            
            // Remove test source sets if possible
            try {
                if (project.hasProperty('android')) {
                    project.android.sourceSets.each { sourceSet ->
                        if (sourceSet.name.contains('test') || sourceSet.name.contains('Test')) {
                            sourceSet.java.srcDirs = []
                            sourceSet.kotlin.srcDirs = []
                        }
                    }
                }
            } catch (Exception e) {
                // Ignore if not applicable
            }
        }
    }
}
`;

  settingsContent += disableTestsBlock;
  fs.writeFileSync(SETTINGS_GRADLE_PATH, settingsContent, 'utf8');
  console.log('   ✅ androidTest Tasks für NFC Plugin deaktiviert');
  return true;
}

/**
 * Hauptfunktion
 */
function main() {
  console.log('🔧 Eloyo Android Konfiguration');
  console.log('================================');
  console.log(`Gradle: ${GRADLE_VERSION} | AGP: ${AGP_VERSION} | Kotlin: ${KOTLIN_VERSION}`);
  console.log('Kompatibel mit Java 17-21');
  console.log('================================\n');

  // Prüfe Android Plattform
  checkAndroidPlatform();

  // Konfiguriere Gradle/Kotlin/AGP Versionen
  const gradleWrapperOk = configureGradleWrapper();
  const gradleVersionsOk = configureGradleVersions();
  const gradlePropsOk = configureGradleProperties();
  const appGradleOk = configureAppBuildGradle();
  
  // Deaktiviere problematische androidTest Tasks
  const nfcTestsOk = disableNfcAndroidTests();

  // Konfiguriere NFC/Geolocation
  const techFilterOk = createNfcTechFilter();
  const manifestOk = configureAndroidManifest();

  // Zusammenfassung
  console.log('\n================================');
  const allOk = gradleWrapperOk && gradleVersionsOk && gradlePropsOk && appGradleOk && nfcTestsOk && techFilterOk && manifestOk;
  
  if (allOk) {
    console.log('✅ Android Konfiguration abgeschlossen!\n');
    console.log('Versionen:');
    console.log(`• Gradle ${GRADLE_VERSION}`);
    console.log(`• AGP ${AGP_VERSION}`);
    console.log(`• Kotlin ${KOTLIN_VERSION}`);
    console.log('• Java 17+ (kompatibel bis Java 21)\n');
    console.log('NFC & Geolocation: Aktiviert\n');
    console.log('Nächste Schritte:');
    console.log('1. In Android Studio: File → Sync Project with Gradle Files');
    console.log('2. Falls Fehler: File → Invalidate Caches → Restart');
    console.log('3. npx cap run android\n');
  } else {
    console.log('⚠️  Konfiguration mit Fehlern abgeschlossen');
    console.log('   Überprüfe die Dateien manuell.\n');
  }
}

// Skript ausführen
main();
