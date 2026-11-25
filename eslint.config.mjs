import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Fichiers repris tels quels de Pokémon Showdown (animations d'attaques) : ils suivent les règles
    // d'écriture d'un autre projet, on ne les vérifie pas. Le code écrit pour ce projet (scene.ts, index.ts) l'est.
    "lib/showdown/animations-attaques.ts",
    "lib/showdown/animations-communes.ts",
    "lib/showdown/effets.ts",
    // Modèle 3D du Pokédex repris d'un fichier fourni par l'utilisateur (prototype du labo).
    "lib/labo/pokedex3d.ts",
    // Nuée de points de l'en-tête et du pied de page, reprise telle quelle de React Bits.
    "components/SwarmCursor.tsx",
  ]),
]);

export default eslintConfig;
