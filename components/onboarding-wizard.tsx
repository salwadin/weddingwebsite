"use client";

import { useState, useTransition } from "react";
import { Check, Eye, EyeOff, Lock } from "lucide-react";
import { cn, EVENT_TYPES } from "@/lib/format";
import type { OnboardingInput } from "@/lib/actions/onboarding";
import type { EventType, RsvpMode, Side, Visibility } from "@/lib/types";
import { Button, Checkbox, Field, Input, Select, Textarea } from "./ui";

const STEPS = ["Names", "Events", "Dates & venues", "Visibility", "Theme", "Guests", "Invitations", "Publish"];

const DEFAULTS: Record<string, { visibility: Visibility; rsvpMode: RsvpMode; hostSide: Side }> = {
  nikkah: { visibility: "public", rsvpMode: "optional", hostSide: "both" },
  shaadi: { visibility: "invite", rsvpMode: "required", hostSide: "bride" },
  walima: { visibility: "invite", rsvpMode: "required", hostSide: "groom" },
  mehndi: { visibility: "private", rsvpMode: "required", hostSide: "bride" },
  dholki: { visibility: "private", rsvpMode: "optional", hostSide: "bride" },
  mayoun: { visibility: "private", rsvpMode: "optional", hostSide: "bride" },
  baraat: { visibility: "invite", rsvpMode: "required", hostSide: "groom" },
};

const THEMES = [
  { id: "noor", name: "Noor", c: ["#fbf8f2", "#b08d57", "#2b2620"] },
  { id: "gulab", name: "Gulab", c: ["#fcf7f5", "#b77a74", "#2b2620"] },
  { id: "zaitoon", name: "Zaitoon", c: ["#f8f8f3", "#6f8466", "#2b2620"] },
  { id: "mehtab", name: "Mehtab", c: ["#141a26", "#d2b07a", "#f3ede2"] },
] as const;

type Ev = OnboardingInput["events"][number];

function parseHouseholds(text: string, side: Side) {
  // "Mr. and Mrs. Ahmed & Family: Javed Ahmed, Farah Ahmed, Zayd Ahmed (child)"  or just "Hina Khan"
  return text.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const [name, rest] = l.includes(":") ? [l.slice(0, l.indexOf(":")), l.slice(l.indexOf(":") + 1)] : [l, ""];
    return { name: name.trim(), members: rest ? rest.split(",").map((m) => m.trim()).filter(Boolean) : [name.trim()], side };
  });
}

