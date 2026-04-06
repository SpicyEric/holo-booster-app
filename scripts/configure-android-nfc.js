#!/usr/bin/env node

/**
 * Android NFC Configuration Script for Capacitor 7+ / AGP 8.7+
 * 
 * CLEAN SCRIPT - Fully compatible with Capacitor 7 (Java 21, Gradle 8.11.1, SDK 35)
 * 
 * This script ONLY:
 * - Patches android/app/build.gradle with correct SDK versions
 * - Patches AndroidManifest.xml with NFC permissions and intent filters
 * - Creates NFC tech filter files
 * - Configures Gradle wrapper and properties
 * 
 * This script does NOT:
 * - Create capacitor.build.gradle (deprecated in Capacitor 5+)
 * - Reference :capacitor-app (doesn't exist)
 * - Add "apply from: 'capacitor.build.gradle'" (deprecated)
 * - Create additional Gradle modules
 * 
 * Usage: node scripts/configure-android-nfc.js
 * 
 * Build order:
 *   npm install
 *   npm run build
 *   npx cap add android
 *   node scripts/configure-android-nfc.js
 *   npx cap sync android
 *   npx cap open android
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.join(__dirname, '..');
const ANDROID_PATH = path.join(PROJECT_ROOT, 'android');
const NODE_MODULES_PATH = path.join(PROJECT_ROOT, 'node_modules');

// =========================================================================
// COMMON PATCH HELPERS
// =========================================================================
function enforceJava21(content) {
  let out = content;

  // Upgrade Java 17 → 21 (Capacitor 7 requires JDK 21)
  out = out.replace(/VERSION_17/g, 'VERSION_21');
  out = out.replace(/VERSION_11/g, 'VERSION_21');
  out = out.replace(/VERSION_1_8/g, 'VERSION_21');
  out = out.replace(/JavaLanguageVersion\.of\(\s*17\s*\)/g, 'JavaLanguageVersion.of(21)');
  out = out.replace(/JavaLanguageVersion\.of\(\s*11\s*\)/g, 'JavaLanguageVersion.of(21)');
  out = out.replace(/JavaVersion\.toVersion\(\s*17\s*\)/g, 'JavaVersion.toVersion(21)');
  out = out.replace(/jvmToolchain\(\s*17\s*\)/g, 'jvmToolchain(21)');

  // Kotlin targets
  out = out.replace(/kotlinOptions\.jvmTarget\s*=\s*['\"]17['\"]/g, 'kotlinOptions.jvmTarget = "21"');
  out = out.replace(/\bjvmTarget\s*=\s*['\"]17['\"]/g, 'jvmTarget = "21"');
  out = out.replace(/\bjvmTarget\s*=\s*['\"]11['\"]/g, 'jvmTarget = "21"');
  // Kotlin DSL enum form
  out = out.replace(/\bJVM_17\b/g, 'JVM_21');
  out = out.replace(/\bJVM_11\b/g, 'JVM_21');

  // Java compile options (Groovy and Kotlin DSL)
  out = out.replace(/\bsourceCompatibility\s*=\s*17\b/g, 'sourceCompatibility = 21');
  out = out.replace(/\btargetCompatibility\s*=\s*17\b/g, 'targetCompatibility = 21');
  out = out.replace(/\bsourceCompatibility\s+17\b/g, 'sourceCompatibility 21');
  out = out.replace(/\btargetCompatibility\s+17\b/g, 'targetCompatibility 21');
  out = out.replace(/\bsourceCompatibility\s*=\s*11\b/g, 'sourceCompatibility = 21');
  out = out.replace(/\btargetCompatibility\s*=\s*11\b/g, 'targetCompatibility = 21');

  // Sometimes plugins set release explicitly
  out = out.replace(/options\.release\s*=\s*17\b/g, 'options.release = 21');
  out = out.replace(/options\.release\.set\(\s*17\s*\)/g, 'options.release.set(21)');
  out = out.replace(/\brelease\.set\(\s*17\s*\)/g, 'release.set(21)');
  out = out.replace(/--release\s+17\b/g, '--release 21');

  // Common Gradle compilerArgs patterns (Groovy/Kotlin DSL)
  out = out.replace(
    /(['\"])--release\1\s*,\s*(['\"])17\2/g,
    (_m, q1, q2) => `${q1}--release${q1}, ${q2}21${q2}`
  );
  out = out.replace(/(['\"])--release\1\s*,\s*17\b/g, '$1--release$1, 21');
  out = out.replace(
    /(['\"])--release\1\s*[,)]\s*(['\"])17\2/g,
    (_m, q1, q2) => `${q1}--release${q1}, ${q2}21${q2}`
  );

  // Fallback for -source/-target flags
  out = out.replace(/-source\s+17\b/g, '-source 21');
  out = out.replace(/-target\s+17\b/g, '-target 21');

  return out;
}

// ============================================================================
// VERSION CONSTANTS - Capacitor 5+ and AGP 8 compatible
// ============================================================================
// NOTE: Recent Android Gradle Plugin versions require Gradle 8.9+.
// If this is lower, Android Studio will fail with:
// "Minimum supported Gradle version is 8.9. Current version is X.Y"
const GRADLE_VERSION = '8.11.1';
const COMPILE_SDK = 35;
const MIN_SDK = 24;
const TARGET_SDK = 35;
const AGP_VERSION = '8.7.2';

console.log('🔧 Configuring Android project for NFC...\n');

// ============================================================================
// 1. CHECK ANDROID PLATFORM EXISTS
// ============================================================================
function checkAndroidPlatform() {
  if (!fs.existsSync(ANDROID_PATH)) {
    console.error('❌ Android platform not found!');
    console.error('   Run: npx cap add android');
    process.exit(1);
  }
  console.log('✅ Android platform found');
}

// ============================================================================
// 2. CONFIGURE GRADLE WRAPPER
// ============================================================================
function configureGradleWrapper() {
  console.log('\n📦 Configuring Gradle Wrapper...');
  
  const wrapperDir = path.join(ANDROID_PATH, 'gradle', 'wrapper');
  const wrapperPath = path.join(wrapperDir, 'gradle-wrapper.properties');
  
  if (!fs.existsSync(wrapperDir)) {
    fs.mkdirSync(wrapperDir, { recursive: true });
  }
  
  const content = `# gradle-wrapper.properties - Generated by configure-android-nfc.js
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-all.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`;
  
  fs.writeFileSync(wrapperPath, content, 'utf8');
  console.log(`   ✅ Gradle version → ${GRADLE_VERSION}`);
}

// ============================================================================
// 3. CONFIGURE GRADLE.PROPERTIES
// ============================================================================
function configureGradleProperties() {
  console.log('\n📦 Configuring gradle.properties...');
  
  const propsPath = path.join(ANDROID_PATH, 'gradle.properties');
  
  const content = `# gradle.properties - Generated by configure-android-nfc.js
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m -Dfile.encoding=UTF-8
org.gradle.parallel=true
org.gradle.caching=true
org.gradle.daemon=true
android.useAndroidX=true
android.enableJetifier=true
android.nonTransitiveRClass=false
android.defaults.buildfeatures.buildconfig=true
kotlin.code.style=official
`;
  
  fs.writeFileSync(propsPath, content, 'utf8');
  console.log('   ✅ Gradle properties configured');
}

// ============================================================================
// 4. CREATE capacitor.build.gradle WITH PLUGIN DEPENDENCIES
// ============================================================================
function createCapacitorBuildGradle() {
  console.log('\n📦 Creating capacitor.build.gradle with plugin dependencies...');
  
  // Read capacitor.settings.gradle to find all plugin projects
  const settingsPath = path.join(ANDROID_PATH, 'capacitor.settings.gradle');
  if (!fs.existsSync(settingsPath)) {
    console.log('   ⚠️ capacitor.settings.gradle not found, skipping');
    return;
  }
  
  const settingsContent = fs.readFileSync(settingsPath, 'utf8');
  
  // Extract all project names (except capacitor-android itself)
  const projectNames = [];
  const regex = /include\s+':([^']+)'/g;
  let match;
  while ((match = regex.exec(settingsContent)) !== null) {
    const name = match[1];
    if (name !== 'capacitor-android') {
      projectNames.push(name);
    }
  }
  
  console.log(`   Found ${projectNames.length} plugin(s): ${projectNames.join(', ')}`);
  
  // Generate the capacitor.build.gradle file
  const depLines = projectNames.map(name => `    implementation project(':${name}')`).join('\n');
  
  const content = `// DO NOT EDIT THIS FILE! IT IS GENERATED BY configure-android-nfc.js
// This file adds Capacitor plugin dependencies to the app module

dependencies {
${depLines}
}
`;
  
  const outputPath = path.join(ANDROID_PATH, 'app', 'capacitor.build.gradle');
  fs.writeFileSync(outputPath, content, 'utf8');
  console.log('   ✅ capacitor.build.gradle created at android/app/');
}

// ============================================================================
// 5. PATCH APP BUILD.GRADLE
// ============================================================================
function patchAppBuildGradle() {
  console.log('\n📦 Patching app/build.gradle...');
  
  const appBuildPath = path.join(ANDROID_PATH, 'app', 'build.gradle');
  
  if (!fs.existsSync(appBuildPath)) {
    console.log('   ⚠️ app/build.gradle not found (run npx cap add android first)');
    return;
  }
  
  let content = fs.readFileSync(appBuildPath, 'utf8');
  let modified = false;
  
  // CRITICAL: Ensure "apply from: 'capacitor.build.gradle'" is present
  // This file adds plugin project dependencies so they are compiled into the APK
  if (!content.includes("apply from: 'capacitor.build.gradle'") && !content.includes('apply from: "capacitor.build.gradle"')) {
    // Add it right after "apply plugin: 'com.android.application'"
    content = content.replace(
      "apply plugin: 'com.android.application'",
      "apply plugin: 'com.android.application'\napply from: 'capacitor.build.gradle'"
    );
    console.log('   ✅ Added "apply from: capacitor.build.gradle"');
    modified = true;
  }
  
  // Ensure compileSdk is set
  if (!content.includes('compileSdk') && !content.includes('compileSdkVersion')) {
    content = content.replace(
      /android\s*\{/,
      `android {\n    compileSdk ${COMPILE_SDK}`
    );
    console.log(`   ✅ Added compileSdk = ${COMPILE_SDK}`);
    modified = true;
  } else {
    // Update existing compileSdk/compileSdkVersion
    content = content.replace(/compileSdkVersion\s+\d+/, `compileSdk ${COMPILE_SDK}`);
    content = content.replace(/compileSdk\s+\d+/, `compileSdk ${COMPILE_SDK}`);
  }
  
  // Ensure minSdk is set in defaultConfig
  if (!content.includes('minSdk') && !content.includes('minSdkVersion')) {
    content = content.replace(
      /defaultConfig\s*\{/,
      `defaultConfig {\n        minSdk ${MIN_SDK}`
    );
    console.log(`   ✅ Added minSdk = ${MIN_SDK}`);
    modified = true;
  }
  
  // Ensure targetSdk is set
  if (!content.includes('targetSdk') && !content.includes('targetSdkVersion')) {
    content = content.replace(
      /defaultConfig\s*\{([^}]*)\}/s,
      (match, inner) => {
        if (!inner.includes('targetSdk')) {
          return match.replace('{', `{\n        targetSdk ${TARGET_SDK}`);
        }
        return match;
      }
    );
    console.log(`   ✅ Added targetSdk = ${TARGET_SDK}`);
    modified = true;
  }
  
  // Ensure Java 21 compatibility (Capacitor 7 requirement)
  if (
    content.includes('VERSION_17') ||
    content.includes('VERSION_11') ||
    content.includes('VERSION_1_8')
  ) {
    content = content.replace(/VERSION_17/g, 'VERSION_21');
    content = content.replace(/VERSION_11/g, 'VERSION_21');
    content = content.replace(/VERSION_1_8/g, 'VERSION_21');
    console.log('   ✅ Enforced Java version → 21');
    modified = true;
  }

  // NOTE: Capawesome NFC plugin auto-registers via Capacitor's plugin autoloading.
  // No manual dependency injection is needed for @capawesome-team/capacitor-nfc.
  // This section has been simplified compared to the old @exxili plugin setup.
  
  if (modified) {
    fs.writeFileSync(appBuildPath, content, 'utf8');
  } else {
    console.log('   ✅ app/build.gradle already correctly configured');
  }
}

// =========================================================================
// 5b. PATCH PLUGIN BUILD.GRADLE FILES (e.g. capacitor-geolocation)
// =========================================================================
function patchPluginBuildGradleFiles() {
  console.log('\n📦 Patching plugin build.gradle files (enforce Java/Kotlin 21)...');

  /**
   * Recursively find Gradle build files inside android/ (excluding android/app/build.gradle)
   */
  const buildFiles = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip build output to keep it fast
        if (entry.name === 'build' || entry.name === '.gradle') continue;
        walk(full);
        continue;
      }
      if (entry.isFile() && (entry.name === 'build.gradle' || entry.name === 'build.gradle.kts')) {
        // We'll skip app/build.gradle because it's handled above
        const normalized = full.replace(/\\/g, '/');
        if (normalized.endsWith('/android/app/build.gradle')) continue;
        buildFiles.push(full);
      }
    }
  };

  walk(ANDROID_PATH);

  if (buildFiles.length === 0) {
    console.log('   ✅ No plugin build files found');
    return;
  }

  let patchedCount = 0;

  for (const filePath of buildFiles) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const original = content;

      // Enforce Java/Kotlin 21 across plugins and tasks
      content = enforceJava21(content);

      if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        patchedCount++;
      }
    } catch (e) {
      console.log(`   ⚠️ Could not patch: ${filePath}`);
    }
  }

  if (patchedCount > 0) {
    console.log(`   ✅ Patched ${patchedCount} plugin Gradle file(s) to Java/Kotlin 21`);
  } else {
    console.log('   ✅ Plugin Gradle files already compatible');
  }
}

