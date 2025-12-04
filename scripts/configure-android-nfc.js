#!/usr/bin/env node

/**
 * Automatisches Android Konfigurationsskript - KOMPLETT ÜBERARBEITET
 * 
 * BEHEBT:
 * - "Could not get unknown property 'org'" in settings.gradle
 * - "Build was configured to prefer settings repositories" Konflikte
 * - flatDir Repository Fehler
 * - Kotlin/AGP Versionskonflikte
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
 * - KEINE org.xxx Properties
 * - KEINE gradle.beforeProject Blöcke
 * - NUR: pluginManagement, dependencyResolutionManagement, includes
 */
function configureSettingsGradle() {
  console.log('\n🔧 Erstelle saubere settings.gradle...');
  
  // Ermittle welche Capacitor Plugins vorhanden sind
  const capacitorPlugins = [];
  
  // Standard Capacitor Android
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

  // NFC Plugins
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
      break;
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

  // =====================================================
  // SAUBERE settings.gradle
  // KEINE org.xxx, KEINE gradle.beforeProject, KEINE ext
  // =====================================================
  const cleanSettings = `// settings.gradle - SAUBER generiert von configure-android-nfc.js
// WICHTIG: 
// - Alle org.gradle.* Properties gehören in gradle.properties!
// - Alle Repositories werden HIER zentral verwaltet (FAIL_ON_PROJECT_REPOS)
// - Keine Repositories in build.gradle Dateien!

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
  console.log('   ✅ Saubere settings.gradle erstellt');
  console.log('   ✅ Repositories nur in dependencyResolutionManagement');
  console.log('   ✅ Keine org.xxx Properties (gehören in gradle.properties)');
  return true;
}

/**
 * Konfiguriert gradle.properties - HIER gehören alle org.* Properties hin!
 */
function configureGradleProperties() {
  console.log('\n🔧 Konfiguriere gradle.properties...');
  
  const cleanProperties = `# gradle.properties - generiert von configure-android-nfc.js
# ALLE org.gradle.* Properties gehören HIER hin, NICHT in settings.gradle!

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
 * Entfernt alle repositories {} Blöcke aus einer Gradle-Datei
 * AUSSER die im buildscript {} Block
 */
function removeRepositoriesBlocks(content, filename) {
  let modified = false;
  
  // 1. Entferne allprojects { repositories { ... } } komplett
  // Dieser Block darf bei FAIL_ON_PROJECT_REPOS nicht existieren
  const allProjectsRegex = /\n*allprojects\s*\{[\s\S]*?\n\}\n*/g;
  if (allProjectsRegex.test(content)) {
    content = content.replace(allProjectsRegex, '\n');
    console.log(`   ✅ ${filename}: allprojects Block entfernt`);
    modified = true;
  }
  
  // 2. Entferne standalone repositories {} Blöcke (außerhalb von buildscript)
  // Wir müssen vorsichtig sein, buildscript { repositories {} } zu behalten
  
  // Finde buildscript Block und merke Position
  const buildscriptMatch = content.match(/buildscript\s*\{/);
  if (buildscriptMatch) {
    // Finde das Ende des buildscript Blocks
    const buildscriptStart = buildscriptMatch.index;
    let braceCount = 0;
    let buildscriptEnd = buildscriptStart;
    let inBuildscript = false;
    
    for (let i = buildscriptStart; i < content.length; i++) {
      if (content[i] === '{') {
        if (!inBuildscript) inBuildscript = true;
        braceCount++;
      } else if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0 && inBuildscript) {
          buildscriptEnd = i;
          break;
        }
      }
    }
    
    // Jetzt entferne repositories außerhalb von buildscript
    const beforeBuildscript = content.slice(0, buildscriptStart);
    const buildscriptBlock = content.slice(buildscriptStart, buildscriptEnd + 1);
    const afterBuildscript = content.slice(buildscriptEnd + 1);
    
    // Entferne repositories {} aus afterBuildscript (außer in subprojects/allprojects die wir schon entfernt haben)
    const standaloneReposRegex = /\n*repositories\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\n*/g;
    const cleanedAfter = afterBuildscript.replace(standaloneReposRegex, (match) => {
      // Prüfe ob es ein flatDir oder normales repo ist
      if (match.includes('google()') || match.includes('mavenCentral()') || match.includes('flatDir')) {
        console.log(`   ✅ ${filename}: Standalone repositories Block entfernt`);
        modified = true;
        return '\n';
      }
      return match;
    });
    
    content = beforeBuildscript + buildscriptBlock + cleanedAfter;
  } else {
    // Kein buildscript Block - entferne alle repositories Blöcke
    const reposRegex = /\n*repositories\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\n*/g;
    if (reposRegex.test(content)) {
      content = content.replace(reposRegex, '\n');
      console.log(`   ✅ ${filename}: repositories Blöcke entfernt`);
      modified = true;
    }
  }
  
  return { content, modified };
}