export function OnboardingWizard({ action, userName }: { action: (i: OnboardingInput) => Promise<{ error?: string }>; userName: string }) {
  const [step, setStep] = useState(0);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [names, setNames] = useState({ partner1: "", partner2: "", partner1Family: "", partner2Family: "", role: "bride" as "bride" | "groom" });
  const [types, setTypes] = useState<EventType[]>(["nikkah", "shaadi", "walima"]);
  const [events, setEvents] = useState<Record<string, Ev>>({});
  const [theme, setTheme] = useState<OnboardingInput["theme"]>("noor");
  const [brideText, setBrideText] = useState("");
  const [groomText, setGroomText] = useState("");
  const [assign, setAssign] = useState<Record<string, { bride: boolean; groom: boolean }>>({});
  const [publish, setPublish] = useState(true);
  const [slug, setSlug] = useState("");

  const label = (t: EventType) => EVENT_TYPES.find((x) => x.value === t)!.label;
  const ev = (t: EventType): Ev => events[t] ?? { type: t, name: label(t), date: "", startTime: "18:00", venueName: "", address: "", ...(DEFAULTS[t] ?? { visibility: "invite", rsvpMode: "required", hostSide: "both" }) };
  const setEv = (t: EventType, patch: Partial<Ev>) => setEvents((p) => ({ ...p, [t]: { ...ev(t), ...patch } }));
  const households = [...parseHouseholds(brideText, "bride"), ...parseHouseholds(groomText, "groom")];
  // Family-only events default to the hosting side; everything else invites both sides.
  const asg = (t: EventType) => assign[t] ?? (ev(t).visibility === "private"
    ? { bride: ev(t).hostSide !== "groom", groom: ev(t).hostSide !== "bride" }
    : { bride: true, groom: true });

  const canNext = [
    names.partner1.trim() && names.partner2.trim(),
    types.length > 0,
    types.every((t) => ev(t).date),
    true, true, true, true, true,
  ][step];

  const finish = () => {
    setError("");
    const list = types.map(ev).sort((a, b) => a.date.localeCompare(b.date));
    const assignByIndex = Object.fromEntries(list.map((e, i) => [i, asg(e.type)]));
    start(async () => {
      const r = await action({ ...names, events: list, theme, households, assign: assignByIndex, slug: slug || `${names.partner1}-and-${names.partner2}`, publish });
      if (r?.error) setError(r.error);
    });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <ol className="mb-8 flex gap-1.5">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <div className={cn("h-1 rounded-full", i <= step ? "bg-ink" : "bg-line")} />
            <p className={cn("mt-2 hidden text-[11px] sm:block", i === step ? "text-ink" : "text-muted")}>{i + 1}. {s}</p>
          </li>
        ))}
      </ol>

      <div className="fade-in rounded-3xl border border-line bg-white p-6 sm:p-10" key={step}>
        {step === 0 && (
          <>
            <h2 className="font-serif text-4xl">Assalamu alaikum, {userName.split(" ")[0]}! Who&apos;s getting married?</h2>
            <p className="mt-2 text-sm text-muted">These names will appear on your website and invitations.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Bride's first name"><Input value={names.partner1} onChange={(e) => setNames({ ...names, partner1: e.target.value })} placeholder="Ayesha" autoFocus /></Field>
              <Field label="Groom's first name"><Input value={names.partner2} onChange={(e) => setNames({ ...names, partner2: e.target.value })} placeholder="Omar" /></Field>
              <Field label="Bride's family name"><Input value={names.partner1Family} onChange={(e) => setNames({ ...names, partner1Family: e.target.value })} placeholder="Siddiqui" /></Field>
              <Field label="Groom's family name"><Input value={names.partner2Family} onChange={(e) => setNames({ ...names, partner2Family: e.target.value })} placeholder="Farooq" /></Field>
              <Field label="I am the…"><Select value={names.role} onChange={(e) => setNames({ ...names, role: e.target.value as "bride" | "groom" })}><option value="bride">Bride</option><option value="groom">Groom</option></Select></Field>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="font-serif text-4xl">Which celebrations are you planning?</h2>
            <p className="mt-2 text-sm text-muted">Choose as many as you like. Each gets its own guest list and RSVP. You can add more later.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {EVENT_TYPES.filter((t) => t.value !== "custom").map((t) => {
                const on = types.includes(t.value);
                return (
                  <button key={t.value} type="button" onClick={() => setTypes(on ? types.filter((x) => x !== t.value) : [...types, t.value])}
                    className={cn("flex items-center gap-3 rounded-2xl border p-4 text-left transition", on ? "border-ink bg-cream/60" : "border-line hover:border-gold")}>
                    <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border", on ? "border-ink bg-ink text-ivory" : "border-line")}>{on && <Check className="h-3 w-3" />}</span>
                    <span><span className="block font-serif text-xl">{t.label}</span>{t.blurb && <span className="text-xs text-muted">{t.blurb}</span>}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-serif text-4xl">When and where?</h2>
            <p className="mt-2 text-sm text-muted">A date is enough for now. Fill in venues whenever you&apos;re ready.</p>
            <div className="mt-6 space-y-5">
              {types.map((t) => (
                <div key={t} className="grid gap-3 rounded-2xl bg-cream/40 p-4 sm:grid-cols-[1fr_160px_110px]">
                  <Field label="Event name"><Input value={ev(t).name} onChange={(e) => setEv(t, { name: e.target.value })} /></Field>
                  <Field label="Date"><Input type="date" value={ev(t).date} onChange={(e) => setEv(t, { date: e.target.value })} required /></Field>
                  <Field label="Time"><Input type="time" value={ev(t).startTime} onChange={(e) => setEv(t, { startTime: e.target.value })} /></Field>
                  <Field label="Venue"><Input value={ev(t).venueName} onChange={(e) => setEv(t, { venueName: e.target.value })} placeholder={t === "nikkah" ? "Masjid Al-Noor" : "Venue name"} /></Field>
                  <Field label="Address" className="sm:col-span-2"><Input value={ev(t).address} onChange={(e) => setEv(t, { address: e.target.value })} /></Field>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-serif text-4xl">Who can see each event?</h2>
            <p className="mt-2 text-sm text-muted">We&apos;ve suggested the most common setup. Guests who aren&apos;t invited to an event will never know it exists.</p>
            <div className="mt-6 space-y-4">
              {types.map((t) => (
                <div key={t} className="rounded-2xl border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-serif text-2xl">{ev(t).name}</p>
                    <Select value={ev(t).rsvpMode} onChange={(e) => setEv(t, { rsvpMode: e.target.value as RsvpMode })} className="h-9 w-40 text-xs">
                      <option value="required">RSVP required</option><option value="optional">RSVP optional</option><option value="none">No RSVP</option>
                    </Select>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {([["public", Eye, "Open to everyone", "Shown on your public website"], ["invite", Lock, "Invitation only", "Only invited families"], ["private", EyeOff, "Family only", "An intimate gathering"]] as const).map(([v, Icon, title, sub]) => (
                      <button key={v} type="button" onClick={() => setEv(t, { visibility: v })}
                        className={cn("rounded-xl border p-3 text-left", ev(t).visibility === v ? "border-ink bg-cream/60" : "border-line hover:border-gold")}>
                        <Icon className="h-4 w-4 text-gold" /><span className="mt-1 block text-sm font-medium">{title}</span><span className="text-xs text-muted">{sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="font-serif text-4xl">Choose a look</h2>
            <p className="mt-2 text-sm text-muted">Contemporary palettes with subtle South Asian motifs. You can customize fonts and colors later.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {THEMES.map((t) => (
                <button key={t.id} type="button" onClick={() => setTheme(t.id)} className={cn("overflow-hidden rounded-2xl border text-left", theme === t.id ? "border-ink ring-2 ring-gold-soft" : "border-line")}>
                  <div className="flex h-36 flex-col items-center justify-center" style={{ background: t.c[0], color: t.c[2] }}>
                    <span className="font-arabic text-sm" style={{ color: t.c[1] }}>بِسْمِ اللَّهِ</span>
                    <span className="font-serif text-4xl">{names.partner1 || "Ayesha"} <span style={{ color: t.c[1] }}>&amp;</span> {names.partner2 || "Omar"}</span>
                  </div>
                  <p className="px-4 py-3 font-serif text-xl">{t.name}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h2 className="font-serif text-4xl">Add your guests</h2>
            <p className="mt-2 text-sm text-muted">One household per line. Optionally list who&apos;s in it after a colon. You can also skip this and import a CSV later.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label={`${names.partner1 || "Bride"}'s side`}><Textarea rows={8} value={brideText} onChange={(e) => setBrideText(e.target.value)} placeholder={"Mr. and Mrs. Ahmed & Family: Javed Ahmed, Farah Ahmed, Zayd Ahmed (child)\nHina Khan"} /></Field>
              <Field label={`${names.partner2 || "Groom"}'s side`}><Textarea rows={8} value={groomText} onChange={(e) => setGroomText(e.target.value)} placeholder={"Dr. and Mrs. Malik: Asif Malik, Sadia Malik\nBilal Sheikh: Bilal Sheikh, Guest (plus one)"} /></Field>
            </div>
            <p className="mt-3 text-xs text-muted">{households.length} households · {households.reduce((n, h) => n + h.members.length, 0)} guests</p>
          </>
        )}

        {step === 6 && (
          <>
            <h2 className="font-serif text-4xl">Who&apos;s invited to what?</h2>
            <p className="mt-2 text-sm text-muted">Open events include everyone automatically. For the rest, choose which side&apos;s guests to invite. Fine-tune individual families later.</p>
            <div className="mt-6 divide-y divide-line rounded-2xl border border-line">
              {types.map((t) => (
                <div key={t} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <p className="font-serif text-xl">{ev(t).name}</p>
                  {ev(t).visibility === "public" ? <span className="text-sm text-muted">Open to everyone</span> : (
                    <div className="flex gap-4 text-sm">
                      <label className="flex items-center gap-1.5"><Checkbox checked={asg(t).bride} onChange={(e) => setAssign({ ...assign, [t]: { ...asg(t), bride: e.target.checked } })} /> {names.partner1 || "Bride"}&apos;s side</label>
                      <label className="flex items-center gap-1.5"><Checkbox checked={asg(t).groom} onChange={(e) => setAssign({ ...assign, [t]: { ...asg(t), groom: e.target.checked } })} /> {names.partner2 || "Groom"}&apos;s side</label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {step === 7 && (
          <>
            <h2 className="font-serif text-4xl">Ready to share, Insha&apos;Allah</h2>
            <p className="mt-2 text-sm text-muted">Pick your website address. Every guest gets a personal link that shows only their events.</p>
            <div className="mt-6 space-y-4">
              <Field label="Website address">
                <div className="flex items-center gap-2"><span className="text-sm text-muted">/w/</span><Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder={`${names.partner1 || "ayesha"}-and-${names.partner2 || "omar"}`.toLowerCase()} /></div>
              </Field>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={publish} onChange={(e) => setPublish(e.target.checked)} /> Publish my website now</label>
              <ul className="rounded-2xl bg-cream/50 p-4 text-sm">
                {types.map(ev).map((e) => <li key={e.type} className="flex justify-between py-0.5"><span>{e.name}</span><span className="text-muted">{e.date} · {e.visibility === "public" ? "open" : e.visibility === "private" ? "family only" : "invitation only"}</span></li>)}
              </ul>
            </div>
            {error && <p className="mt-4 rounded-xl bg-rose-soft px-4 py-2.5 text-sm text-[#8f3f39]">{error}</p>}
          </>
        )}

        <div className="mt-10 flex items-center justify-between">
          <Button type="button" variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 0}>Back</Button>
          {step < STEPS.length - 1
            ? <Button type="button" onClick={() => setStep(step + 1)} disabled={!canNext}>Continue</Button>
            : <Button type="button" onClick={finish} disabled={pending}>{pending ? "Creating your wedding…" : "Create my wedding"}</Button>}
        </div>
      </div>
    </div>
  );
}
