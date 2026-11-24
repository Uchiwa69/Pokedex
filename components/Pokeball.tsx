// Petite Pokéball dessinée en SVG : le « O » du logo et les places occupées de la sacoche dans l'en-tête.
// Composant serveur (aucune interaction). Les couleurs viennent des jetons de globals.css
// (fill-balle-haut, fill-balle-bas, fill-encre) : aucune couleur en dur ici.
type Props = {
  className?: string;
};

export default function Pokeball({ className }: Props) {
  return (
    // aria-hidden : l'image est décorative, le nom du site est donné par le lien qui la contient.
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      {/* Contour : un disque foncé, les deux moitiés sont dessinées par-dessus. */}
      <circle cx="12" cy="12" r="12" className="fill-encre" />
      {/* Calotte rouge (demi-disque du haut) */}
      <path d="M2 11a10 10 0 0 1 20 0Z" className="fill-balle-haut" />
      {/* Base blanche (demi-disque du bas) */}
      <path d="M2 13a10 10 0 0 0 20 0Z" className="fill-balle-bas" />
      {/* Bouton central : anneau foncé puis pastille blanche */}
      <circle cx="12" cy="12" r="4.5" className="fill-encre" />
      <circle cx="12" cy="12" r="2.5" className="fill-balle-bas" />
    </svg>
  );
}
