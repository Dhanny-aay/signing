/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true
  },
  webpack: (config, { isServer }) => {
    // Prevent optional Node-only deps like 'canvas' from breaking the bundle
    config.resolve = config.resolve || {};
    config.resolve.alias = { ...(config.resolve.alias || {}), canvas: false };
    config.resolve.fallback = { ...(config.resolve.fallback || {}), canvas: false, fs: false, path: false, crypto: false };
    return config;
  }
};

export default nextConfig;
