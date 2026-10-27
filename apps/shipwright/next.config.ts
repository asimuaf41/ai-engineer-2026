import "./src/env";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ai", "@repo/ui"],
};

export default nextConfig;
