// PROTOTYPE (branche feature/pokemon-2d-attack-animations) — moteur d'effets 2D.
// Un <canvas> 2D, sans bibliothèque. Trois sortes d'objets dessinés : des particules, des éclairs
// (lignes brisées) et des anneaux/faisceaux. Le moteur surveille sa propre fluidité et réduit
// le nombre de particules si l'appareil peine (important sur mobile).

import type { FormeParticule, Recette } from "@/lib/labo/effets2d";

export type Point = { x: number; y: number };
export type Qualite = "haute" | "moyenne" | "basse";

// Nombre maximal de particules vivantes et multiplicateur d'émission, par niveau de qualité.
const BUDGETS: Record<Qualite, { max: number; facteur: number }> = {
  haute: { max: 900, facteur: 1 },
  moyenne: { max: 500, facteur: 0.6 },
  basse: { max: 250, facteur: 0.35 },
};

type Particule = {
  x: number; y: number; vx: number; vy: number; g: number;
  vie: number; duree: number; taille: number; couleur: string;
  forme: FormeParticule; rot: number; vrot: number; additif: boolean;
};
type Eclair = { points: Point[]; vie: number; duree: number; couleur: string };
type Anneau = { x: number; y: number; rayon: number; vie: number; duree: number; couleur: string; epaisseur: number };
type Faisceau = { a: Point; b: Point; largeur: number; vie: number; duree: number; couleurs: string[] };

export type OptionsEmission = {
  couleurs: string[];
  forme?: FormeParticule;
  vitesse?: number;
  duree?: number;
  taille?: number;
  gravite?: number;
  angle?: number; // direction moyenne, en radians
  ouverture?: number; // largeur du cône d'émission, en radians (2π = toutes directions)
  additif?: boolean;
};

export const attendre = (ms: number) => new Promise<void>((resoudre) => setTimeout(resoudre, ms));

export class Moteur2D {
  private ctx: CanvasRenderingContext2D;
  private particules: Particule[] = [];
  private eclairs: Eclair[] = [];
  private anneaux: Anneau[] = [];
  private faisceaux: Faisceau[] = [];
  private flashAlpha = 0;
  private flashCouleur = "#ffffff";
  private largeur = 0;
  private hauteur = 0;
  private boucle = 0;
  private dernier = 0;
  // Mesure de fluidité : durées des dernières images, pour l'adaptation automatique.
  private dureesImages: number[] = [];
  private images = 0;
  private derniereSeconde = 0;

  qualite: Qualite = "haute";
  qualiteAuto = true;
  mesures = { ips: 0, particules: 0 };

  constructor(private toile: HTMLCanvasElement) {
    this.ctx = toile.getContext("2d")!;
    this.redimensionner();
  }

