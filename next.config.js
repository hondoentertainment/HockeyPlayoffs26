/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: "dist",
  experimental: {
    serverActions: { allowedOrigins: ["*"] }
  }
};

module.exports = nextConfig;
