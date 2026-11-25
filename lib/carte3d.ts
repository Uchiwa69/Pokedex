// Dessin des deux faces de la carte holographique dans des <canvas> 2D.
// Ces canvas servent ensuite de textures à la carte en 3D (components/Carte3D.tsx).
// Tout le décor (cadre, grille, motifs, dos) est original ; seule l'illustration est l'image
// déjà affichée sur la fiche, chargée par son adresse.

import type { StyleCarte } from "@/lib/carte-perso";

export const LARGEUR = 720;
export const HAUTEUR = 1000;
// Ces dimensions sont des dimensions de TRAVAIL. La texture réelle est dessinée à l'échelle « finesse »,
// calculée par Carte3D pour correspondre à la taille de la carte à l'écran : c'est ce qui garde le texte net.

export type DonneesCarte = {
  numero: string; // "0006"
  nom: string;
  types: string[]; // libellés français
  mesures: string; // "1,7 m · 90,5 kg"
  teinte: string; // couleur du type principal, ex. "#ee8130"
  policeTitre: string; // famille de police des titres (Chakra Petch)
  // Carte personnalisée (atelier). Absents = la carte de la fiche, inchangée.
  style?: StyleCarte;
  attaques?: AttaqueDessinee[]; // une ou deux attaques, écrites sous le nom
};

// Une attaque telle qu'elle est écrite sur la carte.
export type AttaqueDessinee = {
  nomFr: string;
  couleur: string; // couleur de son type
  puissance: number | null;
};

// Mise en page de la face, en pixels du canvas (720 × 1000). Elle change quand la carte porte des attaques
// (il faut leur faire de la place) ou qu'elle est en « full art » (l'illustration occupe toute la carte).
// Les zones calmes des shaders sont calées sur les mêmes nombres (zonesDeLaFace, lib/effets-types/index.ts).
export function miseEnPage(style: StyleCarte | undefined, nombreAttaques: number) {
  const pleine = style === "pleine";
  const avecAttaques = nombreAttaques > 0;
  return {
    pleine,
    cote: pleine ? 760 : avecAttaques ? 420 : 520, // côté du carré de l'illustration
    centreY: pleine ? 450 : avecAttaques ? 400 : 470, // hauteur de son centre
    debutBandeau: avecAttaques ? 590 : 720, // où commence le bandeau sombre du bas
    ligneNom: avecAttaques ? 712 : 862, // ligne de base du nom
    tailleNom: avecAttaques ? 76 : 96,
    // Haut de chaque rangée d'attaque (une rangée fait 74 px de haut).
    rangees: nombreAttaques >= 2 ? [748, 834] : nombreAttaques === 1 ? [790] : [],
    ligneMesures: avecAttaques ? 958 : 926,
  };
}

// Trace un rectangle aux coins arrondis (chemin seulement : à remplir ou à contourner ensuite).
function rectangleArrondi(ctx: CanvasRenderingContext2D, x: number, y: number, l: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, l, h, r);
}

// Fond commun aux deux faces : nuit bleue, voile de la teinte, grille fine, liseré.
function dessinerFond(ctx: CanvasRenderingContext2D, teinte: string) {
  const fond = ctx.createLinearGradient(0, 0, LARGEUR, HAUTEUR);
  fond.addColorStop(0, "#182056");
  fond.addColorStop(1, "#070a1c");
  ctx.fillStyle = fond;
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);

  // Voile de la couleur du type, du coin haut-gauche vers le centre.
  const voile = ctx.createLinearGradient(0, 0, LARGEUR * 0.8, HAUTEUR * 0.7);
  voile.addColorStop(0, teinte);
  voile.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = voile;
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  ctx.globalAlpha = 1;

  // Grille fine de 40 px.
  ctx.strokeStyle = "rgba(170,182,255,0.10)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 40; x < LARGEUR; x += 40) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HAUTEUR);
  }
  for (let y = 40; y < HAUTEUR; y += 40) {
    ctx.moveTo(0, y);
    ctx.lineTo(LARGEUR, y);
  }
  ctx.stroke();

  // Liseré intérieur de la teinte.
  ctx.strokeStyle = teinte;
  ctx.lineWidth = 4;
  rectangleArrondi(ctx, 22, 22, LARGEUR - 44, HAUTEUR - 44, 36);
  ctx.stroke();
}

