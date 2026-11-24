// types/plante.ts
// Matière : nervures foliaires translucides et grains de pollen lumineux.
// Mouvement : balancement doux sous une brise oblique, dérive flottante des spores.
// Lumière : taches de lumière filtrée (canopée vert émeraude et lueur dorée chaude).

export const GLSL_PLANTE = /* glsl */ `
// Particules douces de pollen portées par une brise oblique
float couchePollen(vec2 p, float t, float echelle, float graine) {
  vec2 grille = p * echelle - vec2(t * 0.45, t * 0.65) * (0.8 + graine * 0.25);
  vec2 id = floor(grille);
  vec2 f = fract(grille) - 0.5;

  float alea = hachage21(id + graine * 29.0);
  if (alea < 0.66) return 0.0;

  vec2 oscillation = vec2(
    sin(t * 1.6 + alea * 17.0) * 0.26,
    cos(t * 1.3 + alea * 23.0) * 0.22
  );
  float d = length(f - oscillation);
  float rayon = mix(0.06, 0.15, fract(alea * 5.7));
  float halo = smoothstep(rayon * 2.2, 0.0, d) * 0.55;
  float coeur = smoothstep(rayon, rayon * 0.2, d) * 0.85;
  return (halo + coeur) * (0.7 + 0.3 * sin(t * 2.2 + alea * 31.0));
}

vec4 effetType(vec2 uv, float proportions, float temps, vec2 inclinaison,
               float progression, vec2 origine, vec3 teinte) {
  float modeEclat = estModeEclat(progression);
  if (uCalme > 0.5 && modeEclat > 0.5) {
    return eclatAccessible(uv, proportions, progression, origine, teinte);
  }

  float env = enveloppeEclat(progression);
  if (env <= 0.0001) return vec4(0.0);

  float t = tempsAnime(temps);
  vec2 inc = inclinaisonAnimee(inclinaison);
  float octaves = mix(2.0, 3.0, uQualite);

  vec2 p = coordonneesIsotropes(uv, vec2(0.5), proportions);

  // Balancement souple imitant une feuille traversée par la brise
  float brise = sin(t * 1.25 + p.y * 2.6) * 0.045 + inc.x * 0.14;
  vec2 q = rotation2D(-0.32 + brise) * p;
  q.x += fbm(q * 2.4 + vec2(0.0, -t * 0.25), octaves) * 0.18 - 0.09;

  // Réseau organique de nervures foliaires (nervures secondaires en V doux)
  float motifNervures = abs(fract((q.y - abs(q.x) * 1.35) * 4.2) - 0.5) * 2.0;
  float nervureFine = smoothstep(0.16, 0.02, motifNervures);
  float nervurePrincipale = exp(-abs(q.x) * 22.0) * 0.65;
  float reseauFolieux = clamp(nervureFine * 0.75 + nervurePrincipale, 0.0, 1.0);

  // Taches de lumière filtrée à travers la canopée (parallaxe profonde à l'inclinaison)
  vec2 coordCanopee = (p + inc * 0.28) * 3.1 + vec2(t * 0.14, t * 0.10);
  float canopee = smoothstep(0.38, 0.84, fbm(coordCanopee, octaves));

  // Deux plans de pollen avec parallaxe inverse des nervures
  float pollen = couchePollen(p - inc * 0.16, t, 6.5, 1.0);
  if (uQualite > 0.3) {
    pollen += couchePollen(p + inc * 0.09, t * 0.85, 9.5, 2.0) * 0.7;
  }

  float masque = 1.0;
  float souffle = 0.0;
  if (modeEclat > 0.5) {
    float pEclat = clamp(progression, 0.0, 1.0);
    float dist = length(coordonneesIsotropes(uv, origine, proportions));
    float rayon = pEclat * 1.70;
    souffle = exp(-pow((dist - rayon) * 6.5, 2.0)) * 1.15;
    float sillage = smoothstep(rayon + 0.15, max(0.0, rayon - 0.65), dist);
    masque = max(souffle, sillage * 0.85);
  } else {
    masque = 0.42 + 0.58 * masqueCadreCarte(uv, 0.28);
  }

  float lumiere = clamp((canopee * 0.55 + reseauFolieux * 0.55 + pollen * 0.75 + souffle * 0.5) * masque, 0.0, 1.2);

  vec3 vertEmeraude = teinte * 0.92;
  vec3 vertTendre = mix(teinte, vec3(0.55, 0.96, 0.42), 0.55);
  vec3 orCanopee = vec3(0.98, 0.95, 0.68);

  vec3 couleur = mix(vertEmeraude, vertTendre, clamp(reseauFolieux * 0.7 + canopee * 0.5, 0.0, 1.0));
  couleur = mix(couleur, orCanopee, clamp(pollen * 0.85 + canopee * reseauFolieux * 0.6, 0.0, 1.0));

  float intensite = clamp(lumiere * 0.72 * env, 0.0, 1.0);
  return vec4(couleur * lumiere * 0.72 * env, intensite);
}
`;
