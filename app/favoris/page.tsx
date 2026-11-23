import type { Metadata } from "next";
import ListeFavoris from "@/components/ListeFavoris";

export const metadata: Metadata = {
  title: "Favoris", // → « Favoris · Pokédex » grâce au gabarit du layout
};

export default function PageFavoris() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="etiquette">Collection</p>
        <h1 className="font-titre text-3xl font-bold">Mes favoris</h1>
      </header>
      {/* La page reste un composant serveur (titre, metadata) ; seule la liste est un composant client. */}
      <ListeFavoris />
    </div>
  );
}
