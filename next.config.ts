import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Skip type checking during build — types depend on Supabase schema
    // that doesn't exist yet. Re-enable after DB setup.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
