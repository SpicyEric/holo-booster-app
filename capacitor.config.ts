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
    // NFC Permissions for iOS
    // These entries will be added to Info.plist
    contentInset: 'automatic',
    allowsLinkPreview: true,
  },
  plugins: {
    // NFC Plugin Configuration
    CapacitorNfc: {
      // Enable foreground dispatch for better NFC handling
    },
  },
};

// IMPORTANT: After running `npx cap add ios`, manually add these entries to ios/App/App/Info.plist:
//
// <key>NFCReaderUsageDescription</key>
// <string>Diese App nutzt NFC um Treuepunkte bei teilnehmenden Händlern zu sammeln.</string>
//
// <key>com.apple.developer.nfc.readersession.iso7816.select-identifiers</key>
// <array>
//   <string>D276000085010100</string>
// </array>
//
// <key>com.apple.developer.nfc.readersession.felica.systemcodes</key>
// <array>
//   <string>0000</string>
// </array>
//
// Also add to ios/App/App/App.entitlements:
// <key>com.apple.developer.nfc.readersession.formats</key>
// <array>
//   <string>NDEF</string>
//   <string>TAG</string>
// </array>

export default config;
