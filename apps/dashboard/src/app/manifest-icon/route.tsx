import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

/** Generates the larger PWA-manifest icon sizes (192/512) on the fly — same design as icon.tsx. */
export async function GET(request: NextRequest) {
  const sizeParam = Number(request.nextUrl.searchParams.get("size") ?? 512);
  const px = Number.isFinite(sizeParam) ? Math.min(Math.max(sizeParam, 32), 1024) : 512;
  const ring = Math.round(px * 0.62);
  const core = Math.round(px * 0.37);
  const border = Math.max(2, Math.round(px * 0.035));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#050608",
        }}
      >
        <div
          style={{
            width: ring,
            height: ring,
            borderRadius: "50%",
            border: `${border}px solid rgba(110,231,255,0.55)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "relative",
              display: "flex",
              width: core,
              height: core,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 38% 32%, #e8fdff 0%, #6ee7ff 42%, #17b8d9 100%)",
              boxShadow: `0 0 ${Math.round(px * 0.22)}px ${Math.round(px * 0.06)}px rgba(110,231,255,0.85)`,
            }}
          >
            <div style={{ position: "absolute", top: Math.round(core * 0.34), left: Math.round(core * 0.22), width: Math.round(core * 0.15), height: Math.round(core * 0.15), borderRadius: "50%", background: "#0a2b33" }} />
            <div style={{ position: "absolute", top: Math.round(core * 0.34), left: Math.round(core * 0.63), width: Math.round(core * 0.15), height: Math.round(core * 0.15), borderRadius: "50%", background: "#0a2b33" }} />
            <div
              style={{
                position: "absolute",
                top: Math.round(core * 0.58),
                left: Math.round(core * 0.31),
                width: Math.round(core * 0.38),
                height: Math.round(core * 0.15),
                background: "#0a2b33",
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
                borderBottomLeftRadius: Math.round(core * 0.15),
                borderBottomRightRadius: Math.round(core * 0.15),
              }}
            />
            <div style={{ position: "absolute", top: Math.round(core * 0.49), left: Math.round(core * 0.06), width: Math.round(core * 0.17), height: Math.round(core * 0.11), borderRadius: "50%", background: "rgba(255,176,140,0.55)" }} />
            <div style={{ position: "absolute", top: Math.round(core * 0.49), left: Math.round(core * 0.77), width: Math.round(core * 0.17), height: Math.round(core * 0.11), borderRadius: "50%", background: "rgba(255,176,140,0.55)" }} />
          </div>
        </div>
      </div>
    ),
    { width: px, height: px },
  );
}
