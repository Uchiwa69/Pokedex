import Image from "next/image";
import Link from "next/link";
import { formaterNumero } from "@/lib/conversion";
import { recupererEvolutions } from "@/lib/pokeapi";

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
    <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {evolutions.map((evolution) => {
        const actuel = evolution.nom === nomActuel;
        return (
          <li key={evolution.id}>
            <Link
              href={`/pokemon/${evolution.nom}`}
              aria-current={actuel ? "page" : undefined}
              className={
                actuel
                  ? "flex h-full flex-col items-center gap-2 rounded-2xl border-2 border-accent bg-surface p-4 text-center"
                  : "flex h-full flex-col items-center gap-2 rounded-2xl border border-bordure bg-surface p-4 text-center hover:border-accent"
              }
            >
              <span className="relative block h-24 w-24">
                {evolution.artwork ? (
                  <Image
                    src={evolution.artwork}
                    alt={`Illustration de ${evolution.nomFr}`}
                    fill
                    sizes="96px"
                    className="object-contain"
                  />
                ) : (
                  <span className="block h-full w-full rounded-full bg-piste" aria-hidden="true" />
                )}
              </span>
              <span className="text-xs font-semibold text-texte-doux">{formaterNumero(evolution.id)}</span>
              <span className="font-titre text-sm font-semibold">{evolution.nomFr}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
