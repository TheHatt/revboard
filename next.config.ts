// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ Lint-Fehler blockieren den Build nicht mehr
  },
  // typescript: { ignoreBuildErrors: true }, // ❌ lieber NICHT aktivieren
};

export default nextConfig;
