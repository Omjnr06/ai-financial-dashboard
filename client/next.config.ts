import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // Intercepts any frontend call to /api/external/...
        source: "/api/external/:path*",
        // Proxies it to your Render backend with cookies securely attached
        destination: "https://vault-api-n6zf.onrender.com/:path*",
      },
    ];
  },
};

export default nextConfig;