  // Ajuste la résolution du canvas à sa taille à l'écran. Le facteur est limité à 2 (1,5 sur petit écran) :
  // au-delà, le nombre de pixels à dessiner explose pour un gain invisible.
  redimensionner() {
    const zone = this.toile.getBoundingClientRect();
    const plafond = zone.width < 500 ? 1.5 : 2;
    const dpr = Math.min(window.devicePixelRatio || 1, plafond);
    this.largeur = zone.width;
    this.hauteur = zone.height;
    this.toile.width = Math.round(zone.width * dpr);
    this.toile.height = Math.round(zone.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  demarrer() {
    this.dernier = performance.now();
    this.derniereSeconde = this.dernier;
    const image = (t: number) => {
      this.dessiner(t);
      this.boucle = requestAnimationFrame(image);
    };
    this.boucle = requestAnimationFrame(image);
  }

  arreter() {
    cancelAnimationFrame(this.boucle);
  }

  /* ---------- Création d'objets ---------- */

  emettre(x: number, y: number, nombre: number, o: OptionsEmission) {
    const budget = BUDGETS[this.qualite];
    const n = Math.max(1, Math.round(nombre * budget.facteur));
    for (let i = 0; i < n; i++) {
      if (this.particules.length >= budget.max) return; // plafond atteint : on n'en crée plus
      const angle = (o.angle ?? 0) + (Math.random() - 0.5) * (o.ouverture ?? Math.PI * 2);
      const vitesse = (o.vitesse ?? 120) * (0.4 + Math.random() * 0.8);
      this.particules.push({
        x, y,
        vx: Math.cos(angle) * vitesse,
        vy: Math.sin(angle) * vitesse,
        g: o.gravite ?? 0,
        vie: 0,
        duree: (o.duree ?? 0.6) * (0.6 + Math.random() * 0.6),
        taille: (o.taille ?? 6) * (0.6 + Math.random() * 0.8),
        couleur: o.couleurs[(Math.random() * o.couleurs.length) | 0],
        forme: o.forme ?? "rond",
        rot: Math.random() * 6.28,
        vrot: (Math.random() - 0.5) * 10,
        additif: o.additif ?? true,
      });
    }
  }

  eclair(depuis: Point, vers: Point, couleur: string) {
    // Ligne brisée : 9 segments dont les points s'écartent au hasard de la ligne droite.
    const points: Point[] = [depuis];
    for (let k = 1; k < 9; k++) {
      const t = k / 9;
      const ecart = 46 * (1 - t);
      points.push({ x: depuis.x + (vers.x - depuis.x) * t + (Math.random() - 0.5) * ecart, y: depuis.y + (vers.y - depuis.y) * t + (Math.random() - 0.5) * ecart * 0.4 });
    }
    points.push(vers);
    this.eclairs.push({ points, vie: 0, duree: 0.2, couleur });
  }

  anneau(x: number, y: number, rayon: number, couleur: string, duree = 0.5, epaisseur = 5) {
    this.anneaux.push({ x, y, rayon, vie: 0, duree, couleur, epaisseur });
  }

  faisceau(a: Point, b: Point, largeur: number, couleurs: string[], duree = 0.45) {
    this.faisceaux.push({ a, b, largeur, vie: 0, duree, couleurs });
  }

  flash(couleur: string, force = 0.5) {
    this.flashCouleur = couleur;
    this.flashAlpha = force;
  }

  // Fait voyager un point de A à B ; `pas` est appelé à chaque image avec la position et l'avancement k (0→1).
  voyager(a: Point, b: Point, duree: number, pas: (x: number, y: number, k: number) => void, cloche = 0): Promise<void> {
    return new Promise((resoudre) => {
      const debut = performance.now();
      const image = (t: number) => {
        const k = Math.min(1, (t - debut) / duree);
        pas(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * cloche, k);
        if (k < 1) requestAnimationFrame(image);
        else resoudre();
      };
      requestAnimationFrame(image);
    });
  }

  /* ---------- Dessin ---------- */

  private dessiner(t: number) {
    const ecoule = t - this.dernier;
    const dt = Math.min(0.05, ecoule / 1000);
    this.dernier = t;
    this.adapterQualite(ecoule);

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.largeur, this.hauteur);

    if (this.flashAlpha > 0) {
      ctx.globalAlpha = this.flashAlpha * 0.35;
      ctx.fillStyle = this.flashCouleur;
      ctx.fillRect(0, 0, this.largeur, this.hauteur);
      this.flashAlpha = Math.max(0, this.flashAlpha - dt * 2.4);
    }

    ctx.globalCompositeOperation = "lighter";
    for (let i = this.faisceaux.length - 1; i >= 0; i--) {
      const f = this.faisceaux[i];
      f.vie += dt;
      const k = f.vie / f.duree;
      if (k >= 1) { this.faisceaux.splice(i, 1); continue; }
      // Le faisceau s'allonge vite (premier tiers), puis s'affine en s'éteignant.
      const avance = Math.min(1, k * 3);
      const bout = { x: f.a.x + (f.b.x - f.a.x) * avance, y: f.a.y + (f.b.y - f.a.y) * avance };
      ctx.lineCap = "round";
      f.couleurs.forEach((couleur, rang) => {
        ctx.globalAlpha = (1 - k) * 0.9;
        ctx.strokeStyle = couleur;
        ctx.lineWidth = f.largeur * (1 - k * 0.6) * (1 - rang * 0.3);
        ctx.beginPath();
        ctx.moveTo(f.a.x, f.a.y);
        ctx.lineTo(bout.x, bout.y);
        ctx.stroke();
      });
    }

    for (let i = this.eclairs.length - 1; i >= 0; i--) {
      const e = this.eclairs[i];
      e.vie += dt;
      if (e.vie >= e.duree) { this.eclairs.splice(i, 1); continue; }
      ctx.globalAlpha = 1 - e.vie / e.duree;
      ctx.lineJoin = "round";
      for (const [largeur, couleur] of [[10, e.couleur], [3, "#ffffff"]] as const) {
        ctx.lineWidth = largeur;
        ctx.strokeStyle = couleur;
        ctx.beginPath();
        e.points.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.stroke();
      }
    }

    for (let i = this.anneaux.length - 1; i >= 0; i--) {
      const a = this.anneaux[i];
      a.vie += dt;
      const k = a.vie / a.duree;
      if (k >= 1) { this.anneaux.splice(i, 1); continue; }
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = a.couleur;
      ctx.lineWidth = a.epaisseur * (1 - k * 0.7);
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.rayon * (0.15 + k * 0.85), 0, 6.283);
      ctx.stroke();
    }

    for (let i = this.particules.length - 1; i >= 0; i--) {
      const p = this.particules[i];
      p.vie += dt;
      if (p.vie >= p.duree) {
        // Suppression rapide : on remplace la particule morte par la dernière du tableau.
        this.particules[i] = this.particules[this.particules.length - 1];
        this.particules.pop();
        continue;
      }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
      const k = p.vie / p.duree;
      ctx.globalCompositeOperation = p.additif ? "lighter" : "source-over";
      ctx.globalAlpha = (1 - k) * (p.additif ? 0.85 : 0.75);
      ctx.fillStyle = p.couleur;
      const taille = p.taille * (1 - k * 0.5);
      this.dessinerForme(p, taille);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    this.images += 1;
    if (t - this.derniereSeconde >= 1000) {
      this.mesures = { ips: this.images, particules: this.particules.length };
      this.images = 0;
      this.derniereSeconde = t;
    }
  }

  private dessinerForme(p: Particule, taille: number) {
    const ctx = this.ctx;
    // Le rond est de loin la forme la plus fréquente : dessiné sans changer de repère (plus rapide).
    if (p.forme === "rond") {
      ctx.beginPath();
      ctx.arc(p.x, p.y, taille, 0, 6.283);
      ctx.fill();
      return;
    }
    if (p.forme === "bulle") {
      ctx.strokeStyle = p.couleur;
      ctx.lineWidth = Math.max(1, taille * 0.3);
      ctx.beginPath();
      ctx.arc(p.x, p.y, taille, 0, 6.283);
      ctx.stroke();
      ctx.globalAlpha *= 0.35;
      ctx.fill();
      return;
    }
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.beginPath();
    if (p.forme === "trait") {
      ctx.rotate(Math.atan2(p.vy, p.vx)); // le trait est aligné sur sa direction de déplacement
      ctx.rect(-taille * 2.5, -taille * 0.25, taille * 5, taille * 0.5);
    } else {
      ctx.rotate(p.rot);
      if (p.forme === "feuille") ctx.ellipse(0, 0, taille, taille * 0.42, 0, 0, 6.283);
      else if (p.forme === "cristal") { ctx.moveTo(0, -taille * 1.4); ctx.lineTo(taille * 0.7, 0); ctx.lineTo(0, taille * 1.4); ctx.lineTo(-taille * 0.7, 0); }
      else if (p.forme === "roche") { ctx.moveTo(-taille, -taille * 0.5); ctx.lineTo(-taille * 0.2, -taille); ctx.lineTo(taille, -taille * 0.4); ctx.lineTo(taille * 0.7, taille * 0.8); ctx.lineTo(-taille * 0.6, taille); }
      else { // étoile à 5 branches
        for (let s = 0; s < 10; s++) {
          const r = s % 2 ? taille * 0.45 : taille * 1.2;
          ctx.lineTo(Math.cos((s * Math.PI) / 5) * r, Math.sin((s * Math.PI) / 5) * r);
        }
      }
    }
    ctx.fill();
    ctx.restore();
  }

  // Si la moyenne des 40 dernières images dépasse 22 ms (moins de 45 images/s), on baisse la qualité d'un cran.
  private adapterQualite(dureeImage: number) {
    if (!this.qualiteAuto) return;
    this.dureesImages.push(dureeImage);
    if (this.dureesImages.length < 40) return;
    const moyenne = this.dureesImages.reduce((somme, d) => somme + d, 0) / this.dureesImages.length;
    this.dureesImages = [];
    if (moyenne > 22 && this.particules.length > 60) {
      this.qualite = this.qualite === "haute" ? "moyenne" : "basse";
    }
  }
}

/* ------------------------------------------------------------------ */
/* Séquence complète d'une attaque                                     */
/* ------------------------------------------------------------------ */

// Ce que la page fournit pour animer les sprites (le moteur ne touche pas au DOM).
export type Crochets = {
  elan: () => void; // petit recul de l'attaquant au moment où il lance l'attaque
  charger: () => Promise<void>; // l'attaquant se rue sur la cible (attaque de contact)
  encaisser: (force: number) => Promise<void>; // la cible clignote et l'arène tremble
};

function impact(moteur: Moteur2D, r: Recette, b: Point, angle: number) {
  const n = r.intensite;
  const communs = { couleurs: r.couleurs, forme: r.forme, additif: r.additif };
  if (r.impact === "explosion") {
    moteur.emettre(b.x, b.y, 100 * n, { ...communs, vitesse: 300 * n, duree: 0.7, taille: 11, gravite: r.gravite });
    moteur.emettre(b.x, b.y, 24 * n, { couleurs: ["#3a3140", "#5b5060"], vitesse: 90, duree: 1.1, taille: 22, gravite: -60, additif: false });
    moteur.anneau(b.x, b.y, 90 * n, r.couleurs[1], 0.45, 7);
  } else if (r.impact === "eclaboussure") {
    moteur.emettre(b.x, b.y, 90 * n, { ...communs, vitesse: 310 * n, duree: 0.65, taille: 7, gravite: Math.max(r.gravite, 500), angle: angle - Math.PI, ouverture: 3.6 });
  } else if (r.impact === "eclats") {
    moteur.emettre(b.x, b.y, 44 * n, { couleurs: r.couleurs, forme: "trait", vitesse: 420 * n, duree: 0.3, taille: 5 });
    moteur.emettre(b.x, b.y, 26 * n, { ...communs, vitesse: 190 * n, duree: 0.55, taille: 8, gravite: r.gravite });
    moteur.anneau(b.x, b.y, 70 * n, r.couleurs[0], 0.3, 5);
  } else if (r.impact === "anneaux") {
    for (let i = 0; i < 3; i++) setTimeout(() => moteur.anneau(b.x, b.y, (60 + i * 34) * n, r.couleurs[i % r.couleurs.length], 0.6, 6), i * 90);
    moteur.emettre(b.x, b.y, 40 * n, { ...communs, vitesse: 150, duree: 0.7, taille: 8, gravite: r.gravite });
  } else if (r.impact === "nuage") {
    moteur.emettre(b.x, b.y, 70 * n, { ...communs, forme: "rond", vitesse: 110, duree: 1, taille: 20, gravite: -20 });
  }
  moteur.flash(r.couleurs[1], 0.45 * n);
}

// Joue une attaque de A (attaquant) vers B (cible), selon sa recette. Se termine quand tout est fini.
export async function jouerAttaque(moteur: Moteur2D, r: Recette, a: Point, b: Point, crochets: Crochets): Promise<void> {
  const n = r.intensite;
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const communs = { couleurs: r.couleurs, forme: r.forme, additif: r.additif };

  switch (r.trajectoire) {
    case "aura": {
      // Statut : anneaux et particules qui montent autour du lanceur. La cible n'est pas touchée.
      for (let i = 0; i < 3; i++) {
        moteur.anneau(a.x, a.y + 20, 80 + i * 20, r.couleurs[i % r.couleurs.length], 0.7, 5);
        moteur.emettre(a.x, a.y + 30, 26, { ...communs, vitesse: 90, duree: 0.9, taille: 7, gravite: -160, angle: -Math.PI / 2, ouverture: 2.6 });
        await attendre(150);
      }
      await attendre(350);
      return;
    }
    case "contact": {
      const charge = crochets.charger();
      await attendre(400); // moment où l'attaquant atteint la cible
      moteur.emettre(b.x, b.y, 1, { couleurs: ["#ffffff"], forme: "etoile", vitesse: 0, duree: 0.25, taille: 46 * n, additif: true });
      impact(moteur, r, b, angle);
      await Promise.all([crochets.encaisser(n), charge]);
      return;
    }
    case "projectile": {
      crochets.elan();
      await moteur.voyager(a, b, 420, (x, y) => moteur.emettre(x, y, 7, { ...communs, vitesse: 55, duree: 0.45, taille: 13 * n, gravite: r.gravite }));
      break;
    }
    case "jet": {
      crochets.elan();
      for (let i = 0; i < 14; i++) {
        void moteur.voyager(a, b, 360, (x, y) => moteur.emettre(x, y, 2, { ...communs, vitesse: 40, duree: 0.35, taille: 8 * n, gravite: 160 }), 26);
        await attendre(26);
      }
      await attendre(250);
      break;
    }
    case "rayon": {
      crochets.elan();
      moteur.faisceau(a, b, 26 * n, [r.couleurs[1], r.couleurs[0]]);
      await moteur.voyager(a, b, 150, (x, y) => moteur.emettre(x, y, 5, { ...communs, vitesse: 70, duree: 0.5, taille: 6, gravite: r.gravite }));
      break;
    }
    case "ciel": {
      const frappes = r.forme === "trait" ? 3 : 5;
      for (let i = 0; i < frappes; i++) {
        const haut = { x: b.x + (Math.random() - 0.5) * 140, y: -10 };
        const cible = { x: b.x + (Math.random() - 0.5) * 40, y: b.y + (Math.random() - 0.5) * 30 };
        if (r.forme === "trait") {
          moteur.eclair(haut, cible, r.couleurs[1]); // foudre
          moteur.flash(r.couleurs[1], 0.6);
          moteur.emettre(cible.x, cible.y, 20, { couleurs: r.couleurs, forme: "trait", vitesse: 380, duree: 0.3, taille: 4 });
        } else {
          // Chute de rochers : chaque bloc tombe du haut de l'écran en laissant de la poussière.
          void moteur.voyager(haut, cible, 300, (x, y) => moteur.emettre(x, y, 2, { ...communs, vitesse: 20, duree: 0.25, taille: 16 * n, gravite: 0 }));
        }
        await attendre(110);
      }
      await attendre(r.forme === "trait" ? 60 : 260);
      break;
    }
    case "nuee": {
      crochets.elan();
      const vols: Promise<void>[] = [];
      for (let i = 0; i < 16; i++) {
        const cible = { x: b.x + (Math.random() - 0.5) * 50, y: b.y + (Math.random() - 0.5) * 60 };
        const cloche = (i % 2 ? 1 : -1) * (30 + i * 5);
        vols.push(moteur.voyager(a, cible, 500 + i * 14, (x, y) => { if (Math.random() < 0.6) moteur.emettre(x, y, 1, { ...communs, vitesse: 26, duree: 0.3, taille: 10 * n, gravite: 0 }); }, cloche));
        await attendre(22);
      }
      await Promise.all(vols);
      break;
    }
    case "spirale": {
      crochets.elan();
      await moteur.voyager(a, b, 620, (x, y, k) => {
        const rayon = 22 * (1 - k);
        moteur.emettre(x + Math.cos(k * 22) * rayon, y + Math.sin(k * 22) * rayon, 5, { ...communs, vitesse: 22, duree: 0.5, taille: 15 * n, gravite: r.gravite });
      });
      break;
    }
    case "onde": {
      crochets.elan();
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        moteur.anneau(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, (36 + i * 16) * n, r.couleurs[i % r.couleurs.length], 0.5, 6);
        await attendre(85);
      }
      break;
    }
    case "sol": {
      // Éruption : la matière jaillit vers le haut sous la cible.
      for (let i = 0; i < 4; i++) {
        moteur.emettre(b.x + (Math.random() - 0.5) * 90, b.y + 46, 26 * n, { ...communs, vitesse: 430, duree: 0.8, taille: 12, gravite: r.gravite, angle: -Math.PI / 2, ouverture: 0.9 });
        await attendre(90);
      }
      break;
    }
  }

  impact(moteur, r, b, angle);
  if (r.touche) await crochets.encaisser(n);
}
