"use client";

import { useState, useTransition } from "react";
import { Check, Eye, EyeOff, Lock, Plus, X } from "lucide-react";
import { cn, EVENT_TYPES, TRADITIONS } from "@/lib/format";
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
  katb_kitab: { visibility: "invite", rsvpMode: "required", hostSide: "both" },
  aqd: { visibility: "invite", rsvpMode: "required", hostSide: "both" },
  civil: { visibility: "private", rsvpMode: "none", hostSide: "both" },
  engagement: { visibility: "invite", rsvpMode: "required", hostSide: "bride" },
  henna: { visibility: "private", rsvpMode: "required", hostSide: "bride" },
  kina: { visibility: "private", rsvpMode: "required", hostSide: "bride" },
  zaffa: { visibility: "invite", rsvpMode: "none", hostSide: "both" },
  aroosi: { visibility: "invite", rsvpMode: "required", hostSide: "both" },
  reception: { visibility: "invite", rsvpMode: "required", hostSide: "both" },
  shaash_saar: { visibility: "private", rsvpMode: "optional", hostSide: "bride" },
  welcome_dinner: { visibility: "invite", rsvpMode: "required", hostSide: "both" },
  brunch: { visibility: "invite", rsvpMode: "optional", hostSide: "both" },
  ceremony: { visibility: "invite", rsvpMode: "required", hostSide: "both" },
  rehearsal_dinner: { visibility: "private", rsvpMode: "required", hostSide: "both" },
  sangeet: { visibility: "invite", rsvpMode: "required", hostSide: "both" },
  haldi: { visibility: "private", rsvpMode: "optional", hostSide: "both" },
  tea_ceremony: { visibility: "private", rsvpMode: "required", hostSide: "both" },
  after_party: { visibility: "invite", rsvpMode: "optional", hostSide: "both" },
};

// Starting palettes only; couples change colors, fonts, pattern and photos any time in Website.
const THEMES = [
  { id: "noor", name: "Ivory & gold", c: ["#fbf8f2", "#b08d57", "#2b2620"] },
  { id: "gulab", name: "Blush", c: ["#fcf7f5", "#b77a74", "#2b2620"] },
  { id: "zaitoon", name: "Sage", c: ["#f8f8f3", "#6f8466", "#2b2620"] },
  { id: "mehtab", name: "Midnight", c: ["#141a26", "#d2b07a", "#f3ede2"] },
] as const;

