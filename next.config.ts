import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  // Output: standalone untuk Docker deployment (file server.js self-contained)
  output: "standalone",
  // TypeScript: ignore build errors (sebagian shadcn/ui tidak strict-typed)
  typescript: {
    ignoreBuildErrors: true,
  },
  // React strict mode (disabled karena hot reload double-socket issue)
  reactStrictMode: false,
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  // Production source maps (untuk debugging, bisa disable untuk perf)
  productionBrowserSourceMaps: false,
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 hari
  },
  // Security headers untuk semua routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }] : []),
        ],
      },
      {
        // Disable caching untuk API routes (data realtime)
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        // Static assets long cache
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  // Experimental: optimize package imports
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', 'recharts'],
  },
};

export default nextConfig;
