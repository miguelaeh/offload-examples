/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false, // disable double rendering because if not the offload widget changes state twice and you can't use it in dev mode - does not affect production builds
    swcMinify: false,
};

export default nextConfig;
