// ADAPTATEUR écrit pour ce projet : il fait jouer dans NOTRE arène les animations d'attaques reprises
// de Pokémon Showdown (lib/showdown/animations-attaques.ts).
//
// Une animation Showdown est une fonction qui appelle une « scène » :
//   scene.showEffect("fireball", depart, arrivee, "linear", "explode")   → une image va d'un point à un autre
//   scene.backgroundEffect("#000000", 600, 0.3)                          → un voile de couleur sur l'arène
//   attacker.anim({ z: defender.z, time: 300 }, "accel")                 → le Pokémon lui-même se déplace
// Showdown fait cela avec jQuery. Ici, la même « scène » est refaite avec l'API d'animation du navigateur
// (element.animate), en n'animant que transform et opacity.
//
// Repère de Showdown : x = gauche/droite, y = hauteur, z = profondeur (0 = Pokémon proche, 200 = Pokémon éloigné).
// Chez nous, le Pokémon « proche » est celui du joueur (vu de dos) et l'« éloigné » est l'adversaire.

export type Point = { x: number; y: number };

// Une position dans le repère de Showdown. « time » est en millisecondes depuis le début de l'attaque.
export type PositionScene = {
  x?: number;
  y?: number;
  z?: number;
  scale?: number;
  xscale?: number;
  yscale?: number;
  opacity?: number;
  time?: number;
};

// Une image d'effet : son adresse et sa taille d'origine en pixels.
export type DonneesImage = { url?: string; w: number; h: number; rawHTML?: string };

// Une animation Showdown : une fonction qui reçoit la scène et les deux Pokémon [attaquant, défenseur].
export type TableAnimations = Record<string, { anim: (scene: SceneShowdown, lutins: Lutin[]) => void }>;

// Dossier des images copiées dans public/.
const DOSSIER_IMAGES = "/showdown/fx/";

// Courbes de vitesse de Showdown, traduites en courbes CSS. Chacune est une parabole : la courbe de Bézier
// indiquée la reproduit exactement (elle peut dépasser 1 : c'est ce qui dessine la cloche d'un saut).
const COURBES = {
  linear: "linear",
  swing: "cubic-bezier(0.37, 0, 0.63, 1)", // départ et arrivée en douceur
  quadUp: "cubic-bezier(0.333, 0.667, 0.667, 1)", // rapide puis ralentit
  quadDown: "cubic-bezier(0.333, 0, 0.667, 0.333)", // lent puis accélère
  ballisticUp: "cubic-bezier(0.333, 1.333, 0.667, 1.667)", // monte plus haut que l'arrivée, puis retombe
  ballisticDown: "cubic-bezier(0.333, -0.667, 0.667, -0.333)", // l'inverse
} as const;

type Courbe = keyof typeof COURBES;

// Pour une « transition » de Showdown : la courbe du déplacement horizontal (et de la taille) et celle du
// déplacement vertical. Elles ne diffèrent que pour les trajectoires en cloche (« ballistic… »).
// monte = true si l'arrivée est plus haut à l'écran que le départ.
function courbesDe(transition: string | undefined, monte: boolean, versLeFond: boolean): { horizontale: Courbe; verticale: Courbe } {
  switch (transition) {
    case "swing":
      return { horizontale: "swing", verticale: "swing" };
    case "accel":
      return { horizontale: "quadDown", verticale: "quadDown" };
    case "decel":
      return { horizontale: "quadUp", verticale: "quadUp" };
    case "ballistic":
      return { horizontale: "linear", verticale: monte ? "ballisticUp" : "ballisticDown" };
    case "ballisticUnder":
      return { horizontale: "linear", verticale: monte ? "ballisticDown" : "ballisticUp" };
    case "ballistic2":
      return { horizontale: "linear", verticale: monte ? "quadUp" : "quadDown" };
    case "ballistic2Back":
      return { horizontale: "linear", verticale: versLeFond ? "quadUp" : "quadDown" };
    case "ballistic2Under":
      return { horizontale: "linear", verticale: monte ? "quadDown" : "quadUp" };
    default:
      return { horizontale: "linear", verticale: "linear" };
  }
}

// Une image d'effet posée dans l'arène : trois éléments imbriqués, pour animer séparément le déplacement
// horizontal, le déplacement vertical, et la taille + l'opacité (chacun a sa propre courbe de vitesse).
type Effet = { axeX: HTMLElement; axeY: HTMLElement; image: HTMLElement; curseur: number };

