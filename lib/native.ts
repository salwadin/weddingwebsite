import "server-only";
import { headers } from "next/headers";

// The iOS and Android apps (capacitor.config.ts) load this site in a web view whose user
// agent ends in "QuboolApp".
//
// Inside them the site offers no purchases and no calls to buy elsewhere: plans and listing
// tiers are digital goods, which the App Store and Google Play only allow through their own
// in-app purchase. Existing plans still work in the apps; people buy on the website.
export const NATIVE_UA = "QuboolApp";

/** True when this request comes from the Qubool iOS or Android app. */
export async function inNativeApp() {
  return ((await headers()).get("user-agent") ?? "").includes(NATIVE_UA);
}
