// Draws a designed invitation card as SVG. Pure, so the dashboard preview (client)
// and the guest's invitation page (server) render exactly the same card.

export type CardTemplate = "arch" | "jali" | "minimal";

export interface CardProps {
  template: CardTemplate;
  englishText: string; urduText: string; arabicText: string;
  eventName: string; dateLine: string; islamicLine: string; timeLine: string; venue: string; address: string;
  names: string;
}

export const PALETTES: Record<CardTemplate, { bg: string; ink: string; accent: string; soft: string }> = {
  arch: { bg: "#fbf8f2", ink: "#2b2620", accent: "#b08d57", soft: "#f4eee3" },
  jali: { bg: "#fcf5f3", ink: "#3a2a28", accent: "#b77a74", soft: "#f3e1dd" },
  minimal: { bg: "#ffffff", ink: "#26302a", accent: "#6f8466", soft: "#e7ebe1" },
};

function wrap(text: string, max: number) {
  const words = text.split(/\s+/); const lines: string[] = []; let cur = "";
  for (const w of words) { if ((cur + " " + w).trim().length > max) { if (cur) lines.push(cur); cur = w; } else cur = (cur + " " + w).trim(); }
  if (cur) lines.push(cur);
  return lines;
}
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The card as an SVG string. `dear` adds a "Dear …," line; `qr` is a data URL for an RSVP QR code. */
export function invitationSvg(p: CardProps, opts: { dear?: string; qr?: string } = {}) {
  const c = PALETTES[p.template] ?? PALETTES.arch;
  const W = 600, H = 860, cx = W / 2;
  const serif = "Cormorant Garamond, Georgia, serif";
  const parts: string[] = [];
  parts.push(`<rect width="${W}" height="${H}" fill="${c.bg}"/>`);
  if (p.template === "jali") {
    let pat = "";
    for (let x = 0; x <= W; x += 40) for (const y of [0, H - 40]) pat += `<path d="M${x + 20} ${y + 4} L${x + 36} ${y + 20} L${x + 20} ${y + 36} L${x + 4} ${y + 20} Z" fill="none" stroke="${c.accent}" stroke-opacity=".45"/>`;
    for (let y = 40; y < H - 40; y += 40) for (const x of [0, W - 40]) pat += `<path d="M${x + 20} ${y + 4} L${x + 36} ${y + 20} L${x + 20} ${y + 36} L${x + 4} ${y + 20} Z" fill="none" stroke="${c.accent}" stroke-opacity=".45"/>`;
    parts.push(pat, `<rect x="52" y="52" width="${W - 104}" height="${H - 104}" fill="none" stroke="${c.accent}" stroke-width="1.2"/>`);
  } else if (p.template === "minimal") {
    parts.push(`<rect x="28" y="28" width="${W - 56}" height="${H - 56}" fill="none" stroke="${c.accent}" stroke-width="1"/><rect x="36" y="36" width="${W - 72}" height="${H - 72}" fill="none" stroke="${c.accent}" stroke-width=".6"/>`);
  } else {
    parts.push(`<path d="M60 820 V300 A240 240 0 0 1 540 300 V820 Z" fill="none" stroke="${c.accent}" stroke-width="1.5"/>`);
    parts.push(`<path d="M76 806 V304 A224 224 0 0 1 524 304 V806 Z" fill="none" stroke="${c.accent}" stroke-opacity=".45" stroke-width="1"/>`);
  }
  let y = p.template === "jali" || p.template === "minimal" ? 120 : 150;
  if (p.arabicText) { parts.push(`<text x="${cx}" y="${y}" text-anchor="middle" font-family="Amiri, serif" font-size="26" fill="${c.accent}" direction="rtl">${esc(p.arabicText)}</text>`); y += 46; }
  if (opts.dear) { parts.push(`<text x="${cx}" y="${y}" text-anchor="middle" font-family="${serif}" font-style="italic" font-size="19" fill="${c.ink}" opacity=".75">Dear ${esc(opts.dear)},</text>`); y += 36; }
  for (const line of wrap(p.englishText, 46)) { parts.push(`<text x="${cx}" y="${y}" text-anchor="middle" font-family="${serif}" font-size="18" fill="${c.ink}" opacity=".85">${esc(line)}</text>`); y += 26; }
  y += 30;
  parts.push(`<text x="${cx}" y="${y}" text-anchor="middle" font-family="${serif}" font-size="54" fill="${c.ink}">${esc(p.names)}</text>`); y += 34;
  parts.push(`<path d="M${cx - 70} ${y} H${cx - 12} M${cx + 12} ${y} H${cx + 70}" stroke="${c.accent}"/><path d="M${cx} ${y - 7} L${cx + 7} ${y} L${cx} ${y + 7} L${cx - 7} ${y} Z" fill="none" stroke="${c.accent}"/>`); y += 44;
  parts.push(`<text x="${cx}" y="${y}" text-anchor="middle" font-family="${serif}" font-size="15" letter-spacing="5" fill="${c.accent}">${esc(p.eventName.toUpperCase())}</text>`); y += 36;
  parts.push(`<text x="${cx}" y="${y}" text-anchor="middle" font-family="${serif}" font-size="22" fill="${c.ink}">${esc(p.dateLine)}</text>`); y += 24;
  if (p.islamicLine) { parts.push(`<text x="${cx}" y="${y}" text-anchor="middle" font-family="${serif}" font-size="15" fill="${c.ink}" opacity=".6">${esc(p.islamicLine)}</text>`); y += 26; }
  parts.push(`<text x="${cx}" y="${y}" text-anchor="middle" font-family="${serif}" font-size="18" fill="${c.ink}">${esc(p.timeLine)}</text>`); y += 34;
  parts.push(`<text x="${cx}" y="${y}" text-anchor="middle" font-family="${serif}" font-size="20" fill="${c.ink}">${esc(p.venue)}</text>`); y += 22;
  parts.push(`<text x="${cx}" y="${y}" text-anchor="middle" font-family="${serif}" font-size="14" fill="${c.ink}" opacity=".6">${esc(p.address)}</text>`); y += 34;
  if (p.urduText) { parts.push(`<text x="${cx}" y="${y}" text-anchor="middle" font-family="Noto Nastaliq Urdu, serif" font-size="17" fill="${c.ink}" opacity=".8" direction="rtl">${esc(p.urduText)}</text>`); y += 40; }
  if (opts.qr) {
    const size = 92, qy = Math.min(y, H - size - 70);
    parts.push(`<image href="${opts.qr}" x="${cx - size / 2}" y="${qy}" width="${size}" height="${size}"/>`);
    parts.push(`<text x="${cx}" y="${qy + size + 20}" text-anchor="middle" font-family="${serif}" font-size="12" letter-spacing="2" fill="${c.ink}" opacity=".6">SCAN TO RSVP</text>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${parts.join("")}</svg>`;
}