type OptionsScene = {
  calqueEffets: HTMLElement; // au-dessus des Pokémon
  calqueFond: HTMLElement; // derrière les Pokémon
  proche: Point; // centre du Pokémon proche, en pixels dans l'arène
  loin: Point; // centre du Pokémon éloigné
  unite: number; // taille d'une « unité Showdown » en pixels d'écran
};

export class SceneShowdown {
  // Décalage ajouté à tous les temps (certaines animations appellent scene.wait(…) pour retarder la suite).
  timeOffset = 0;
  // Quelques animations lisent la position du côté du joueur.
  battle = { mySide: { x: 0, y: 0, z: 0 } };

  private animations: Animation[] = [];
  private elements: HTMLElement[] = [];
  // Moment (en ms) où la dernière animation se termine : c'est la durée totale de l'attaque.
  private fin = 0;

  constructor(private options: OptionsScene) {}

  wait(duree: number) {
    this.timeOffset += duree;
  }

  // Convertit une position Showdown en pixels dans notre arène.
  // Le point de base glisse du Pokémon proche (z = 0) au Pokémon éloigné (z = 200). Comme dans Showdown,
  // ce qui est proche est dessiné plus grand (× 1,5) que ce qui est loin (× 1) : c'est l'effet de profondeur.
  enPixels(position: PositionScene) {
    const { proche, loin, unite } = this.options;
    const profondeur = (position.z ?? 0) / 200;
    const perspective = Math.max(0.1, 1.5 - 0.5 * profondeur) * unite;
    const echelle = position.scale ?? 1;
    return {
      x: proche.x + (loin.x - proche.x) * profondeur + (position.x ?? 0) * perspective,
      y: proche.y + (loin.y - proche.y) * profondeur - (position.y ?? 0) * perspective,
      echelleX: perspective * (position.xscale ?? echelle),
      echelleY: perspective * (position.yscale ?? echelle),
      opacite: position.opacity ?? 1,
    };
  }

  // Lance une animation du navigateur et la garde en mémoire, pour pouvoir tout annuler à la fin.
  animer(element: HTMLElement, images: Keyframe[], debut: number, duree: number, courbe: Courbe) {
    // fill: "forwards" → l'élément garde son état d'arrivée ; avant le début (delay), il n'est pas touché.
    const animation = element.animate(images, { delay: debut, duration: Math.max(duree, 1), easing: COURBES[courbe], fill: "forwards" });
    this.animations.push(animation);
    this.fin = Math.max(this.fin, debut + duree);
  }

  // Affiche une image d'effet et l'anime du départ à l'arrivée.
  showEffect(effet: string | DonneesImage, depart: PositionScene, arrivee: PositionScene, transition: string, apres?: string, css?: Record<string, string>) {
    const donnees = typeof effet === "string" ? IMAGES[effet] : effet;
    const cree: Effet = { axeX: document.createElement("div"), axeY: document.createElement("div"), image: document.createElement("img"), curseur: 0 };
    // Effet inconnu ou sans image (quelques écrans de protection de Showdown) : on ne dessine rien.
    if (!donnees?.url) return cree;

    const adresse = donnees.url.startsWith("http") || donnees.url.startsWith("/") ? donnees.url : DOSSIER_IMAGES + donnees.url;
    cree.axeX.style.cssText = "position:absolute;left:0;top:0;will-change:transform";
    cree.axeY.style.cssText = "will-change:transform";
    // L'image est invisible (opacity:0) tant que son animation n'a pas commencé.
    cree.image.style.cssText = `display:block;width:${donnees.w}px;height:${donnees.h}px;opacity:0;will-change:transform,opacity`;
    if (css) Object.assign(cree.image.style, css); // ex. { filter: "hue-rotate(90deg)" } pour recolorer l'image
    (cree.image as HTMLImageElement).src = adresse;
    (cree.image as HTMLImageElement).alt = ""; // image décorative
    cree.axeY.appendChild(cree.image);
    cree.axeX.appendChild(cree.axeY);
    this.options.calqueEffets.appendChild(cree.axeX);
    this.elements.push(cree.axeX);

    return this.animateEffect(cree, donnees, depart, arrivee, transition, apres);
  }

