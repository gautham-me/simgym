import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/DS",
  assetPrefix: "/DS",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
