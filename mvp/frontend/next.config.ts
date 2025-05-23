import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  /* config options here */
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: "http://auth-service:8000/:path*",
      },
      {
        source: "/api/warehouse/:path*",
        destination: "http://warehouse-service:8001/:path*",
      },
      {
        source: "/api/tracking/:path*",
        destination: "http://tracking-service:8002/:path*",
      },
      {
        source: "/api/notification/:path*",
        destination: "http://notification-service:8003/:path*",
      },
    ];
  },
};

export default nextConfig;
