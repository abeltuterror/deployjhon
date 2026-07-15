import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La ruta OG lee public/logo.svg con fs en runtime; Vercel no incluye public/
  // en el bundle de la función por defecto, así que lo forzamos aquí.
  outputFileTracingIncludes: {
    "/api/og/convocatoria/[slug]": ["./public/logo.svg"],
  },
};

export default nextConfig;
