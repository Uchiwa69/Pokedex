"use client";

// LOCAL UNIQUEMENT (branche local/vitrine-3d-fiche, jamais fusionnée dans main) — petite vitrine 3D de la fiche.
// Tant que l'on n'a pas cliqué, rien de la 3D n'est chargé : ni three.js, ni le fichier du modèle.

import { useState } from "react";
import dynamic from "next/dynamic";
import type { RolesAnimation } from "@/lib/labo/modeles3d";

// dynamic() : le code de la visionneuse n'est téléchargé qu'au moment où on l'ouvre.
// ssr: false : elle a besoin du navigateur (WebGL), jamais du serveur.
const Visionneuse3D = dynamic(() => import("@/components/labo/Visionneuse3D"), {
  ssr: false,
  loading: () => (
    <p role="status" className="etiquette flex h-72 items-center justify-center">
      Chargement de la vitrine…
    </p>
  ),
});

type Props = {
  url: string; // adresse du fichier du modèle
  nom: string;
  roles: RolesAnimation;
  animations: string[];
  ko: number;
};

export default function PanneauVitrine3D({ url, nom, roles, animations, ko }: Props) {
  const [ouverte, setOuverte] = useState(false);

  return (
    <section aria-labelledby="titre-vitrine" className="verre flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="titre-vitrine" className="etiquette">
          Modèle 3D · {(ko / 1024).toFixed(1)} Mo
        </h2>
        <button
          type="button"
          onClick={() => setOuverte((valeur) => !valeur)}
          aria-expanded={ouverte}
          className={`bouton ${ouverte ? "bouton-secondaire" : "bouton-principal"}`}
        >
          {ouverte ? "Fermer" : "Afficher le modèle"}
        </button>
      </div>

      {/* Fermer retire le composant : sa scène three.js est libérée (voir le nettoyage dans Visionneuse3D). */}
      {ouverte && <Visionneuse3D compacte url={url} nom={nom} roles={roles} animations={animations} ko={ko} />}
    </section>
  );
}
