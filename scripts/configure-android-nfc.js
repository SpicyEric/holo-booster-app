#!/usr/bin/env node

/**
 * Automatisches Android Konfigurationsskript
 * 
 * Dieses Skript aktualisiert automatisch:
 * - AndroidManifest.xml mit NFC Intent-Filtern
 * - AndroidManifest.xml mit Geolocation-Berechtigungen
 * - Patcht NFC-Plugin für Kotlin-Kompatibilität
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
const PROJECT_ROOT = path.join(__dirname, '..');
const ANDROID_PATH = path.join(PROJECT_ROOT, 'android');
const NODE_MODULES_PATH = path.join(PROJECT_ROOT, 'node_modules');
const MANIFEST_PATH = path.join(ANDROID_PATH, 'app', 'src', 'main', 'AndroidManifest.xml');
const BUILD_GRADLE_PATH = path.join(ANDROID_PATH, 'build.gradle');
const APP_BUILD_GRADLE_PATH = path.join(ANDROID_PATH, 'app', 'build.gradle');
const GRADLE_WRAPPER_PATH = path.join(ANDROID_PATH, 'gradle', 'wrapper', 'gradle-wrapper.properties');
const SETTINGS_GRADLE_PATH = path.join(ANDROID_PATH, 'settings.gradle');
const GRADLE_PROPERTIES_PATH = path.join(ANDROID_PATH, 'gradle.properties');

// ============================================
// WICHTIG: Alle Versionen müssen zusammenpassen!
// ============================================
const KOTLIN_VERSION = '1.9.23';  // Neueste stabile Version
const AGP_VERSION = '8.2.2';      // Kompatibel mit Gradle 8.6
const GRADLE_VERSION = '8.6';     // Unterstützt Java 17-21

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
    return true;
  }

  let wrapperProps = fs.readFileSync(GRADLE_WRAPPER_PATH, 'utf8');
  
  // Update Gradle Version - use -all for better IDE support
  const gradleUrlPattern = /distributionUrl=.*gradle-[\d.]+-.*\.zip/;
  const newUrl = `distributionUrl=https\\://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-all.zip`;
  
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
 * Konfiguriert die Kotlin und AGP Versionen in build.gradle (Root)
 */
