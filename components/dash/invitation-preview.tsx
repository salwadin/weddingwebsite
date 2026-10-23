"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button, Select } from "@/components/ui";
import { invitationSvg, PALETTES, type CardProps } from "@/lib/invitation-card";

export interface PreviewProps extends CardProps {
  showQr: boolean;
  recipients: { name: string; link: string }[]; // first entry may be the public link
}

export function InvitationPreview(p: PreviewProps) {
  const [who, setWho] = useState(0);
  const [qr, setQr] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const r = p.recipients[who];

  useEffect(() => {
    if (!p.showQr || !r) { setQr(""); return; }
    QRCode.toDataURL(window.location.origin + r.link, { margin: 0, width: 220, color: { dark: PALETTES[p.template].ink, light: "#00000000" } }).then(setQr);
  }, [r, p.showQr, p.template]);

  const svg = useMemo(() => invitationSvg(p, { dear: r && !r.link.startsWith("/w/") ? r.name : undefined, qr: qr || undefined }), [p, qr, r]);

  const download = async () => {
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    await img.decode();
    const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 1720;
    const ctx = canvas.getContext("2d")!; ctx.drawImage(img, 0, 0, 1200, 1720);
    const a = document.createElement("a"); a.download = `${p.eventName.toLowerCase()}-invitation${r && !r.link.startsWith("/w/") ? "-" + r.name.replace(/[^a-z]+/gi, "-").toLowerCase() : ""}.png`;
    a.href = canvas.toDataURL("image/png"); a.click();
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select value={who} onChange={(e) => setWho(Number(e.target.value))} className="h-9 flex-1 text-xs" aria-label="Preview for">
          {p.recipients.map((x, i) => <option key={x.link} value={i}>{x.link.startsWith("/w/") ? `Public: ${x.name}` : `Personalized for ${x.name}`}</option>)}
        </Select>
        <Button type="button" size="sm" variant="outline" onClick={download}>Download PNG</Button>
      </div>
      <div ref={ref} className="mx-auto max-w-[420px] overflow-hidden rounded-xl [&>svg]:h-auto [&>svg]:w-full shadow-[0_20px_60px_-30px_rgba(43,38,32,0.5)]" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
