import "server-only";
import { sign } from "node:crypto";
import { connect, type ClientHttp2Session } from "node:http2";

// Apple Push Notification service, token auth (a .p8 key), over HTTP/2.
// Notifications go out only when APNS_KEY, APNS_KEY_ID and a team id (APNS_TEAM_ID, or
// APPLE_TEAM_ID from the universal-link setup) are set. Without them nothing is sent.

const key = () => process.env.APNS_KEY?.replace(/\\n/g, "\n").trim();
const teamId = () => process.env.APNS_TEAM_ID || process.env.APPLE_TEAM_ID;
export const apnsEnabled = () => !!(key() && process.env.APNS_KEY_ID && teamId());

const HOSTS = { production: "https://api.push.apple.com", sandbox: "https://api.sandbox.push.apple.com" };
type Env = keyof typeof HOSTS;

export type PushMessage = { title: string; body: string; url?: string };
/** `gone`: the token is dead (app deleted, notifications reset); forget it. */
export type PushResult = { ok: true } | { ok: false; gone: boolean; error: string };

// APNs wants the same signed token reused for up to an hour, and refuses new ones more
// often than every 20 minutes.
let jwt: { value: string; at: number } | null = null;
function bearer() {
  if (jwt && Date.now() - jwt.at < 50 * 60_000) return jwt.value;
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const at = Date.now();
  const input = `${b64({ alg: "ES256", kid: process.env.APNS_KEY_ID })}.${b64({ iss: teamId(), iat: Math.floor(at / 1000) })}`;
  const sig = sign("sha256", Buffer.from(input), { key: key()!, dsaEncoding: "ieee-p1363" }).toString("base64url");
  jwt = { value: `${input}.${sig}`, at };
  return jwt.value;
}

function post(session: ClientHttp2Session, token: string, payload: string) {
  return new Promise<{ status: number; reason?: string }>((resolve, reject) => {
    const req = session.request({
      ":method": "POST", ":path": `/3/device/${token}`,
      authorization: `bearer ${bearer()}`,
      "apns-topic": process.env.APNS_BUNDLE_ID || "app.qubool",
      "apns-push-type": "alert", "apns-priority": "10",
      "content-type": "application/json",
    });
    let status = 0, body = "";
    req.setTimeout(10_000, () => req.close());
    req.on("response", (h) => { status = Number(h[":status"]); });
    req.on("data", (c) => { body += c; });
    req.on("end", () => {
      let reason: string | undefined;
      try { reason = body ? (JSON.parse(body) as { reason?: string }).reason : undefined; } catch { /* not JSON */ }
      resolve({ status, reason });
    });
    req.on("error", reject);
    req.end(payload);
  });
}

/**
 * Sends one notification to each iPhone token. Store builds (TestFlight, App Store) get
 * production tokens and builds run from Xcode get sandbox ones, which can't be told apart,
 * so a token production rejects as BadDeviceToken is tried once on the sandbox.
 */
export async function sendApns(tokens: string[], msg: PushMessage): Promise<PushResult[]> {
  const payload = JSON.stringify({ aps: { alert: { title: msg.title, body: msg.body }, sound: "default" }, url: msg.url });
  const sessions: Partial<Record<Env, ClientHttp2Session>> = {};
  const session = (env: Env) => {
    const s = sessions[env];
    if (s && !s.closed && !s.destroyed) return s;
    const fresh = connect(process.env.APNS_URL || HOSTS[env]); // APNS_URL: the tests' mock (tests/apns-mock.ts)
    fresh.on("error", () => {}); // surfaced by the request instead
    return (sessions[env] = fresh);
  };
  try {
    return await Promise.all(tokens.map(async (token): Promise<PushResult> => {
      try {
        let r = await post(session("production"), token, payload);
        if (r.status === 400 && r.reason === "BadDeviceToken") r = await post(session("sandbox"), token, payload);
        if (r.status === 200) return { ok: true };
        const gone = r.status === 410 || r.reason === "BadDeviceToken" || r.reason === "Unregistered" || r.reason === "DeviceTokenNotForTopic";
        return { ok: false, gone, error: `APNs ${r.status} ${r.reason ?? ""}`.trim() };
      } catch (e) {
        return { ok: false, gone: false, error: `APNs: ${(e as Error).message}` };
      }
    }));
  } finally {
    for (const s of Object.values(sessions)) s?.close();
  }
}
