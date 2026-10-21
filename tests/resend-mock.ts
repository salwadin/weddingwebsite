import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";

// A stand-in for the Resend API, started by global-setup.ts. The app server
// (playwright.config.ts) sends to it via RESEND_API_URL; tests read what it
// received from GET /__sent and clear it with DELETE /__sent.
// Any address containing "+reject" gets a 422, like Resend's validation errors.

export const RESEND_MOCK_PORT = Number(process.env.RESEND_MOCK_PORT ?? 3999);
export const RESEND_MOCK_URL = `http://127.0.0.1:${RESEND_MOCK_PORT}`;

export interface SentEmail { id: string; from: string; to: string[]; subject: string; html: string; text: string; idempotencyKey?: string }

export function startResendMock(): Promise<Server> {
  let sent: SentEmail[] = [];
  const server = createServer(async (req, res) => {
    const reply = (status: number, body: unknown) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
    let raw = "";
    for await (const chunk of req) raw += chunk;
    if (req.url === "/__sent") {
      if (req.method === "DELETE") sent = [];
      return reply(200, sent);
    }
    if (req.method !== "POST" || req.url !== "/emails/batch") return reply(404, { name: "not_found", message: "Not found" });
    if (!req.headers.authorization?.startsWith("Bearer re_")) return reply(401, { name: "missing_api_key", message: "Missing API key" });
    const batch = JSON.parse(raw) as Omit<SentEmail, "id">[];
    if (batch.some((e) => e.to.some((t) => t.includes("+reject")))) return reply(422, { name: "validation_error", message: "Invalid `to` field" });
    const key = req.headers["idempotency-key"] as string | undefined;
    const out = batch.map((e) => ({ ...e, id: randomUUID(), idempotencyKey: key }));
    sent.push(...out);
    reply(200, { data: out.map((e) => ({ id: e.id })) });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(RESEND_MOCK_PORT, "127.0.0.1", () => resolve(server));
  });
}
