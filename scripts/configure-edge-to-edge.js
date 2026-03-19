#!/usr/bin/env node

/**
 * Edge-to-Edge Configuration Script for Android & iOS
 * 
 * Android: Patches styles.xml for transparent system bars and
 *          MainActivity.java/kt to enable edge-to-edge rendering.
 *          This makes env(safe-area-inset-top/bottom) work in WebView.
 * 
 * iOS:     Adds UIViewControllerBasedStatusBarAppearance to Info.plist.
 *          iOS WebView already respects safe-area-inset via viewport-fit=cover.
 * 
 * Usage: node scripts/configure-edge-to-edge.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.join(__dirname, '..');
const ANDROID_PATH = path.join(PROJECT_ROOT, 'android');
const IOS_APP_PATH = path.join(PROJECT_ROOT, 'ios', 'App', 'App');

// ============================================================================
// ANDROID: Edge-to-Edge
// ============================================================================

function configureAndroidEdgeToEdge() {
  console.log('\n🤖 Configuring Android Edge-to-Edge...');

  if (!fs.existsSync(ANDROID_PATH)) {
    console.log('   ℹ️  Android platform not found, skipping');
    return;
  }

  configureAndroidStyles();
  configureAndroidMainActivity();
}

/**
 * Patch res/values/styles.xml to set transparent navigation/status bars
 */
function configureAndroidStyles() {
  console.log('\n   📦 Patching styles.xml...');

  const stylesPath = path.join(ANDROID_PATH, 'app', 'src', 'main', 'res', 'values', 'styles.xml');

  if (!fs.existsSync(stylesPath)) {
    console.log('      ⚠️ styles.xml not found, creating...');
    const stylesDir = path.dirname(stylesPath);
    if (!fs.existsSync(stylesDir)) {
      fs.mkdirSync(stylesDir, { recursive: true });
    }
  }

  let content = fs.existsSync(stylesPath) 
    ? fs.readFileSync(stylesPath, 'utf8')
    : `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">
        <item name="android:actionBarSize">@dimen/action_bar_size</item>
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
    </style>
</resources>`;

  let modified = false;

  // Add transparent navigation bar
  if (!content.includes('android:navigationBarColor')) {
    content = content.replace(
      /(<style\s+name="AppTheme"[^>]*>)/,
      '$1\n        <!-- Edge-to-Edge: transparent system bars -->\n        <item name="android:navigationBarColor">@android:color/transparent</item>'
    );
    modified = true;
    console.log('      ✅ Added transparent navigationBarColor');
  }

  // Add transparent status bar
  if (!content.includes('android:statusBarColor')) {
    content = content.replace(
      /(<style\s+name="AppTheme"[^>]*>)/,
      '$1\n        <item name="android:statusBarColor">@android:color/transparent</item>'
    );
    modified = true;
    console.log('      ✅ Added transparent statusBarColor');
  }

  // Disable enforced navigation bar contrast (Android 10+)
  if (!content.includes('android:enforceNavigationBarContrast')) {
    content = content.replace(
      /(<style\s+name="AppTheme"[^>]*>)/,
      '$1\n        <item name="android:enforceNavigationBarContrast">false</item>'
    );
    modified = true;
    console.log('      ✅ Added enforceNavigationBarContrast=false');
  }

  // Disable enforced status bar contrast
  if (!content.includes('android:enforceStatusBarContrast')) {
    content = content.replace(
      /(<style\s+name="AppTheme"[^>]*>)/,
      '$1\n        <item name="android:enforceStatusBarContrast">false</item>'
    );
    modified = true;
    console.log('      ✅ Added enforceStatusBarContrast=false');
  }

  if (modified) {
    fs.writeFileSync(stylesPath, content, 'utf8');
  } else {
    console.log('      ✅ styles.xml already configured for edge-to-edge');
  }
}

/**
 * Patch MainActivity.java/kt to call WindowCompat.setDecorFitsSystemWindows(false)
 */