/**
 * Konfiguriert die Root build.gradle
 * KRITISCH: Entfernt ALLE repositories außerhalb von buildscript!
 */
function configureRootBuildGradle() {
  console.log('\n📦 Konfiguriere Root build.gradle...');
  
  if (!fs.existsSync(BUILD_GRADLE_PATH)) {
    console.error('   ❌ build.gradle nicht gefunden!');
    return false;
  }

  let buildGradle = fs.readFileSync(BUILD_GRADLE_PATH, 'utf8');
  
  // Entferne alle unerlaubten repositories Blöcke
  const result = removeRepositoriesBlocks(buildGradle, 'build.gradle');
  buildGradle = result.content;

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

  // Füge subprojects Block hinzu um Tests zu deaktivieren (OHNE repositories!)
  if (!buildGradle.includes('// Disable test tasks for plugins')) {
    const subprojectsBlock = `

// Disable test tasks for plugins to avoid Kotlin compilation issues
// KEINE repositories hier - alle Repos sind in settings.gradle!
subprojects {
    afterEvaluate { project ->
        if (project.name.contains('capacitor') || project.name.contains('nfc') || project.name.contains('geolocation')) {
            project.tasks.matching { task ->
                def taskName = task.name.toLowerCase()
                taskName.contains('test') || taskName.contains('lint')
            }.configureEach { task ->
                task.enabled = false
            }
        }
    }
}
`;
    
    buildGradle += subprojectsBlock;
  }
  
  console.log(`   ✅ Kotlin → ${KOTLIN_VERSION}`);
  console.log(`   ✅ AGP → ${AGP_VERSION}`);
  
  fs.writeFileSync(BUILD_GRADLE_PATH, buildGradle, 'utf8');
  return true;
}

/**
 * Konfiguriert app/build.gradle
 * KRITISCH: Entfernt ALLE repositories Blöcke inkl. flatDir!
 */
function configureAppBuildGradle() {
  console.log('\n📦 Konfiguriere app/build.gradle...');
  
  if (!fs.existsSync(APP_BUILD_GRADLE_PATH)) {
    console.log('   ⚠️  app/build.gradle nicht gefunden');
    return true;
  }

  let appBuildGradle = fs.readFileSync(APP_BUILD_GRADLE_PATH, 'utf8');
  
  // =====================================================
  // KRITISCH: Entferne ALLE repositories Blöcke!
  // Mit FAIL_ON_PROJECT_REPOS dürfen sie hier nicht sein!
  // =====================================================
  
  // Entferne repositories { ... } Block komplett (inkl. flatDir)
  const reposRegex = /\n*repositories\s*\{[\s\S]*?\n\}\n*/g;
  if (reposRegex.test(appBuildGradle)) {
    appBuildGradle = appBuildGradle.replace(reposRegex, '\n');
    console.log('   ✅ repositories Block entfernt (inkl. flatDir)');
  }
  
  // Entferne auch einzelne flatDir Definitionen falls außerhalb von repositories
  appBuildGradle = appBuildGradle.replace(/\n*flatDir\s*\{[^}]*\}\n*/g, '\n');
  
  // Update Java Version to 17
  appBuildGradle = appBuildGradle.replace(/JavaVersion\.VERSION_\d+/g, 'JavaVersion.VERSION_17');
  console.log('   ✅ Java Version → 17');
  
  // Stelle sicher, dass namespace gesetzt ist (AGP 8 Requirement)
  if (!appBuildGradle.includes('namespace')) {
    // Finde android { Block und füge namespace hinzu
    appBuildGradle = appBuildGradle.replace(
      /android\s*\{/,
      `android {\n    namespace "app.lovable.holo_booster_app"`
    );
    console.log('   ✅ namespace hinzugefügt (AGP 8 Requirement)');
  }
  
  fs.writeFileSync(APP_BUILD_GRADLE_PATH, appBuildGradle, 'utf8');
  return true;
}

