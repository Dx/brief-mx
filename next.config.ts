import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' }, // NewsAPI devuelve imágenes de múltiples dominios
    ],
  },
};

export default nextConfig;
