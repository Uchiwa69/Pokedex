"use client";

// LOCAL UNIQUEMENT (branche local/vitrine-3d-fiche) — modèle 3D du membre sélectionné dans la sacoche.

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ouvrirModele, type ModeleOuvert } from "@/lib/labo/prechargement3d";

// dynamic() + ssr: false : three.js n'est téléchargé que si un modèle doit vraiment s'afficher.
const Visionneuse3D = dynamic(() => import("@/components/labo/Visionneuse3D"), { ssr: false, loading: () => <Attente /> });

function Attente() {
  return (
    <p role="status" className="etiquette flex aspect-square max-h-[70svh] w-full items-center justify-center">
      Préparation du modèle 3D…
    </p>
  );
}

type Props = {
  numero: number;
  nom: string;
  // Appelé avec true quand ce Pokémon n'a pas de modèle 3D : le panneau affiche alors la scène 2D à la place.
  surAbsence: (absent: boolean) => void;
};

// undefined = on ne sait pas encore ; null = pas de modèle pour ce Pokémon.
export default function VitrineMembre({ numero, nom, surAbsence }: Props) {
  const [modele, setModele] = useState<ModeleOuvert | null | undefined>(undefined);

  useEffect(() => {
    let annule = false;
    let ouvert: ModeleOuvert | null = null;
    ouvrirModele(numero).then((resultat) => {
      if (annule) {
        resultat?.liberer(); // le panneau a été fermé entre-temps
        return;
      }
      ouvert = resultat;
      setModele(resultat);
      if (resultat === null) surAbsence(true);
    });
    // Nettoyage : on rend l'adresse locale du fichier quand le panneau disparaît.
    return () => {
      annule = true;
      ouvert?.liberer();
    };
  }, [numero, surAbsence]);

  if (modele === null) return null; // pas de modèle 3D : rien à afficher
  if (modele === undefined) return <Attente />;

  return <Visionneuse3D compacte url={modele.adresse} nom={nom} roles={modele.roles} animations={modele.animations} ko={modele.ko} />;
}
