import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Configuration des tests. Seules les fonctions pures de lib/ sont testées.
export default defineConfig({
  resolve: {
    // Même alias que dans tsconfig.json : "@/lib/combat" → "<racine>/lib/combat".
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node", // pas besoin de navigateur simulé pour des fonctions pures
  },
});