/**
 * Patcht Plugin build.gradle Dateien
 * Entfernt repositories und updated Kotlin Versionen
 */
function patchPluginBuildGradle() {
  console.log('\n🔧 Patche Plugin build.gradle Dateien...');
  
  const pluginPaths = [
    path.join(NODE_MODULES_PATH, '@exxili', 'capacitor-nfc', 'android', 'build.gradle'),
    path.join(NODE_MODULES_PATH, 'capacitor-nfc', 'android', 'build.gradle'),
    path.join(NODE_MODULES_PATH, '@capacitor-community', 'nfc', 'android', 'build.gradle'),
    path.join(NODE_MODULES_PATH, '@capacitor', 'geolocation', 'android', 'build.gradle'),
    path.join(NODE_MODULES_PATH, '@capacitor', 'app', 'android', 'build.gradle'),
    path.join(NODE_MODULES_PATH, '@capacitor', 'android', 'capacitor', 'build.gradle'),
  ];

  for (const pluginPath of pluginPaths) {
    if (fs.existsSync(pluginPath)) {
      console.log(`   📝 Patche: ${path.relative(PROJECT_ROOT, pluginPath)}`);
      
      let content = fs.readFileSync(pluginPath, 'utf8');
      let modified = false;

      // KRITISCH: Entferne alle repositories Blöcke aus Plugins!
      const reposResult = removeRepositoriesBlocks(content, path.basename(pluginPath));
      content = reposResult.content;
      if (reposResult.modified) modified = true;

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
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║        🔧 Eloyo Android Konfiguration - KOMPLETT          ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`║  Gradle:  ${GRADLE_VERSION}           Kotlin: ${KOTLIN_VERSION}                   ║`);
  console.log(`║  AGP:     ${AGP_VERSION}        Java: 17                       ║`);
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║  BEHEBT:                                                   ║');
  console.log('║  • "Could not get unknown property org"                   ║');
  console.log('║  • "prefer settings repositories" Fehler                  ║');
  console.log('║  • flatDir Repository Konflikte                           ║');
  console.log('║  • Kotlin/AGP Versionskonflikte                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  checkAndroidPlatform();

  console.log('\n═══ SCHRITT 1: Gradle Konfiguration ═══');
  configureGradleWrapper();
  configureSettingsGradle();    // SAUBER - keine org.xxx!
  configureGradleProperties();  // Alle org.xxx Properties hier!
  configureRootBuildGradle();   // Entfernt allprojects/repositories
  configureAppBuildGradle();    // Entfernt flatDir/repositories

  console.log('\n═══ SCHRITT 2: Plugin Patches ═══');
  patchPluginBuildGradle();     // Entfernt repositories aus Plugins

  console.log('\n═══ SCHRITT 3: Android Manifest ═══');
  createNfcTechFilter();
  configureAndroidManifest();

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  ✅ KONFIGURATION ABGESCHLOSSEN!                          ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║  Nächste Schritte:                                        ║');
  console.log('║  1. npx cap sync android                                  ║');
  console.log('║  2. Android Studio öffnen                                 ║');
  console.log('║  3. File → Sync Project with Gradle Files                 ║');
  console.log('║  4. Build → Make Project oder ./gradlew assembleDebug     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

main();