// =========================================================================
// 5c. PATCH CAPACITOR PLUGIN GRADLE FILES IN NODE_MODULES
// (Capacitor Android projects often reference plugins directly from
// node_modules via settings.gradle projectDir mappings.)
// =========================================================================
function patchNodeModulesCapacitorPlugins() {
  console.log('\n📦 Patching node_modules Capacitor plugin Gradle files (enforce Java/Kotlin 21)...');

  // Patch only known Capacitor-related packages to keep this fast and safe.
  const roots = [
    path.join(NODE_MODULES_PATH, '@capacitor'),
    path.join(NODE_MODULES_PATH, '@capawesome-team'),
    path.join(NODE_MODULES_PATH, '@exxili'),
    // Third-party Capacitor plugin (direct dependency)
    path.join(NODE_MODULES_PATH, 'capacitor-native-settings')
  ];

  const filesToPatch = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'build' || entry.name === '.gradle') continue;
        walk(full);
        continue;
      }
      if (entry.isFile() && (entry.name === 'build.gradle' || entry.name === 'build.gradle.kts')) {
        // Focus on Android-related gradle files
        const normalized = full.replace(/\\/g, '/');
        if (!normalized.includes('/android/')) continue;
        filesToPatch.push(full);
      }
    }
  };

  for (const root of roots) walk(root);

  if (filesToPatch.length === 0) {
    console.log('   ✅ No node_modules plugin Gradle files found to patch');
    return;
  }

  let patchedCount = 0;
  for (const filePath of filesToPatch) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const original = content;

      content = enforceJava21(content);

      if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        patchedCount++;
        console.log(`   ✅ Patched: ${filePath.replace(PROJECT_ROOT, '.')}`);
      }
    } catch (e) {
      console.log(`   ⚠️ Could not patch: ${filePath}`);
    }
  }

  if (patchedCount > 0) {
    console.log(`   ✅ Patched ${patchedCount} node_modules plugin Gradle file(s) to Java/Kotlin 21`);
  } else {
    console.log('   ✅ node_modules plugin Gradle files already compatible');
  }
}

