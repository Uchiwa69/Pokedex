// Dessin des deux faces de la carte holographique dans des <canvas> 2D.
// Ces canvas servent ensuite de textures à la carte en 3D (components/Carte3D.tsx).
// Tout le décor (cadre, grille, motifs, dos) est original ; seule l'illustration est l'image
// déjà affichée sur la fiche, chargée par son adresse.

export const LARGEUR = 720;
export const HAUTEUR = 1000;

export type DonneesCarte = {
  numero: string; // "0006"
  nom: string;
  types: string[]; // libellés français
  mesures: string; // "1,7 m · 90,5 kg"
  teinte: string; // couleur du type principal, ex. "#ee8130"
  policeTitre: string; // famille de police des titres (Chakra Petch)
};

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
  ctx.font = "600 24px system-ui, sans-serif";
  ctx.letterSpacing = "4px";
  ctx.textAlign = alignement;
  ctx.fillStyle = "rgba(238,240,255,0.78)";
  ctx.fillText(texte.toUpperCase(), x, y);
  ctx.letterSpacing = "0px";
}

// Face avant : numéro, types, illustration sur son halo, nom, mesures.
export function dessinerFace(toile: HTMLCanvasElement, donnees: DonneesCarte, illustration: HTMLImageElement | null) {
  toile.width = LARGEUR;
  toile.height = HAUTEUR;
  const ctx = toile.getContext("2d")!;
  dessinerFond(ctx, donnees.teinte);

  etiquette(ctx, `N° ${donnees.numero}`, 60, 92);
  etiquette(ctx, donnees.types.join(" · "), LARGEUR - 60, 92, "right");

  // Numéro en filigrane.
  ctx.font = `700 220px ${donnees.policeTitre}`;
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(238,240,255,0.07)";
  ctx.fillText(donnees.numero, LARGEUR - 50, 330);

  // Halo diffus derrière l'illustration, puis halo net au sol.
  const centreX = LARGEUR / 2;
  const centreY = 470;
  const halo = ctx.createRadialGradient(centreX, centreY, 20, centreX, centreY, 300);
  halo.addColorStop(0, donnees.teinte);
  halo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = halo;
  ctx.fillRect(0, 150, LARGEUR, 640);
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = donnees.teinte;
  ctx.beginPath();
  ctx.ellipse(centreX, 720, 170, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (illustration) {
    const cote = 520;
    ctx.drawImage(illustration, centreX - cote / 2, centreY - cote / 2 - 10, cote, cote);
  }

  // Nom, réduit s'il est trop long pour la carte.
  let taille = 76;
  ctx.textAlign = "left";
  do {
    ctx.font = `700 ${taille}px ${donnees.policeTitre}`;
    taille -= 4;
  } while (ctx.measureText(donnees.nom).width > LARGEUR - 120 && taille > 36);
  ctx.fillStyle = "#eef0ff";
  ctx.fillText(donnees.nom, 60, 850);

  etiquette(ctx, donnees.mesures, 60, 912);
}

// Dos de la carte : motif original (anneaux, « lentille » en dégradé, nom du site).
export function dessinerDos(toile: HTMLCanvasElement, teinte: string, policeTitre: string) {
  toile.width = LARGEUR;
  toile.height = HAUTEUR;
  const ctx = toile.getContext("2d")!;
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

  // « Lentille » : le disque en dégradé de l'en-tête du site.
  const lentille = ctx.createLinearGradient(centreX - 90, centreY - 90, centreX + 90, centreY + 90);
  lentille.addColorStop(0, "#67e8f9");
  lentille.addColorStop(1, "#aab6ff");
  ctx.fillStyle = lentille;
  ctx.beginPath();
  ctx.arc(centreX, centreY, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.font = `700 64px ${policeTitre}`;
  ctx.letterSpacing = "14px";
  ctx.textAlign = "center";
  ctx.fillStyle = "#eef0ff";
  ctx.fillText("POKÉDEX", centreX + 7, HAUTEUR - 130);
  ctx.letterSpacing = "0px";
}
