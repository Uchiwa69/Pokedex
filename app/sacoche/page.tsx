import type { Metadata } from "next";
import AreneEquipe from "@/components/AreneEquipe";

export const metadata: Metadata = {
  title: "Sacoche",
};

export default function PageSacoche() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="etiquette">Équipe</p>
        <h1 className="font-titre text-3xl font-bold">Ma sacoche</h1>
      </header>
      {/* Tout le contenu dépend du localStorage : c'est un composant client. */}
      <AreneEquipe />
    </div>
  );
}
