"use client";

import { useEffect } from "react";
import { Button, Logo } from "@/components/ui";

// After a deploy, a page that was already open still points at the old build: its
// server actions and code chunks no longer exist, which surfaces as a client error.
// A single reload picks up the new build, so do that before showing anything.
const STALE = /server action.*(not found|was not found)|failed to find server action|chunkloaderror|loading chunk|dynamically imported module/i;
const RELOADED_AT = "q_stale_reload";

export function ErrorScreen({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const stale = STALE.test(`${error.name} ${error.message}`);

  useEffect(() => {
    console.error(error);
    if (!stale) return;
    try {
      const last = Number(sessionStorage.getItem(RELOADED_AT) ?? 0);
      if (Date.now() - last < 30_000) return; // already tried; don't loop
      sessionStorage.setItem(RELOADED_AT, String(Date.now()));
    } catch {}
    window.location.reload();
  }, [error, stale]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo className="text-2xl" />
      <h1 className="mt-8 font-serif text-4xl">{stale ? "Qubool was just updated" : "Something went wrong"}</h1>
      <p className="mt-3 max-w-md text-sm text-muted">
        {stale ? "Reloading to get the latest version. If this page stays, tap Try again." : "Please try again. If it keeps happening, reload the page."}
      </p>
      <div className="mt-6 flex gap-2">
        <Button onClick={() => (stale ? window.location.reload() : reset())}>Try again</Button>
        <Button variant="outline" onClick={() => window.location.assign("/")}>Go home</Button>
      </div>
      {error.digest && <p className="mt-6 text-[11px] text-muted">Reference: {error.digest}</p>}
    </div>
  );
}
