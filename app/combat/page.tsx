import type { Metadata } from "next";
import EtatVide from "@/components/EtatVide";

export const metadata: Metadata = {
  title: "Combat",
};

export default function PageCombat() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-titre text-3xl font-bold">Combat</h1>
      <EtatVide
        titre="L'arène n'est pas encore ouverte"
        message="Bientôt : ta sacoche contre une équipe tirée au hasard."
        lien={{ href: "/sacoche", libelle: "Préparer ma sacoche" }}
      />
    </div>
  );
}
