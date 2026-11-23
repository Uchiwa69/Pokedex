import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imposé par le cours : ne jamais retirer ces deux options.
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Durée de vie des images optimisées : 31 jours au lieu de 4 heures (valeur par défaut).
    // Les illustrations des Pokémon ne changent jamais. Avec 4 heures, chaque image devait être
    // retéléchargée et redimensionnée plusieurs fois par jour (environ 0,6 s par image à chaque fois),
    // ce qui retardait l'apparition des cartes après un changement de filtre.
    minimumCacheTTL: 2678400,
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
