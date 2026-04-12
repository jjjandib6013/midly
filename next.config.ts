import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['sharp', 'tesseract.js', '@vladmandic/face-api', 'canvas'],
};

export default nextConfig;
