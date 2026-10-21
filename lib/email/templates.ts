// Branded email templates. Plain inline-styled HTML (tables, no external CSS or
// images) so it renders the same in Gmail, Outlook and Apple Mail, plus a plain
// text part. Every link is absolute: the caller passes full URLs.

export interface Email {
  subject: string;
  html: string;
  text: string;
}

interface Layout {
  subject: string;
  /** Small caps line above the heading, e.g. the couple's names. */
  eyebrow?: string;
  heading: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  footer: string;
}

const C = { ivory: "#fbf8f2", cream: "#f4eee3", ink: "#2b2620", muted: "#7b7166", gold: "#b08d57", line: "#e7ddcd" };
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const SANS = "Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function render(l: Layout): Email {
  const p = l.paragraphs.map((x) => `<p style="margin:0 0 16px;font:16px/1.6 ${SANS};color:${C.ink}">${esc(x)}</p>`).join("");
  const cta = l.cta ? `
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr><td style="background:${C.ink};border-radius:999px">
            <a href="${esc(l.cta.url)}" style="display:inline-block;padding:12px 28px;font:600 15px ${SANS};color:${C.ivory};text-decoration:none">${esc(l.cta.label)}</a>
          </td></tr></table>
          <p style="margin:0 0 8px;font:12px/1.5 ${SANS};color:${C.muted}">Or copy this link into your browser:<br><a href="${esc(l.cta.url)}" style="color:${C.gold};word-break:break-all">${esc(l.cta.url)}</a></p>` : "";
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(l.subject)}</title></head>
<body style="margin:0;padding:0;background:${C.cream}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream}"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.ivory};border:1px solid ${C.line};border-radius:20px">
      <tr><td style="padding:36px 36px 8px;text-align:center">
        <div style="font:20px ${SERIF};letter-spacing:3px;color:${C.gold}">&#10022;</div>
        ${l.eyebrow ? `<p style="margin:12px 0 0;font:600 11px ${SANS};letter-spacing:2px;text-transform:uppercase;color:${C.muted}">${esc(l.eyebrow)}</p>` : ""}
        <h1 style="margin:10px 0 0;font:500 30px/1.25 ${SERIF};color:${C.ink}">${esc(l.heading)}</h1>
      </td></tr>
      <tr><td style="padding:24px 36px 20px">${p}${cta}</td></tr>
      <tr><td style="padding:18px 36px 28px;border-top:1px solid ${C.line}">
        <p style="margin:0;font:12px/1.5 ${SANS};color:${C.muted}">${esc(l.footer)}</p>
        <p style="margin:8px 0 0;font:12px ${SERIF};letter-spacing:1px;color:${C.gold}">Sent with Qubool</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  const text = [l.eyebrow, l.heading, "", ...l.paragraphs.flatMap((x) => [x, ""]),
    ...(l.cta ? [`${l.cta.label}: ${l.cta.url}`, ""] : []), "--", l.footer].filter((x) => x !== undefined).join("\n");
  return { subject: l.subject, html, text };
}

export interface Couple { partner1: string; partner2: string }
const names = (w: Couple) => `${w.partner1} & ${w.partner2}`;
const personal = "This link is personal to your family. Please don't forward it.";

export function invitationEmail(o: { wedding: Couple; household: string; link: string }) {
  return render({
    subject: `You're invited · ${names(o.wedding)}`,
    eyebrow: "Together with their families", heading: names(o.wedding),
    paragraphs: [`Assalamu alaikum ${o.household},`, `You are warmly invited to the wedding of ${names(o.wedding)}. Your personal invitation has every event you're invited to, with the details and a place to RSVP for your family.`],
    cta: { label: "Open your invitation", url: o.link }, footer: personal,
  });
}

export function saveTheDateEmail(o: { wedding: Couple; household: string; link: string }) {
  return render({
    subject: `Save the date · ${names(o.wedding)}`,
    eyebrow: "Save the date", heading: names(o.wedding),
    paragraphs: [`Assalamu alaikum ${o.household},`, `Please save the date for the wedding of ${names(o.wedding)}. A formal invitation will follow, and your personal page already has the dates.`],
    cta: { label: "See the dates", url: o.link }, footer: personal,
  });
}

export function reminderEmail(o: { wedding: Couple; household: string; link: string; event?: string }) {
  const ev = o.event ? `the ${o.event}` : "our wedding";
  return render({
    subject: `Kind reminder to RSVP · ${o.event ?? names(o.wedding)}`,
    eyebrow: names(o.wedding), heading: "A kind reminder to RSVP",
    paragraphs: [`Assalamu alaikum ${o.household},`, `We'd love to know if you can join us for ${ev}. It only takes a moment, and you can change your answer until the RSVP deadline.`],
    cta: { label: "Reply now", url: o.link }, footer: personal,
  });
}

export function linkResendEmail(o: { wedding: Couple; household: string; link: string }) {
  return render({
    subject: `Your invitation from ${names(o.wedding)}`,
    eyebrow: names(o.wedding), heading: "Here's your invitation link",
    paragraphs: [`Assalamu alaikum ${o.household},`, "Someone asked us to send your personal invitation link again. Here it is."],
    cta: { label: "Open your invitation", url: o.link },
    footer: "If you didn't ask for this, you can ignore this email. The link only ever goes to the contact the couple has on file.",
  });
}

export function collaboratorInviteEmail(o: { wedding: Couple; inviter: string; hasAccount: boolean; link: string }) {
  return render({
    subject: `${o.inviter} invited you to help plan ${names(o.wedding)}'s wedding`,
    eyebrow: "Qubool", heading: `Help plan ${names(o.wedding)}'s wedding`,
    paragraphs: [`Assalamu alaikum,`, `${o.inviter} has invited you to plan ${names(o.wedding)}'s wedding with them on Qubool.`,
      o.hasAccount ? "You've been added already. Sign in to start planning." : "Create a Qubool account with this email address to accept. You'll join the wedding as soon as your email is verified."],
    cta: { label: o.hasAccount ? "Sign in" : "Create your account", url: o.link },
    footer: "You received this because someone entered your email address on Qubool. If you weren't expecting it, you can ignore this email.",
  });
}

export function inquiryEmail(o: { subject: string; message: string; link: string }) {
  return render({
    subject: o.subject, eyebrow: "Qubool marketplace", heading: "You have a new inquiry",
    paragraphs: [o.subject + ":", o.message],
    cta: { label: "Reply from your vendor portal", url: o.link },
    footer: "You received this because your business is listed on the Qubool marketplace.",
  });
}
