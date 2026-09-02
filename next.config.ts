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
        // browser sandbox.
        source: "/app",
        headers: [
          {
            key: "Permissions-Policy",
            // The spec's default allowlist for the "tools" feature is 'self'.
            // We add 'self' explicitly so the page can register and query its
            // own tools, plus 'https://chatgpt.com' so the ChatGPT in-app
            // browser can call them cross-origin.
            value: "tools=(self https://chatgpt.com)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
