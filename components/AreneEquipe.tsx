"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, Reorder, useReducedMotion } from "motion/react";
import BadgeType from "@/components/BadgeType";
import BarreStat from "@/components/BarreStat";
import CarteAttaque from "@/components/CarteAttaque";
import SocleEquipe from "@/components/SocleEquipe";
import Scene2D from "@/components/labo/Scene2D";
import VitrineMembre from "@/components/labo/VitrineMembre";
import { useChargementAttaques } from "@/hooks/useChargementAttaques";
import { useTypesCouverts } from "@/hooks/useTypesCouverts";
import { LIBELLES_STATS } from "@/lib/stats";
import { styleTeinte } from "@/lib/teinte";
import { LONGUEUR_MAX_SURNOM, TAILLE_MAX_SACOCHE, useSacoche, useSacochePrete, type Membre } from "@/stores/sacoche";

// Page « arène d'équipe » : les 6 emplacements de la sacoche, chacun sur un socle.
export default function AreneEquipe() {
  const prete = useSacochePrete();

  // Tant que le localStorage n'est pas relu, on ne sait pas ce que contient la sacoche.
  if (!prete) {
    return (
      <div
        role="status"
        aria-label="Chargement de la sacoche"
        className="h-96 animate-pulse rounded-3xl bg-piste motion-reduce:animate-none"
      />
    );
  }

  // Le contenu n'est monté qu'une fois la sacoche prête : son état initial lit donc les vraies données.
  return <ContenuArene />;
}

