// Petite Pokéball dessinée en SVG : le « O » du logo, les places de la sacoche dans l'en-tête
// et le bouton « sacoche » des cartes.
// Composant sans état ni hook (utilisable côté serveur comme côté client). Les couleurs viennent
// des jetons de globals.css (fill-balle-haut, fill-balle-bas, fill-encre) : aucune couleur en dur ici.
type Props = {
  className?: string;
  // true : seulement le contour, de la couleur du texte (Pokéball « vide », pas encore utilisée).
  vide?: boolean;
};

export default function Pokeball({ className, vide = false }: Props) {
  if (vide) {
    return (
      // stroke="currentColor" : le trait prend la couleur du texte du parent.
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        {/* La ceinture, interrompue par le bouton central */}
        <path d="M2 12h6.5M15.5 12H22" />
        <circle cx="12" cy="12" r="3.5" />
      </svg>
    );
  }

  return (
    // aria-hidden : l'image est décorative, le sens est donné par le lien ou le bouton qui la contient.
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