// ============================================================================
// 6. CREATE NFC TECH FILTER
// ============================================================================
function createNfcTechFilter() {
  console.log('\n📦 Creating NFC tech filter...');
  
  const xmlDir = path.join(ANDROID_PATH, 'app', 'src', 'main', 'res', 'xml');
  
  if (!fs.existsSync(xmlDir)) {
    fs.mkdirSync(xmlDir, { recursive: true });
  }
  
  const content = `<?xml version="1.0" encoding="utf-8"?>
<!-- nfc_tech_filter.xml - Generated by configure-android-nfc.js -->
<resources xmlns:xliff="urn:oasis:names:tc:xliff:document:1.2">
    <!-- NDEF tags (primary format for Eloyo stamps) -->
    <tech-list>
        <tech>android.nfc.tech.Ndef</tech>
    </tech-list>
    <tech-list>
        <tech>android.nfc.tech.NdefFormatable</tech>
    </tech-list>
    <!-- Common NFC-A tags (MIFARE, etc.) -->
    <tech-list>
        <tech>android.nfc.tech.NfcA</tech>
    </tech-list>
    <!-- NFC-B tags -->
    <tech-list>
        <tech>android.nfc.tech.NfcB</tech>
    </tech-list>
    <!-- NFC-F tags (FeliCa) -->
    <tech-list>
        <tech>android.nfc.tech.NfcF</tech>
    </tech-list>
    <!-- NFC-V tags (ISO 15693) -->
    <tech-list>
        <tech>android.nfc.tech.NfcV</tech>
    </tech-list>
    <!-- ISO-DEP tags -->
    <tech-list>
        <tech>android.nfc.tech.IsoDep</tech>
    </tech-list>
    <!-- MIFARE Classic -->
    <tech-list>
        <tech>android.nfc.tech.MifareClassic</tech>
    </tech-list>
    <!-- MIFARE Ultralight -->
    <tech-list>
        <tech>android.nfc.tech.MifareUltralight</tech>
    </tech-list>
</resources>
`;
  
  fs.writeFileSync(path.join(xmlDir, 'nfc_tech_filter.xml'), content, 'utf8');
  console.log('   ✅ nfc_tech_filter.xml created');
}

