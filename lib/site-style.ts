import type { ThemeSettings } from "./types";

// The couple's Pattern choice (Website → Theme), applied the same way on every site page.
// "none" (the default for new weddings) keeps the site free of any cultural motif.

/** Photo frame: arch-shaped only when the couple chose Arches. */
export const photoFrame = (t: Pick<ThemeSettings, "pattern">) => (t.pattern === "arch" ? "arch-mask" : "rounded-3xl");

/** Section background: the lattice only when the couple chose Lattice. */
export const patternBg = (t: Pick<ThemeSettings, "pattern">) => (t.pattern === "jali" ? "jali-bg" : "");
