import "server-only";
import { sign } from "node:crypto";
import type { PushMessage, PushResult } from "./apns";

// Firebase Cloud Messaging HTTP v1, for the Android app. Notifications go out only when
// FCM_SERVICE_ACCOUNT holds the Firebase service-account JSON (Firebase console → Project
// settings → Service accounts → Generate new private key). Without it nothing is sent.

type ServiceAccount = { project_id: string; client_email: string; private_key: string };
function account(): ServiceAccount | null {
  try {
    const a = JSON.parse(process.env.FCM_SERVICE_ACCOUNT || "null") as ServiceAccount | null;
    return a?.project_id && a.client_email && a.private_key ? a : null;
  } catch {
    return null;
  }
}
export const fcmEnabled = () => !!account();

/** Must match the channel the app creates (components/native-bridge.tsx). */
export const ANDROID_CHANNEL = "updates";

// A service-account JWT exchanged for an OAuth access token, which lasts an hour.
let access: { token: string; until: number } | null = null;
async function accessToken(a: ServiceAccount) {
  if (access && Date.now() < access.until) return access.token;
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const input = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: a.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  })}`;
  const assertion = `${input}.${sign("sha256", Buffer.from(input), a.private_key).toString("base64url")}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) throw new Error(`Google sign-in failed (${res.status})`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  access = { token: j.access_token, until: Date.now() + (j.expires_in - 300) * 1000 };
  return access.token;
}

/** Sends one notification to each Android token (FCM has no batch send in v1). */
export async function sendFcm(tokens: string[], msg: PushMessage): Promise<PushResult[]> {
  const a = account()!;
  let bearer: string;
  try {
    bearer = await accessToken(a);
  } catch (e) {
    return tokens.map(() => ({ ok: false, gone: false, error: `FCM: ${(e as Error).message}` }));
  }
  return Promise.all(tokens.map(async (token): Promise<PushResult> => {
    try {
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${a.project_id}/messages:send`, {
        method: "POST",
        headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json" },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: msg.title, body: msg.body },
            data: msg.url ? { url: msg.url } : undefined,
            android: { priority: "high", notification: { channel_id: ANDROID_CHANNEL } },
          },
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) return { ok: true };
      const err = ((await res.json().catch(() => ({}))) as { error?: { status?: string; details?: { errorCode?: string }[] } }).error;
      const code = err?.details?.find((d) => d.errorCode)?.errorCode ?? err?.status ?? "";
      // UNREGISTERED: the app was removed or the token rotated. INVALID_ARGUMENT here is a malformed token.
      return { ok: false, gone: code === "UNREGISTERED" || (res.status === 400 && code === "INVALID_ARGUMENT"), error: `FCM ${res.status} ${code}`.trim() };
    } catch (e) {
      return { ok: false, gone: false, error: `FCM: ${(e as Error).message}` };
    }
  }));
}