// Events are keyed by id: a built-in type ("reception") or a couple's own event ("own-…"), so any number of their own fit.
const isOwn = (k: string) => k.startsWith("own-");

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
  const [tradition, setTradition] = useState(TRADITIONS[0].value);
  const [keys, setKeys] = useState<string[]>(TRADITIONS[0].events);
  const [ownName, setOwnName] = useState("");
  const [events, setEvents] = useState<Record<string, Ev>>({});
  const [theme, setTheme] = useState<OnboardingInput["theme"]>("noor");
  const [later, setLater] = useState(false);
  const [brideText, setBrideText] = useState("");
  const [groomText, setGroomText] = useState("");
  const [assign, setAssign] = useState<Record<string, { bride: boolean; groom: boolean }>>({});
  const [publish, setPublish] = useState(true);
  const [slug, setSlug] = useState("");

  const label = (t: EventType) => EVENT_TYPES.find((x) => x.value === t)?.label ?? "Event";
  const ev = (k: string): Ev => {
    if (events[k]) return events[k];
    const d = DEFAULTS[k] ?? { visibility: "invite" as Visibility, rsvpMode: "required" as RsvpMode, hostSide: "both" as Side };
    // Family-only events hosted by one side start private to that side (its organizers only).
    return { type: k as EventType, name: label(k as EventType), date: "", startTime: "18:00", venueName: "", address: "", ...d, sidePrivate: d.visibility === "private" && d.hostSide !== "both" };
  };
  const family = (s: Side) => (s === "bride" ? `${names.partner1 || "First partner"}'s family` : s === "groom" ? `${names.partner2 || "Second partner"}'s family` : "Both families");
  const setEv = (k: string, patch: Partial<Ev>) => setEvents((p) => ({ ...p, [k]: { ...ev(k), ...patch } }));
  // A couple's own event (a Shaalima, a family dinner…): invitation-only and shared by both families until they say otherwise.
  const addOwn = () => {
    const name = ownName.trim().slice(0, 80);
    if (!name) return;
    const k = `own-${Date.now()}`;
    setEvents((p) => ({ ...p, [k]: { type: "custom", name, date: "", startTime: "18:00", venueName: "", address: "", visibility: "invite", rsvpMode: "required", hostSide: "both" } }));
    setKeys((p) => [...p, k]);
    setOwnName("");
  };
  const households = [...parseHouseholds(brideText, "bride"), ...parseHouseholds(groomText, "groom")];
  // Family-only events default to the hosting side; everything else invites both sides.
  const asg = (t: string) => assign[t] ?? (ev(t).visibility === "private"
    ? { bride: ev(t).hostSide !== "groom", groom: ev(t).hostSide !== "bride" }
    : { bride: true, groom: true });

  const canNext = [
    names.partner1.trim() && names.partner2.trim(),
    keys.length > 0,
    keys.every((t) => ev(t).date),
    true, true, true, true, true,
  ][step];

  const finish = () => {
    setError("");
    const sorted = [...keys].sort((a, b) => ev(a).date.localeCompare(ev(b).date));
    const list = sorted.map(ev);
    const assignByIndex = Object.fromEntries(sorted.map((k, i) => [i, asg(k)]));
    start(async () => {
      const r = await action({ ...names, tradition, events: list, theme, households, assign: assignByIndex, slug: slug || `${names.partner1}-and-${names.partner2}`, publish });
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
            <h2 className="font-serif text-4xl">Welcome, {userName.split(" ")[0]}! Who&apos;s getting married?</h2>
            <p className="mt-2 text-sm text-muted">These names will appear on your website and invitations, in this order.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="First partner's name"><Input value={names.partner1} onChange={(e) => setNames({ ...names, partner1: e.target.value })} placeholder="First name" autoFocus /></Field>
              <Field label="Second partner's name"><Input value={names.partner2} onChange={(e) => setNames({ ...names, partner2: e.target.value })} placeholder="First name" /></Field>
              <Field label="Their family name"><Input value={names.partner1Family} onChange={(e) => setNames({ ...names, partner1Family: e.target.value })} placeholder="Optional" /></Field>
              <Field label="Their family name"><Input value={names.partner2Family} onChange={(e) => setNames({ ...names, partner2Family: e.target.value })} placeholder="Optional" /></Field>
              <Field label="Which one are you?"><Select value={names.role} onChange={(e) => setNames({ ...names, role: e.target.value as "bride" | "groom" })}><option value="bride">{names.partner1 || "The first partner"}</option><option value="groom">{names.partner2 || "The second partner"}</option></Select></Field>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="font-serif text-4xl">Which celebrations are you planning?</h2>
            <p className="mt-2 text-sm text-muted">Pick a starting point, then add or remove anything. Each event gets its own guest list and RSVP, and you can add more later.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {TRADITIONS.map((t) => (
                <button key={t.value} type="button" onClick={() => { setTradition(t.value); setKeys([...t.events, ...keys.filter(isOwn)]); }}
                  className={cn("rounded-full border px-3.5 py-1.5 text-sm", tradition === t.value ? "border-ink bg-ink text-ivory" : "border-line hover:border-gold")}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {EVENT_TYPES.filter((t) => t.value !== "custom").map((t) => {
                const on = keys.includes(t.value);
                return (
                  <button key={t.value} type="button" onClick={() => setKeys(on ? keys.filter((x) => x !== t.value) : [...keys, t.value])}
                    className={cn("flex items-center gap-3 rounded-2xl border p-4 text-left transition", on ? "border-ink bg-cream/60" : "border-line hover:border-gold")}>
                    <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border", on ? "border-ink bg-ink text-ivory" : "border-line")}>{on && <Check className="h-3 w-3" />}</span>
                    <span><span className="block font-serif text-xl">{t.label}</span>{t.blurb && <span className="text-xs text-muted">{t.blurb}</span>}</span>
                  </button>
                );
              })}
              {keys.filter(isOwn).map((k) => (
                <div key={k} className="flex items-center gap-3 rounded-2xl border border-ink bg-cream/60 p-4">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-ink bg-ink text-ivory"><Check className="h-3 w-3" /></span>
                  <span className="flex-1"><span className="block font-serif text-xl">{ev(k).name}</span><span className="text-xs text-muted">Your own event</span></span>
                  <button type="button" aria-label={`Remove ${ev(k).name}`} onClick={() => setKeys(keys.filter((x) => x !== k))} className="rounded-full p-1 text-muted hover:bg-white hover:text-ink"><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-dashed border-line p-4">
              <p className="text-sm font-medium">Add your own event</p>
              <p className="mt-0.5 text-xs text-muted">Anything your family celebrates: a Shaalima, a family dinner, a send-off. It isn&apos;t tied to either side; you choose who&apos;s invited.</p>
              <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); addOwn(); }}>
                <Input value={ownName} onChange={(e) => setOwnName(e.target.value)} placeholder="Event name" aria-label="Your own event's name" maxLength={80} />
                <Button type="submit" variant="outline" disabled={!ownName.trim()}><Plus className="h-4 w-4" /> Add</Button>
              </form>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-serif text-4xl">When and where?</h2>
            <p className="mt-2 text-sm text-muted">A date is enough for now. Fill in venues whenever you&apos;re ready.</p>
            <div className="mt-6 space-y-5">
              {keys.map((t) => (
                <div key={t} className="grid gap-3 rounded-2xl bg-cream/40 p-4 sm:grid-cols-[1fr_160px_110px]">
                  <Field label="Event name"><Input value={ev(t).name} onChange={(e) => setEv(t, { name: e.target.value })} /></Field>
                  <Field label="Date"><Input type="date" value={ev(t).date} onChange={(e) => setEv(t, { date: e.target.value })} required /></Field>
                  <Field label="Time"><Input type="time" value={ev(t).startTime} onChange={(e) => setEv(t, { startTime: e.target.value })} /></Field>
                  <Field label="Venue"><Input value={ev(t).venueName} onChange={(e) => setEv(t, { venueName: e.target.value })} placeholder="Venue name" /></Field>
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
              {keys.map((t) => (
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
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                    <label className="flex items-center gap-2">Hosted by
                      <Select value={ev(t).hostSide} aria-label={`Who hosts the ${ev(t).name}`} className="h-9 w-auto text-xs"
                        onChange={(e) => { const hostSide = e.target.value as Side; setEv(t, { hostSide, sidePrivate: hostSide !== "both" && ev(t).sidePrivate }); }}>
                        {(["both", "bride", "groom"] as const).map((s) => <option key={s} value={s}>{family(s)}</option>)}
                      </Select>
                    </label>
                    {ev(t).hostSide !== "both" && (
                      <label className="flex items-center gap-1.5">
                        <Checkbox checked={!!ev(t).sidePrivate} onChange={(e) => setEv(t, { sidePrivate: e.target.checked })} />
                        Private to {family(ev(t).hostSide)}
                      </label>
                    )}
                  </div>
                  {ev(t).hostSide !== "both" && ev(t).sidePrivate && <p className="mt-1 text-xs text-muted">The other family&apos;s organizers won&apos;t see this event or any of its costs.</p>}
                </div>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="font-serif text-4xl">Choose a look</h2>
            <p className="mt-2 text-sm text-muted">Just a starting palette. Colors, fonts, patterns and your own photos can all be changed any time in Website, so don&apos;t overthink it.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {THEMES.map((t) => (
                <button key={t.id} type="button" onClick={() => { setTheme(t.id); setLater(false); }} className={cn("overflow-hidden rounded-2xl border text-left", theme === t.id && !later ? "border-ink ring-2 ring-gold-soft" : "border-line")}>
                  <div className="flex h-36 flex-col items-center justify-center" style={{ background: t.c[0], color: t.c[2] }}>
                    {TRADITIONS.find((x) => x.value === tradition)?.islamic && <span className="font-arabic text-sm" style={{ color: t.c[1] }}>بِسْمِ اللَّهِ</span>}
                    <span className="font-serif text-4xl">{names.partner1 || "Partner"} <span style={{ color: t.c[1] }}>&amp;</span> {names.partner2 || "Partner"}</span>
                  </div>
                  <p className="px-4 py-3 font-serif text-xl">{t.name}</p>
                </button>
              ))}
              <button type="button" onClick={() => { setTheme("noor"); setLater(true); }} className={cn("flex flex-col justify-center rounded-2xl border border-dashed p-6 text-left sm:col-span-2", later ? "border-ink ring-2 ring-gold-soft" : "border-line hover:border-gold")}>
                <span className="font-serif text-xl">I&apos;ll customize it later</span>
                <span className="mt-1 text-sm text-muted">Start with a plain, simple look and make it yours in Website whenever you&apos;re ready.</span>
              </button>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h2 className="font-serif text-4xl">Add your guests</h2>
            <p className="mt-2 text-sm text-muted">One household per line. Optionally list who&apos;s in it after a colon. You can also skip this and import a CSV later.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label={`${names.partner1 || "First partner"}'s side`}><Textarea rows={8} value={brideText} onChange={(e) => setBrideText(e.target.value)} placeholder={"The Miller Family: Tom Miller, Anne Miller, Lily Miller (child)\nRose Bennett"} /></Field>
              <Field label={`${names.partner2 || "Second partner"}'s side`}><Textarea rows={8} value={groomText} onChange={(e) => setGroomText(e.target.value)} placeholder={"Mr. and Mrs. Parker: David Parker, Kate Parker\nSam Lee: Sam Lee, Guest (plus one)"} /></Field>
            </div>
            <p className="mt-3 text-xs text-muted">{households.length} households · {households.reduce((n, h) => n + h.members.length, 0)} guests</p>
          </>
        )}

        {step === 6 && (
          <>
            <h2 className="font-serif text-4xl">Who&apos;s invited to what?</h2>
            <p className="mt-2 text-sm text-muted">Open events include everyone automatically. For the rest, choose which side&apos;s guests to invite. Fine-tune individual families later.</p>
            <div className="mt-6 divide-y divide-line rounded-2xl border border-line">
              {keys.map((t) => (
                <div key={t} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <p className="font-serif text-xl">{ev(t).name}</p>
                  {ev(t).visibility === "public" ? <span className="text-sm text-muted">Open to everyone</span> : (
                    <div className="flex gap-4 text-sm">
                      <label className="flex items-center gap-1.5"><Checkbox checked={asg(t).bride} onChange={(e) => setAssign({ ...assign, [t]: { ...asg(t), bride: e.target.checked } })} /> {names.partner1 || "First partner"}&apos;s side</label>
                      <label className="flex items-center gap-1.5"><Checkbox checked={asg(t).groom} onChange={(e) => setAssign({ ...assign, [t]: { ...asg(t), groom: e.target.checked } })} /> {names.partner2 || "Second partner"}&apos;s side</label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {step === 7 && (
          <>
            <h2 className="font-serif text-4xl">Ready to share{TRADITIONS.find((x) => x.value === tradition)?.islamic ? ", Insha’Allah" : ""}</h2>
            <p className="mt-2 text-sm text-muted">Pick your website address. Every guest gets a personal link that shows only their events.</p>
            <div className="mt-6 space-y-4">
              <Field label="Website address">
                <div className="flex items-center gap-2"><span className="text-sm text-muted">/w/</span><Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder={`${names.partner1 || "first"}-and-${names.partner2 || "second"}`.toLowerCase()} /></div>
              </Field>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={publish} onChange={(e) => setPublish(e.target.checked)} /> Publish my website now</label>
              <ul className="rounded-2xl bg-cream/50 p-4 text-sm">
                {keys.map((k) => ({ k, e: ev(k) })).map(({ k, e }) => <li key={k} className="flex justify-between py-0.5"><span>{e.name}</span><span className="text-muted">{e.date} · {e.visibility === "public" ? "open" : e.visibility === "private" ? "family only" : "invitation only"}</span></li>)}
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
