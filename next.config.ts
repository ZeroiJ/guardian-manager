import type { NextConfig } from "next";
import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'www.bungie.net',
            },
            {
                protocol: 'https',
                hostname: 'bungie.net',
            }
        ],
    },
};

if (process.env.NODE_ENV === 'development') {
    setupDevPlatform();
}

export default nextConfig;
