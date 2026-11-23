import type { Metadata } from "next";
import EtatVide from "@/components/EtatVide";

export const metadata: Metadata = {
  title: "Favoris", // → « Favoris · Pokédex » grâce au gabarit du layout
};

export default function PageFavoris() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-titre text-3xl font-bold">Mes favoris</h1>
      <EtatVide
        titre="Aucun favori pour le moment"
        message="Les Pokémon marqués d'une étoile apparaîtront ici."
        lien={{ href: "/", libelle: "Voir tous les Pokémon" }}
      />
    </div>
  );
}
