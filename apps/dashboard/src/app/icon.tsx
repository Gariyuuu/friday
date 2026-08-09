import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 50% 42%, #0c1620 0%, #050608 68%, #020304 100%)",
          borderRadius: 14,
        }}
      >
        {/* Outer halo ring, echoing the real Orb's OrbRings — a thin
            glowing arc rather than a flat stroke, for real depth. */}
        <div
          style={{
            display: "flex",
            width: 46,
            height: 46,
            borderRadius: "50%",
            border: "1.5px solid rgba(110,231,255,0.28)",
            boxShadow: "0 0 6px 0px rgba(110,231,255,0.2)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: "2px solid rgba(110,231,255,0.55)",
              boxShadow: "0 0 10px 1px rgba(110,231,255,0.3)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* The core — radial gradient instead of a flat fill, so it
                reads as a lit sphere rather than a flat disc. */}
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 38% 32%, #e8fdff 0%, #6ee7ff 42%, #17b8d9 100%)",
                boxShadow: "0 0 22px 6px rgba(110,231,255,0.9), 0 0 46px 14px rgba(110,231,255,0.35)",
              }}
            />
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