  // Ajoute une étape à un effet déjà affiché (elle commence quand la précédente est finie).
  animateEffect(effet: Effet, donneesOuNom: string | DonneesImage, departBrut: PositionScene, arriveeBrute: PositionScene, transition: string, apres?: string) {
    const donnees = typeof donneesOuNom === "string" ? IMAGES[donneesOuNom] : donneesOuNom;
    if (!donnees?.url) return effet;

    // Mêmes valeurs par défaut que Showdown : une étape dure 500 ms, et l'arrivée reprend ce que le départ précise.
    const depart = { ...departBrut };
    const arrivee = { ...depart, ...arriveeBrute };
    const tempsDepart = (departBrut.time ?? 0) + this.timeOffset;
    const tempsArrivee = (arriveeBrute.time || (departBrut.time ?? 0) + 500) + this.timeOffset;
    const debut = effet.curseur + tempsDepart;
    const duree = Math.max(tempsArrivee - tempsDepart, 0);

    const a = this.enPixels(depart);
    const b = this.enPixels(arrivee);
    const courbes = courbesDe(transition, b.y < a.y, (arrivee.z ?? 0) > 0);
    // L'image est posée par son coin haut gauche : on retire la moitié de sa taille pour la centrer sur le point.
    const moitieL = donnees.w / 2;
    const moitieH = donnees.h / 2;

    this.animer(effet.axeX, [{ transform: `translateX(${a.x - moitieL}px)` }, { transform: `translateX(${b.x - moitieL}px)` }], debut, duree, courbes.horizontale);
    this.animer(effet.axeY, [{ transform: `translateY(${a.y - moitieH}px)` }, { transform: `translateY(${b.y - moitieH}px)` }], debut, duree, courbes.verticale);
    this.animer(effet.image, [{ transform: `scale(${a.echelleX}, ${a.echelleY})` }, { transform: `scale(${b.echelleX}, ${b.echelleY})` }], debut, duree, courbes.horizontale);
    this.animer(effet.image, [{ opacity: a.opacite }, { opacity: b.opacite }], debut, duree, "linear");

    let finEtape = debut + duree;
    if (apres === "fade") {
      // L'image s'efface en 100 ms.
      this.animer(effet.image, [{ opacity: b.opacite }, { opacity: 0 }], finEtape, 100, "linear");
      finEtape += 100;
    }
    if (apres === "explode") {
      // L'image grossit trois fois en s'effaçant, en 200 ms.
      this.animer(effet.image, [{ transform: `scale(${b.echelleX}, ${b.echelleY})` }, { transform: `scale(${b.echelleX * 3}, ${b.echelleY * 3})` }], finEtape, 200, "linear");
      this.animer(effet.image, [{ opacity: b.opacite }, { opacity: 0 }], finEtape, 200, "linear");
      finEtape += 200;
    }
    effet.curseur = finEtape;
    return effet;
  }

  // Voile de couleur (ou image) sur toute l'arène : il apparaît en 250 ms, reste, puis s'efface en 250 ms.
  backgroundEffect(fond: string, duree: number, opacite = 1, retard = 0) {
    const voile = document.createElement("div");
    voile.style.cssText = "position:absolute;inset:0;opacity:0;background-size:cover;background-position:center";
    voile.style.background = fond;
    voile.style.backgroundSize = "cover";
    this.options.calqueFond.appendChild(voile);
    this.elements.push(voile);
    this.animer(voile, [{ opacity: 0 }, { opacity: opacite }], retard, 250, "linear");
    this.animer(voile, [{ opacity: opacite }, { opacity: 0 }], retard + duree, 250, "linear");
  }

  // Le décor de Showdown, que les attaques de type Sol font trembler (Séisme, Telluriforce…) avec
  // scene.$bg.animate({ top: -100 }, 100).animate({ top: -90 }, 100)… Sa position de repos est top = -90.
  // Chez nous, c'est toute l'arène qui monte et descend de quelques pixels.
  $bg = this.creerDecor();

  private creerDecor() {
    const REPOS = -90;
    let curseur = 0; // moment où la prochaine secousse commence (elles se suivent)
    let haut = REPOS;
    const decor = {
      animate: (cible: { top?: number }, duree: number) => {
        const arene = this.options.calqueEffets.parentElement;
        const suivant = cible.top ?? haut;
        if (arene) {
          this.animer(arene, [{ transform: `translateY(${haut - REPOS}px)` }, { transform: `translateY(${suivant - REPOS}px)` }], curseur, duree, "swing");
        }
        haut = suivant;
        curseur += duree;
        return decor; // on renvoie le décor pour pouvoir enchaîner les appels
      },
      delay: (duree: number) => {
        curseur += duree;
        return decor;
      },
    };
    return decor;
  }

