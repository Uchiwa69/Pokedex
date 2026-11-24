// types/glace.ts
// Matière : cristaux de givre hexagonaux et facettes prismatiques anguleuses.
// Mouvement : cristallisation progressive depuis les bords, géométrie figée et nette.
// Lumière : éclats spéculaires directionnels secs selon l'angle d'inclinaison.

export const GLSL_GLACE = /* glsl */ `
vec4 pavageHexagonal(vec2 p) {
  vec2 r = vec2(1.0, 1.7320508);
  vec2 h = r * 0.5;
  vec2 a = mod(p, r) - h;
  vec2 b = mod(p - h, r) - h;
  vec2 gv = dot(a, a) < dot(b, b) ? a : b;
  vec2 id = p - gv;
  return vec4(gv, id);
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

  vec2 p = coordonneesIsotropes(uv, vec2(0.5), proportions);
  vec4 hex = pavageHexagonal(p * 8.5);
  vec2 local = hex.xy;
  vec2 idCellule = hex.zw;

  float distBordHex = abs(distanceHexagone(local, 0.48));
  float areteCristal = smoothstep(0.045, 0.008, distBordHex);

  vec2 normaleFacette = (hachage22(idCellule) - 0.5) * 1.8;
  float alignement = dot(normalize(vec3(normaleFacette, 1.0)), normalize(vec3(inc * 1.4, 1.0)));
  float eclatFacette = pow(clamp(alignement, 0.0, 1.0), 14.0);

  float bruitGivre = bruitValeur(p * 5.0 + idCellule * 0.15);
  float masqueGivre = 0.0;
  if (modeEclat > 0.5) {
    float pEclat = clamp(progression, 0.0, 1.0);
    float distOrigine = length(coordonneesIsotropes(uv, origine, proportions));
    float rayonGel = pEclat * 1.75;
    float frontGel = smoothstep(rayonGel + 0.08, rayonGel - 0.12, distOrigine + (bruitGivre - 0.5) * 0.22);
    float liseretFront = exp(-pow((distOrigine - rayonGel) * 9.0, 2.0));
    masqueGivre = clamp(frontGel * 0.85 + liseretFront, 0.0, 1.2);
    eclatFacette = max(eclatFacette, liseretFront * (0.4 + 0.6 * hachage21(idCellule)));
  } else {
    float respiration = 0.04 * sin(t * 0.9);
    float bord = masqueCadreCarte(uv, 0.30 + respiration);
    masqueGivre = smoothstep(0.18, 0.72, bord + bruitGivre * 0.35);
  }

  float structure = (areteCristal * 0.72 + eclatFacette * 0.95) * masqueGivre;
  structure = clamp(structure, 0.0, 1.25);

  vec3 bleuGlacier = mix(teinte, vec3(0.55, 0.88, 1.0), 0.55);
  vec3 blancCristal = vec3(0.94, 0.99, 1.0);

  vec3 couleur = mix(bleuGlacier, blancCristal, clamp(eclatFacette * 0.85 + areteCristal * 0.5, 0.0, 1.0));
  float intensite = clamp(structure * 0.76 * env, 0.0, 1.0);

  return vec4(couleur * structure * 0.76 * env, intensite);
}
`;
