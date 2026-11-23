import Image from "next/image";
import Link from "next/link";
import { recupererEvolutions } from "@/lib/pokeapi";
import { styleTeinte } from "@/lib/teinte";

type Props = {
  nomEspece: string;
  // Nom du Pokémon affiché sur la fiche, pour le signaler dans la chaîne.
  nomActuel: string;
};

// Composant serveur asynchrone, placé sous son propre <Suspense> dans la fiche :
// le haut de la fiche s'affiche sans attendre la chaîne d'évolution.
export default async function ChaineEvolution({ nomEspece, nomActuel }: Props) {
  const evolutions = await recupererEvolutions(nomEspece);

  if (evolutions.length <= 1) {
    return <p className="text-sm text-texte-doux">Ce Pokémon n&apos;évolue pas.</p>;
  }

  return (
    <ol className="grid auto-rows-fr grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {evolutions.map((evolution) => {
        const actuel = evolution.nom === nomActuel;
        return (
          <li key={evolution.id} className="min-w-0">
            <Link
              href={`/pokemon/${evolution.nom}`}
              aria-current={actuel ? "page" : undefined}
              style={styleTeinte(evolution.types[0])}
              className={`verre group relative flex h-full flex-col items-center gap-2 overflow-hidden p-4 text-center ${
                // Le Pokémon de la fiche est entouré de l'accent.
                actuel ? "outline-2 -outline-offset-2 outline-accent" : ""
              }`}
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-[linear-gradient(145deg,var(--teinte),transparent_60%)] opacity-25 transition-opacity duration-200 group-hover:opacity-45 motion-reduce:transition-none"
              />
              <span className="relative block h-24 w-24">
                {/* Halo net au sol */}
                <span aria-hidden="true" className="absolute bottom-0 left-1/2 h-2 w-3/5 -translate-x-1/2 rounded-[100%] bg-[var(--teinte)] opacity-70 blur-xs dark:opacity-60" />
                {evolution.artwork ? (
                  <Image
                    src={evolution.artwork}
                    alt={`Illustration de ${evolution.nomFr}`}
                    fill
                    sizes="96px"
                    className="object-contain transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                ) : (
                  <span className="block h-full w-full rounded-full bg-piste" aria-hidden="true" />
                )}
              </span>
              <span className="etiquette relative">N° {String(evolution.id).padStart(4, "0")}</span>
              <span className="relative w-full truncate font-titre text-sm font-semibold">{evolution.nomFr}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
