// types/roche.ts
// Matière : plaques minérales fracturées (Voronoï polygonal) et éclats de quartz.
// Mouvement : inertie massive, quasi immobile au repos (relief révélé par l'angle).
// Lumière : reflets spéculaires durs sur les arêtes de fracture et facettes inclinées.

export const GLSL_ROCHE = /* glsl */ `
// Calcule la distance exacte aux lignes de fracture polygonales entre blocs minéraux
// Renvoie : x = distance à l'arête de fracture, y = identifiant scalaire de la plaque
vec2 fracturesMinerales(vec2 p) {
  vec2 n = floor(p);
  vec2 f = fract(p);

  vec2 decalageMin = vec2(0.0);
  vec2 celluleMin = vec2(0.0);
  float distMin1 = 8.0;

  // Passe 1 : trouve le centre de plaque le plus proche
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 voisin = vec2(float(i), float(j));
      vec2 graine = hachage22(n + voisin);
      vec2 r = voisin + 0.15 + 0.70 * graine - f;
      float d = dot(r, r);
      if (d < distMin1) {
        distMin1 = d;
        decalageMin = r;
        celluleMin = n + voisin;
      }
    }
  }

  // Passe 2 : distance orthogonale à la médiatrice (arête droite entre deux blocs)
  float distArete = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 voisin = vec2(float(i), float(j));
      vec2 graine = hachage22(n + voisin);
      vec2 r = voisin + 0.15 + 0.70 * graine - f;
      vec2 diff = r - decalageMin;
      if (dot(diff, diff) > 0.0001) {
        float dMediatrice = dot(0.5 * (decalageMin + r), normalize(diff));
        distArete = min(distArete, dMediatrice);
      }
    }
  }

  return vec2(distArete, hachage21(celluleMin));
}

vec4 effetType(vec2 uv, float proportions, float temps, vec2 inclinaison,
               float progression, vec2 origine, vec3 teinte) {
  float modeEclat = estModeEclat(progression);
  if (uCalme > 0.5 && modeEclat > 0.5) {
    return eclatAccessible(uv, proportions, progression, origine, teinte);
  }

  float env = enveloppeEclat(progression);
  if (env <= 0.0001) return vec4(0.0);

  vec2 inc = inclinaisonAnimee(inclinaison);
  vec2 p = coordonneesIsotropes(uv, vec2(0.5), proportions);

  // Parallaxe minérale lourde
  vec2 pRoche = p * 4.6 + inc * 0.12;
  vec2 frac = fracturesMinerales(pRoche);
  float distArete = frac.x;
  float idBloc = frac.y;

  // Arête de fracture nette + chanfrein minéral
  float ligneFracture = smoothstep(0.055, 0.012, distArete);

  // Chaque bloc possède une orientation plane propre qui accroche la lumière sèchement
  vec2 penteBloc = vec2(cos(idBloc * DEUX_PI), sin(idBloc * DEUX_PI)) * 0.85;
  vec3 normaleBloc = normalize(vec3(penteBloc, 1.0));
  vec3 dirLumiere = normalize(vec3(inc * 1.55, 1.0));
  float refletBloc = pow(clamp(dot(normaleBloc, dirLumiere), 0.0, 1.0), 11.0);

  // Micro-inclusions de quartz scintillantes ancrées sur la pierre
  float quartz = 0.0;
  if (uQualite > 0.25) {
    vec2 gQuartz = floor(pRoche * 5.5);
    float aleaQ = hachage21(gQuartz);
    if (aleaQ > 0.86) {
      float alignQ = dot(normalize(vec3((hachage22(gQuartz) - 0.5) * 2.2, 1.0)), dirLumiere);
      quartz = pow(clamp(alignQ, 0.0, 1.0), 22.0) * smoothstep(0.45, 0.1, length(fract(pRoche * 5.5) - 0.5));
    }
  }

  float masque = 1.0;
  float ondeSismique = 0.0;
  if (modeEclat > 0.5) {
    float pEclat = clamp(progression, 0.0, 1.0);
    float dist = length(coordonneesIsotropes(uv, origine, proportions));
    float rayon = pEclat * 1.72;
    ondeSismique = exp(-pow((dist - rayon) * 12.0, 2.0)) * 1.35;
    float sillage = smoothstep(rayon + 0.10, max(0.0, rayon - 0.55), dist);
    masque = max(ondeSismique, sillage * 0.85);
  } else {
    masque = 0.38 + 0.62 * masqueCadreCarte(uv, 0.26);
  }

  float structure = clamp((ligneFracture * 0.72 + refletBloc * 0.85 + quartz * 0.9 + ondeSismique * 0.7) * masque, 0.0, 1.25);

  vec3 ocrePierre = teinte * 0.95;
  vec3 ambreQuartz = mix(teinte, vec3(1.0, 0.86, 0.56), 0.68);
  vec3 eclatBlanc = vec3(1.0, 0.97, 0.90);

  vec3 couleur = mix(ocrePierre, ambreQuartz, clamp(ligneFracture * 0.7 + refletBloc * 0.6, 0.0, 1.0));
  couleur = mix(couleur, eclatBlanc, clamp(quartz * 0.9 + pow(refletBloc, 2.0) * 0.5, 0.0, 1.0));

  float intensite = clamp(structure * 0.74 * env, 0.0, 1.0);
  return vec4(couleur * structure * 0.74 * env, intensite);
}
`;
