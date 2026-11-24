// Icône de sac à dos dessinée en SVG, pour l'indicateur de sacoche de l'en-tête.
// stroke="currentColor" : le trait prend la couleur du texte du parent (text-texte-doux, text-texte…).
type Props = {
  className?: string;
};

export default function IconeSac({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Poignée */}
      <path d="M9 6V5a3 3 0 0 1 6 0v1" />
      {/* Corps du sac */}
      <path d="M5 10a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v8a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3Z" />
      {/* Fermeture, puis poche avant */}
      <path d="M9 10.5h6" />
      <path d="M9 21v-5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5" />
    </svg>
  );
}
