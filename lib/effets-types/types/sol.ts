// types/sol.ts
// Matière : strates sédimentaires ondulées et grains de mica dorés.
// Mouvement : dérive horizontale continue évoquant le vent sur les dunes et grès.
// Lumière : lueur chaude terre de Sienne, ocre doré et scintillement granulaire.

export const GLSL_SOL = /* glsl */ `
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

  // Strates sédimentaires horizontales animées d'une dérive éolienne régulière
  float ondulation = fbm(vec2(p.x * 2.4 - t * 0.28, p.y * 1.8), octaves) * 2.1;
  float altitude = (p.y + inc.y * 0.18) * 6.8 + ondulation + inc.x * 0.45;

  // Bandes stratifiées douces (aucune cassure anguleuse)
  float stratePrincipale = pow(0.5 + 0.5 * sin(altitude * PI), 2.4);
  float strateFine = 0.5 + 0.5 * cos(altitude * DEUX_PI * 2.0 + 0.8);
  float reliefStrates = mix(stratePrincipale, strateFine, 0.32);

  // Grains de mica en suspension dans le sable qui accrochent la lumière à l'inclinaison
  vec2 grilleMica = (p + vec2(-t * 0.18, 0.0) + inc * 0.14) * mix(18.0, 26.0, uQualite);
  vec2 idMica = floor(grilleMica);
  float aleaMica = hachage21(idMica);
  float mica = 0.0;
  if (aleaMica > 0.78) {
    vec2 normaleGrain = (hachage22(idMica) - 0.5) * 2.0;
    float align = dot(normalize(vec3(normaleGrain, 1.0)), normalize(vec3(inc * 1.4, 1.0)));
    float point = smoothstep(0.45, 0.08, length(fract(grilleMica) - 0.5));
    mica = pow(clamp(align, 0.0, 1.0), 10.0) * point * 1.1;
  }

  float masque = 1.0;
  float ondeTellurique = 0.0;
  if (modeEclat > 0.5) {
    float pEclat = clamp(progression, 0.0, 1.0);
    float dist = length(coordonneesIsotropes(uv, origine, proportions));
    float rayon = pEclat * 1.68;
    ondeTellurique = exp(-pow((dist - rayon) * 7.5, 2.0)) * 1.25;
    float voileSable = smoothstep(rayon + 0.16, max(0.0, rayon - 0.65), dist);
    masque = max(ondeTellurique, voileSable * 0.85);
  } else {
    float baseTellurique = smoothstep(0.85, 0.0, uv.y) * 0.45;
    masque = clamp(0.35 + masqueCadreCarte(uv, 0.25) * 0.55 + baseTellurique, 0.0, 1.15);
  }

  float lumiere = clamp((reliefStrates * 0.72 + mica * 0.85 + ondeTellurique * 0.6) * masque, 0.0, 1.2);

  vec3 terreSienne = teinte * 0.92;
  vec3 ocreDore = mix(teinte, vec3(0.98, 0.80, 0.42), 0.62);
  vec3 refletMica = vec3(1.0, 0.95, 0.78);

  vec3 couleur = mix(terreSienne, ocreDore, reliefStrates);
  couleur = mix(couleur, refletMica, clamp(mica * 0.85, 0.0, 0.9));

  float intensite = clamp(lumiere * 0.72 * env, 0.0, 1.0);
  return vec4(couleur * lumiere * 0.72 * env, intensite);
}
`;
