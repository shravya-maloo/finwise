import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) loads a worker file using a path that's
  // relative to its own package location at runtime. Bundling it breaks
  // that path, so this tells Next.js to leave it as a plain require()
  // instead, letting Node resolve it from node_modules normally.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
