import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Classic dynamic rendering for the MVP; flip to cacheComponents later for static shells.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
  serverExternalPackages: ["@playhouse/script-parser"],
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
};

export default nextConfig;