function configureGradleVersions() {
  console.log('\n📦 Konfiguriere Root build.gradle...');
  
  if (!fs.existsSync(BUILD_GRADLE_PATH)) {
    console.error('   ❌ build.gradle nicht gefunden!');
    return false;
  }

  let buildGradle = fs.readFileSync(BUILD_GRADLE_PATH, 'utf8');
  
  // Update alle Kotlin Versionen (verschiedene Patterns)
  const kotlinPatterns = [
    /kotlinVersion\s*=\s*['"][\d.]+['"]/g,
    /kotlin_version\s*=\s*['"][\d.]+['"]/g,
    /ext\.kotlinVersion\s*=\s*['"][\d.]+['"]/g,
    /ext\.kotlin_version\s*=\s*['"][\d.]+['"]/g,
  ];
  
  for (const pattern of kotlinPatterns) {
    if (pattern.test(buildGradle)) {
      buildGradle = buildGradle.replace(pattern, `kotlinVersion = '${KOTLIN_VERSION}'`);
    }
  }
  
  // Update Kotlin Gradle Plugin in classpath
  const kotlinPluginPattern = /classpath\s*['"](org\.jetbrains\.kotlin:kotlin-gradle-plugin):[\d.]+['"]/g;
  buildGradle = buildGradle.replace(kotlinPluginPattern, `classpath '$1:${KOTLIN_VERSION}'`);
  
  // Stellen sicher, dass kotlinVersion im ext Block ist
  if (!buildGradle.includes('kotlinVersion')) {
    const extBlockPattern = /ext\s*\{/;
    if (extBlockPattern.test(buildGradle)) {
      buildGradle = buildGradle.replace(extBlockPattern, `ext {\n        kotlinVersion = '${KOTLIN_VERSION}'`);
      console.log(`   ✅ Kotlin Version ${KOTLIN_VERSION} zu ext Block hinzugefügt`);
    }
  } else {
    console.log(`   ✅ Kotlin Version → ${KOTLIN_VERSION}`);
  }
  
  // Update AGP Version
  const agpPattern = /classpath\s*['"]com\.android\.tools\.build:gradle:[\d.]+['"]/g;
  buildGradle = buildGradle.replace(agpPattern, `classpath 'com.android.tools.build:gradle:${AGP_VERSION}'`);
  console.log(`   ✅ AGP Version → ${AGP_VERSION}`);
  
  fs.writeFileSync(BUILD_GRADLE_PATH, buildGradle, 'utf8');
  console.log('   ✅ Root build.gradle aktualisiert');
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
  appBuildGradle = appBuildGradle.replace(javaVersionPattern, 'JavaVersion.VERSION_17');
  console.log('   ✅ Java Version → 17');
  
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
  
  // Entferne explizite Java Home (lässt Android Studio entscheiden)
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
 * KRITISCH: Patcht alle NFC Plugin build.gradle Dateien im node_modules
 * Das ist der Hauptfix für den Kotlin-Versionskonflikt!
 */
function patchNfcPluginBuildGradle() {
  console.log('\n🔧 Patche NFC Plugin build.gradle Dateien...');
  
  // Alle möglichen NFC Plugin Pfade
  const nfcPluginPaths = [
    path.join(NODE_MODULES_PATH, '@exxili', 'capacitor-nfc', 'android', 'build.gradle'),
    path.join(NODE_MODULES_PATH, 'capacitor-nfc', 'android', 'build.gradle'),
    path.join(NODE_MODULES_PATH, '@capacitor-community', 'nfc', 'android', 'build.gradle'),
    path.join(NODE_MODULES_PATH, '@niceugenius', 'capacitor-nfc', 'android', 'build.gradle'),
  ];

  let patchedCount = 0;

  for (const pluginPath of nfcPluginPaths) {
    if (fs.existsSync(pluginPath)) {
      console.log(`   📝 Gefunden: ${path.relative(PROJECT_ROOT, pluginPath)}`);
      
      let content = fs.readFileSync(pluginPath, 'utf8');
      let modified = false;

      // 1. Ersetze alle alten Kotlin Versionen
      const kotlinVersionPatterns = [
        /kotlin_version\s*=\s*['"][\d.]+['"]/g,
        /kotlinVersion\s*=\s*['"][\d.]+['"]/g,
        /ext\.kotlin_version\s*=\s*['"][\d.]+['"]/g,
      ];
      
      for (const pattern of kotlinVersionPatterns) {
        if (pattern.test(content)) {
          content = content.replace(pattern, `kotlin_version = '${KOTLIN_VERSION}'`);
          modified = true;
        }
      }

      // 2. Ersetze Kotlin Plugin Versionen in classpath
      const kotlinPluginPattern = /classpath\s*['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin:[\d.]+['"]/g;
      if (kotlinPluginPattern.test(content)) {
        content = content.replace(kotlinPluginPattern, `classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:${KOTLIN_VERSION}'`);
        modified = true;
      }

      // 3. Update kotlin-stdlib
      const stdlibPattern = /implementation\s*['"]org\.jetbrains\.kotlin:kotlin-stdlib(-jdk\d*)?:[\d.]+['"]/g;
      if (stdlibPattern.test(content)) {
        content = content.replace(stdlibPattern, `implementation 'org.jetbrains.kotlin:kotlin-stdlib:${KOTLIN_VERSION}'`);
        modified = true;
      }

      // 4. Füge afterEvaluate Block hinzu um Tests zu deaktivieren
      if (!content.includes('// Disable androidTest')) {
        const afterEvaluateBlock = `

// Disable androidTest tasks to avoid Kotlin compilation issues
afterEvaluate {
    tasks.matching { it.name.toLowerCase().contains('androidtest') }.configureEach {
        enabled = false
    }
}
`;
        content += afterEvaluateBlock;
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(pluginPath, content, 'utf8');
        console.log(`   ✅ Gepatcht: Kotlin → ${KOTLIN_VERSION}`);
        patchedCount++;
      } else {
        console.log(`   ⏭️  Bereits aktuell`);
      }
    }
  }

  if (patchedCount === 0) {
    console.log('   ⚠️  Keine NFC Plugin build.gradle gefunden');
    console.log('   → NFC Plugin möglicherweise nicht installiert?');
  }

  return true;
}

/**
 * Fügt Kotlin Version Override in settings.gradle hinzu
 */
function configureSettingsGradle() {
  console.log('\n🔧 Konfiguriere settings.gradle...');
  
  if (!fs.existsSync(SETTINGS_GRADLE_PATH)) {
    console.log('   ⚠️  settings.gradle nicht gefunden');
    return true;
  }

  let settingsContent = fs.readFileSync(SETTINGS_GRADLE_PATH, 'utf8');
  
  // Check if already configured
  if (settingsContent.includes('Force Kotlin version')) {
    console.log('   ⏭️  Kotlin Override bereits konfiguriert');
    return true;
  }

  // Füge Plugin Block hinzu, der Kotlin Version für alle Subprojekte forciert
  const kotlinOverrideBlock = `

// Force Kotlin version for all subprojects (including NFC plugin)
gradle.beforeProject { project ->
    project.buildscript {
        repositories {
            google()
            mavenCentral()
        }
    }
    
    project.afterEvaluate {
        // Force kotlin version in all plugins
        project.plugins.withId('org.jetbrains.kotlin.android') {
            project.tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
                kotlinOptions {
                    jvmTarget = '17'
                }
            }
        }
        
        // Disable all androidTest tasks for NFC-related projects
        if (project.name.toLowerCase().contains('nfc') || 
            project.name.toLowerCase().contains('exxili') ||
            project.name.toLowerCase().contains('capacitor-nfc')) {
            project.tasks.matching { task ->
                task.name.toLowerCase().contains('test')
            }.configureEach { task ->
                task.enabled = false
            }
        }
    }
}
`;

  settingsContent += kotlinOverrideBlock;
  fs.writeFileSync(SETTINGS_GRADLE_PATH, settingsContent, 'utf8');
  console.log('   ✅ Kotlin Version Override hinzugefügt');
  return true;
}

/**
 * Hauptfunktion
 */
function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║        🔧 Eloyo Android Konfiguration              ║');
  console.log('╠═══════════════════════════════════════════════════╣');
  console.log(`║  Gradle:  ${GRADLE_VERSION.padEnd(10)} (min für Java 17-21)      ║`);
  console.log(`║  AGP:     ${AGP_VERSION.padEnd(10)} (Android Gradle Plugin)    ║`);
  console.log(`║  Kotlin:  ${KOTLIN_VERSION.padEnd(10)} (neueste stabile)         ║`);
  console.log(`║  Java:    17         (Ziel-Version)               ║`);
  console.log('╚═══════════════════════════════════════════════════╝\n');

  // Prüfe Android Plattform
  checkAndroidPlatform();

  // === SCHRITT 1: Gradle/Kotlin/AGP Versionen ===
  console.log('\n═══ SCHRITT 1: Gradle Konfiguration ═══');
  const gradleWrapperOk = configureGradleWrapper();
  const gradleVersionsOk = configureGradleVersions();
  const gradlePropsOk = configureGradleProperties();
  const appGradleOk = configureAppBuildGradle();
  const settingsOk = configureSettingsGradle();

  // === SCHRITT 2: NFC Plugin patchen ===
  console.log('\n═══ SCHRITT 2: NFC Plugin Patch ═══');
  const nfcPatchOk = patchNfcPluginBuildGradle();

  // === SCHRITT 3: Manifest & Tech Filter ===
  console.log('\n═══ SCHRITT 3: Android Manifest ═══');
  const techFilterOk = createNfcTechFilter();
  const manifestOk = configureAndroidManifest();

  // Zusammenfassung
  console.log('\n╔═══════════════════════════════════════════════════╗');
  const allOk = gradleWrapperOk && gradleVersionsOk && gradlePropsOk && 
                appGradleOk && settingsOk && nfcPatchOk && techFilterOk && manifestOk;
  
  if (allOk) {
    console.log('║  ✅ Android Konfiguration ERFOLGREICH!             ║');
    console.log('╠═══════════════════════════════════════════════════╣');
    console.log('║  Nächste Schritte:                                 ║');
    console.log('║                                                    ║');
    console.log('║  1. cd android                                     ║');
    console.log('║  2. ./gradlew clean                                ║');
    console.log('║  3. In Android Studio:                             ║');
    console.log('║     File → Invalidate Caches → Restart             ║');
    console.log('║  4. File → Sync Project with Gradle Files          ║');
    console.log('║  5. Build → Make Project                           ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');
  } else {
    console.log('║  ⚠️  Konfiguration mit Warnungen abgeschlossen      ║');
    console.log('║  Überprüfe die Dateien manuell.                    ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');
  }
}

// Skript ausführen
main();
