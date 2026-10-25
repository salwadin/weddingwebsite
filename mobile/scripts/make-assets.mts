// Draws the app icon and splash sources (mobile/assets/*.png) from the ring mark in
// app/icon.svg, then has @capacitor/assets cut every size iOS and Android need.
//   npm run mobile:assets
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const INK = "#2b2620", IVORY = "#fbf8f2", GOLD = "#c9a46a";
const out = new URL("../assets/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });

/** The two interlocking rings, in app/icon.svg's 32-unit box, scaled to `size` and centred on a `canvas`. */
function rings(canvas: number, size: number, left: string, background?: string) {
  const s = size / 32, o = (canvas - size) / 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}">
    ${background ? `<rect width="${canvas}" height="${canvas}" fill="${background}"/>` : ""}
    <g transform="translate(${o} ${o}) scale(${s})">
      <circle cx="12.5" cy="16" r="6.5" fill="none" stroke="${left}" stroke-width="2.2"/>
      <circle cx="19.5" cy="16" r="6.5" fill="none" stroke="${GOLD}" stroke-width="2.2"/>
    </g></svg>`);
}

const png = (svg: Buffer, name: string) => sharp(svg).png().toFile(out + name);

await Promise.all([
  // iOS icon and the Android legacy icon: ivory and gold rings on ink, like the favicon.
  png(rings(1024, 1000, IVORY, INK), "icon-only.png"),
  // Android adaptive icon: launchers crop to the middle ~66%, so the rings sit well inside it.
  png(rings(1024, 900, IVORY), "icon-foreground.png"),
  sharp({ create: { width: 1024, height: 1024, channels: 4, background: INK } }).png().toFile(out + "icon-background.png"),
  // Splash: the mark small and calm on the site's ivory (ink in dark mode).
  png(rings(2732, 520, INK, IVORY), "splash.png"),
  png(rings(2732, 520, IVORY, INK), "splash-dark.png"),
]);

execFileSync("npx", ["capacitor-assets", "generate", "--ios", "--android", "--assetPath", "mobile/assets",
  "--iosProject", "mobile/ios/App", "--androidProject", "mobile/android",
  "--iconBackgroundColor", INK, "--iconBackgroundColorDark", INK,
  "--splashBackgroundColor", IVORY, "--splashBackgroundColorDark", INK], { stdio: "inherit" });
