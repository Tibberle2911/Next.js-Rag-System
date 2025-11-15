import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  // ESLint configuration via next.config is no longer supported in Next 16
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      // Add production image domains here if needed
      // Example: { protocol: 'https', hostname: 'yourdomain.com', pathname: '/**' }
    ],
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  turbopack: {
    // Pin root to this project to avoid picking parent lockfiles
    root: __dirname,
  },
  // Vercel deployment optimizations
  serverExternalPackages: ['@modelcontextprotocol/sdk', 'groq-sdk'],
  // API routes configuration for Vercel
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/optimization',
        destination: '/scalability',
        permanent: true,
      },
      {
        source: '/advanced-features',
        destination: '/operations',
        permanent: true,
      },
    ]
  },
  // Ensure static files are properly handled
  trailingSlash: false,
}

export default nextConfig
