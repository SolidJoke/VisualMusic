// AppMobile.jsx — POC stub
import React from "react";

export default function AppMobile() {
  return (
    <div style={{
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center",
      justifyContent: "center", 
      height: "100vh",
      background: "#0e0f17", 
      color: "#a0a8c0", 
      fontFamily: "Inter, sans-serif",
      padding: "24px", 
      textAlign: "center", 
      gap: "16px"
    }}>
      <div style={{ fontSize: "2rem" }}>🎵</div>
      <h1 style={{ fontSize: "1.2rem", fontWeight: 600, color: "#fff", margin: 0 }}>
        VisualMusic
      </h1>
      <p style={{ fontSize: "0.9rem", margin: 0, maxWidth: "280px", lineHeight: 1.5 }}>
        La version mobile est en cours de développement.
        Pour une expérience complète, utilisez VisualMusic sur un écran 4K ou large.
      </p>
    </div>
  );
}
