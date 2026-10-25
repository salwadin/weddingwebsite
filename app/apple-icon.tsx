import { ImageResponse } from "next/og";

// Home-screen icon (iOS "Add to Home Screen"): the same rings as app/icon.svg, as a PNG.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#2b2620" }}>
        <svg width="132" height="132" viewBox="0 0 32 32">
          <circle cx="12.5" cy="16" r="6.5" fill="none" stroke="#fbf8f2" strokeWidth="2.2" />
          <circle cx="19.5" cy="16" r="6.5" fill="none" stroke="#c9a46a" strokeWidth="2.2" />
        </svg>
      </div>
    ),
    size,
  );
}
