// Qualité d'affichage des scènes 3D plein écran (feu de fin de page, astéroïdes, introduction, Pokéball).
// Pensé pour les Mac : écrans Retina (2 pixels réels par pixel CSS : 4 fois plus de pixels à calculer) et écrans
// ProMotion à 120 images par seconde (Chrome y fait tourner les animations à 120 i/s : 2 fois plus de travail).
// Trois outils, utilisables partout :
// - ratioPixels : la densité de pixels d'un canvas, plafonnée par un BUDGET total de pixels ;
// - Cadence : limite une boucle d'animation à 60 images par seconde ;
// - RegulateurQualite : baisse la densité si la machine n'arrive pas à suivre, la remonte quand elle suit.

// Budget d'un canvas plein écran : environ 2,4 millions de pixels réels (un écran 1920 × 1250). Au-delà, l'œil ne voit
// pas la différence sur des flammes ou un ciel flou, mais la carte graphique, elle, la sent.
export const BUDGET_PLEIN_ECRAN = 2_400_000;

// Densité de pixels à donner à un canvas de largeur × hauteur (en pixels CSS) : celle de l'écran, sans dépasser
// `plafond`, ni le budget de pixels. Jamais moins de 1 : en dessous, l'image deviendrait floue.
export function ratioPixels(largeur: number, hauteur: number, plafond: number, budget = BUDGET_PLEIN_ECRAN): number {
  const ecran = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const selonBudget = Math.sqrt(budget / Math.max(1, largeur * hauteur));
  return Math.max(1, Math.min(ecran, plafond, selonBudget));
}

// Limite une boucle requestAnimationFrame à 60 images par seconde. Sur un écran à 120 Hz, une image sur deux est
// sautée ; sur un écran à 60 Hz, rien ne change.
//   const cadence = new Cadence();
//   function boucle(maintenant) { image = requestAnimationFrame(boucle); if (!cadence.aDessiner(maintenant)) return; … }
export class Cadence {
  private derniere = -Infinity;
  // Un peu moins de 1000/60 ms : sur un écran à 60 Hz, l'intervalle varie de ± 1 ms, il ne faut sauter aucune image.
  constructor(private intervalle = 1000 / 64) {}

  aDessiner(maintenant: number): boolean {
    if (maintenant - this.derniere < this.intervalle) return false;
    this.derniere = maintenant;
    return true;
  }
}

// Mesure le temps entre deux images. Si, sur une seconde environ, la moyenne dépasse 25 ms (moins de 40 images par
// seconde), le facteur de qualité baisse de 15 % (jusqu'à `minimum`) ; s'il redescend sous 17 ms, il remonte doucement.
// `surChangement` reçoit le nouveau facteur (entre minimum et 1), à multiplier par la densité de pixels.
export class RegulateurQualite {
  facteur = 1;
  private cumul = 0;
  private nombre = 0;
  private precedente = 0;

  constructor(
    private surChangement: (facteur: number) => void,
    private minimum = 0.5,
  ) {}

  mesurer(maintenant: number) {
    const ecart = maintenant - this.precedente;
    this.precedente = maintenant;
    // Un écart énorme = onglet en arrière-plan ou boucle en pause : on ne le compte pas.
    if (ecart <= 0 || ecart > 250) return;
    this.cumul += ecart;
    this.nombre += 1;
    if (this.nombre < 45) return;
    const moyenne = this.cumul / this.nombre;
    this.cumul = 0;
    this.nombre = 0;
    let suivant = this.facteur;
    if (moyenne > 25) suivant = Math.max(this.minimum, this.facteur * 0.85);
    else if (moyenne < 17 && this.facteur < 1) suivant = Math.min(1, this.facteur * 1.08);
    if (suivant !== this.facteur) {
      this.facteur = suivant;
      this.surChangement(suivant);
    }
  }
}