function configureAndroidMainActivity() {
  console.log('\n   📦 Patching MainActivity for edge-to-edge...');

  const javaRoot = path.join(ANDROID_PATH, 'app', 'src', 'main', 'java');
  if (!fs.existsSync(javaRoot)) {
    console.log('      ⚠️ No java source directory found, skipping');
    return;
  }

  // Find MainActivity
  const mainActivityFiles = [];
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name === 'MainActivity.java' || entry.name === 'MainActivity.kt') {
        mainActivityFiles.push(full);
      }
    }
  };
  walk(javaRoot);

  if (mainActivityFiles.length === 0) {
    console.log('      ⚠️ No MainActivity file found');
    return;
  }

  for (const filePath of mainActivityFiles) {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    const isKotlin = filePath.endsWith('.kt');

    // Check if already configured
    if (content.includes('setDecorFitsSystemWindows') || content.includes('WindowCompat')) {
      console.log('      ✅ MainActivity already has edge-to-edge configuration');
      continue;
    }

    if (isKotlin) {
      // Kotlin: Add import
      if (!content.includes('import androidx.core.view.WindowCompat')) {
        content = content.replace(
          /(import\s+[^\n]+\n)/,
          '$1import android.os.Bundle\nimport androidx.core.view.WindowCompat\n'
        );
      }

      // Add or modify onCreate
      if (content.includes('override fun onCreate')) {
        // Add to existing onCreate
        content = content.replace(
          /(super\.onCreate\([^)]*\))/,
          '$1\n        // Edge-to-Edge: let content render behind system bars\n        WindowCompat.setDecorFitsSystemWindows(window, false)'
        );
      } else {
        // Add new onCreate
        content = content.replace(
          /class\s+MainActivity\s*:\s*BridgeActivity\(\)\s*\{/,
          `class MainActivity : BridgeActivity() {\n    override fun onCreate(savedInstanceState: Bundle?) {\n        super.onCreate(savedInstanceState)\n        // Edge-to-Edge: let content render behind system bars\n        WindowCompat.setDecorFitsSystemWindows(window, false)\n    }`
        );
      }
    } else {
      // Java: Add imports
      if (!content.includes('import androidx.core.view.WindowCompat')) {
        content = content.replace(
          /(import\s+[^\n]+;\n)/,
          '$1import android.os.Bundle;\nimport androidx.core.view.WindowCompat;\n'
        );
      }

      // Add or modify onCreate
      if (content.includes('void onCreate')) {
        // Add to existing onCreate
        content = content.replace(
          /(super\.onCreate\([^)]*\);)/,
          '$1\n        // Edge-to-Edge: let content render behind system bars\n        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);'
        );
      } else {
        // Add new onCreate before closing brace of class
        const onCreateMethod = `
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Edge-to-Edge: let content render behind system bars
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }
`;
        // Find last closing brace and insert before it
        const lastBrace = content.lastIndexOf('}');
        content = content.slice(0, lastBrace) + onCreateMethod + content.slice(lastBrace);
      }
    }

    // Remove duplicate imports
    content = content.replace(/(import android\.os\.Bundle[;\s]*\n){2,}/g, 'import android.os.Bundle;\n');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`      ✅ Added edge-to-edge to ${isKotlin ? 'Kotlin' : 'Java'} MainActivity`);
    }
  }
}

// ============================================================================
// iOS: Safe Area Configuration
// ============================================================================

function configureIOSEdgeToEdge() {
  console.log('\n🍎 Configuring iOS safe area support...');

  if (!fs.existsSync(IOS_APP_PATH)) {
    console.log('   ℹ️  iOS platform not found, skipping');
    return;
  }

  const infoPlistPath = path.join(IOS_APP_PATH, 'Info.plist');
  if (!fs.existsSync(infoPlistPath)) {
    console.log('   ⚠️ Info.plist not found');
    return;
  }

  let content = fs.readFileSync(infoPlistPath, 'utf8');
  let modified = false;

  // Add UIViewControllerBasedStatusBarAppearance = true
  // This allows the WebView to control status bar appearance
  if (!content.includes('UIViewControllerBasedStatusBarAppearance')) {
    const insertPos = content.lastIndexOf('</dict>');
    if (insertPos !== -1) {
      const entry = `\t<key>UIViewControllerBasedStatusBarAppearance</key>\n\t<true/>\n`;
      content = content.slice(0, insertPos) + entry + content.slice(insertPos);
      modified = true;
      console.log('   ✅ Added UIViewControllerBasedStatusBarAppearance');
    }
  }

  // Ensure viewport-fit=cover is documented
  // (The actual viewport meta tag is in index.html, which we already have)

  if (modified) {
    fs.writeFileSync(infoPlistPath, content, 'utf8');
  } else {
    console.log('   ✅ iOS already configured for safe areas');
  }
}

// ============================================================================
// ANDROID: Add androidx.core dependency for WindowCompat
// ============================================================================

function ensureAndroidXCoreDependency() {
  console.log('\n   📦 Ensuring androidx.core dependency...');

  const appBuildPath = path.join(ANDROID_PATH, 'app', 'build.gradle');
  if (!fs.existsSync(appBuildPath)) return;

  let content = fs.readFileSync(appBuildPath, 'utf8');

  if (content.includes('androidx.core:core')) {
    console.log('      ✅ androidx.core already present');
    return;
  }

  // Add the dependency
  if (content.includes('dependencies {')) {
    content = content.replace(
      /dependencies\s*\{/,
      `dependencies {\n    implementation 'androidx.core:core:1.15.0'`
    );
    fs.writeFileSync(appBuildPath, content, 'utf8');
    console.log('      ✅ Added androidx.core:core:1.15.0 dependency');
  }
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  console.log('━'.repeat(60));
  console.log('  Edge-to-Edge Configuration Script');
  console.log('  Android + iOS safe area support');
  console.log('━'.repeat(60));

  configureAndroidEdgeToEdge();
  ensureAndroidXCoreDependency();
  configureIOSEdgeToEdge();

  console.log('\n' + '━'.repeat(60));
  console.log('  ✅ Edge-to-Edge configuration complete!');
  console.log('');
  console.log('  CSS env() values now available:');
  console.log('    • env(safe-area-inset-top)    → Status bar / notch');
  console.log('    • env(safe-area-inset-bottom)  → Nav buttons / home indicator');
  console.log('    • env(safe-area-inset-left)    → Rounded corners');
  console.log('    • env(safe-area-inset-right)   → Rounded corners');
  console.log('━'.repeat(60));
}

main();
