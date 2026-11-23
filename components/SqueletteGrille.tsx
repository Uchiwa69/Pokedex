// Fausse grille grise affichée pendant le chargement : elle a la même forme que la vraie,
// pour que la page ne « saute » pas quand les données arrivent.
export default function SqueletteGrille({ nombre = 24 }: { nombre?: number }) {
  return (
    <div role="status" aria-label="Chargement des Pokémon">
      <ul className="grid auto-rows-fr grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
        {/* Array.from crée un tableau de `nombre` cases, juste pour répéter le bloc. */}
        {Array.from({ length: nombre }, (_, i) => (
          <li key={i} className="verre flex animate-pulse flex-col gap-2 p-3 motion-reduce:animate-none sm:p-4">
            <div className="flex min-h-8 items-center">
              <div className="h-3 w-16 rounded-full bg-piste" />
            </div>
            <div className="mx-auto aspect-square w-full max-w-36 rounded-full bg-piste" />
            <div className="h-7 w-2/3 rounded-full bg-piste" />
            <div className="h-5 w-16 rounded-full bg-piste" />
          </li>
        ))}
      </ul>
    </div>
  );
}
