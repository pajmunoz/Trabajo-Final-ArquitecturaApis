import type { NextConfig } from "next";

// El navegador llama a /api/... en el mismo origen y el servidor de Next.js lo reenvía
// al API Gateway. Así el front servido por HTTPS no hace llamadas HTTP (contenido
// mixto bloqueado por el navegador) y no depende de CORS. Se fija al compilar.
const BACKEND_URL = (process.env.BACKEND_URL ?? "http://3.151.57.252").replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Servidor mínimo (server.js) para desplegar en Azure App Service sin node_modules.
  output: "standalone",
  // No generar AGENTS.md ni CLAUDE.md al arrancar el servidor de desarrollo.
  agentRules: false,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/:path*` }];
  },
};

export default nextConfig;
