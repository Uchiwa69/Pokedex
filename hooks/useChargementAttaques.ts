import { useEffect } from "react";
import type { Attaque } from "@/lib/conversion";
import { useSacoche } from "@/stores/sacoche";

// Pour chaque membre de la sacoche qui n'a pas encore ses attaques, demande au serveur ses
// 4 meilleures attaques (route /api/attaques/[nom]) et les enregistre dans le store.
// Le calcul reste côté serveur (données en cache) : le navigateur ne fait qu'UNE requête par Pokémon.
export function useChargementAttaques() {
  const membres = useSacoche((etat) => etat.membres);
  const definirAttaques = useSacoche((etat) => etat.definirAttaques);

  // Noms des membres sans attaques, réunis en une chaîne : l'effet ne se relance que si cette liste change.
  const aCharger = membres
    .filter((m) => m.attaques === undefined)
    .map((m) => m.pokemon.nom)
    .join(",");

  useEffect(() => {
    if (aCharger === "") return;
    let annule = false;

    for (const nom of aCharger.split(",")) {
      fetch(`/api/attaques/${encodeURIComponent(nom)}`)
        .then((reponse) => {
          if (!reponse.ok) throw new Error(`Réponse ${reponse.status}`);
          return reponse.json() as Promise<Attaque[]>;
        })
        .then((attaques) => {
          if (!annule) definirAttaques(nom, attaques);
        })
        .catch(() => {
          // En cas d'échec on ne fait rien : les attaques restent « à charger » et seront
          // redemandées à la prochaine visite de la page.
        });
    }

    return () => {
      annule = true;
    };
  }, [aCharger, definirAttaques]);
}
