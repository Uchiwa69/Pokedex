// types/feu.ts
// Matière : plasma thermique advecté et braises incandescentes.
// Mouvement : convection ascendante continue avec cisaillement à l'inclinaison.
// Lumière : gradient corps noir (rouge braise -> orange vif -> cœur blanc-jaune).

export const GLSL_FEU = /* glsl */ `
float coucheBraises(vec2 p, float t, float echelle, float graine) {
  vec2 grille = p * echelle;
  grille.y -= t * (1.8 + graine * 0.7);
  vec2 id = floor(grille);
  vec2 f = fract(grille) - 0.5;

  float alea = hachage21(id + graine * 41.0);
  if (alea < 0.62) return 0.0;

  vec2 decalage = vec2(
    sin(t * 2.4 + alea * 19.0) * 0.28,
    cos(t * 1.7 + alea * 13.0) * 0.18
  );
  float d = length(f - decalage);
  float rayon = mix(0.05, 0.14, fract(alea * 7.3));
  float scintillement = 0.65 + 0.35 * sin(t * 3.2 + alea * 25.0);
  return smoothstep(rayon, rayon * 0.15, d) * scintillement;
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
  float octaves = mix(2.0, 4.0, uQualite);

  vec2 p = coordonneesIsotropes(uv, vec2(0.5), proportions);
  p.x += inc.x * (uv.y - 0.2) * 0.38;

  vec2 coordFlamme = vec2(p.x * 3.2, p.y * 2.1 - t * 1.35);
  float turbulence = fbm(coordFlamme, octaves);
  vec2 advection = vec2(turbulence - 0.5, fbm(coordFlamme + vec2(4.2, -t * 0.8), octaves) - 0.5);
  float plasma = fbm(coordFlamme * 1.6 + advection * 1.55, octaves);

  float masqueSpatial = 1.0;
  float frontOnde = 0.0;
  if (modeEclat > 0.5) {
    float pEclat = clamp(progression, 0.0, 1.0);
    float distOrigine = length(coordonneesIsotropes(uv, origine, proportions));
    float rayon = pEclat * 1.75;
    frontOnde = exp(-pow((distOrigine - rayon) * 5.2, 2.0)) * 1.35;
    float sillage = smoothstep(rayon + 0.12, max(0.0, rayon - 0.65), distOrigine);
    masqueSpatial = max(frontOnde, sillage * 0.85);
  } else {
    float cadre = masqueCadreCarte(uv, 0.24);
    float baseArdente = smoothstep(0.75, 0.0, uv.y) * 0.65;
    masqueSpatial = clamp(cadre * 0.95 + baseArdente, 0.0, 1.25);
  }

  float chaleur = clamp(plasma * 1.35 * masqueSpatial + frontOnde * 0.55, 0.0, 1.4);
  chaleur = smoothstep(0.24, 1.05, chaleur);

  float braisesFond = coucheBraises(p + inc * 0.08, t, 7.5, 1.0);
  float braisesAvant = coucheBraises(p - inc * 0.16, t * 1.25, 11.0, 2.0);
  float braises = (braisesFond * 0.6 + braisesAvant * 1.1) * mix(0.45, 1.0, masqueSpatial);

  vec3 rougeBraise = teinte * 0.85;
  vec3 orangeVif = mix(teinte, vec3(1.0, 0.42, 0.08), 0.65);
  vec3 coeurBlancJaune = vec3(1.0, 0.96, 0.80);

  vec3 couleurFlamme = mix(rougeBraise, orangeVif, smoothstep(0.15, 0.62, chaleur));
  couleurFlamme = mix(couleurFlamme, coeurBlancJaune, smoothstep(0.62, 0.98, chaleur));

  vec3 couleurBraises = mix(orangeVif, coeurBlancJaune, 0.7) * braises;
  float intensite = clamp((chaleur * 0.78 + braises * 0.75) * env, 0.0, 1.0);
  vec3 resultat = (couleurFlamme * chaleur * 0.78 + couleurBraises * 0.75) * env;

  return vec4(resultat, intensite);
}
`;
