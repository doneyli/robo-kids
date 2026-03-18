/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Blockly uses browser APIs — exclude from SSR
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
