#!/usr/bin/env node

/**
 * Android NFC Configuration Script for Capacitor 5+ / AGP 8+
 * 
 * CLEAN SCRIPT - Fully compatible with modern Capacitor
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
function enforceJava17(content) {
  let out = content;

  // Most common constants / toolchains
  out = out.replace(/VERSION_21/g, 'VERSION_17');
  out = out.replace(/JavaLanguageVersion\.of\(\s*21\s*\)/g, 'JavaLanguageVersion.of(17)');
  out = out.replace(/JavaVersion\.toVersion\(\s*21\s*\)/g, 'JavaVersion.toVersion(17)');
  out = out.replace(/jvmToolchain\(\s*21\s*\)/g, 'jvmToolchain(17)');

  // Kotlin targets
  out = out.replace(/kotlinOptions\.jvmTarget\s*=\s*['\"]21['\"]/g, 'kotlinOptions.jvmTarget = "17"');
  out = out.replace(/\bjvmTarget\s*=\s*['\"]21['\"]/g, 'jvmTarget = "17"');
  // Kotlin DSL enum form
  out = out.replace(/\bJVM_21\b/g, 'JVM_17');

  // Java compile options (Groovy and Kotlin DSL)
  out = out.replace(/\bsourceCompatibility\s*=\s*21\b/g, 'sourceCompatibility = 17');
  out = out.replace(/\btargetCompatibility\s*=\s*21\b/g, 'targetCompatibility = 17');
  out = out.replace(/\bsourceCompatibility\s+21\b/g, 'sourceCompatibility 17');
  out = out.replace(/\btargetCompatibility\s+21\b/g, 'targetCompatibility 17');

  // Sometimes plugins set release explicitly
  out = out.replace(/options\.release\s*=\s*21\b/g, 'options.release = 17');
  out = out.replace(/options\.release\.set\(\s*21\s*\)/g, 'options.release.set(17)');
  out = out.replace(/\brelease\.set\(\s*21\s*\)/g, 'release.set(17)');
  out = out.replace(/--release\s+21\b/g, '--release 17');

  // Common Gradle compilerArgs patterns (Groovy/Kotlin DSL)
  // e.g. options.compilerArgs += ["--release", "21"]
  out = out.replace(
    /(['\"])--release\1\s*,\s*(['\"])21\2/g,
    (_m, q1, q2) => `${q1}--release${q1}, ${q2}17${q2}`
  );
  // e.g. "--release",21
  out = out.replace(/(['\"])--release\1\s*,\s*21\b/g, '$1--release$1, 17');
  // e.g. listOf("--release", "21") (handles minor formatting variants)
  out = out.replace(
    /(['\"])--release\1\s*[,)]\s*(['\"])21\2/g,
    (_m, q1, q2) => `${q1}--release${q1}, ${q2}17${q2}`
  );

  // Fallback for -source/-target flags if they appear in compiler args
  out = out.replace(/-source\s+21\b/g, '-source 17');
  out = out.replace(/-target\s+21\b/g, '-target 17');

  return out;
}

// ============================================================================
// VERSION CONSTANTS - Capacitor 5+ and AGP 8 compatible
// ============================================================================
// NOTE: Recent Android Gradle Plugin versions require Gradle 8.9+.
// If this is lower, Android Studio will fail with:
// "Minimum supported Gradle version is 8.9. Current version is X.Y"
const GRADLE_VERSION = '8.9';
const COMPILE_SDK = 34;
const MIN_SDK = 24;
const TARGET_SDK = 34;

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
// 4. DELETE DEPRECATED FILES
// ============================================================================
function deleteDeprecatedFiles() {
  console.log('\n🧹 Cleaning up deprecated files...');
  
  const deprecatedFiles = [
    path.join(ANDROID_PATH, 'app', 'capacitor.build.gradle'),
    path.join(ANDROID_PATH, 'capacitor.build.gradle')
  ];
  
  let deletedCount = 0;
  for (const filePath of deprecatedFiles) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`   ✅ Deleted: ${path.basename(filePath)}`);
      deletedCount++;
    }
  }
  
  if (deletedCount === 0) {
    console.log('   ✅ No deprecated files found');
  }
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
  
  // CRITICAL: Remove any "apply from: 'capacitor.build.gradle'" line
  const applyFromPatterns = [
    /apply from: ['"]capacitor\.build\.gradle['"]\s*\n?/g,
    /apply from: file\(['"]capacitor\.build\.gradle['"]\)\s*\n?/g
  ];
  
  for (const pattern of applyFromPatterns) {
    if (pattern.test(content)) {
      content = content.replace(pattern, '');
      console.log('   ✅ Removed deprecated "apply from: capacitor.build.gradle"');
      modified = true;
    }
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
  
  // Ensure Java 17 compatibility
  // Some newer templates/plugins may use Java 21. We standardize on 17.
  if (
    content.includes('VERSION_21') ||
    content.includes('VERSION_11') ||
    content.includes('VERSION_1_8')
  ) {
    content = content.replace(/VERSION_21/g, 'VERSION_17');
    content = content.replace(/VERSION_11/g, 'VERSION_17');
    content = content.replace(/VERSION_1_8/g, 'VERSION_17');
    console.log('   ✅ Enforced Java version → 17');
    modified = true;
  }

  // Ensure the Exxili NFC Android module is on the app compile classpath.
  // Without this dependency, manual registration in MainActivity will not compile
  // and Capacitor may not load the plugin at runtime.
  const exxiliDepGroovy = "implementation project(':exxili-capacitor-nfc')";
  const exxiliDepKotlin = 'implementation(project(":exxili-capacitor-nfc"))';

  const hasExxiliDep =
    content.includes("project(':exxili-capacitor-nfc')") ||
    content.includes('project(\":exxili-capacitor-nfc\")');

  if (!hasExxiliDep) {
    // Prefer inserting right after capacitor-android dependency if present
    const capacitorAndroidGroovy = "implementation project(':capacitor-android')";
    const capacitorAndroidKotlin = 'implementation(project(":capacitor-android"))';

    if (content.includes(capacitorAndroidGroovy)) {
      content = content.replace(
        capacitorAndroidGroovy,
        `${capacitorAndroidGroovy}\n    ${exxiliDepGroovy}`
      );
      console.log('   ✅ Added Exxili NFC Gradle dependency to app/build.gradle');
      modified = true;
    } else if (content.includes(capacitorAndroidKotlin)) {
      content = content.replace(
        capacitorAndroidKotlin,
        `${capacitorAndroidKotlin}\n    ${exxiliDepKotlin}`
      );
      console.log('   ✅ Added Exxili NFC Gradle dependency to app/build.gradle');
      modified = true;
    } else if (/\bdependencies\s*\{/.test(content)) {
      // Fallback: first dependencies block
      content = content.replace(
        /\bdependencies\s*\{/, 
        (m) => `${m}\n    ${exxiliDepGroovy}`
      );
      console.log('   ✅ Added Exxili NFC Gradle dependency to app/build.gradle');
      modified = true;
    } else {
      console.log('   ⚠️ Could not find dependencies block to add Exxili NFC module dependency');
    }
  }
  
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
  console.log('\n📦 Patching plugin build.gradle files (enforce Java/Kotlin 17)...');

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

      // Enforce Java/Kotlin 17 across plugins and tasks
      content = enforceJava17(content);

      if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        patchedCount++;
      }
    } catch (e) {
      console.log(`   ⚠️ Could not patch: ${filePath}`);
    }
  }

  if (patchedCount > 0) {
    console.log(`   ✅ Patched ${patchedCount} plugin Gradle file(s) to Java/Kotlin 17`);
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
  console.log('\n📦 Patching node_modules Capacitor plugin Gradle files (enforce Java/Kotlin 17)...');

  // Patch only known Capacitor-related packages to keep this fast and safe.
  const roots = [
    path.join(NODE_MODULES_PATH, '@capacitor'),
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

      content = enforceJava17(content);

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
    console.log(`   ✅ Patched ${patchedCount} node_modules plugin Gradle file(s) to Java/Kotlin 17`);
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
  
  // Add NFC intent filters to MainActivity
  if (!content.includes('android.nfc.action.NDEF_DISCOVERED')) {
    content = content.replace(
      /<activity[^>]*android:name="[^"]*MainActivity"[^>]*>([\s\S]*?)<\/activity>/,
      (match) => {
        if (match.includes('NDEF_DISCOVERED')) return match;
        
        const nfcFilters = `
            <!-- NFC Intent Filters - Added by configure-android-nfc.js -->
            <intent-filter>
                <action android:name="android.nfc.action.NDEF_DISCOVERED" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="text/plain" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.nfc.action.TECH_DISCOVERED" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.nfc.action.TAG_DISCOVERED" />
                <category android:name="android.intent.category.DEFAULT" />
            </intent-filter>
            <meta-data
                android:name="android.nfc.action.TECH_DISCOVERED"
                android:resource="@xml/nfc_tech_filter" />`;
        
        return match.replace('</activity>', nfcFilters + '\n        </activity>');
      }
    );
    console.log('   ✅ Added NFC intent filters to MainActivity');
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(manifestPath, content, 'utf8');
  } else {
    console.log('   ✅ All permissions and filters already present');
  }
}

// ============================================================================
// 8. REGISTER EXXILI NFC PLUGIN IN MAINACTIVITY (Android)
// ============================================================================
// The @exxili/capacitor-nfc plugin sometimes does not get auto-registered in
// certain Capacitor/Gradle setups, causing runtime errors:
//   Error: "NFC" plugin is not implemented on android
// The plugin itself includes an example MainActivity that calls:
//   registerPlugin(NFCPlugin::class.java)
// We patch the app's MainActivity to include this registration.
function patchMainActivityRegisterNfcPlugin() {
  console.log('\n📦 Ensuring NFC plugin is registered in MainActivity...');

  const javaRoot = path.join(ANDROID_PATH, 'app', 'src', 'main', 'java');
  if (!fs.existsSync(javaRoot)) {
    console.log('   ⚠️ MainActivity source folder not found (run npx cap sync android first)');
    return;
  }

  /** Find MainActivity.java / MainActivity.kt */
  const mainActivityFiles = [];
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (entry.isFile() && (entry.name === 'MainActivity.java' || entry.name === 'MainActivity.kt')) {
        mainActivityFiles.push(full);
      }
    }
  };

  walk(javaRoot);

  if (mainActivityFiles.length === 0) {
    console.log('   ⚠️ MainActivity.java/kt not found under android/app/src/main/java');
    return;
  }

  const mainActivityPath = mainActivityFiles[0];
  let content = fs.readFileSync(mainActivityPath, 'utf8');
  const original = content;

  const alreadyRegistered =
    (content.includes('registerPlugin(com.exxili.capacitornfc.NFCPlugin') ||
      content.includes('registerPlugin(NFCPlugin') ||
      content.includes('registerPlugin(com.exxili.capacitornfc.NFCPlugin::class.java)') ||
      content.includes('registerPlugin(NFCPlugin::class.java)'));

  if (alreadyRegistered) {
    console.log('   ✅ NFC plugin already registered in MainActivity');
    return;
  }

  const isKotlin = mainActivityPath.endsWith('.kt');

  if (isKotlin) {
    // Ensure import exists
    if (!content.includes('import com.exxili.capacitornfc.NFCPlugin')) {
      content = content.replace(
        /import\s+com\.getcapacitor\.[^\n]+\n/, 
        (m) => `${m}import com.exxili.capacitornfc.NFCPlugin\n`
      );
    }

    // Normalize any previously inserted fully-qualified registration
    content = content.replace(
      /registerPlugin\(com\.exxili\.capacitornfc\.NFCPlugin::class\.java\)/g,
      'registerPlugin(NFCPlugin::class.java)'
    );

    // If onCreate exists, inject registerPlugin after super.onCreate
    if (/override\s+fun\s+onCreate\s*\(/.test(content)) {
      if (!content.includes('registerPlugin(NFCPlugin::class.java)')) {
        content = content.replace(
          /super\.onCreate\(savedInstanceState\)\s*/,
          (m) => `${m}\n        registerPlugin(NFCPlugin::class.java)\n`
        );
      }
    } else {
      // Insert full onCreate override before the class closing brace
      content = content.replace(
        /\}\s*$/,
        `\n\n    override fun onCreate(savedInstanceState: android.os.Bundle?) {\n        super.onCreate(savedInstanceState)\n        registerPlugin(NFCPlugin::class.java)\n    }\n}\n`
      );
    }
  } else {
    // Java
    // Ensure import exists
    if (!content.includes('import com.exxili.capacitornfc.NFCPlugin;')) {
      // Insert after BridgeActivity import if possible
      if (content.includes('import com.getcapacitor.BridgeActivity;')) {
        content = content.replace(
          'import com.getcapacitor.BridgeActivity;\n',
          'import com.getcapacitor.BridgeActivity;\nimport com.exxili.capacitornfc.NFCPlugin;\n'
        );
      } else {
        // Fallback: insert after package declaration
        content = content.replace(
          /^(package\s+[^;]+;\s*\n)/,
          `$1\nimport com.exxili.capacitornfc.NFCPlugin;\n`
        );
      }
    }

    // Normalize any previously inserted fully-qualified registration
    content = content.replace(
      /registerPlugin\(com\.exxili\.capacitornfc\.NFCPlugin\.class\);/g,
      'registerPlugin(NFCPlugin.class);'
    );

    if (/void\s+onCreate\s*\(/.test(content)) {
      if (!content.includes('registerPlugin(NFCPlugin.class);')) {
        content = content.replace(
          /super\.onCreate\(savedInstanceState\);\s*/,
          (m) => `${m}\n        registerPlugin(NFCPlugin.class);\n`
        );
      }
    } else {
      // Insert full onCreate override before the class closing brace
      content = content.replace(
        /\}\s*$/,
        `\n\n    @Override\n    public void onCreate(android.os.Bundle savedInstanceState) {\n        super.onCreate(savedInstanceState);\n        registerPlugin(NFCPlugin.class);\n    }\n}\n`
      );
    }
  }

  if (content !== original) {
    fs.writeFileSync(mainActivityPath, content, 'utf8');
    console.log(`   ✅ Patched MainActivity to register NFC plugin: ${mainActivityPath.replace(PROJECT_ROOT, '.')}`);
  } else {
    console.log('   ✅ MainActivity already compatible');
  }
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
    
    // Step 3: Delete deprecated files (capacitor.build.gradle)
    deleteDeprecatedFiles();
    
    // Step 4: Patch app/build.gradle
    patchAppBuildGradle();

    // Step 4b: Patch plugin build.gradle files (e.g. capacitor-geolocation)
    patchPluginBuildGradleFiles();

    // Step 4c: Patch plugin Gradle files in node_modules (where Capacitor often points projectDir)
    patchNodeModulesCapacitorPlugins();
    
    // Step 5: Configure NFC
    createNfcTechFilter();
    configureAndroidManifest();

    // Step 6: Ensure NFC plugin is registered in MainActivity
    patchMainActivityRegisterNfcPlugin();
    
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
