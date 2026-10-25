"use client";

import { useEffect, useState } from "react";
import { registerDevice } from "@/lib/actions/push";

// The site's side of the iOS and Android apps (capacitor.config.ts). Inside them Capacitor
// injects window.Capacitor; in a normal browser none of this does anything, and the plugin
// code is only loaded inside the apps.

type CapacitorGlobal = { isNativePlatform?: () => boolean; getPlatform?: () => string; isPluginAvailable?: (name: string) => boolean };
const cap = () => (typeof window === "undefined" ? undefined : (window as { Capacitor?: CapacitorGlobal }).Capacitor);
const isNative = () => !!cap()?.isNativePlatform?.();

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

// ---------- push notifications (lib/push sends them) ----------

/** The app was built with push support. Android builds without google-services.json leave the plugin out (MainActivity.java). */
const pushAvailable = () => isNative() && !!cap()?.isPluginAvailable?.("PushNotifications");

/** "granted", "denied", "prompt", or null outside the apps / without push support. */
export async function pushPermission(): Promise<string | null> {
  if (!pushAvailable()) return null;
  const { PushNotifications } = await import("@capacitor/push-notifications");
  return (await PushNotifications.checkPermissions()).receive;
}

// Listeners go up once, before the first register() call, so the token isn't missed.
let listening: Promise<void> | null = null;
function listenForPush() {
  return (listening ??= (async () => {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const platform = cap()?.getPlatform?.() ?? "";
    // Each new or rotated token is saved for whoever is signed in on this phone.
    await PushNotifications.addListener("registration", ({ value }) => void registerDevice(value, platform));
    // Tapping a notification opens the page it's about (a path on this site, from lib/push/send.ts).
    await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
      const url = (notification.data as { url?: unknown } | undefined)?.url;
      if (typeof url === "string" && url.startsWith("/") && !url.startsWith("//")) window.location.assign(url);
    });
    // Android 8+ files notifications under a channel the person can mute separately (lib/push/fcm.ts).
    if (platform === "android") await PushNotifications.createChannel({ id: "updates", name: "Wedding updates", description: "RSVPs and inquiries", importance: 4 });
  })());
}

/**
 * Registers this phone for notifications, asking permission first if `ask` and the
 * person hasn't answered yet. Returns the permission afterwards.
 */
export async function enablePush(ask: boolean): Promise<string | null> {
  if (!pushAvailable()) return null;
  const { PushNotifications } = await import("@capacitor/push-notifications");
  await listenForPush();
  let { receive } = await PushNotifications.checkPermissions();
  if (ask && receive.startsWith("prompt")) ({ receive } = await PushNotifications.requestPermissions());
  if (receive === "granted") await PushNotifications.register();
  return receive;
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
      // A notification tapped while the app was closed is delivered once a listener exists.
      if (pushAvailable()) await listenForPush();
    })();
    return () => remove();
  }, []);
  return null;
}
