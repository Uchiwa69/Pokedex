// Variante « pyroclastique » : onde de choc, fissures de lave (cellules de Voronoï), plaques qui tombent une à une.
// Shader fourni par l'utilisateur (généré avec Gemini), repris tel quel : seule la ligne « precision » a été
// retirée, three.js l'ajoute déjà. Sortie en alpha prémultiplié : (0,0,0,0) = on voit la vraie page derrière.

export const SHADER_PYROCLASTIQUE = /* glsl */ `
// Uniforms imposés
uniform float uProgression;   // 0 -> 1, piloté par le défilement
uniform float uTemps;         // secondes, animation continue
uniform float uProportions;   // largeur / hauteur de l'écran
uniform sampler2D uImage;     // Dracaufeu, alpha droit (non prémultiplié)
uniform vec2 uCentre;         // centre de l'illustration
uniform float uTaille;        // côté de l'illustration
uniform vec3 uFond;           // couleur de fond de la page

// Uniforms ajoutés
uniform float uQualite;           // 0.5 sur mobile, 1.0 sur ordinateur
uniform float uIntensiteSecousse; // 0.015 conseillé

varying vec2 vUv;

vec2 hachage2(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

float bruit(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hachage2(i).x;
    float b = hachage2(i + vec2(1.0, 0.0)).x;
    float c = hachage2(i + vec2(0.0, 1.0)).x;
    float d = hachage2(i + vec2(1.0, 1.0)).x;
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p, int octavesMax) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
        if (i >= octavesMax) break;
        v += a * bruit(p);
        p = p * 2.05 + vec2(11.3, 27.9);
        a *= 0.5;
    }
    return v;
}

// Voronoi renvoyant : x = distance au bord de la cellule (fissure), y = identifiant aléatoire de la plaque
vec2 voronoiFissures(vec2 x) {
    vec2 n = floor(x);
    vec2 f = fract(x);

    vec2 mg, mr;
    float md = 8.0;
    float idCellule = 0.0;

    // Première passe : trouver le centre le plus proche
    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = hachage2(n + g);
            o = 0.5 + 0.42 * sin(uTemps * 0.4 + 6.2831 * o);
            vec2 r = g + o - f;
            float d = dot(r, r);
            if (d < md) {
                md = d;
                mr = r;
                mg = g;
                idCellule = hachage2(n + g).x;
            }
        }
    }

    // Seconde passe : distance exacte à la frontière entre cellules
    md = 8.0;
    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 g = mg + vec2(float(i), float(j));
            vec2 o = hachage2(n + g);
            o = 0.5 + 0.42 * sin(uTemps * 0.4 + 6.2831 * o);
            vec2 r = g + o - f;
            if (dot(mr - r, mr - r) > 0.0001) {
                md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
            }
        }
    }
    return vec2(md, idCellule);
}

void main() {
    int octaves = (uQualite < 0.75) ? 2 : 4;

    vec2 posEcran = (vUv - 0.5) * vec2(uProportions, 1.0);
    vec2 posGueule = uCentre + (vec2(0.40, 0.81) - 0.5) * uTaille;

    // 1. Onde de choc (shockwave) qui part de la gueule
    float rayonMax = length(vec2(uProportions * 0.5, 0.5) + abs(posGueule)) + 0.3;
    float progOnde = smoothstep(0.05, 0.65, uProgression);
    float rayonOnde = progOnde * rayonMax * 1.3;
    float distGueule = length(posEcran - posGueule);

    float anneauOnde = smoothstep(0.14, 0.0, abs(distGueule - rayonOnde)) * smoothstep(0.0, 0.08, uProgression) * smoothstep(0.85, 0.4, uProgression);
    vec2 dirRadiale = normalize(posEcran - posGueule + vec2(0.0001));
    vec2 distorsionOnde = dirRadiale * anneauOnde * 0.045;

    // Secousse brutale au passage de l'onde
    float secousseAmp = anneauOnde * uIntensiteSecousse * 1.6;
    vec2 secousse = (hachage2(vec2(floor(uTemps * 45.0), 1.0)) - 0.5) * secousseAmp;

    vec2 posEffet = posEcran + distorsionOnde + secousse;

    // 2. Rendu Dracaufeu + fond
    vec2 uvImage = (posEffet - uCentre) / uTaille + 0.5;
    float dansCadre = step(0.0, uvImage.x) * step(uvImage.x, 1.0)
                    * step(0.0, uvImage.y) * step(uvImage.y, 1.0);
    vec4 tex = texture2D(uImage, clamp(uvImage, 0.0, 1.0));
    float alphaSprite = tex.a * dansCadre;

    // Flash interne sur Dracaufeu
    float flashSprite = smoothstep(0.0, 0.2, uProgression) * smoothstep(0.6, 0.25, uProgression);
    vec3 colSprite = tex.rgb + vec3(1.0, 0.5, 0.1) * flashSprite * 0.5;
    vec3 colBase = mix(uFond, colSprite, alphaSprite);

    // 3. Fissuration pyroclastique (plaques de magma)
    vec2 warp = vec2(fbm(posEffet * 4.0, octaves), fbm(posEffet * 4.0 + 5.2, octaves)) - 0.5;
    vec2 vor = voronoiFissures(posEffet * 6.5 + warp * 0.55);
    float distFissure = vor.x;
    float idPlaque = vor.y;

    // Propagation des fissures depuis la gueule
    float frontFissure = smoothstep(0.12, 0.72, uProgression) * rayonMax * 1.25;
    float zoneFissuree = smoothstep(frontFissure + 0.1, frontFissure - 0.15, distGueule);

    // Lave brillante dans les craquelures
    float largeurFissure = mix(0.01, 0.14, zoneFissuree);
    float lave = smoothstep(largeurFissure, 0.0, distFissure) * zoneFissuree;
    vec3 couleurLave = mix(vec3(0.9, 0.15, 0.0), vec3(1.0, 0.88, 0.35), lave) * lave * 2.4;

    // Carbonisation progressive des plaques avant qu'elles ne disparaissent
    float seuilDisparition = smoothstep(0.38, 0.95, uProgression) * rayonMax * 1.3;
    float retardPlaque = idPlaque * 0.32 + warp.x * 0.15;
    float avancementPlaque = distGueule + retardPlaque - seuilDisparition;

    // 1.0 = plaque présente, 0.0 = plaque consumée
    float masquePlaque = smoothstep(-0.02, 0.03, avancementPlaque);
    masquePlaque = mix(1.0, masquePlaque, step(0.0001, uProgression));

    // Noircissement de la plaque juste avant sa désintégration
    float carbonisation = smoothstep(0.28, 0.0, avancementPlaque) * masquePlaque;
    colBase = mix(colBase, vec3(0.04, 0.03, 0.03), carbonisation * 0.92);

    // 4. Boule de plasma centrale lors de l'explosion
    float phasePlasma = smoothstep(0.02, 0.32, uProgression) * smoothstep(0.75, 0.38, uProgression);
    float rayonPlasma = mix(0.01, rayonMax * 0.85, pow(smoothstep(0.02, 0.55, uProgression), 1.4));
    float turbPlasma = fbm(posEffet * 5.0 - vec2(0.0, uTemps * 3.8), octaves);
    float coeurPlasma = smoothstep(rayonPlasma, 0.0, distGueule + (turbPlasma - 0.5) * 0.35) * phasePlasma;
    vec3 colPlasma = mix(vec3(1.0, 0.28, 0.02), vec3(1.0, 0.95, 0.75), coeurPlasma) * coeurPlasma * 2.2;

    // Reflet de l'onde de choc
    vec3 colOnde = vec3(1.0, 0.65, 0.25) * anneauOnde * 0.9;

    // 5. Sortie en alpha prémultiplié
    vec3 rgbFinal = colBase * masquePlaque;
    float alphaFinal = masquePlaque;

    vec3 emissif = (couleurLave * masquePlaque) + colPlasma + colOnde;
    float alphaEmissif = clamp(max(emissif.r, max(emissif.g, emissif.b)) * 0.5, 0.0, 1.0);

    rgbFinal += emissif;
    alphaFinal = clamp(alphaFinal + alphaEmissif * (1.0 - alphaFinal), 0.0, 1.0);

    float fin = 1.0 - smoothstep(0.95, 1.0, uProgression);
    gl_FragColor = vec4(rgbFinal * fin, alphaFinal * fin);
}
`;
