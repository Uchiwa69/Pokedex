"use client";

// LOCAL UNIQUEMENT (branche local/vitrine-3d-fiche).
// Composant sans affichage, monté dans le layout : il surveille la sacoche et précharge le modèle 3D
// de chaque membre. Ajouter un Pokémon depuis la liste ou depuis sa fiche lance donc le téléchargement
// tout de suite, sans que les boutons aient à s'en occuper.

import { useEffect } from "react";
import { prechargerModele } from "@/lib/labo/prechargement3d";
import { useSacoche } from "@/stores/sacoche";

export default function Prechargeur3D() {
  // Le sélecteur renvoie une seule valeur simple (un texte) : "6,150,25".
  const numeros = useSacoche((etat) => etat.membres.map((m) => m.pokemon.id).join(","));

  useEffect(() => {
    for (const numero of numeros.split(",").filter(Boolean)) {
      prechargerModele(Number(numero)); // sans effet si le modèle est déjà rangé
    }
  }, [numeros]);

  return null;
}