function ContenuArene() {
  const membres = useSacoche((etat) => etat.membres);
  const vider = useSacoche((etat) => etat.vider);
  const accuserAjout = useSacoche((etat) => etat.accuserAjout);
  const typesCouverts = useTypesCouverts();
  // Charge en arrière-plan les 4 attaques des membres qui n'en ont pas encore.
  useChargementAttaques();

  // Membre sélectionné (son nom), état LOCAL à la page : inutile de le mettre dans le store.
  const [selection, setSelection] = useState<string | null>(null);
  // Confirmation en deux clics pour « Vider la sacoche ».
  const [confirmation, setConfirmation] = useState(false);

  // Nom du dernier Pokémon ajouté, lu UNE fois au montage (la fonction passée à useState ne s'exécute
  // qu'au premier rendu). Son socle jouera l'effet « Poké Ball ».
  const [nouveau] = useState(() => useSacoche.getState().dernierAjout);
  useEffect(() => {
    // L'effet est joué : on l'efface du store pour qu'il ne rejoue pas à la prochaine visite.
    accuserAjout();
  }, [accuserAjout]);

  // État dérivé : si le membre sélectionné a été retiré, il n'y a plus de sélection.
  const membreSelectionne = membres.find((m) => m.pokemon.nom === selection) ?? null;
  const emplacementsVides = TAILLE_MAX_SACOCHE - membres.length;

  return (
    <div className="flex flex-col gap-8">
      {/* Barre d'en-tête : types couverts et actions */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <section aria-labelledby="titre-types-couverts" className="flex flex-col gap-2">
          <h2 id="titre-types-couverts" className="etiquette">
            Types couverts · {membres.length} Pokémon sur {TAILLE_MAX_SACOCHE}
          </h2>
          {typesCouverts.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {typesCouverts.map((type) => (
                <li key={type}>
                  <BadgeType type={type} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-texte-doux">Aucun pour le moment.</p>
          )}
        </section>

        <div className="flex flex-wrap items-center gap-2">
          {membres.length > 0 &&
            (confirmation ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    vider();
                    setConfirmation(false);
                  }}
                  className="bouton bouton-secondaire text-danger"
                >
                  Confirmer : tout retirer
                </button>
                <button type="button" onClick={() => setConfirmation(false)} className="bouton bouton-secondaire">
                  Annuler
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmation(true)} className="bouton bouton-secondaire">
                Vider la sacoche
              </button>
            ))}
          <Link href="/combat" className="bouton bouton-principal">
            Lancer un combat
          </Link>
        </div>
      </div>

      {/* Les 6 emplacements : 2 colonnes sur mobile, 3 à partir de sm */}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {membres.map((membre, index) => (
          <li
            key={membre.pokemon.nom}
            className="animate-apparition motion-reduce:animate-fondu"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <EmplacementMembre
              membre={membre}
              index={index}
              selectionne={membre.pokemon.nom === selection}
              nouveau={membre.pokemon.nom === nouveau}
              // Recliquer sur le membre sélectionné le désélectionne.
              surSelection={() => setSelection((actuel) => (actuel === membre.pokemon.nom ? null : membre.pokemon.nom))}
            />
          </li>
        ))}

        {/* Emplacements vides dessinés : ils renvoient vers la liste */}
        {Array.from({ length: emplacementsVides }, (_, i) => (
          <li
            key={`vide-${i}`}
            className="animate-apparition motion-reduce:animate-fondu"
            style={{ animationDelay: `${(membres.length + i) * 60}ms` }}
          >
            <Link
              href="/"
              className="flex h-full flex-col items-center gap-2 rounded-3xl border border-dashed border-bordure p-4 text-center hover:bg-piste"
            >
              <span className="relative mx-auto block aspect-square w-full max-w-40" aria-hidden="true">
                <span className="absolute inset-x-0 bottom-0 h-[35%] rounded-[100%] border-2 border-dashed border-bordure" />
                <span className="absolute bottom-[40%] left-1/2 -translate-x-1/2 font-titre text-3xl font-bold text-texte-doux">+</span>
              </span>
              <span className="font-titre text-sm font-semibold">Ajouter un Pokémon</span>
              <span className="etiquette">Emplacement libre</span>
            </Link>
          </li>
        ))}
      </ul>

      {membreSelectionne ? (
        // key : quand on change de membre, React recrée le panneau → son animation d'entrée
        // et celle des barres de stats rejouent.
        <PanneauDetail key={membreSelectionne.pokemon.nom} membre={membreSelectionne} />
      ) : (
        membres.length > 0 && (
          // Invitation : un texte simple, de taille normale et de couleur claire (une étiquette grise passait inaperçue).
          <p className="text-center font-titre text-base font-semibold text-texte">Sélectionne un Pokémon pour voir son détail</p>
        )
      )}

      {membres.length > 1 && <OrdreEquipe membres={membres} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

type PropsEmplacement = {
  membre: Membre;
  index: number;
  selectionne: boolean;
  nouveau: boolean;
  surSelection: () => void;
};

function EmplacementMembre({ membre, index, selectionne, nouveau, surSelection }: PropsEmplacement) {
  const { pokemon, surnom } = membre;
  const animationsReduites = useReducedMotion();

  return (
    // Un vrai <button> : activable au clic, avec Entrée et avec Espace, sans code supplémentaire.
    <button
      type="button"
      onClick={surSelection}
      aria-pressed={selectionne}
      aria-label={`${surnom} (${pokemon.nomFr})${selectionne ? ", sélectionné" : ""}`}
      style={styleTeinte(pokemon.types[0])}
      // "group" : la main ci-dessous réagit au survol du bouton. cursor-pointer : le curseur devient une main.
      className={`group relative flex h-full w-full cursor-pointer flex-col items-center gap-2 rounded-3xl p-4 text-center hover:bg-piste ${
        selectionne ? "verre" : "border border-transparent"
      }`}
    >
      {/* Une main dans le coin haut droit, invisible au repos : elle apparaît au survol du socle, ou quand le
          bouton reçoit le focus clavier, pour montrer que le Pokémon est cliquable. On n'anime que l'opacité. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-accent text-sur-accent opacity-0 shadow-lueur transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
          <path d="M9 11V5a1.5 1.5 0 0 1 3 0v5m0 0V9a1.5 1.5 0 0 1 3 0v2m0 0v-.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.5a6 6 0 0 1-4.7-2.3L4 15a1.6 1.6 0 0 1 2.5-2L9 15" />
        </svg>
      </span>

      {/* Effet « Poké Ball » à l'arrivée d'un nouveau membre : un flash de la couleur du type qui s'étend
          en s'effaçant, pendant que le Pokémon grossit depuis presque rien (ressort). */}
      {nouveau && !animationsReduites && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/3 h-24 w-24 -translate-x-1/2 rounded-full bg-[var(--teinte)]"
          initial={{ scale: 0.2, opacity: 0.9 }}
          animate={{ scale: 2.4, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      )}
      <motion.div
        className="w-full"
        // initial={false} : pas d'animation d'entrée pour les membres déjà présents.
        initial={nouveau ? (animationsReduites ? { opacity: 0 } : { scale: 0.2, opacity: 0 }) : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={animationsReduites ? { duration: 0.3 } : { type: "spring", stiffness: 260, damping: 18 }}
      >
        <SocleEquipe pokemon={pokemon} decalage={index} selectionne={selectionne} />
      </motion.div>

      <span className="w-full truncate font-titre text-xl font-semibold">{surnom}</span>
      <span className="etiquette w-full truncate">{pokemon.nomFr}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */

function PanneauDetail({ membre }: { membre: Membre }) {
  const { pokemon, surnom, attaques } = membre;
  const renommer = useSacoche((etat) => etat.renommer);
  const retirer = useSacoche((etat) => etat.retirer);

  // true quand ce Pokémon n'a pas de modèle 3D (voir VitrineMembre) : on affiche alors la scène 2D à la place.
  const [sans3d, setSans3d] = useState(false);

  // Les trois blocs de la colonne de droite, rangés dans des constantes pour garder le rendu final lisible.
  const blocSurnom = (
    // Le surnom est validé à la sortie du champ ou avec Entrée (soumission du formulaire).
    // key={surnom} sur le champ : quand le store change le surnom, le champ est recréé avec la nouvelle valeur.
    <form
      className="flex flex-col gap-2"
      onSubmit={(evenement) => {
        evenement.preventDefault(); // pas de rechargement de la page
        const donnees = new FormData(evenement.currentTarget);
        renommer(pokemon.nom, String(donnees.get("surnom") ?? ""));
      }}
    >
      <label htmlFor="surnom" className="etiquette">
        Surnom ({LONGUEUR_MAX_SURNOM} caractères max.)
      </label>
      <input
        key={surnom}
        id="surnom"
        name="surnom"
        defaultValue={surnom}
        maxLength={LONGUEUR_MAX_SURNOM}
        onBlur={(evenement) => renommer(pokemon.nom, evenement.target.value)}
        autoComplete="off"
        className="min-h-11 w-full rounded-full border border-bordure bg-surface px-4 text-sm text-texte"
      />
    </form>
  );

  const blocStats = (
    <div className="flex flex-col gap-2">
      <h3 className="etiquette">Statistiques</h3>
      <ul className="flex flex-col gap-2">
        {LIBELLES_STATS.map((stat, index) => (
          <BarreStat key={stat.cle} libelle={stat.libelle} valeur={pokemon.stats[stat.cle]} index={index} />
        ))}
      </ul>
    </div>
  );

  const blocAttaques = (
    <div className="flex flex-col gap-2">
      <h3 className="etiquette">Attaques</h3>
      {attaques === undefined ? (
        <p role="status" className="text-sm text-texte-doux">
          Chargement des attaques…
        </p>
      ) : attaques.length === 0 ? (
        <p className="text-sm text-texte-doux">Ce Pokémon n&apos;apprend aucune attaque offensive.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {attaques.map((attaque) => (
            <li key={attaque.id} className="min-w-0">
              <CarteAttaque attaque={attaque} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <section
      aria-label={`Détail de ${surnom}`}
      style={styleTeinte(pokemon.types[0])}
      className="verre relative flex animate-apparition flex-col gap-6 overflow-hidden p-4 motion-reduce:animate-fondu sm:p-6"
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,var(--teinte),transparent_55%)] opacity-20" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="etiquette">N° {String(pokemon.id).padStart(4, "0")}</p>
          <h2 className="font-titre text-3xl font-bold">{surnom}</h2>
          <ul className="flex flex-wrap gap-2" aria-label="Types">
            {pokemon.types.map((type) => (
              <li key={type}>
                <BadgeType type={type} />
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/pokemon/${pokemon.nom}`} className="bouton bouton-secondaire">
            Voir la fiche
          </Link>
          <button type="button" onClick={() => retirer(pokemon.nom)} className="bouton bouton-secondaire text-danger">
            Retirer de la sacoche
          </button>
        </div>
      </div>

      {/* LOCAL UNIQUEMENT : à gauche, un carré avec le modèle 3D du membre (préchargé à son ajout dans la sacoche)
          ou, s'il n'en a pas, son illustration mise en scène en 2D. À droite, les informations. */}
      <div className="relative grid gap-6 md:grid-cols-2">
        {sans3d ? (
          <Scene2D pokemon={pokemon} />
        ) : (
          // setSans3d est passé tel quel : VitrineMembre l'appelle s'il découvre qu'il n'y a pas de modèle.
          <VitrineMembre numero={pokemon.id} nom={surnom} surAbsence={setSans3d} />
        )}
        <div className="flex flex-col gap-6">
          {blocSurnom}
          {blocStats}
          {blocAttaques}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

// Ordre de l'équipe : glisser-déposer (Reorder de motion) + boutons Monter/Descendre pour le clavier.
// Dans les deux cas, c'est le store qui enregistre le nouvel ordre (et donc le localStorage).
function OrdreEquipe({ membres }: { membres: Membre[] }) {
  const reordonner = useSacoche((etat) => etat.reordonner);
  const deplacer = useSacoche((etat) => etat.deplacer);
  const noms = membres.map((m) => m.pokemon.nom);

  return (
    <section aria-labelledby="titre-ordre" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 id="titre-ordre" className="font-titre text-xl font-semibold">
          Ordre de l&apos;équipe
        </h2>
        <p className="text-sm text-texte-doux">
          Fais glisser une ligne, ou utilise les flèches. Le premier Pokémon entrera en premier au combat.
        </p>
      </div>

      {/* Reorder.Group reçoit la liste des valeurs et appelle onReorder avec la liste dans le nouvel ordre. */}
      <Reorder.Group as="ol" axis="y" values={noms} onReorder={reordonner} className="flex flex-col gap-2">
        {membres.map(({ pokemon, surnom }, index) => (
          <Reorder.Item
            key={pokemon.nom}
            value={pokemon.nom}
            // --teinte : couleur du type principal du Pokémon, utilisée par la pastille du numéro.
            style={styleTeinte(pokemon.types[0])}
            className="verre flex cursor-grab items-center gap-4 px-4 py-2 active:cursor-grabbing"
          >
            {/* Numéro d'ordre : une pastille teintée, grand chiffre en gras, pour qu'on lise l'ordre d'un coup d'œil.
                aria-hidden : la liste est un <ol>, les lecteurs d'écran annoncent déjà le rang. */}
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--teinte)_60%,transparent)] bg-[color-mix(in_srgb,var(--teinte)_28%,transparent)] font-titre text-lg font-bold tabular-nums text-texte"
            >
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate font-titre text-sm font-semibold">
              {surnom} <span className="etiquette">· {pokemon.nomFr}</span>
            </span>
            <button
              type="button"
              onClick={() => deplacer(pokemon.nom, -1)}
              disabled={index === 0}
              aria-label={`Monter ${surnom}`}
              className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-piste disabled:opacity-30"
            >
              <span aria-hidden="true">↑</span>
            </button>
            <button
              type="button"
              onClick={() => deplacer(pokemon.nom, 1)}
              disabled={index === membres.length - 1}
              aria-label={`Descendre ${surnom}`}
              className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-piste disabled:opacity-30"
            >
              <span aria-hidden="true">↓</span>
            </button>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </section>
  );
}
