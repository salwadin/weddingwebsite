import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";

// A stand-in for Twilio's Messages API, started by global-setup.ts. The app server
// (playwright.config.ts) sends to it via TWILIO_API_URL; tests read what it received
// from GET /__sent and clear it with DELETE /__sent.
// Numbers ending in 0199 answer like a guest who replied STOP (Twilio error 21610).

export const TWILIO_MOCK_PORT = Number(process.env.TWILIO_MOCK_PORT ?? 3998);
export const TWILIO_MOCK_URL = `http://127.0.0.1:${TWILIO_MOCK_PORT}`;
export const TWILIO_TEST = { sid: "ACqubooltest", token: "qubool-local-twilio-token", from: "+18885550100" };

export interface SentSms { sid: string; to: string; from: string; body: string; statusCallback: string }

export function startTwilioMock(): Promise<Server> {
  let sent: SentSms[] = [];
  const server = createServer(async (req, res) => {
    const reply = (status: number, body: unknown) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
    let raw = "";
    for await (const chunk of req) raw += chunk;
    if (req.url === "/__sent") {
      if (req.method === "DELETE") sent = [];
      return reply(200, sent);
    }
    if (req.method !== "POST" || req.url !== `/2010-04-01/Accounts/${TWILIO_TEST.sid}/Messages.json`) return reply(404, { code: 20404, message: "Not found" });
    const auth = `Basic ${Buffer.from(`${TWILIO_TEST.sid}:${TWILIO_TEST.token}`).toString("base64")}`;
    if (req.headers.authorization !== auth) return reply(401, { code: 20003, message: "Authenticate" });
    const f = new URLSearchParams(raw);
    const to = f.get("To") ?? "";
    if (to.endsWith("0199")) return reply(400, { code: 21610, message: "Attempt to send to unsubscribed recipient" });
    const msg = { sid: `SM${randomUUID().replace(/-/g, "")}`, to, from: f.get("From") ?? f.get("MessagingServiceSid") ?? "", body: f.get("Body") ?? "", statusCallback: f.get("StatusCallback") ?? "" };
    sent.push(msg);
    reply(201, { sid: msg.sid, status: "queued" });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(TWILIO_MOCK_PORT, "127.0.0.1", () => resolve(server));
  });
}
