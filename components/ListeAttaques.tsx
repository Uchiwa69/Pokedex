import BadgeType from "@/components/BadgeType";
import IconeCategorie, { LIBELLES_CATEGORIES } from "@/components/IconeCategorie";
import { recupererAttaquesParNiveau } from "@/lib/pokeapi";

// Attaques apprises par montée de niveau. Composant serveur asynchrone, placé sous <Suspense> :
// le squelette (SqueletteAttaques) s'affiche pendant que le serveur charge chaque attaque.
export default async function ListeAttaques({ nom }: { nom: string }) {
  const apprises = await recupererAttaquesParNiveau(nom);

  if (apprises.length === 0) {
    return <p className="text-sm text-texte-doux">Aucune attaque apprise par montée de niveau.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="etiquette">
        {apprises.length} attaques · survole ou sélectionne une ligne pour lire sa description
      </p>
      <ul className="flex flex-col gap-2">
        {apprises.map(({ niveau, attaque }) => (
          // tabIndex={0} : la ligne peut recevoir le focus au clavier (et au doigt), ce qui affiche la description.
          // "group" : la description réagit au survol et au focus de la ligne.
          <li
            key={attaque.id}
            tabIndex={0}
            className="verre group relative grid grid-cols-[3rem_1fr] items-center gap-x-4 gap-y-2 px-4 py-2 sm:grid-cols-[3rem_1fr_auto]"
          >
            <p className="flex flex-col">
              <span className="etiquette">Niv.</span>
              <span className="font-titre text-xl font-semibold tabular-nums">{niveau <= 1 ? "1" : niveau}</span>
            </p>

            <div className="flex min-w-0 flex-col gap-1">
              <p className="truncate font-titre text-sm font-semibold">{attaque.nomFr}</p>
              <div className="flex flex-wrap items-center gap-2">
                <BadgeType type={attaque.type} petit />
                <span className="etiquette flex items-center gap-1">
                  <IconeCategorie categorie={attaque.categorie} />
                  {LIBELLES_CATEGORIES[attaque.categorie]}
                </span>
              </div>
            </div>

            {/* dl : paires « libellé / valeur ». « — » quand la valeur n'existe pas (attaque de statut…). */}
            <dl className="col-span-2 grid grid-cols-3 gap-4 text-center sm:col-span-1">
              <div>
                <dt className="etiquette">Puis.</dt>
                <dd className="font-titre text-sm font-semibold tabular-nums">{attaque.puissance ?? "—"}</dd>
              </div>
              <div>
                <dt className="etiquette">Préc.</dt>
                <dd className="font-titre text-sm font-semibold tabular-nums">{attaque.precision ?? "—"}</dd>
              </div>
              <div>
                <dt className="etiquette">PP</dt>
                <dd className="font-titre text-sm font-semibold tabular-nums">{attaque.pp}</dd>
              </div>
            </dl>

            {/* Description : toujours dans la page (lue par les lecteurs d'écran), rendue visible
                au survol ou au focus par un simple changement d'opacité. Elle flotte sous la ligne
                (absolute) pour ne pas décaler les lignes suivantes. */}
            {attaque.description && (
              <p className="pointer-events-none absolute inset-x-4 top-full z-10 -mt-1 rounded-2xl border border-bordure bg-surface-pleine p-3 text-sm text-texte opacity-0 shadow-carte transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100 motion-reduce:transition-none">
                {attaque.description}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Squelette de la liste, affiché par <Suspense> pendant le chargement.
export function SqueletteAttaques() {
  return (
    <ul role="status" aria-label="Chargement des attaques" className="flex animate-pulse flex-col gap-2 motion-reduce:animate-none">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="verre flex items-center gap-4 px-4 py-2">
          <span className="h-10 w-10 rounded-full bg-piste" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="h-4 w-1/3 rounded-full bg-piste" />
            <span className="h-4 w-1/4 rounded-full bg-piste" />
          </span>
        </li>
      ))}
    </ul>
  );
}
