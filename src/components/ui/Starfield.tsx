"use client";

import { useEffect, useRef } from "react";

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let stars: { x: number; y: number; radius: number; opacity: number; speed: number; pulseSpeed: number }[] = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    };

    const initStars = () => {
      stars = [];
      const numStars = Math.floor((canvas.width * canvas.height) / 8000);

      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() > 0.9 ? Math.random() * 1.5 : Math.random() * 0.8,
          opacity: Math.random(),
          pulseSpeed: (Math.random() * 0.02) + 0.005,
          speed: (Math.random() * 0.05) + 0.01,
        });
      }
    };

    const drawStars = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        star.opacity += star.pulseSpeed;
        if (star.opacity >= 1 || star.opacity <= 0.1) {
          star.pulseSpeed = -star.pulseSpeed;
        }

        star.y -= star.speed;
        if (star.y < 0) {
          star.y = canvas.height;
          star.x = Math.random() * canvas.width;
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        const hue = Math.random() > 0.5 ? '200, 255, 255' : '255, 255, 255';
        ctx.fillStyle = `rgba(${hue}, ${Math.max(0.1, Math.min(1, star.opacity))})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(drawStars);
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    drawStars();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none opacity-70"
      style={{ zIndex: 0 }}
    />
  );
}
