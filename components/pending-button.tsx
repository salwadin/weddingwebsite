"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";

/**
 * A form button that shows it's working: while its form is submitting, every
 * PendingButton in that form is disabled and the one that was clicked shows
 * `pendingLabel`. Use it for actions with side effects (emails, approvals) so
 * a slow response doesn't invite a second click.
 */
export function PendingButton({ pendingLabel = "Working…", children, onClick, disabled, ...p }: ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  const [clicked, setClicked] = useState(false);
  useEffect(() => { if (!pending) setClicked(false); }, [pending]);

  return (
    <Button {...p} disabled={disabled || pending} aria-busy={pending && clicked}
      onClick={(e) => { setClicked(true); onClick?.(e); }}>
      {pending && clicked ? pendingLabel : children}
    </Button>
  );
}