  // Durée totale de ce qui a été programmé, en millisecondes.
  get dureeTotale() {
    return this.fin;
  }

  // Retire tout : les images d'effets disparaissent et les Pokémon reprennent leur place.
  nettoyer() {
    for (const animation of this.animations) animation.cancel();
    for (const element of this.elements) element.remove();
    this.animations = [];
    this.elements = [];
  }
}

// Un Pokémon vu par Showdown (là-bas : « PokemonSprite »). Les animations lisent sa position (x, y, z)
// et peuvent le déplacer avec anim(). Chez nous, il pilote deux éléments du socle (voir SocleEquipe) :
// l'un pour le déplacement horizontal, la taille et l'opacité, l'autre pour le déplacement vertical.
export class Lutin {
  x = 0;
  y = 0;
  z: number;
  // true pour le Pokémon éloigné (vu de face). Sert à savoir où sont « derrière » et « à gauche ».
  isFrontSprite: boolean;
  isMissedPokemon = false;
  // Son image, utilisée par quelques attaques qui dessinent des copies du Pokémon.
  sp: DonneesImage & { shiny?: boolean };

  // Moment où sa prochaine animation commencera : les appels à anim() se suivent, comme une file d'attente.
  private curseur = 0;
  // Sa dernière pose (au départ : sa place habituelle).
  private pose: Required<Omit<PositionScene, "time" | "xscale" | "yscale">>;

  constructor(
    private scene: SceneShowdown,
    private axeX: HTMLElement | null,
    private axeY: HTMLElement | null,
    eloigne: boolean,
    adresseImage: string | undefined,
  ) {
    this.isFrontSprite = eloigne;
    this.z = eloigne ? 200 : 0;
    this.sp = { url: adresseImage, w: 96, h: 96 };
    this.pose = { x: 0, y: 0, z: this.z, scale: 1, opacity: 1 };
  }

  // Coordonnée « derrière lui » (plus loin de l'adversaire) et « à sa gauche », comme dans Showdown.
  behind(distance: number) {
    return this.z + (this.isFrontSprite ? 1 : -1) * distance;
  }
  leftof(distance: number) {
    return this.x + (this.isFrontSprite ? 1 : -1) * distance;
  }

  // Attendre avant la prochaine animation de ce Pokémon.
  delay(duree: number) {
    this.curseur += duree;
    return this;
  }

  // Déplacer le Pokémon vers une position (par défaut : retour à sa place, en 500 ms).
  anim(arrivee: PositionScene, transition?: string) {
    const cible = { x: this.x, y: this.y, z: this.z, scale: 1, opacity: 1, ...arrivee };
    const duree = arrivee.time ?? 500;
    const debut = this.curseur;
    this.curseur += duree;
    if (!this.axeX || !this.axeY) return this;

    // On anime un DÉCALAGE par rapport à sa place habituelle (l'élément est déjà posé au bon endroit par la page).
    const place = this.scene.enPixels({ x: this.x, y: this.y, z: this.z });
    const a = this.scene.enPixels(this.pose);
    const b = this.scene.enPixels(cible);
    const courbes = courbesDe(transition, b.y < place.y, cible.z > 0);
    const decalage = (p: { x: number; y: number; echelleX: number }) => ({ dx: p.x - place.x, dy: p.y - place.y, taille: p.echelleX / place.echelleX });
    const de = decalage(a);
    const vers = decalage(b);

    this.scene.animer(this.axeX, [{ transform: `translateX(${de.dx}px) scale(${de.taille})` }, { transform: `translateX(${vers.dx}px) scale(${vers.taille})` }], debut, duree, courbes.horizontale);
    this.scene.animer(this.axeX, [{ opacity: a.opacite }, { opacity: b.opacite }], debut, duree, "linear");
    this.scene.animer(this.axeY, [{ transform: `translateY(${de.dy}px)` }, { transform: `translateY(${vers.dy}px)` }], debut, duree, courbes.verticale);

    this.pose = { x: cible.x, y: cible.y, z: cible.z, scale: cible.scale, opacity: cible.opacity };
    return this;
  }
}

// La table des images est fournie par lib/showdown/index.ts au chargement (elle vient d'un fichier repris de Showdown).
let IMAGES: Record<string, DonneesImage> = {};
export function definirImages(table: Record<string, DonneesImage>) {
  IMAGES = table;
}
