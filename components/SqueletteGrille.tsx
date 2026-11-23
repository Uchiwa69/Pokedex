// Fausse grille grise affichée pendant le chargement : elle a la même forme que la vraie,
// pour que la page ne « saute » pas quand les données arrivent.
export default function SqueletteGrille({ nombre = 24 }: { nombre?: number }) {
  return (
    <div role="status" aria-label="Chargement des Pokémon">
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
        {/* Array.from crée un tableau de `nombre` cases, juste pour répéter le bloc. */}
        {Array.from({ length: nombre }, (_, i) => (
          <li
            key={i}
            className="flex animate-pulse flex-col gap-2 rounded-2xl border border-bordure bg-surface p-4 motion-reduce:animate-none"
          >
            <div className="h-4 w-12 rounded bg-piste" />
            <div className="mx-auto aspect-square w-full max-w-40 rounded-full bg-piste" />
            <div className="h-7 w-2/3 rounded bg-piste" />
            <div className="h-6 w-16 rounded-full bg-piste" />
          </li>
        ))}
      </ul>
    </div>
  );
}
