import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async headers() {
    return [
      {
        // The /app page registers WebMCP tools. The permissions-policy
        // `tools` directive exposes them to the granted agent origins
        // (https://chatgpt.com). This is the cross-origin grant that lets
        // ChatGPT's agent runtime call Recall's tools through the page's
        // existing sandbox (blueprint §17, §21.1).
        source: "/app",
        headers: [
          {
            key: "Permissions-Policy",
            value: "tools=(https://chatgpt.com)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