// ============================================================================
// 7. CONFIGURE ANDROID MANIFEST
// ============================================================================
function configureAndroidManifest() {
  console.log('\n📦 Configuring AndroidManifest.xml...');
  
  const manifestPath = path.join(ANDROID_PATH, 'app', 'src', 'main', 'AndroidManifest.xml');
  
  if (!fs.existsSync(manifestPath)) {
    console.log('   ⚠️ AndroidManifest.xml not found (run npx cap sync android first)');
    return;
  }
  
  let content = fs.readFileSync(manifestPath, 'utf8');
  let modified = false;
  
  // Required permissions
  const permissions = [
    { name: 'android.permission.INTERNET', label: 'INTERNET' },
    { name: 'android.permission.NFC', label: 'NFC' },
    { name: 'android.permission.ACCESS_FINE_LOCATION', label: 'ACCESS_FINE_LOCATION' },
    { name: 'android.permission.ACCESS_COARSE_LOCATION', label: 'ACCESS_COARSE_LOCATION' },
    { name: 'android.permission.POST_NOTIFICATIONS', label: 'POST_NOTIFICATIONS' },
    { name: 'android.permission.VIBRATE', label: 'VIBRATE' }
  ];
  
  // Add missing permissions
  for (const perm of permissions) {
    if (!content.includes(perm.name)) {
      content = content.replace(
        '<application',
        `<uses-permission android:name="${perm.name}" />\n    <application`
      );
      console.log(`   ✅ Added permission: ${perm.label}`);
      modified = true;
    }
  }
  
  // Add NFC feature (optional - allows app to work on devices without NFC)
  if (!content.includes('android.hardware.nfc')) {
    content = content.replace(
      '<application',
      '<uses-feature android:name="android.hardware.nfc" android:required="false" />\n    <application'
    );
    console.log('   ✅ Added NFC feature (optional)');
    modified = true;
  }
  
  // NFC Intent Filters are intentionally NOT added to the manifest.
  // The Capawesome NFC plugin uses Foreground Dispatch which only works
  // when the app is in the foreground and actively scanning.
  // Adding manifest-level intent filters (NDEF_DISCOVERED, TECH_DISCOVERED,
  // TAG_DISCOVERED) would cause Android to auto-launch the app whenever
  // ANY NFC tag is tapped — even when the app is closed. This is unwanted.
  
  // CLEANUP: Remove any previously added NFC intent filters from manifest
  if (content.includes('android.nfc.action.NDEF_DISCOVERED') || 
      content.includes('android.nfc.action.TECH_DISCOVERED') ||
      content.includes('android.nfc.action.TAG_DISCOVERED')) {
    // Remove NFC intent-filter blocks
    content = content.replace(/\s*<!-- NFC Intent Filters[^>]*-->\s*/g, '');
    content = content.replace(/\s*<intent-filter>\s*<action android:name="android\.nfc\.action\.NDEF_DISCOVERED"[^/]*\/>\s*<category android:name="android\.intent\.category\.DEFAULT"[^/]*\/>\s*<data android:mimeType="text\/plain"[^/]*\/>\s*<\/intent-filter>/g, '');
    content = content.replace(/\s*<intent-filter>\s*<action android:name="android\.nfc\.action\.TECH_DISCOVERED"[^/]*\/>\s*<\/intent-filter>/g, '');
    content = content.replace(/\s*<intent-filter>\s*<action android:name="android\.nfc\.action\.TAG_DISCOVERED"[^/]*\/>\s*<category android:name="android\.intent\.category\.DEFAULT"[^/]*\/>\s*<\/intent-filter>/g, '');
    content = content.replace(/\s*<meta-data\s*android:name="android\.nfc\.action\.TECH_DISCOVERED"\s*android:resource="@xml\/nfc_tech_filter"[^/]*\/>/g, '');
    console.log('   ✅ Removed old NFC intent filters from manifest (prevents auto-launch)');
    modified = true;
  } else {
    console.log('   ✅ No NFC intent filters in manifest (correct - prevents auto-launch)');
  }

  // Enforce portrait-only orientation on MainActivity
  if (!content.includes('android:screenOrientation')) {
    content = content.replace(
      /(<activity[^>]*android:name="[^"]*MainActivity")/,
      '$1\n            android:screenOrientation="portrait"'
    );
    console.log('   ✅ Locked screen orientation to portrait');
    modified = true;
  }

  // CRITICAL: Set singleTask launch mode to prevent NFC intents from
  // creating a new Activity instance (which would reload the WebView and lose session).
  // Capacitor defaults to singleTop, which does NOT prevent restart on NFC intents.
  if (content.includes('android:launchMode="singleTop"')) {
    content = content.replace(
      /android:launchMode="singleTop"/,
      'android:launchMode="singleTask"'
    );
    console.log('   ✅ Changed launchMode from singleTop → singleTask (prevents NFC restart)');
    modified = true;
  } else if (!content.includes('android:launchMode="singleTask"')) {
    content = content.replace(
      /(<activity[^>]*android:name="[^"]*MainActivity")/,
      '$1\n            android:launchMode="singleTask"'
    );
    console.log('   ✅ Set launchMode to singleTask (prevents NFC restart)');
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(manifestPath, content, 'utf8');
  } else {
    console.log('   ✅ All permissions, filters, and orientation already present');
  }
}

