import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ajncuwugertkokfrqxqm.supabase.co",
        pathname: "/storage/v1/object/public/artwork-images/**",
      },
    ],
  },
};

export default nextConfig;
