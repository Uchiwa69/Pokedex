import Link from "next/link";

// Pied de page : composant serveur, sans aucun JavaScript côté navigateur.
// Pas de filet au-dessus (choix de l'utilisateur) : il prolonge la page sans séparation.
// Fond transparent : le site n'a qu'un thème, le sombre, où le fond de la page est déjà de cette couleur ; en bas
// de l'accueil, on voit ainsi les astéroïdes de l'écran de fin derrière lui, sans bande opaque.
export default function PiedDePage() {
  return (
    <footer>
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-texte-doux sm:flex-row sm:items-center sm:justify-between">
        <p>
          Données :{" "}
          <a href="https://pokeapi.co" target="_blank" rel="noreferrer" className="font-medium text-accent underline">
            PokéAPI
          </a>{" "}
          ·{" "}
          <Link href="/a-propos" className="font-medium text-accent underline">
            À propos
          </Link>
        </p>
        <p>Pokémon est une marque de Nintendo / Game Freak / The Pokémon Company. Projet étudiant non commercial.</p>
      </div>
    </footer>
  );
}
