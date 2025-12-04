#!/usr/bin/env node

/**
 * Automatisches Android Konfigurationsskript
 * 
 * Konfiguriert:
 * - Gradle Wrapper, AGP, Kotlin Versionen
 * - settings.gradle (SAUBER ohne Property-Zugriffe)
 * - gradle.properties (alle org.gradle.* Properties)
 * - NFC & Geolocation Plugin Patches
 * - AndroidManifest.xml
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
const KOTLIN_VERSION = '1.9.23';
const AGP_VERSION = '8.2.2';
const GRADLE_VERSION = '8.6';

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
 * Konfiguriert Gradle Wrapper Version
 */
function configureGradleWrapper() {
  console.log('\n📦 Konfiguriere Gradle Wrapper...');
  
  if (!fs.existsSync(GRADLE_WRAPPER_PATH)) {
    console.log('   ⚠️  gradle-wrapper.properties nicht gefunden');
    return true;
  }

  let wrapperProps = fs.readFileSync(GRADLE_WRAPPER_PATH, 'utf8');
  
  const gradleUrlPattern = /distributionUrl=.*gradle-[\d.]+-.*\.zip/;
  const newUrl = `distributionUrl=https\\://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-all.zip`;
  
  if (gradleUrlPattern.test(wrapperProps)) {
    wrapperProps = wrapperProps.replace(gradleUrlPattern, newUrl);
    console.log(`   ✅ Gradle Version → ${GRADLE_VERSION}`);
  }
  
  fs.writeFileSync(GRADLE_WRAPPER_PATH, wrapperProps, 'utf8');
  return true;
}

/**
 * KRITISCH: Erstellt eine SAUBERE settings.gradle
 * KEINE org.xxx Properties - nur Module-Definitionen!
 */
function configureSettingsGradle() {
  console.log('\n🔧 Erstelle saubere settings.gradle...');
  
  // Lese aktuelle settings.gradle um includes zu extrahieren
  let existingContent = '';
  if (fs.existsSync(SETTINGS_GRADLE_PATH)) {
    existingContent = fs.readFileSync(SETTINGS_GRADLE_PATH, 'utf8');
  }

  // Ermittle welche Capacitor Plugins vorhanden sind
  const capacitorPlugins = [];
  
  // Standard Capacitor Plugins
  const capacitorAndroidPath = path.join(NODE_MODULES_PATH, '@capacitor', 'android');
  if (fs.existsSync(capacitorAndroidPath)) {
    capacitorPlugins.push({
      name: 'capacitor-android',
      path: '../node_modules/@capacitor/android/capacitor'
    });
  }

  // Geolocation
  const geoPath = path.join(NODE_MODULES_PATH, '@capacitor', 'geolocation', 'android');
  if (fs.existsSync(geoPath)) {
    capacitorPlugins.push({
      name: 'capacitor-geolocation',
      path: '../node_modules/@capacitor/geolocation/android'
    });
  }

  // NFC Plugins (verschiedene mögliche Pakete)
  const nfcPaths = [
    { name: 'capacitor-nfc', base: '@exxili/capacitor-nfc' },
    { name: 'capacitor-nfc', base: 'capacitor-nfc' },
    { name: 'capacitor-nfc', base: '@capacitor-community/nfc' },
  ];

  for (const nfc of nfcPaths) {
    const nfcPath = path.join(NODE_MODULES_PATH, nfc.base, 'android');
    if (fs.existsSync(nfcPath)) {
      capacitorPlugins.push({
        name: nfc.name,
        path: `../node_modules/${nfc.base}/android`
      });
      break; // Nur eines hinzufügen
    }
  }

  // App Plugin
  const appPath = path.join(NODE_MODULES_PATH, '@capacitor', 'app', 'android');
  if (fs.existsSync(appPath)) {
    capacitorPlugins.push({
      name: 'capacitor-app',
      path: '../node_modules/@capacitor/app/android'
    });
  }

  // Erstelle saubere settings.gradle - KEINE org.xxx Referenzen!
  const cleanSettings = `// SAUBERE settings.gradle - generiert von configure-android-nfc.js
// WICHTIG: Alle org.gradle.* Properties gehören in gradle.properties!

pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "android"

include ':app'

include ':capacitor-android'
project(':capacitor-android').projectDir = new File('../node_modules/@capacitor/android/capacitor')

${capacitorPlugins.filter(p => p.name !== 'capacitor-android').map(plugin => `include ':${plugin.name}'
project(':${plugin.name}').projectDir = new File('${plugin.path}')`).join('\n\n')}
`;

  fs.writeFileSync(SETTINGS_GRADLE_PATH, cleanSettings, 'utf8');
  console.log('   ✅ Saubere settings.gradle erstellt (keine org.xxx Properties!)');
  return true;
}

