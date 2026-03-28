import React, { useEffect, useRef } from "react";

export default function AudioVisualizer({ analyser, width = "100%", height = "60px" }) {
  const canvasRef = useRef(null);
  const requestRef = useRef();

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Match internal canvas resolution to actual display size for sharpness
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;

    const draw = () => {
      requestRef.current = requestAnimationFrame(draw);

      // analyser.getValue() returns Float32Array of dB values (usually -100 to 0)
      const values = analyser.getValue();
      
      // Clear canvas with a very slight fade effect for sleekness
      ctx.fillStyle = "rgba(18, 18, 18, 0.4)";
      ctx.fillRect(0, 0, W, H);

      // The FFT array size is analyser.size (e.g. 64)
      const bufferLength = values.length;
      
      // We often don't need the very top end of the spectrum visually, 
      // but let's draw them all evenly.
      const barWidth = (W / bufferLength) * 1.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        // value is in decibels (-100 to 0). Normalize it to 0-1.
        let val = values[i];
        if (!isFinite(val)) val = -100;
        
        let normalized = (val + 100) / 100; 
        if (normalized < 0) normalized = 0;
        if (normalized > 1) normalized = 1;

        // Apply an exponential curve to make peaks pop more
        normalized = Math.pow(normalized, 1.5);

        const barHeight = normalized * H * 0.9;

        // Gradient color: Bass (red/yellow) -> Treble (blue/purple)
        const hue = i * (360 / bufferLength);
        ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;

        // Draw centered vertically or from bottom? Let's do from bottom
        ctx.beginPath();
        ctx.roundRect(x, H - barHeight, barWidth - 1, barHeight, 2);
        ctx.fill();

        x += barWidth;
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, [analyser]);

  return (
    <div style={{ width, height, borderRadius: "6px", overflow: "hidden", border: "1px solid #333", backgroundColor: "#121212" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}
