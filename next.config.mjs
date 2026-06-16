/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Mongoose / mongodb-memory-server / exceljs are server-only packages that
    // must not be bundled into client code or traced into the server bundle.
    serverComponentsExternalPackages: [
      'mongoose',
      'mongodb-memory-server',
      'exceljs',
    ],
  },
};

export default nextConfig;
