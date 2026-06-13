import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#00c06d",
          borderRadius: 7,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: 4,
          position: "relative",
        }}
      >
        {/* Red dot — the iconic iSabi "i" dot */}
        <div style={{ position: "absolute", top: 5, left: 9, width: 6, height: 6, borderRadius: "50%", background: "#ff050b" }} />
        <span style={{ color: "white", fontWeight: 900, fontSize: 17, fontFamily: "sans-serif", letterSpacing: "-1px" }}>
          iS
        </span>
      </div>
    ),
    { ...size }
  );
}
