import type { Metadata } from "next";
import EtatVide from "@/components/EtatVide";

export const metadata: Metadata = {
  title: "Sacoche",
};

export default function PageSacoche() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-titre text-3xl font-bold">Ma sacoche</h1>
      <EtatVide
        titre="La sacoche est vide"
        message="Tu pourras y ranger jusqu'à 6 Pokémon pour former ton équipe."
        lien={{ href: "/", libelle: "Choisir des Pokémon" }}
      />
    </div>
  );
}
