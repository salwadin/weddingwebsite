"use client";

import "./globals.css";
import { ErrorScreen } from "@/components/error-screen";

// Replaces the root layout when the layout itself fails, so it brings its own <html>.
export default function GlobalError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body><ErrorScreen {...props} /></body>
    </html>
  );
}
