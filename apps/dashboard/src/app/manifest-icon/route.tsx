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
              width: core,
              height: core,
              borderRadius: "50%",
              background: "#6ee7ff",
              boxShadow: `0 0 ${Math.round(px * 0.22)}px ${Math.round(px * 0.06)}px rgba(110,231,255,0.85)`,
            }}
          />
        </div>
      </div>
    ),
    { width: px, height: px },
  );
}
