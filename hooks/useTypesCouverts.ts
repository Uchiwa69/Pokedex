import { useMemo } from "react";
import { NOMS_TYPES, type NomType } from "@/lib/types";
import { useSacoche } from "@/stores/sacoche";

// Les types présents dans la sacoche, sans doublon, dans l'ordre de la table des types.
export function useTypesCouverts(): NomType[] {
  // Le sélecteur renvoie UNE valeur existante du store (le tableau membres).
  // Il ne faut pas calculer la liste des types DANS le sélecteur : cela créerait un nouveau
  // tableau à chaque appel, Zustand croirait que l'état a changé → rendus en boucle.
  const membres = useSacoche((etat) => etat.membres);

  // useMemo : le calcul n'est refait que si `membres` change.
  return useMemo(() => {
    const presents = new Set(membres.flatMap((m) => m.pokemon.types));
    return NOMS_TYPES.filter((type) => presents.has(type));
  }, [membres]);
}
