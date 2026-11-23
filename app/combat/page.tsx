import type { Metadata } from "next";
import ArenaCombat from "@/components/ArenaCombat";
import { recupererTypes } from "@/lib/pokeapi";

export const metadata: Metadata = {
  title: "Combat",
};

// Page serveur : elle charge la table d'efficacité des 18 types (donnée en cache)
// et la transmet en prop au composant client qui gère le combat.
export default async function PageCombat() {
  const table = await recupererTypes();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="etiquette">Arène</p>
        <h1 className="font-titre text-3xl font-bold">Combat</h1>
      </header>
      <ArenaCombat table={table} />
    </div>
  );
}