// Écrit un texte en capitales espacées (les « étiquettes » du site).
function etiquette(ctx: CanvasRenderingContext2D, texte: string, x: number, y: number, alignement: CanvasTextAlign = "left") {
  ctx.font = "700 32px system-ui, sans-serif";
  ctx.letterSpacing = "3px";
  ctx.textAlign = alignement;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(texte.toUpperCase(), x, y);
  ctx.letterSpacing = "0px";
}

// Face avant : numéro, types, illustration sur son halo, nom, mesures.
export function dessinerFace(toile: HTMLCanvasElement, donnees: DonneesCarte, illustration: HTMLImageElement | null, finesse: number) {
  toile.width = Math.round(LARGEUR * finesse);
  toile.height = Math.round(HAUTEUR * finesse);
  const ctx = toile.getContext("2d")!;
  ctx.scale(toile.width / LARGEUR, toile.height / HAUTEUR);
  dessinerFond(ctx, donnees.teinte);

  // Bandeau sombre en haut : le numéro et les types restent lisibles quelle que soit la teinte.
  const haut = ctx.createLinearGradient(0, 0, 0, 170);
  haut.addColorStop(0, "rgba(5,7,22,0.75)");
  haut.addColorStop(1, "rgba(5,7,22,0)");
  ctx.fillStyle = haut;
  ctx.fillRect(0, 0, LARGEUR, 170);
  // Carte chromatique : une petite étoile après le numéro, comme la marque des cartes « shiny ».
  etiquette(ctx, `N° ${donnees.numero}${donnees.style === "chromatique" ? " ✦" : ""}`, 60, 100);
  etiquette(ctx, donnees.types.join(" · "), LARGEUR - 60, 100, "right");

  const attaques = donnees.attaques ?? [];
  const page = miseEnPage(donnees.style, attaques.length);
  // Sans attaque et hors « full art », ces nombres sont ceux de la carte de la fiche : elle ne change pas.
  const echelle = page.cote / 520; // 1 pour la carte de la fiche

  // Numéro en filigrane (pas en « full art » : l'illustration prend toute la place).
  if (!page.pleine) {
    ctx.font = `700 220px ${donnees.policeTitre}`;
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(238,240,255,0.05)";
    ctx.fillText(donnees.numero, LARGEUR - 50, 340);
  }

  // Halo diffus derrière l'illustration, puis halo net au sol.
  const centreX = LARGEUR / 2;
  const centreY = page.centreY;
  const halo = ctx.createRadialGradient(centreX, centreY, 20, centreX, centreY, 300 * echelle);
  halo.addColorStop(0, donnees.teinte);
  halo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = halo;
  ctx.fillRect(0, 150, LARGEUR, 640);
  if (!page.pleine) {
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = donnees.teinte;
    ctx.beginPath();
    ctx.ellipse(centreX, centreY + 250 * echelle, 170 * echelle, 22 * echelle, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (illustration) {
    ctx.drawImage(illustration, centreX - page.cote / 2, centreY - page.cote / 2 - 10 * echelle, page.cote, page.cote);
  }

  // Bandeau sombre en bas, derrière le nom, les attaques et les mesures.
  const bas = ctx.createLinearGradient(0, page.debutBandeau, 0, HAUTEUR);
  bas.addColorStop(0, "rgba(5,7,22,0)");
  bas.addColorStop(0.45, "rgba(5,7,22,0.8)");
  bas.addColorStop(1, "rgba(5,7,22,0.9)");
  ctx.fillStyle = bas;
  ctx.fillRect(0, page.debutBandeau, LARGEUR, HAUTEUR - page.debutBandeau);

  // Nom, réduit s'il est trop long pour la carte.
  let taille = page.tailleNom;
  ctx.textAlign = "left";
  do {
    ctx.font = `700 ${taille}px ${donnees.policeTitre}`;
    taille -= 4;
  } while (ctx.measureText(donnees.nom).width > LARGEUR - 120 && taille > 36);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(donnees.nom, 60, page.ligneNom);

  // Les attaques : une rangée chacune, avec une pastille de la couleur de son type, son nom et sa puissance.
  attaques.forEach((attaque, index) => {
    const haut = page.rangees[index];
    if (haut === undefined) return;
    rectangleArrondi(ctx, 50, haut, LARGEUR - 100, 74, 22);
    ctx.fillStyle = "rgba(5,7,22,0.6)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = attaque.couleur;
    ctx.beginPath();
    ctx.arc(92, haut + 37, 15, 0, Math.PI * 2);
    ctx.fill();

    // La puissance à droite (un tiret pour une attaque de statut), puis le nom, réduit s'il est trop long.
    const puissance = attaque.puissance === null ? "—" : String(attaque.puissance);
    ctx.font = `700 38px ${donnees.policeTitre}`;
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(puissance, LARGEUR - 74, haut + 50);
    const placeNom = LARGEUR - 74 - ctx.measureText(puissance).width - 24 - 124;
    let tailleAttaque = 34;
    ctx.textAlign = "left";
    do {
      ctx.font = `600 ${tailleAttaque}px ${donnees.policeTitre}`;
      tailleAttaque -= 2;
    } while (ctx.measureText(attaque.nomFr).width > placeNom && tailleAttaque > 20);
    ctx.fillText(attaque.nomFr, 124, haut + 49);
  });

  etiquette(ctx, donnees.mesures, 60, page.ligneMesures);
}

// Dos de la carte : anneaux, Pokéball rouge et blanche au centre, nom du site.
export function dessinerDos(toile: HTMLCanvasElement, teinte: string, policeTitre: string, finesse: number) {
  toile.width = Math.round(LARGEUR * finesse);
  toile.height = Math.round(HAUTEUR * finesse);
  const ctx = toile.getContext("2d")!;
  ctx.scale(toile.width / LARGEUR, toile.height / HAUTEUR);
  dessinerFond(ctx, teinte);

  const centreX = LARGEUR / 2;
  const centreY = HAUTEUR / 2 - 40;
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = `rgba(170,182,255,${0.5 - i * 0.07})`;
    ctx.beginPath();
    ctx.arc(centreX, centreY, 110 + i * 46, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Pokéball rouge et blanche, la même que celle du logo et de la sacoche (components/Pokeball.tsx).
  // Un canvas ne lit pas les classes Tailwind : les couleurs sont recopiées des jetons de globals.css
  // (--color-encre, --color-balle-haut, --color-balle-bas).
  const rayon = 90;
  const encre = "#0b1020";
  // Disque foncé : il forme le contour et la ceinture, les deux moitiés sont dessinées par-dessus.
  ctx.fillStyle = encre;
  ctx.beginPath();
  ctx.arc(centreX, centreY, rayon, 0, Math.PI * 2);
  ctx.fill();
  // Calotte rouge : demi-disque du haut (l'angle va de π à 2π), remonté un peu pour laisser voir la ceinture.
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(centreX, centreY - 7.5, 75, Math.PI, Math.PI * 2);
  ctx.fill();
  // Base blanche : demi-disque du bas (de 0 à π), descendu d'autant.
  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.arc(centreX, centreY + 7.5, 75, 0, Math.PI);
  ctx.fill();
  // Bouton central : anneau foncé puis pastille blanche.
  ctx.fillStyle = encre;
  ctx.beginPath();
  ctx.arc(centreX, centreY, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.arc(centreX, centreY, 19, 0, Math.PI * 2);
  ctx.fill();
  // Fin liseré clair autour de la balle, pour la détacher du fond sombre.
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(centreX, centreY, rayon + 2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.font = `700 64px ${policeTitre}`;
  ctx.letterSpacing = "14px";
  ctx.textAlign = "center";
  ctx.fillStyle = "#eef0ff";
  ctx.fillText("POKÉDEX", centreX + 7, HAUTEUR - 130);
  ctx.letterSpacing = "0px";
}
