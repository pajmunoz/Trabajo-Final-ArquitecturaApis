import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No generar AGENTS.md ni CLAUDE.md al arrancar el servidor de desarrollo.
  agentRules: false,
};

export default nextConfig;
