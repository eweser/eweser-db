/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@eweser/shared', '@eweser/db'],
  webpack: (config, { dev }) => {
    if (dev) {
      config.devtool = 'source-map';
    }
    return config;
  },
};

export default nextConfig;
