"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { enablePush, pushPermission } from "./native-bridge";
import { Button } from "./ui";

// Inside the apps, on the couple's dashboard and the vendor page: offers notifications with
// our own card first, so the system prompt only appears after someone taps "Turn on" (a
// "no" to the system prompt can only be undone in the phone's Settings). Once allowed, it
// re-registers quietly on each visit, since tokens can change.

const DISMISSED = "qb_push_dismissed";
const remembered = () => { try { return localStorage.getItem(DISMISSED) === "1"; } catch { return false; } };
const remember = () => { try { localStorage.setItem(DISMISSED, "1"); } catch { /* private mode */ } };

export function PushPrompt({ title, text }: { title: string; text: string }) {
  const [state, setState] = useState<"hidden" | "offer" | "denied">("hidden");

  useEffect(() => {
    void (async () => {
      const p = await pushPermission();
      if (p === "granted") await enablePush(false);
      else if (p?.startsWith("prompt") && !remembered()) setState("offer");
    })().catch(() => {});
  }, []);

  if (state === "hidden") return null;
  const close = () => { remember(); setState("hidden"); };
  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm">
      <Bell className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
      <div className="min-w-0 flex-1">
        {state === "offer" ? (
          <>
            <p className="font-medium">{title}</p>
            <p className="mt-0.5 text-muted">{text}</p>
            <Button size="sm" className="mt-2.5" onClick={async () => {
              const p = await enablePush(true).catch(() => null);
              if (p === "granted") close();
              else { remember(); setState("denied"); }
            }}>Turn on notifications</Button>
          </>
        ) : (
          <p className="text-muted">No problem. You can turn notifications on any time in your phone&apos;s Settings, under Qubool → Notifications.</p>
        )}
      </div>
      <button aria-label="Not now" onClick={close} className="-m-1 p-1 text-muted hover:text-ink"><X className="h-4 w-4" /></button>
    </div>
  );
}
