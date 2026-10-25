"use client";

import { useEffect, useState } from "react";

// The site's side of the iOS and Android apps (capacitor.config.ts). Inside them Capacitor
// injects window.Capacitor; in a normal browser none of this does anything, and the plugin
// code is only loaded inside the apps.

type CapacitorGlobal = { isNativePlatform?: () => boolean };
const isNative = () => typeof window !== "undefined" && !!(window as { Capacitor?: CapacitorGlobal }).Capacitor?.isNativePlatform?.();

/** True (after hydration) when the page is running inside the Qubool app. */
export function useNativeApp() {
  const [native, setNative] = useState(false);
  useEffect(() => setNative(isNative()), []);
  return native;
}

/** Opens the phone's share sheet for a link. Returns false outside the apps or if it fails. */
export async function nativeShare(url: string, text?: string) {
  if (!isNative()) return false;
  const { Share } = await import("@capacitor/share");
  return Share.share({ url, text, dialogTitle: "Share" }).then(() => true, (e: Error) => /cancel/i.test(e.message));
}

/** Mounted once in the root layout. */
export function NativeBridge() {
  useEffect(() => {
    if (!isNative()) return;
    document.documentElement.classList.add("native-app");
    let remove = () => {};
    void (async () => {
      const [{ App }, { SplashScreen }] = await Promise.all([import("@capacitor/app"), import("@capacitor/splash-screen")]);
      await SplashScreen.hide({ fadeOutDuration: 200 });
      // A qubool.app link tapped elsewhere (an invitation, a sign-in email) opened the app:
      // show that page here. Same path on this origin, so local test builds stay local.
      // qubool://i/<token> works too (Info.plist / AndroidManifest.xml), without universal links.
      const handle = await App.addListener("appUrlOpen", ({ url }) => {
        const to = new URL(url);
        if (to.protocol === "qubool:") return window.location.assign(`/${to.hostname}${to.pathname}${to.search}${to.hash}`);
        if (!/(^|\.)qubool\.app$/.test(to.hostname)) return;
        window.location.assign(to.pathname + to.search + to.hash);
      });
      remove = () => void handle.remove();
    })();
    return () => remove();
  }, []);
  return null;
}
