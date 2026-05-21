/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.xn--pqqu92a7purjq99ibym.top',
      },
      {
        protocol: 'https',
        hostname: 'xn--pqqu92a7purjq99ibym.top',
      },
    ],
  },
}

export default nextConfig