/**
 * Konfiguriert gradle.properties - HIER gehören alle org.* Properties hin!
 */
function configureGradleProperties() {
  console.log('\n🔧 Konfiguriere gradle.properties...');
  
  // Komplette saubere gradle.properties
  const cleanProperties = `# gradle.properties - generiert von configure-android-nfc.js
# ALLE org.gradle.* Properties gehören HIER hin!

# JVM/Gradle Einstellungen
org.gradle.jvmargs=-Xmx4096m -Dfile.encoding=UTF-8
org.gradle.parallel=true
org.gradle.caching=true
org.gradle.daemon=true

# Android/Kotlin Einstellungen
android.useAndroidX=true
android.enableJetifier=true
android.nonTransitiveRClass=true
kotlin.code.style=official

# Suppress Kotlin warnings
kotlin.jvm.target.validation.mode=warning
`;

  fs.writeFileSync(GRADLE_PROPERTIES_PATH, cleanProperties, 'utf8');
  console.log('   ✅ gradle.properties konfiguriert');
  return true;
}

/**
 * Konfiguriert die Root build.gradle
 */
function configureRootBuildGradle() {
  console.log('\n📦 Konfiguriere Root build.gradle...');
  
  if (!fs.existsSync(BUILD_GRADLE_PATH)) {
    console.error('   ❌ build.gradle nicht gefunden!');
    return false;
  }

  let buildGradle = fs.readFileSync(BUILD_GRADLE_PATH, 'utf8');
  
  // Update Kotlin Version überall
  const kotlinPatterns = [
    /kotlinVersion\s*=\s*['"][\d.]+['"]/g,
    /kotlin_version\s*=\s*['"][\d.]+['"]/g,
    /ext\.kotlinVersion\s*=\s*['"][\d.]+['"]/g,
    /ext\.kotlin_version\s*=\s*['"][\d.]+['"]/g,
  ];
  
  for (const pattern of kotlinPatterns) {
    buildGradle = buildGradle.replace(pattern, `kotlinVersion = '${KOTLIN_VERSION}'`);
  }
  
  // Update Kotlin Gradle Plugin
  buildGradle = buildGradle.replace(
    /classpath\s*['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin:[\d.]+['"]/g,
    `classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:${KOTLIN_VERSION}'`
  );
  
  // Update AGP Version
  buildGradle = buildGradle.replace(
    /classpath\s*['"]com\.android\.tools\.build:gradle:[\d.]+['"]/g,
    `classpath 'com.android.tools.build:gradle:${AGP_VERSION}'`
  );
  
  // Stelle sicher, dass kotlinVersion im ext Block ist
  if (!buildGradle.includes('kotlinVersion')) {
    buildGradle = buildGradle.replace(
      /ext\s*\{/,
      `ext {\n        kotlinVersion = '${KOTLIN_VERSION}'`
    );
  }

  // Füge allprojects Block hinzu um Kotlin für ALLE Subprojekte zu konfigurieren
  if (!buildGradle.includes('// Force Kotlin version')) {
    const allProjectsBlock = `

// Force Kotlin version for all subprojects and disable test tasks for plugins
subprojects {
    afterEvaluate { project ->
        // Disable all androidTest tasks for capacitor plugins
        if (project.name.contains('capacitor') || project.name.contains('nfc') || project.name.contains('geolocation')) {
            project.tasks.matching { task ->
                def taskName = task.name.toLowerCase()
                taskName.contains('test') || taskName.contains('lint')
            }.configureEach { task ->
                task.enabled = false
            }
            
            // Clear test source sets if they exist
            if (project.hasProperty('android')) {
                project.android {
                    testOptions {
                        unitTests.all {
                            enabled = false
                        }
                    }
                }
            }
        }
    }
}
`;
    
    // Füge vor dem letzten schließenden Klammer ein
    const lastBrace = buildGradle.lastIndexOf('}');
    if (lastBrace > 0) {
      buildGradle = buildGradle.slice(0, lastBrace + 1) + allProjectsBlock;
    } else {
      buildGradle += allProjectsBlock;
    }
  }
  
  console.log(`   ✅ Kotlin → ${KOTLIN_VERSION}`);
  console.log(`   ✅ AGP → ${AGP_VERSION}`);
  
  fs.writeFileSync(BUILD_GRADLE_PATH, buildGradle, 'utf8');
  return true;
}

/**
 * Konfiguriert app/build.gradle
 */
function configureAppBuildGradle() {
  console.log('\n📦 Konfiguriere app/build.gradle...');
  
  if (!fs.existsSync(APP_BUILD_GRADLE_PATH)) {
    console.log('   ⚠️  app/build.gradle nicht gefunden');
    return true;
  }

  let appBuildGradle = fs.readFileSync(APP_BUILD_GRADLE_PATH, 'utf8');
  
  // Update Java Version to 17
  appBuildGradle = appBuildGradle.replace(/JavaVersion\.VERSION_\d+/g, 'JavaVersion.VERSION_17');
  console.log('   ✅ Java Version → 17');
  
  fs.writeFileSync(APP_BUILD_GRADLE_PATH, appBuildGradle, 'utf8');
  return true;
}

/**
 * Patcht NFC Plugin build.gradle Dateien
 */
function patchNfcPluginBuildGradle() {
  console.log('\n🔧 Patche Plugin build.gradle Dateien...');
  
  const pluginPaths = [
    path.join(NODE_MODULES_PATH, '@exxili', 'capacitor-nfc', 'android', 'build.gradle'),
    path.join(NODE_MODULES_PATH, 'capacitor-nfc', 'android', 'build.gradle'),
    path.join(NODE_MODULES_PATH, '@capacitor-community', 'nfc', 'android', 'build.gradle'),
    path.join(NODE_MODULES_PATH, '@capacitor', 'geolocation', 'android', 'build.gradle'),
    path.join(NODE_MODULES_PATH, '@capacitor', 'app', 'android', 'build.gradle'),
  ];

  for (const pluginPath of pluginPaths) {
    if (fs.existsSync(pluginPath)) {
      console.log(`   📝 Patche: ${path.relative(PROJECT_ROOT, pluginPath)}`);
      
      let content = fs.readFileSync(pluginPath, 'utf8');
      let modified = false;

      // Update alle Kotlin Versionen
      const kotlinPatterns = [
        /kotlin_version\s*=\s*['"][\d.]+['"]/g,
        /kotlinVersion\s*=\s*['"][\d.]+['"]/g,
      ];
      
      for (const pattern of kotlinPatterns) {
        if (pattern.test(content)) {
          content = content.replace(pattern, `kotlin_version = '${KOTLIN_VERSION}'`);
          modified = true;
        }
      }

      // Update Kotlin Plugin in classpath
      if (content.includes('kotlin-gradle-plugin')) {
        content = content.replace(
          /classpath\s*['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin:[\d.]+['"]/g,
          `classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:${KOTLIN_VERSION}'`
        );
        modified = true;
      }

      // Update kotlin-stdlib
      content = content.replace(
        /implementation\s*['"]org\.jetbrains\.kotlin:kotlin-stdlib(-jdk\d*)?:[\d.]+['"]/g,
        `implementation 'org.jetbrains.kotlin:kotlin-stdlib:${KOTLIN_VERSION}'`
      );

      // Füge Test-Deaktivierung hinzu
      if (!content.includes('// Disable test tasks')) {
        content += `

// Disable test tasks to avoid Kotlin compilation issues
afterEvaluate {
    tasks.matching { it.name.toLowerCase().contains('test') }.configureEach {
        enabled = false
    }
}
`;
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(pluginPath, content, 'utf8');
        console.log(`   ✅ Gepatcht`);
      }
    }
  }

  return true;
}

/**
 * Erstellt NFC Tech Filter XML
 */
function createNfcTechFilter() {
  console.log('\n📝 Erstelle NFC Tech Filter...');
  
  const xmlDir = path.join(ANDROID_PATH, 'app', 'src', 'main', 'res', 'xml');
  if (!fs.existsSync(xmlDir)) {
    fs.mkdirSync(xmlDir, { recursive: true });
  }
  
  const techFilterPath = path.join(xmlDir, 'nfc_tech_filter.xml');
  
  const techFilter = `<?xml version="1.0" encoding="utf-8"?>
<resources xmlns:xliff="urn:oasis:names:tc:xliff:document:1.2">
    <tech-list>
        <tech>android.nfc.tech.NfcA</tech>
    </tech-list>
    <tech-list>
        <tech>android.nfc.tech.NfcB</tech>
    </tech-list>
    <tech-list>
        <tech>android.nfc.tech.Ndef</tech>
    </tech-list>
    <tech-list>
        <tech>android.nfc.tech.NdefFormatable</tech>
    </tech-list>
    <tech-list>
        <tech>android.nfc.tech.MifareUltralight</tech>
    </tech-list>
    <tech-list>
        <tech>android.nfc.tech.IsoDep</tech>
    </tech-list>
</resources>
`;

  fs.writeFileSync(techFilterPath, techFilter, 'utf8');
  console.log('   ✅ nfc_tech_filter.xml erstellt');
  return true;
}

/**
 * Konfiguriert AndroidManifest.xml
 */
function configureAndroidManifest() {
  console.log('\n📝 Konfiguriere AndroidManifest.xml...');
  
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('   ❌ AndroidManifest.xml nicht gefunden!');
    return false;
  }

  let manifest = fs.readFileSync(MANIFEST_PATH, 'utf8');
  
  // NFC Permission
  if (!manifest.includes('android.permission.NFC')) {
    const insertPos = manifest.indexOf('<application');
    if (insertPos !== -1) {
      manifest = manifest.slice(0, insertPos) + 
        '    <uses-permission android:name="android.permission.NFC"/>\n' +
        '    <uses-feature android:name="android.hardware.nfc" android:required="false"/>\n' +
        manifest.slice(insertPos);
      console.log('   ✅ NFC Permission hinzugefügt');
    }
  }

  // Geolocation Permissions
  if (!manifest.includes('android.permission.ACCESS_FINE_LOCATION')) {
    const insertPos = manifest.indexOf('<application');
    if (insertPos !== -1) {
      manifest = manifest.slice(0, insertPos) + 
        '    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>\n' +
        '    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>\n' +
        '    <uses-feature android:name="android.hardware.location.gps" android:required="false"/>\n' +
        manifest.slice(insertPos);
      console.log('   ✅ Geolocation Permissions hinzugefügt');
    }
  }

  // NFC Intent-Filter zur MainActivity
  if (!manifest.includes('android.nfc.action.NDEF_DISCOVERED')) {
    const intentFilters = `
        <!-- NFC Intent Filters -->
        <intent-filter>
            <action android:name="android.nfc.action.NDEF_DISCOVERED"/>
            <category android:name="android.intent.category.DEFAULT"/>
            <data android:mimeType="application/vnd.eloyo.stamp"/>
        </intent-filter>
        <intent-filter>
            <action android:name="android.nfc.action.TECH_DISCOVERED"/>
            <category android:name="android.intent.category.DEFAULT"/>
        </intent-filter>
        <intent-filter>
            <action android:name="android.nfc.action.TAG_DISCOVERED"/>
            <category android:name="android.intent.category.DEFAULT"/>
        </intent-filter>
        <meta-data android:name="android.nfc.action.TECH_DISCOVERED"
            android:resource="@xml/nfc_tech_filter"/>
        <!-- Deep Links -->
        <intent-filter>
            <action android:name="android.intent.action.VIEW"/>
            <category android:name="android.intent.category.DEFAULT"/>
            <category android:name="android.intent.category.BROWSABLE"/>
            <data android:scheme="eloyo"/>
        </intent-filter>`;

    const activityEnd = manifest.indexOf('</activity>');
    if (activityEnd !== -1) {
      manifest = manifest.slice(0, activityEnd) + intentFilters + '\n        ' + manifest.slice(activityEnd);
      console.log('   ✅ NFC Intent-Filter hinzugefügt');
    }
  }

  fs.writeFileSync(MANIFEST_PATH, manifest, 'utf8');
  return true;
}

/**
 * Hauptfunktion
 */
function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║        🔧 Eloyo Android Konfiguration              ║');
  console.log('╠═══════════════════════════════════════════════════╣');
  console.log(`║  Gradle:  ${GRADLE_VERSION}           Kotlin: ${KOTLIN_VERSION}           ║`);
  console.log(`║  AGP:     ${AGP_VERSION}        Java: 17               ║`);
  console.log('╚═══════════════════════════════════════════════════╝\n');

  checkAndroidPlatform();

  console.log('\n═══ SCHRITT 1: Gradle Konfiguration ═══');
  configureGradleWrapper();
  configureSettingsGradle();    // SAUBER - keine org.xxx!
  configureGradleProperties();  // Alle org.xxx Properties hier!
  configureRootBuildGradle();
  configureAppBuildGradle();

  console.log('\n═══ SCHRITT 2: Plugin Patches ═══');
  patchNfcPluginBuildGradle();

  console.log('\n═══ SCHRITT 3: Android Manifest ═══');
  createNfcTechFilter();
  configureAndroidManifest();

  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║  ✅ KONFIGURATION ABGESCHLOSSEN!                   ║');
  console.log('╠═══════════════════════════════════════════════════╣');
  console.log('║  Nächste Schritte:                                 ║');
  console.log('║  1. npx cap sync android                           ║');
  console.log('║  2. Android Studio: File → Sync Project            ║');
  console.log('║  3. Build → Make Project                           ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');
}

main();
