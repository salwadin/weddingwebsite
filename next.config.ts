import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the project root so a stray lockfile in a parent folder isn't picked up.
  turbopack: { root: __dirname },
  // Couples upload their own invitation artwork (up to 8 MB) through a server action.
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
};

export default nextConfig;
