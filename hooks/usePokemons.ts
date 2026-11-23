import { useEffect, useState } from "react";
import type { Pokemon } from "@/lib/conversion";
import { recupererPokemonClient } from "@/lib/pokeapi-client";

type Resultat = {
  cle: string; // la liste de noms à laquelle ce résultat correspond
  pokemons: Pokemon[];
  erreur: boolean;
};

// Charge une liste de Pokémon DANS LE NAVIGATEUR et expose les 3 états classiques
// d'un chargement côté client : chargement, erreur, données.
export function usePokemons(noms: string[]) {
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [essai, setEssai] = useState(0);

  // Une chaîne comme dépendance : elle ne change que si la liste change vraiment
  // (un tableau, lui, est un nouvel objet à chaque rendu).
  const cle = noms.join(",");

  useEffect(() => {
    // Si la liste change ou si le composant disparaît avant la réponse, on ignore cette réponse.
    let annule = false;
    const demandes = cle === "" ? [] : cle.split(",");

    Promise.all(demandes.map((nom) => recupererPokemonClient(nom)))
      .then((liste) => {
        if (annule) return;
        setResultat({ cle, pokemons: liste.filter((p): p is Pokemon => p !== null), erreur: false });
      })
      .catch(() => {
        if (annule) return;
        setResultat({ cle, pokemons: [], erreur: true });
      });

    return () => {
      annule = true;
    };
  }, [cle, essai]);

  // Le résultat en mémoire correspond-il à la liste demandée maintenant ?
  const aJour = resultat !== null && resultat.cle === cle;

  return {
    // Pendant un rechargement, on continue d'afficher les Pokémon déjà connus qui sont encore demandés.
    pokemons: resultat ? resultat.pokemons.filter((p) => noms.includes(p.nom)) : [],
    chargement: !aJour,
    erreur: aJour && resultat.erreur,
    reessayer: () => {
      setResultat(null);
      setEssai((n) => n + 1);
    },
  };
}
