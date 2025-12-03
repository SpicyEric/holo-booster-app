import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.3ee30c314eaa4550a0fd340678fe1b0c',
  appName: 'holo-booster-app',
  webDir: 'dist',
  server: {
    url: 'https://3ee30c31-4eaa-4550-a0fd-340678fe1b0c.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: true,
  },
  android: {
    // Deep Links für Android
    allowMixedContent: true,
  },
  plugins: {
    // App Plugin für Deep Links
    App: {
      // URL Schemes die die App öffnen
      // eloyo://scan?chip=XXX
    },
    // NFC Plugin Configuration
    CapacitorNfc: {
      // NFC Foreground Dispatch
    },
  },
  // Deep Link URL Schemes
  // Diese müssen auch in den nativen Projekten konfiguriert werden
};

// IMPORTANT: After running `npx cap add ios`, manually add these entries to ios/App/App/Info.plist:
//
// NFC Permissions:
// <key>NFCReaderUsageDescription</key>
// <string>Diese App nutzt NFC um Treuepunkte bei teilnehmenden Händlern zu sammeln.</string>
//
// <key>com.apple.developer.nfc.readersession.iso7816.select-identifiers</key>
// <array>
//   <string>D276000085010100</string>
// </array>
//
// Deep Link URL Scheme (in URL Types):
// <key>CFBundleURLTypes</key>
// <array>
//   <dict>
//     <key>CFBundleURLSchemes</key>
//     <array>
//       <string>eloyo</string>
//     </array>
//     <key>CFBundleURLName</key>
//     <string>app.lovable.3ee30c314eaa4550a0fd340678fe1b0c</string>
//   </dict>
// </array>
//
// Universal Links (Associated Domains in App.entitlements):
// <key>com.apple.developer.associated-domains</key>
// <array>
//   <string>applinks:eloyo.de</string>
// </array>

export default config;
