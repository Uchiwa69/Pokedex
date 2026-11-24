import IconeCategorie, { LIBELLES_CATEGORIES } from "@/components/IconeCategorie";
import { GLYPHES } from "@/lib/glyphes";
import { recupererAttaquesParNiveau } from "@/lib/pokeapi";
import { styleTeinte } from "@/lib/teinte";
import { TYPES } from "@/lib/types";

// Même cascade d'apparition que la grille de l'accueil : seules les premières cartes sont décalées.
const CARTES_DECALEES = 6;
const DECALAGE = 15; // millisecondes

// Attaques apprises par montée de niveau. Composant serveur asynchrone, placé sous <Suspense> :
// le squelette (SqueletteAttaques) s'affiche pendant que le serveur charge les attaques.
export default async function ListeAttaques({ nom }: { nom: string }) {
  const apprises = await recupererAttaquesParNiveau(nom);

  if (apprises.length === 0) {
    return <p className="text-sm text-texte-doux">Aucune attaque apprise par montée de niveau.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="etiquette">
        {apprises.length} {apprises.length > 1 ? "attaques" : "attaque"} · de la première apprise à la dernière
      </p>
      {/* Grille de cartes : 1 colonne sur mobile, 2 puis 3 ensuite. sm:auto-rows-fr : dès qu'il y a plusieurs colonnes, toutes les rangées ont la même hauteur. */}
      <ul className="grid gap-4 sm:auto-rows-fr sm:grid-cols-2 lg:grid-cols-3">
        {apprises.map(({ niveau, attaque }, index) => (
          // --teinte : couleur du TYPE DE L'ATTAQUE (pas celle du Pokémon), pour le décor et le symbole de la carte.
          <li
            key={attaque.id}
            style={{ ...styleTeinte(attaque.type), animationDelay: `${Math.min(index, CARTES_DECALEES) * DECALAGE}ms` }}
            className="verre relative flex animate-apparition flex-col gap-3 overflow-hidden p-4 motion-reduce:animate-fondu"
          >
            {/* Décor, comme sur les cartes des Pokémon : dégradé de la teinte et liseré de lumière en haut. */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,var(--teinte),transparent_55%)] opacity-20" />
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-3xl shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-texte)_40%,transparent)]" />

            <div className="relative flex items-start gap-3">
              {/* Symbole du type dans un disque teinté (les mêmes symboles que le filtre de l'accueil). */}
              <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--teinte)_22%,transparent)]">
                <svg viewBox="0 0 24 24" className="size-5 fill-[var(--teinte)]">
                  <path d={GLYPHES[attaque.type].trace} fillRule="evenodd" />
                </svg>
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {/* Le nom est l'information principale : le plus grand texte de la carte, en gras. */}
                <h3 className="truncate font-titre text-lg font-bold leading-tight">{attaque.nomFr}</h3>
                <p className="etiquette flex items-center gap-1">
                  {TYPES[attaque.type].libelle} ·
                  <IconeCategorie categorie={attaque.categorie} />
                  {LIBELLES_CATEGORIES[attaque.categorie]}
                </p>
              </div>
              {/* Niveau d'apprentissage, dans une petite gélule */}
              <p className="flex shrink-0 items-baseline gap-1 rounded-full border border-bordure-verre bg-fond/60 px-3 py-1">
                <span className="etiquette">Niv.</span>
                <span className="font-titre text-base font-bold tabular-nums">{niveau <= 1 ? "1" : niveau}</span>
              </p>
            </div>

            {/* Description toujours visible (plus besoin de survoler), mais en retrait : petite, en couleur douce,
                2 lignes au maximum. title : le texte complet apparaît au survol s'il a été coupé. */}
            {attaque.description && (
              <p title={attaque.description} className="relative line-clamp-2 text-xs leading-relaxed text-texte-doux">
                {attaque.description}
              </p>
            )}

            {/* dl : paires « libellé / valeur ». Les chiffres sont grands et en gras, les libellés restent petits :
                l'œil va d'abord aux valeurs. « — » quand la valeur n'existe pas (attaque de statut…).
                mt-auto : les trois cases restent collées en bas, quelle que soit la longueur de la description. */}
            <dl className="relative mt-auto grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-fond/50 px-2 py-2">
                <dt className="etiquette">Puissance</dt>
                <dd className="font-titre text-xl font-bold leading-tight tabular-nums">{attaque.puissance ?? "—"}</dd>
              </div>
              <div className="rounded-2xl bg-fond/50 px-2 py-2">
                <dt className="etiquette">Précision</dt>
                <dd className="font-titre text-xl font-bold leading-tight tabular-nums">{attaque.precision ?? "—"}</dd>
              </div>
              <div className="rounded-2xl bg-fond/50 px-2 py-2">
                <dt className="etiquette">PP</dt>
                <dd className="font-titre text-xl font-bold leading-tight tabular-nums">{attaque.pp}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Squelette de la grille, affiché par <Suspense> pendant le chargement : mêmes colonnes que la vraie grille.
export function SqueletteAttaques() {
  return (
    <ul role="status" aria-label="Chargement des attaques" className="grid animate-pulse gap-4 motion-reduce:animate-none sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="verre flex flex-col gap-3 p-4">
          <span className="flex items-center gap-3">
            <span className="size-10 rounded-full bg-piste" />
            <span className="flex flex-1 flex-col gap-2">
              <span className="h-4 w-1/2 rounded-full bg-piste" />
              <span className="h-3 w-1/3 rounded-full bg-piste" />
            </span>
          </span>
          <span className="h-10 rounded-2xl bg-piste" />
          <span className="h-12 rounded-2xl bg-piste" />
        </li>
      ))}
    </ul>
  );
}
