import { useSyncExternalStore } from "react";

// Il n'y a rien à écouter : la fonction d'abonnement ne fait rien.
function abonnementVide() {
  return () => {};
}

// Renvoie false pendant le rendu serveur ET pendant l'hydratation, puis true dans le navigateur.
// Utile pour n'afficher qu'après l'hydratation ce que le serveur ne peut pas connaître
// (le thème choisi, le contenu du localStorage…) et éviter un décalage serveur/client.
//
// useSyncExternalStore prend 3 arguments : s'abonner, la valeur côté client, la valeur côté serveur.
// C'est l'équivalent propre de « useState(false) + useEffect(() => setMonte(true), []) ».
export function useEstMonte(): boolean {
  return useSyncExternalStore(
    abonnementVide,
    () => true, // dans le navigateur
    () => false, // sur le serveur et pendant l'hydratation
  );
}
