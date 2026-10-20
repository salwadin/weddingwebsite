// Personal invitation links: /i/<token>.
//
// The database stores only sha256(token) (invitation_tokens.token_hash), so a
// leaked database can't be used to open anyone's invitation. The raw token is
// derived from the row's id with a server-side secret, which lets organizers
// copy or re-send a household's link at any time. Rotating INVITE_TOKEN_SECRET
// therefore changes every link the dashboard shows; existing links keep working
// until they're regenerated, because the stored hash doesn't change.
import { createHash, createHmac } from "node:crypto";

function secret() {
  const s = process.env.INVITE_TOKEN_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("INVITE_TOKEN_SECRET is not set");
  return s || "qubool-dev-invite-secret";
}

/** The link token for an invitation_tokens row. 32 url-safe characters. */
export function deriveToken(tokenId: string) {
  return createHmac("sha256", secret()).update(`invite:${tokenId}`).digest("base64url").slice(0, 32);
}

/** sha256(token) in PostgREST's bytea hex format. */
export function tokenHashHex(token: string) {
  return "\\x" + createHash("sha256").update(token).digest("hex");
}
