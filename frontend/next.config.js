const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  compress: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  transpilePackages: ["@rainbow-me/rainbowkit"],
  experimental: {
    optimizePackageImports: [
      "@rainbow-me/rainbowkit",
      "wagmi",
      "viem",
      "lucide-react",
    ],
  },
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": path.resolve(
        __dirname,
        "src/mocks/async-storage.js"
      ),
    };
    return config;
  },
};

module.exports = nextConfig;
