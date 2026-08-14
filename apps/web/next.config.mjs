/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@genesis/shared', '@genesis/kernel', '@genesis/models', '@genesis/params'],
};

export default nextConfig;
