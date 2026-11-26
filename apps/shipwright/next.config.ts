import "./src/env";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ai", "@repo/ui"],
  // oxc-parser is a native add-on (a .node file). The bundler can't place that in a chunk, so Node loads it directly.
  serverExternalPackages: ["oxc-parser"],
};

export default nextConfig;
