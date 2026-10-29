import { ImageResponse } from "next/og";

export const alt = "Shipwright: your AI-built app, production-ready.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// next/og draws the image itself, so it can't read our CSS variables. These hex values are our dark
// tokens from packages/ui/src/styles/globals.css, converted from oklch. Keep them in sync by hand.
const COLOR = {
  background: "#090a0e",
  foreground: "#f4f5f7",
  muted: "#9da2ab",
  brand: "#7a9eff",
  critical: "#fd736d",
  success: "#5fce8c",
};

// Satori (the renderer) only understands inline styles, and every div with children needs display: "flex".
function Pill({ label, color }: { label: string; color: string }) {
  return (
    <div
      style={{
        display: "flex",
        padding: "14px 28px",
        borderRadius: 999,
        border: `2px solid ${color}66`,
        background: `${color}22`,
        color,
        fontSize: 36,
        fontWeight: 600,
      }}
    >
      {label}
    </div>
  );
}

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: 72,
        background: COLOR.background,
        color: COLOR.foreground,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 32, color: COLOR.muted }}>
        <div style={{ display: "flex", width: 16, height: 16, borderRadius: 8, background: COLOR.brand }} />
        <div style={{ display: "flex" }}>Shipwright</div>
      </div>
      <div style={{ display: "flex", maxWidth: 960, fontSize: 92, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
        Your AI-built app, production-ready.
      </div>
      <div style={{ display: "flex", gap: 20 }}>
        <Pill label="2 critical" color={COLOR.critical} />
        <Pill label="Score 92" color={COLOR.success} />
      </div>
    </div>,
    { ...size },
  );
}
