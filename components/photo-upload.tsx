"use client";

import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { startUpload } from "@/lib/actions/uploads";
import type { UploadPurpose } from "@/lib/uploads";

type Item = { path: string; preview: string };

/**
 * Uploads images straight to storage (lib/uploads.ts) and adds each one's path to the
 * surrounding form as a hidden `name` input, so the form's own Save button stores it.
 * Nothing is saved until the form is.
 */
export function PhotoUpload({ purpose, name, multiple = false, eventId, label = "Choose a photo" }: {
  purpose: UploadPurpose; name: string; multiple?: boolean; eventId?: string; label?: string;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState("");

  const upload = async (file: File) => {
    const start = await startUpload(purpose, file.type, file.size, eventId);
    if ("error" in start) { setError(start.error); return; }
    // The same request Supabase's own client sends to a signed upload URL.
    const body = new FormData();
    body.append("cacheControl", "31536000");
    body.append("", file);
    const res = await fetch(start.url, { method: "PUT", body, headers: { "x-upsert": "false" } }).catch(() => null);
    if (!res?.ok) { setError("The upload didn't finish. Please try again."); return; }
    const item = { path: start.path, preview: URL.createObjectURL(file) };
    setItems((prev) => (multiple ? [...prev, item] : [item]));
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError("");
    const list = [...files].slice(0, multiple ? 20 : 1);
    setBusy((n) => n + list.length);
    for (const f of list) { await upload(f); setBusy((n) => n - 1); }
  };

  return (
    <div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm hover:bg-cream/60">
        <ImagePlus className="h-4 w-4 text-gold" />{label}
        <input type="file" accept="image/png,image/jpeg,image/webp" multiple={multiple} className="sr-only" data-upload={purpose}
          onChange={(e) => { void onFiles(e.target.files); e.target.value = ""; }} />
      </label>
      <p aria-live="polite" className="mt-1.5 text-xs text-muted">
        {busy > 0 ? `Uploading ${busy} photo${busy > 1 ? "s" : ""}…` : items.length ? `${items.length} ready. Save to keep ${items.length > 1 ? "them" : "it"}.` : ""}
      </p>
      {error && <p className="mt-1 text-xs text-[#9b4d47]">{error}</p>}
      {items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((it) => (
            <div key={it.path} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.preview} alt="New upload" className="h-20 w-20 rounded-lg object-cover" />
              <input type="hidden" name={name} value={it.path} />
              <button type="button" aria-label="Don't use this photo" onClick={() => setItems((p) => p.filter((x) => x.path !== it.path))}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 shadow"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
