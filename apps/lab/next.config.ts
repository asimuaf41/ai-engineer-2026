import "./src/env";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui", "@repo/ai"],
};

export default nextConfig;
