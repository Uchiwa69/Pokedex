// PROTOTYPE (branche feature/pokemon-3d-viewer) — page de test de la vitrine 3D.
// Elle n'est liée depuis aucun menu : on y accède par l'adresse /labo/3d.
// Aucun composant existant de l'application n'est modifié ; cette page ne fait que les réutiliser.

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import BadgeType from "@/components/BadgeType";
import SpriteAnime from "@/components/SpriteAnime";
import ListeModeles from "@/components/labo/ListeModeles";
import Visionneuse3D from "@/components/labo/Visionneuse3D";
import { BASE_MODELES, choisirForme, compterParEtat, listerModeles, obtenirModele } from "@/lib/labo/modeles3d";
import { recupererPokemon } from "@/lib/pokeapi";
import { styleTeinte } from "@/lib/teinte";

export const metadata: Metadata = {
  title: "Labo · Vitrine 3D",
  robots: { index: false }, // prototype : pas d'indexation par les moteurs de recherche
};

type Props = PageProps<"/labo/3d">;

const POKEMON_PAR_DEFAUT = 150; // Mewtwo : un modèle officiel avec toutes ses animations

export default function PageLabo3D({ searchParams }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="etiquette">Laboratoire · prototype non intégré</p>
        <h1 className="font-titre text-3xl font-bold">Vitrine 3D</h1>
      </header>

      {/* L'adresse (?id=…&forme=…) est une donnée de la requête : lue sous Suspense. */}
      <Suspense fallback={<div role="status" aria-label="Chargement" className="h-96 animate-pulse rounded-3xl bg-piste motion-reduce:animate-none" />}>
        <Contenu searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function premiere(valeur: string | string[] | undefined): string {
  return Array.isArray(valeur) ? (valeur[0] ?? "") : (valeur ?? "");
}

async function Contenu({ searchParams }: { searchParams: Props["searchParams"] }) {
  const parametres = await searchParams;

  // Validation : numéro entre 1 et 1 025, sinon le Pokémon par défaut.
  const demande = Number.parseInt(premiere(parametres.id), 10);
  const id = Number.isInteger(demande) && demande >= 1 && demande <= 1025 ? demande : POKEMON_PAR_DEFAUT;
  const modele = obtenirModele(id)!;
  // Forme inconnue → forme normale.
  const forme = choisirForme(modele, premiere(parametres.forme)) ?? choisirForme(modele, "regular");
  // ?forcer=1 affiche la 3D même pour un modèle écarté, pour pouvoir juger sa qualité.
  const forcer = premiere(parametres.forcer) === "1";

  const pokemon = await recupererPokemon(String(id)); // données déjà en cache (types, sprites…)
  const compte = compterParEtat();

  // La 3D est montrée si le modèle est présentable (ou si on la force), ou si l'on a choisi une autre forme.
  const formeChoisie = forme !== null && forme.forme !== "regular";
  const afficher3D = forme !== null && (modele.etat === "anime" || modele.etat === "statique" || forcer || formeChoisie);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-texte-doux">
        Sur 1 025 Pokémon : {compte.anime} modèles animés (animations d&apos;origine), {compte.statique} statiques présentables
        (animation générique), {compte.exclu} écartés pour défaut et {compte.absent} absents — ces deux derniers groupes
        utilisent le repli 2D.
      </p>

      <div className="grid items-start gap-6 lg:grid-cols-[20rem_1fr]">
        {/* Sur mobile, la liste passe après la visionneuse (order-last) ; sur grand écran, elle reste à gauche. */}
        <div className="order-last lg:order-none">
          <ListeModeles modeles={listerModeles()} idActif={id} />
        </div>

        <div className="flex min-w-0 flex-col gap-6" style={styleTeinte(pokemon?.types[0])}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <p className="etiquette">
                N° {String(id).padStart(4, "0")} · classe {modele.classe} · {forme ? forme.forme : "aucun modèle"}
              </p>
              <h2 className="font-titre text-3xl font-bold">{pokemon?.nomFr ?? modele.nom}</h2>
              {pokemon && (
                <ul className="flex flex-wrap gap-2" aria-label="Types">
                  {pokemon.types.map((type) => (
                    <li key={type}>
                      <BadgeType type={type} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Link href={`/pokemon/${pokemon?.nom ?? id}`} className="bouton bouton-secondaire">
              Voir la fiche actuelle
            </Link>
          </div>

          {afficher3D && forme ? (
            // key : changer de modèle recrée la visionneuse avec un état neuf (barre de progression à zéro).
            <Visionneuse3D
              key={forme.fichier}
              url={BASE_MODELES + forme.fichier}
              nom={pokemon?.nomFr ?? modele.nom}
              roles={forme.roles}
              animations={forme.animations}
              ko={forme.ko}
            />
          ) : (
            // Système de repli : le sprite animé déjà utilisé sur la fiche (composant existant, inchangé).
            <div className="flex flex-col gap-4">
              <div className="verre flex flex-col gap-2 p-4 text-sm text-texte-doux">
                <p className="font-semibold text-texte">Repli 2D</p>
                <p>
                  {modele.etat === "absent"
                    ? "Aucun modèle 3D n'existe pour ce Pokémon dans la source utilisée."
                    : `Le modèle 3D existe mais a été écarté : ${modele.defauts || "défaut de pose"}.`}
                </p>
                {modele.etat === "exclu" && (
                  <Link href={`/labo/3d?id=${id}&forcer=1`} scroll={false} className="bouton bouton-secondaire self-start">
                    Afficher quand même le modèle 3D
                  </Link>
                )}
              </div>
              {pokemon && <SpriteAnime pokemon={pokemon} />}
            </div>
          )}

          {/* Autres formes disponibles en 3D */}
          {modele.formes && modele.formes.length > 0 && (
            <section aria-labelledby="titre-formes" className="flex flex-col gap-2">
              <h3 id="titre-formes" className="etiquette">
                Formes disponibles en 3D
              </h3>
              <ul className="flex flex-wrap gap-2">
                {[choisirForme(modele, "regular"), ...modele.formes].map(
                  (f) =>
                    f && (
                      <li key={f.forme + f.fichier}>
                        <Link
                          href={f.forme === "regular" ? `/labo/3d?id=${id}` : `/labo/3d?id=${id}&forme=${encodeURIComponent(f.forme)}`}
                          scroll={false}
                          prefetch={false}
                          aria-current={forme?.fichier === f.fichier ? "true" : undefined}
                          className={`bouton ${forme?.fichier === f.fichier ? "bouton-principal" : "bouton-secondaire"}`}
                        >
                          {f.forme} · {f.animations.length} anim. · {(f.ko / 1024).toFixed(1)} Mo
                        </Link>
                      </li>
                    ),
                )}
              </ul>
            </section>
          )}

          {/* Fiche technique et crédits du modèle */}
          {forme && (
            <dl className="verre grid grid-cols-2 gap-4 p-4 text-sm sm:grid-cols-4">
              <div>
                <dt className="etiquette">Poids</dt>
                <dd className="font-titre font-semibold">{(forme.ko / 1024).toFixed(2)} Mo</dd>
              </div>
              <div>
                <dt className="etiquette">Triangles</dt>
                <dd className="font-titre font-semibold">{forme.triangles.toLocaleString("fr-FR")}</dd>
              </div>
              <div>
                <dt className="etiquette">Os</dt>
                <dd className="font-titre font-semibold">{forme.os}</dd>
              </div>
              <div>
                <dt className="etiquette">Animations</dt>
                <dd className="font-titre font-semibold">{forme.animations.length}</dd>
              </div>
              <div className="col-span-2 sm:col-span-4">
                <dt className="etiquette">Source</dt>
                <dd className="text-texte-doux">
                  Pokemon-3D-api
                  {modele.auteur && modele.source ? (
                    <>
                      {" "}
                      · modèle publié par{" "}
                      <a href={modele.source} target="_blank" rel="noreferrer" className="font-medium text-accent underline">
                        {modele.auteur}
                      </a>{" "}
                      ({modele.licence})
                    </>
                  ) : (
                    " · auteur non renseigné"
                  )}
                  . Pokémon est une marque de Nintendo / Game Freak / The Pokémon Company.
                </dd>
              </div>
              {modele.defauts && (
                <div className="col-span-2 sm:col-span-4">
                  <dt className="etiquette">Défauts relevés au recensement</dt>
                  <dd className="text-texte-doux">{modele.defauts}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}
