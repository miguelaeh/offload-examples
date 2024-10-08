/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false, // disable double rendering because if not the offload widget changes state twice and you can't use it in dev mode
};

export default nextConfig;
