import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imposé par le cours : ne jamais retirer ces deux options.
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Les images des Pokémon (artworks, sprites) sont hébergées sur GitHub.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
      },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
