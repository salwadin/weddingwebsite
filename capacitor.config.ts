import type { CapacitorConfig } from "@capacitor/cli";

// The iOS and Android apps (mobile/) are native shells around the live site: the web view
// loads qubool.app itself, so a deploy updates the apps too, and sign-in uses the site's own
// Supabase cookies. The site adds the native parts when it runs inside them
// (components/native-bridge.tsx, lib/native.ts).
//
// For local testing point the shell at the dev server, then sync:
//   CAP_SERVER_URL=http://localhost:3000 npx cap sync
// (Android emulators reach this Mac at http://10.0.2.2:3000.) Sync again without it before a store build.
const url = process.env.CAP_SERVER_URL || "https://www.qubool.app";
const local = url.startsWith("http://");

const config: CapacitorConfig = {
  appId: "app.qubool",
  appName: "Qubool",
  // Only the offline page ships inside the app; everything else comes from `url`.
  webDir: "mobile/www",
  // The site recognises the apps by this (lib/native.ts).
  appendUserAgent: "QuboolApp",
  backgroundColor: "#fbf8f2",
  server: { url, cleartext: local, errorPath: "offline.html" },
  ios: { path: "mobile/ios", contentInset: "automatic", scheme: "Qubool" },
  android: { path: "mobile/android", allowMixedContent: false },
  plugins: {
    SplashScreen: { launchShowDuration: 2500, launchAutoHide: true, backgroundColor: "#fbf8f2", showSpinner: false },
    StatusBar: { style: "LIGHT", backgroundColor: "#fbf8f2", overlaysWebView: false },
  },
};

export default config;
