import { generateKeyPairSync } from "node:crypto";
import { connect, createServer, type Http2Server } from "node:http2";

// A stand-in for Apple's push service (plain HTTP/2, no TLS), started by global-setup.ts.
// The app server (playwright.config.ts) sends to it via APNS_URL with a throwaway key;
// tests read what it received with apnsSent() and clear it with clearApns().
// Tokens starting with "dead" answer like an uninstalled app (410 Unregistered).

export const APNS_MOCK_PORT = Number(process.env.APNS_MOCK_PORT ?? 3997);
export const APNS_MOCK_URL = `http://127.0.0.1:${APNS_MOCK_PORT}`;
export const APNS_TEST_KEY = generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();

export interface SentPush { token: string; topic: string; title: string; body: string; url?: string }

export function startApnsMock(): Promise<Http2Server> {
  let sent: SentPush[] = [];
  const server = createServer(async (req, res) => {
    const reply = (status: number, body?: unknown) => { res.writeHead(status, { "content-type": "application/json" }); res.end(body === undefined ? "" : JSON.stringify(body)); };
    let raw = "";
    for await (const chunk of req) raw += chunk;
    if (req.url === "/__sent") {
      if (req.method === "DELETE") sent = [];
      return reply(200, sent);
    }
    const token = /^\/3\/device\/(.+)$/.exec(req.url)?.[1];
    if (req.method !== "POST" || !token) return reply(404, { reason: "BadPath" });
    if (!String(req.headers.authorization ?? "").startsWith("bearer ey")) return reply(403, { reason: "MissingProviderToken" });
    if (token.startsWith("dead")) return reply(410, { reason: "Unregistered" });
    const p = JSON.parse(raw) as { aps: { alert: { title: string; body: string } }; url?: string };
    sent.push({ token, topic: String(req.headers["apns-topic"]), title: p.aps.alert.title, body: p.aps.alert.body, url: p.url });
    reply(200);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(APNS_MOCK_PORT, "127.0.0.1", () => resolve(server));
  });
}

/** What the mock received (it speaks only HTTP/2, which fetch doesn't). */
function call(method: "GET" | "DELETE"): Promise<SentPush[]> {
  return new Promise((resolve, reject) => {
    const session = connect(APNS_MOCK_URL);
    session.on("error", reject);
    const req = session.request({ ":method": method, ":path": "/__sent" });
    let body = "";
    req.on("data", (c) => { body += c; });
    req.on("end", () => { session.close(); resolve(JSON.parse(body)); });
    req.on("error", reject);
    req.end();
  });
}
export const apnsSent = () => call("GET");
export const clearApns = () => call("DELETE").then(() => {});
