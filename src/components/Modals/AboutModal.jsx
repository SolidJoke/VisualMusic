import React from 'react';

const AboutModal = ({ isOpen, onClose, txt }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.85)",
        zIndex: 1000,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backdropFilter: "blur(5px)",
      }}
    >
      <div
        style={{
          backgroundColor: "var(--bg-panel)",
          padding: "40px",
          borderRadius: "12px",
          border: "1px solid var(--theme-primary)",
          maxWidth: "500px",
          width: "90%",
          textAlign: "center",
          position: "relative",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "15px",
            right: "15px",
            background: "transparent",
            border: "none",
            color: "#fff",
            fontSize: "24px",
            cursor: "pointer",
          }}
        >
          ✖
        </button>
        <h2 style={{ color: "var(--theme-primary)", marginTop: 0 }}>
          Vmu : VisualMusic Coach
        </h2>
        <p style={{ color: "#ccc", lineHeight: "1.6", fontSize: "16px" }}>
          {txt.aboutDesc}
        </p>
        <p style={{ color: "#fff", fontWeight: "bold", margin: "20px 0" }}>
          {txt.createdBy}
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            marginTop: "30px",
          }}
        >
          <a
            href="https://ko-fi.com/gabrielgsdresende"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              backgroundColor: "#FF5E5B",
              color: "#fff",
              padding: "12px 20px",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "bold",
              fontSize: "18px",
              transition: "transform 0.2s",
            }}
            onMouseOver={(e) => (e.target.style.transform = "scale(1.05)")}
            onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
          >
            {txt.kofi}
          </a>
          <a
            href="https://github.com/SolidJoke/VisualMusic"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              backgroundColor: "var(--bg-raised)",
              color: "#fff",
              padding: "12px 20px",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "bold",
              fontSize: "18px",
              border: "1px solid #555",
              transition: "transform 0.2s",
            }}
            onMouseOver={(e) => (e.target.style.transform = "scale(1.05)")}
            onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
          >
            {txt.github}
          </a>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