// ============================================================================
// 8. CLEAN MAINACTIVITY – Remove manual NFC plugin registrations (Android)
// ============================================================================
// Capacitor 7 + Capawesome NFC v7 use automatic plugin loading.
// Manual registerPlugin() calls cause compile errors because the app module
// does not have a direct Gradle dependency on the plugin module.
// This step removes ALL manual NFC plugin registrations (Exxili and Capawesome).
function cleanMainActivityNfcRegistration() {
  console.log('\n📦 Cleaning MainActivity from manual NFC registrations...');

  const javaRoot = path.join(ANDROID_PATH, 'app', 'src', 'main', 'java');
  if (!fs.existsSync(javaRoot)) {
    console.log('   ✅ No android/app/src/main/java found (skip)');
    return;
  }

  const mainActivityFiles = [];
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (
        entry.isFile() &&
        (entry.name === 'MainActivity.java' || entry.name === 'MainActivity.kt')
      ) {
        mainActivityFiles.push(full);
      }
    }
  };

  walk(javaRoot);

  if (mainActivityFiles.length === 0) {
    console.log('   ✅ No MainActivity file found (skip)');
    return;
  }

  let cleaned = 0;

  for (const filePath of mainActivityFiles) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const original = content;

      // Remove ALL NFC plugin imports (Exxili + Capawesome)
      content = content.replace(/^\s*import\s+com\.exxili\.capacitornfc\.[^;\n]+;\s*\n/gm, '');
      content = content.replace(/^\s*import\s+com\.exxili\.capacitornfc\.[^\n]+\s*\n/gm, '');
      content = content.replace(/^\s*import\s+io\.capawesome\.capacitorjs\.plugins\.nfc\.NfcPlugin;\s*\n/gm, '');
      content = content.replace(/^\s*import\s+io\.capawesome\.capacitorjs\.plugins\.nfc\.NfcPlugin\s*\n/gm, '');

      // Remove manual registerPlugin lines (all variants)
      content = content.replace(/^\s*registerPlugin\(\s*com\.exxili\.capacitornfc\.[^)]*\)\s*;\s*\n/gm, '');
      content = content.replace(/^\s*registerPlugin\(\s*NFCPlugin\.class\s*\)\s*;\s*\n/gm, '');
      content = content.replace(/^\s*registerPlugin\(\s*NFCPlugin::class\.java\s*\)\s*\n/gm, '');
      content = content.replace(/^\s*registerPlugin\(\s*NfcPlugin\.class\s*\)\s*;\s*\n/gm, '');
      content = content.replace(/^\s*registerPlugin\(\s*NfcPlugin::class\.java\s*\)\s*\n/gm, '');

      // Remove empty onCreate that was only added for NFC registration
      // Java: @Override public void onCreate(Bundle savedInstanceState) { super.onCreate(savedInstanceState); }
      content = content.replace(
        /\n\s*@Override\s*\n\s*public\s+void\s+onCreate\(\s*Bundle\s+savedInstanceState\s*\)\s*\{\s*\n\s*super\.onCreate\(\s*savedInstanceState\s*\)\s*;\s*\n\s*\}\s*\n/g,
        '\n'
      );
      // Kotlin: override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState) }
      content = content.replace(
        /\n\s*override\s+fun\s+onCreate\(\s*savedInstanceState:\s*Bundle\?\s*\)\s*\{\s*\n\s*super\.onCreate\(\s*savedInstanceState\s*\)\s*\n\s*\}\s*\n/g,
        '\n'
      );

      // Remove orphaned android.os.Bundle import if onCreate is gone
      if (!content.includes('onCreate') && !content.includes('Bundle')) {
        content = content.replace(/^\s*import\s+android\.os\.Bundle;\s*\n/gm, '');
        content = content.replace(/^\s*import\s+android\.os\.Bundle\s*\n/gm, '');
      }

      // Clean up multiple blank lines
      content = content.replace(/\n{3,}/g, '\n\n');

      if (content !== original) {
        cleaned++;
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`   ✅ Cleaned MainActivity: ${filePath.replace(PROJECT_ROOT, '.')}`);
      }
    } catch (e) {
      console.log(`   ⚠️ Could not clean MainActivity: ${filePath}`);
    }
  }

  if (cleaned === 0) console.log('   ✅ MainActivity already clean (no manual NFC registrations)');
  console.log('   ℹ️  Capawesome NFC v7 uses Capacitor autoloading – no manual registration needed');
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
function main() {
  try {
    console.log('━'.repeat(60));
    console.log('  Android NFC Configuration Script');
    console.log('  Capacitor 5+ / AGP 8 compatible');
    console.log('━'.repeat(60));
    
    // Step 1: Check Android platform exists
    checkAndroidPlatform();
    
    // Step 2: Configure Gradle files
    configureGradleWrapper();
    configureGradleProperties();
    
    // Step 3: Create capacitor.build.gradle with plugin dependencies
    createCapacitorBuildGradle();
    
    // Step 4: Patch app/build.gradle
    patchAppBuildGradle();

    // Step 4b: Patch plugin build.gradle files (e.g. capacitor-geolocation)
    patchPluginBuildGradleFiles();

    // Step 4c: Patch plugin Gradle files in node_modules (where Capacitor often points projectDir)
    patchNodeModulesCapacitorPlugins();
    
    // Step 5: Configure NFC
    createNfcTechFilter();
    configureAndroidManifest();

    // Step 6: Clean manual NFC registrations (Capacitor 7 uses autoloading)
    cleanMainActivityNfcRegistration();
    
    console.log('\n' + '━'.repeat(60));
    console.log('  ✅ Android NFC configuration complete!');
    console.log('━'.repeat(60));
    console.log('\n📋 Next steps:');
    console.log('   1. npx cap sync android');
    console.log('   2. npx cap open android');
    console.log('   3. Build → Make Project');
    console.log('');
  } catch (error) {
    console.error('\n❌ Configuration error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
