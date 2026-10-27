import { ImageResponse } from "next/og";
import { Q_PATH, STAR_PATH } from "@/lib/brand";

// Home-screen icon (iOS "Add to Home Screen"): the Q monogram from app/icon.svg, as a PNG.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f3ec" }}>
        <svg width="132" height="132" viewBox="0 0 32 32" fill="#3b2b20">
          <path fillRule="evenodd" d={Q_PATH} />
          <path d={STAR_PATH} />
        </svg>
      </div>
    ),
    size,
  );
}
