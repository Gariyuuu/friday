import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
            width: 90,
            height: 90,
            borderRadius: "50%",
            border: "5px solid rgba(110,231,255,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "relative",
              display: "flex",
              width: 54,
              height: 54,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 38% 32%, #e8fdff 0%, #6ee7ff 42%, #17b8d9 100%)",
              boxShadow: "0 0 40px 12px rgba(110,231,255,0.85)",
            }}
          >
            <div style={{ position: "absolute", top: 19, left: 12, width: 8, height: 8, borderRadius: "50%", background: "#0a2b33" }} />
            <div style={{ position: "absolute", top: 19, left: 34, width: 8, height: 8, borderRadius: "50%", background: "#0a2b33" }} />
            <div style={{ position: "absolute", top: 17, left: 14, width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.9)" }} />
            <div style={{ position: "absolute", top: 17, left: 36, width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.9)" }} />
            <div
              style={{
                position: "absolute",
                top: 32,
                left: 17,
                width: 20,
                height: 8,
                background: "#0a2b33",
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
                borderBottomLeftRadius: 8,
                borderBottomRightRadius: 8,
              }}
            />
            <div style={{ position: "absolute", top: 27, left: 4, width: 9, height: 6, borderRadius: "50%", background: "rgba(255,176,140,0.55)" }} />
            <div style={{ position: "absolute", top: 27, left: 41, width: 9, height: 6, borderRadius: "50%", background: "rgba(255,176,140,0.55)" }} />
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
