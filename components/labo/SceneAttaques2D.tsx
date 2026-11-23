"use client";

// PROTOTYPE (branche feature/pokemon-2d-attack-animations) — banc d'essai des effets d'attaque 2D.
// Deux sprites, un <canvas> par-dessus, et des commandes pour lancer n'importe quelle combinaison
// type × catégorie × puissance. Le composant EffetAttaque existant n'est pas modifié.

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
import type { Attaque, CategorieAttaque, Pokemon } from "@/lib/conversion";
import { choisirRecette } from "@/lib/labo/effets2d";
import { attendre, jouerAttaque, Moteur2D, type Crochets, type Point, type Qualite } from "@/lib/labo/moteur2d";
import { NOMS_TYPES, TYPES, type NomType } from "@/lib/types";

type Props = {
  joueur: Pokemon;
  adversaire: Pokemon;
  attaquesJoueur: Attaque[];
  attaquesAdversaire: Attaque[];
};

const CATEGORIES: { cle: CategorieAttaque; libelle: string }[] = [
  { cle: "speciale", libelle: "Spéciale (à distance)" },
  { cle: "physique", libelle: "Physique (contact)" },
  { cle: "statut", libelle: "Statut (aura)" },
];

type ChoixQualite = Qualite | "auto";

export default function SceneAttaques2D({ joueur, adversaire, attaquesJoueur, attaquesAdversaire }: Props) {
  const refArene = useRef<HTMLDivElement>(null);
  const refToile = useRef<HTMLCanvasElement>(null);
  const refJoueur = useRef<HTMLDivElement>(null);
  const refAdversaire = useRef<HTMLDivElement>(null);
  const refMoteur = useRef<Moteur2D | null>(null);
  const animationsReduites = useReducedMotion();

  const [type, setType] = useState<NomType>("fire");
  const [categorie, setCategorie] = useState<CategorieAttaque>("speciale");
  const [puissance, setPuissance] = useState(90);
  const [inverse, setInverse] = useState(false); // true : c'est l'adversaire qui attaque
  const [qualite, setQualite] = useState<ChoixQualite>("auto");
  const [occupe, setOccupe] = useState(false);
  const [dernier, setDernier] = useState("");
  const [mesures, setMesures] = useState({ ips: 0, particules: 0, qualite: "haute" as Qualite });

  // Création du moteur au montage, destruction au démontage.
  useEffect(() => {
    const toile = refToile.current;
    if (!toile) return;
    const moteur = new Moteur2D(toile);
    refMoteur.current = moteur;
    moteur.demarrer();
    const observateur = new ResizeObserver(() => moteur.redimensionner());
    observateur.observe(toile);
    // Les mesures du moteur sont recopiées dans l'état React deux fois par seconde (pas à chaque image).
    const minuteur = setInterval(() => setMesures({ ...moteur.mesures, qualite: moteur.qualite }), 500);
    return () => {
      clearInterval(minuteur);
      observateur.disconnect();
      moteur.arreter();
      refMoteur.current = null;
    };
  }, []);

  function changerQualite(choix: ChoixQualite) {
    setQualite(choix);
    const moteur = refMoteur.current;
    if (!moteur) return;
    moteur.qualiteAuto = choix === "auto";
    moteur.qualite = choix === "auto" ? "haute" : choix;
  }

  // Centre d'un sprite dans le repère de l'arène (celui du canvas).
  function centre(element: HTMLElement): Point {
    const cadre = element.getBoundingClientRect();
    const arene = refArene.current!.getBoundingClientRect();
    return { x: cadre.left - arene.left + cadre.width / 2, y: cadre.top - arene.top + cadre.height * 0.5 };
  }

  async function lancer(typeAttaque: NomType, categorieAttaque: CategorieAttaque, puissanceAttaque: number | null, nom?: string) {
    const moteur = refMoteur.current;
    const attaquant = (inverse ? refAdversaire : refJoueur).current;
    const cible = (inverse ? refJoueur : refAdversaire).current;
    const arene = refArene.current;
    if (!moteur || !attaquant || !cible || !arene || occupe) return;

    setOccupe(true);
    setDernier(`${nom ?? TYPES[typeAttaque].libelle} · ${categorieAttaque}${puissanceAttaque ? ` · puissance ${puissanceAttaque}` : ""}`);
    const recette = choisirRecette(typeAttaque, categorieAttaque, puissanceAttaque);
    const a = centre(attaquant);
    const b = centre(cible);
    const sens = inverse ? -1 : 1;
    // API Web Animations : anime transform et opacity d'un élément, et renvoie une promesse de fin.
    const animer = (element: HTMLElement, images: Keyframe[], duree: number) =>
      element.animate(images, { duration: duree, easing: "ease-out" }).finished.then(() => undefined);

    if (animationsReduites) {
      // Animations réduites : ni particules, ni déplacement, ni tremblement. Un fondu de la couleur du type.
      moteur.flash(recette.couleurs[1], 0.6);
      if (recette.touche) await animer(cible, [{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }], 400);
      else await attendre(400);
    } else {
      const crochets: Crochets = {
        elan: () => void animer(attaquant, [{ transform: "translateX(0)" }, { transform: `translateX(${-14 * sens}px) scale(1.04)` }, { transform: `translateX(${6 * sens}px)` }, { transform: "translateX(0)" }], 380),
        charger: () => {
          const dx = b.x - a.x - 56 * sens;
          const dy = b.y - a.y + 10;
          return animer(
            attaquant,
            [
              { transform: "translate(0,0)" },
              { transform: `translate(${-18 * sens}px,6px) scale(.96)`, offset: 0.2 },
              { transform: `translate(${dx}px,${dy}px) scale(.85)`, offset: 0.55 },
              { transform: `translate(${dx}px,${dy}px) scale(.85)`, offset: 0.66 },
              { transform: "translate(0,0)" },
            ],
            760,
          );
        },
        encaisser: (force) => {
          const amplitude = 9 * force;
          void animer(arene, [{ transform: "translateX(0)" }, { transform: `translateX(${-amplitude}px)` }, { transform: `translateX(${amplitude}px)` }, { transform: `translateX(${-amplitude / 2}px)` }, { transform: "translateX(0)" }], 320);
          return animer(cible, [{ opacity: 1, transform: "translateX(0)" }, { opacity: 0.2, transform: `translateX(${14 * sens}px)` }, { opacity: 1, transform: `translateX(${6 * sens}px)` }, { opacity: 0.2 }, { opacity: 1, transform: "translateX(0)" }], 420);
        },
      };
      await jouerAttaque(moteur, recette, a, b, crochets);
    }
    await attendre(250);
    setOccupe(false);
  }

  // Joue les 18 types à la suite, dans la catégorie choisie : pratique pour tout passer en revue.
  async function enchainer() {
    for (const t of NOMS_TYPES) {
      setType(t);
      await lancer(t, categorie, puissance);
      await attendre(120);
    }
  }

  const attaquesActives = inverse ? attaquesAdversaire : attaquesJoueur;
  const spriteJoueur = joueur.spriteDos ?? joueur.artwork;
  const spriteAdversaire = adversaire.spriteFace ?? adversaire.artwork;

  return (
    <div className="flex flex-col gap-6">
      {/* L'arène : les deux sprites et le canvas d'effets posé par-dessus. */}
      <div ref={refArene} className="verre relative h-80 overflow-hidden sm:h-[26rem]">
        <span aria-hidden="true" className="absolute bottom-[10%] left-[8%] h-[8%] w-[28%] rounded-[100%] border-2 border-accent-bis bg-socle-bas" />
        <span aria-hidden="true" className="absolute bottom-[33%] right-[8%] h-[7%] w-[26%] rounded-[100%] border-2 border-accent bg-socle-bas" />

        <div ref={refJoueur} className="absolute bottom-[13%] left-[10%] h-[38%] w-[24%] will-change-transform">
          {spriteJoueur && (
            <Image src={spriteJoueur} alt={`${joueur.nomFr} (de dos)`} fill sizes="200px" unoptimized className="object-contain object-bottom [image-rendering:pixelated]" />
          )}
        </div>
        <div ref={refAdversaire} className="absolute bottom-[36%] right-[10%] h-[32%] w-[22%] will-change-transform">
          {spriteAdversaire && (
            <Image src={spriteAdversaire} alt={`${adversaire.nomFr} (de face)`} fill sizes="200px" unoptimized className="object-contain object-bottom [image-rendering:pixelated]" />
          )}
        </div>

        {/* aria-hidden : le canvas est purement décoratif ; ce qui se passe est écrit dans le paragraphe ci-dessous. */}
        <canvas ref={refToile} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
      </div>

      <p className="etiquette" aria-live="polite">
        {mesures.ips} images/s · {mesures.particules} particules · qualité {mesures.qualite}
        {dernier ? ` · dernier effet : ${dernier}` : ""}
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="titre-libre" className="verre flex flex-col gap-4 p-4">
          <h2 id="titre-libre" className="font-titre text-xl font-semibold">
            Essai libre
          </h2>

          <fieldset className="flex flex-col gap-2">
            <legend className="etiquette pb-2">Type</legend>
            <div className="flex flex-wrap gap-2">
              {NOMS_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={type === t}
                  onClick={() => setType(t)}
                  className={`min-h-9 rounded-full px-3 text-xs font-semibold ${TYPES[t].classes} ${type === t ? "ring-2 ring-texte ring-offset-2 ring-offset-fond" : ""}`}
                >
                  {TYPES[t].libelle}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="etiquette pb-2">Catégorie</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.cle}
                  type="button"
                  aria-pressed={categorie === c.cle}
                  onClick={() => setCategorie(c.cle)}
                  className={`bouton ${categorie === c.cle ? "bouton-principal" : "bouton-secondaire"}`}
                >
                  {c.libelle}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <label htmlFor="puissance" className="etiquette">
              Puissance : {puissance}
            </label>
            <input id="puissance" type="range" min={20} max={150} step={5} value={puissance} onChange={(e) => setPuissance(Number(e.target.value))} className="min-h-11 w-full accent-accent" />
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={occupe} onClick={() => lancer(type, categorie, categorie === "statut" ? null : puissance)} className="bouton bouton-principal disabled:opacity-50">
              Lancer l&apos;attaque
            </button>
            <button type="button" disabled={occupe} onClick={enchainer} className="bouton bouton-secondaire disabled:opacity-50">
              Enchaîner les 18 types
            </button>
          </div>
        </section>

        <div className="flex flex-col gap-6">
          <section aria-labelledby="titre-reelles" className="verre flex flex-col gap-4 p-4">
            <h2 id="titre-reelles" className="font-titre text-xl font-semibold">
              Vraies attaques de {inverse ? adversaire.nomFr : joueur.nomFr}
            </h2>
            <p className="text-sm text-texte-doux">L&apos;effet est choisi automatiquement à partir du type, de la catégorie et de la puissance de l&apos;attaque.</p>
            <ul className="grid grid-cols-2 gap-2">
              {attaquesActives.map((attaque) => (
                <li key={attaque.id} className="min-w-0">
                  <button
                    type="button"
                    disabled={occupe}
                    onClick={() => lancer(attaque.type, attaque.categorie, attaque.puissance, attaque.nomFr)}
                    className={`flex min-h-16 w-full flex-col items-start justify-center gap-1 rounded-2xl px-4 py-2 text-left disabled:opacity-50 ${TYPES[attaque.type].classes}`}
                  >
                    <span className="w-full truncate font-titre text-sm font-semibold">{attaque.nomFr}</span>
                    <span className="w-full truncate text-[11px] font-semibold uppercase tracking-wider">
                      {TYPES[attaque.type].libelle} · {attaque.categorie} · {attaque.puissance ?? "—"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="titre-reglages" className="verre flex flex-col gap-4 p-4">
            <h2 id="titre-reglages" className="font-titre text-xl font-semibold">
              Réglages
            </h2>
            <button type="button" disabled={occupe} aria-pressed={inverse} onClick={() => setInverse((v) => !v)} className="bouton bouton-secondaire self-start disabled:opacity-50">
              Attaquant : {inverse ? adversaire.nomFr : joueur.nomFr} (inverser)
            </button>
            <div className="flex flex-col gap-2">
              <label htmlFor="qualite" className="etiquette">
                Qualité des effets
              </label>
              <select id="qualite" value={qualite} onChange={(e) => changerQualite(e.target.value as ChoixQualite)} className="min-h-11 rounded-full border border-bordure bg-surface-pleine px-4 text-sm text-texte">
                <option value="auto">Automatique (baisse si l&apos;appareil peine)</option>
                <option value="haute">Haute</option>
                <option value="moyenne">Moyenne</option>
                <option value="basse">Basse</option>
              </select>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
