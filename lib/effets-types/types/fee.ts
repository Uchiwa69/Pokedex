// types/fee.ts
// Matière : poussière d'étoiles en croix à 4 branches et voile aurora pastel nacré.
// Mouvement : tourbillon aérien ascendant léger et scintillement en vague à l'inclinaison.
// Lumière : halos rose pastel, lavande tendre et éclats blanc-or très doux.

export const GLSL_FEE = /* glsl */ `
float etoilesEnCroix(vec2 p, float t, vec2 inc, float echelle, float graine) {
  vec2 grille = p * echelle;
  grille.y -= t * (0.35 + graine * 0.15);
  grille.x += sin(t * 0.7 + grille.y * 0.6) * 0.18;

  vec2 id = floor(grille);
  vec2 f = fract(grille) - 0.5;

  float alea = hachage21(id + graine * 53.0);
  if (alea < 0.64) return 0.0;

  vec2 pos = (hachage22(id + graine * 17.0) - 0.5) * 0.42;
  vec2 d = f - pos;
  float dist = length(d);

  float phaseAngle = dot(id * 0.18, inc * 2.2) + alea * DEUX_PI + t * 2.2;
  float scintillement = pow(0.5 + 0.5 * sin(phaseAngle), 3.0);
  if (scintillement < 0.05) return 0.0;

  float taille = mix(0.18, 0.34, fract(alea * 9.1)) * (0.6 + 0.4 * scintillement);

  float brancheH = exp(-abs(d.y) * 42.0) * smoothstep(taille, 0.0, abs(d.x));
  float brancheV = exp(-abs(d.x) * 42.0) * smoothstep(taille, 0.0, abs(d.y));
  float coeur = smoothstep(taille * 0.35, 0.0, dist);

  return (brancheH + brancheV + coeur * 0.9) * scintillement;
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

  vec2 qAurora = p * 2.5 + vec2(inc.x * 0.24, -t * 0.20 + inc.y * 0.24);
  float ondeAurora = fbm(qAurora + fbm(qAurora * 1.4, octaves) * 0.75, octaves);
  float voilePastel = smoothstep(0.32, 0.82, ondeAurora) * 0.58;

  float etoiles = etoilesEnCroix(p - inc * 0.14, t, inc, 5.2, 1.0);
  if (uQualite > 0.3) {
    etoiles += etoilesEnCroix(p + inc * 0.10, t * 1.15, inc, 8.0, 2.0) * 0.78;
  }

  float masque = 1.0;
  float eclosion = 0.0;
  if (modeEclat > 0.5) {
    float pEclat = clamp(progression, 0.0, 1.0);
    float dist = length(coordonneesIsotropes(uv, origine, proportions));
    float rayon = pEclat * 1.72;
    eclosion = exp(-pow((dist - rayon) * 7.5, 2.0)) * 1.2;
    float sillage = smoothstep(rayon + 0.18, max(0.0, rayon - 0.68), dist);
    masque = max(eclosion, sillage * 0.88);
  } else {
    masque = 0.40 + 0.60 * masqueCadreCarte(uv, 0.28);
  }

  float lumiere = clamp((voilePastel + etoiles * 0.95 + eclosion * 0.65) * masque, 0.0, 1.25);

  vec3 rosePastel = mix(teinte, vec3(1.0, 0.68, 0.86), 0.45);
  vec3 lavandeDouce = vec3(0.76, 0.72, 1.0);
  vec3 orBlanc = vec3(1.0, 0.97, 0.92);

  vec3 couleur = mix(rosePastel, lavandeDouce, ondeAurora);
  couleur = mix(couleur, orBlanc, clamp(etoiles * 0.85 + eclosion * 0.45, 0.0, 0.95));

  float intensite = clamp(lumiere * 0.74 * env, 0.0, 1.0);
  return vec4(couleur * lumiere * 0.74 * env, intensite);
}
`;
