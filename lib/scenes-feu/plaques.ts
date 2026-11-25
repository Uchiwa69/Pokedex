// Version 2A « plaques » : souffle qui retombe, puis l'écran se fissure en plaques qui noircissent, tombent et s'effritent.
// Dracaufeu y est intégré à la scène : fond brumeux, contre-jour, ombre au sol, respiration, flamme de la queue.
// Shader fourni par l'utilisateur (généré avec Gemini), repris tel quel, à deux détails près : la ligne
// « precision » est retirée (three.js l'ajoute déjà) et la flamme de la queue est replacée en (0.87, 0.44). Sortie en alpha prémultiplié : (0,0,0,0) = on voit la vraie page derrière.

export const SHADER_PLAQUES = /* glsl */ `
// --- UNIFORMS IMPOSÉS ---
uniform float uProgression;   // 0 -> 1, piloté par le défilement
uniform float uTemps;         // secondes, animation continue des flammes et particules
uniform float uProportions;   // largeur / hauteur de l'écran
uniform sampler2D uImage;     // Dracaufeu, alpha droit (non prémultiplié)
uniform vec2 uCentre;         // centre de l'illustration (unité = hauteur d'écran, 0 = milieu)
uniform float uTaille;        // côté de l'illustration (même unité)
uniform vec3 uFond;           // couleur de fond sombre (#0F1115)

// --- UNIFORMS AJOUTÉS ---
uniform float uQualite;           // 0.5 sur téléphone, 1.0 sur ordinateur
uniform float uIntensiteSecousse; // 0.014 conseillé (tremblement de caméra au souffle)

varying vec2 vUv;

// ============================================================================
// 1. OUTILS MATHÉMATIQUES ET BRUITS PROCÉDURAUX
// ============================================================================

float hachage1(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hachage2(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

// Bruit de valeur lissé (interpolation cubique d'Hermite)
float bruit(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    float a = hachage1(i);
    float b = hachage1(i + vec2(1.0, 0.0));
    float c = hachage1(i + vec2(0.0, 1.0));
    float d = hachage1(i + vec2(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Mouvement brownien fractionnaire (FBM) limité à 5 octaves maximum
float fbm(vec2 p, int octavesMax) {
    float valeur = 0.0;
    float amplitude = 0.5;
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);

    for (int i = 0; i < 5; i++) {
        if (i >= octavesMax) break;
        valeur += amplitude * bruit(p);
        p = rot * p * 2.03 + vec2(17.1, 31.7);
        amplitude *= 0.5;
    }
    return valeur;
}

// Palette thermique maîtrisée (évite la saturation blanche excessive)
vec3 paletteFeu(float t) {
    t = clamp(t, 0.0, 1.0);
    vec3 c1 = vec3(0.38, 0.02, 0.00); // Rouge braise profond
    vec3 c2 = vec3(0.95, 0.24, 0.01); // Orange volcanique
    vec3 c3 = vec3(1.00, 0.68, 0.14); // Or incandescent
    vec3 c4 = vec3(1.00, 0.92, 0.68); // Jaune-blanc chaud (sans brûler l'image)

    vec3 col = mix(c1, c2, smoothstep(0.0, 0.38, t));
    col = mix(col, c3, smoothstep(0.38, 0.78, t));
    col = mix(col, c4, smoothstep(0.78, 1.0, t));
    return col;
}

// Diagramme de Voronoi :
// x = distance au bord de la fissure, y = identifiant unique de la plaque, z = décalage vertical
vec3 voronoiPlaques(vec2 x) {
    vec2 n = floor(x);
    vec2 f = fract(x);

    vec2 mg, mr;
    float md = 8.0;
    vec2 idCellule = vec2(0.0);

    // Passe 1 : recherche du centre de plaque le plus proche
    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = hachage2(n + g);
            // Légère oscillation organique des sommets
            vec2 pos = 0.5 + 0.38 * sin(6.2831 * o + 0.35);
            vec2 r = g + pos - f;
            float d = dot(r, r);
            if (d < md) {
                md = d;
                mr = r;
                mg = g;
                idCellule = o;
            }
        }
    }

    // Passe 2 : distance orthogonale exacte à la frontière entre deux plaques
    md = 8.0;
    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 g = mg + vec2(float(i), float(j));
            vec2 o = hachage2(n + g);
            vec2 pos = 0.5 + 0.38 * sin(6.2831 * o + 0.35);
            vec2 r = g + pos - f;
            if (dot(mr - r, mr - r) > 0.0001) {
                md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
            }
        }
    }
    return vec3(md, idCellule.x, idCellule.y);
}

// Particules de braises et cendres incandescentes qui s'envolent vers le haut
float particulesAscendantes(vec2 uv, float temps, float densite, float tailleMax) {
    vec2 grille = uv * densite;
    vec2 id = floor(grille);
    vec2 f = fract(grille) - 0.5;

    float rnd = hachage1(id);
    if (rnd > 0.34) return 0.0;

    // Tourbillon horizontal
    vec2 decalage = vec2(
        sin(temps * (1.8 + rnd * 2.5) + rnd * 25.0) * 0.32,
        cos(temps * 1.4 + rnd * 14.0) * 0.25
    );
    float dist = length(f - decalage);
    float rayon = mix(0.025, tailleMax, fract(rnd * 19.7));
    float scintillement = 0.5 + 0.5 * sin(temps * 10.0 + rnd * 40.0);

    return smoothstep(rayon, 0.0, dist) * scintillement;
}

// ============================================================================
// 2. RENDU DE LA SCÈNE (FOND TEXTURÉ + DRACAUFEU INTÉGRÉ)
// ============================================================================

vec3 rendreSceneBase(vec2 posEcran, vec2 posGueule, float temps, float progression, int octaves) {
    // A. Fond atmosphérique sombre (jamais plat) : vignette + brume chaude + sol braisé
    float distCentre = length(posEcran * vec2(0.75, 1.0));
    float vignette = smoothstep(1.35, 0.15, distCentre);
    float brumeFond = fbm(posEcran * 2.6 + vec2(temps * 0.08, -temps * 0.12), 3);

    vec3 couleurFond = uFond * (0.65 + 0.45 * vignette);
    couleurFond += vec3(0.07, 0.025, 0.008) * brumeFond * vignette;

    // Halo de contre-jour derrière Dracaufeu pour le détacher du fond
    float distDracaufeu = length(posEcran - uCentre);
    float contreJour = smoothstep(uTaille * 0.95, uTaille * 0.12, distDracaufeu);
    couleurFond += vec3(0.24, 0.07, 0.015) * contreJour * (0.75 + 0.25 * sin(temps * 2.2));

    // Ombre portée au sol sous Dracaufeu
    vec2 posSol = (posEcran - (uCentre + vec2(0.02, -uTaille * 0.44))) / vec2(uTaille * 0.42, uTaille * 0.07);
    float ombreSol = smoothstep(1.0, 0.1, length(posSol));
    couleurFond *= (1.0 - ombreSol * 0.65);

    // B. Respiration lente et distorsion thermique locale sur Dracaufeu
    float respiration = sin(temps * 2.1) * 0.0045 * (1.0 - smoothstep(0.15, 0.45, progression));
    vec2 centreAnime = uCentre + vec2(0.0, respiration);
    // Légère dilatation du torse lors de l'inspiration avant le souffle
    float inspiration = sin(clamp(progression / 0.22, 0.0, 1.0) * 3.14159265) * 0.035;
    float tailleAnimee = uTaille * (1.0 + inspiration);

    // Onde de chaleur devant la gueule
    float distGueule = length(posEcran - posGueule);
    float chaleur = smoothstep(0.45, 0.0, distGueule) * smoothstep(0.0, 0.15, progression) * smoothstep(0.65, 0.30, progression);
    vec2 distorsionChaleur = vec2(
        bruit(posEcran * 12.0 - vec2(0.0, temps * 4.0)) - 0.5,
        bruit(posEcran * 12.0 + 3.1 - vec2(0.0, temps * 4.0)) - 0.5
    ) * 0.018 * chaleur;

    vec2 uvImage = (posEcran + distorsionChaleur - centreAnime) / tailleAnimee + 0.5;
    float dansCadre = step(0.0, uvImage.x) * step(uvImage.x, 1.0)
                    * step(0.0, uvImage.y) * step(uvImage.y, 1.0);

    vec4 tex = texture2D(uImage, clamp(uvImage, 0.0, 1.0));
    float alphaSprite = tex.a * dansCadre;

    // C. Éclairage dynamique sur Dracaufeu (gueule qui charge + rim-light du souffle)
    float phaseCharge = smoothstep(0.0, 0.14, progression) * smoothstep(0.48, 0.18, progression);
    float lueurGueule = smoothstep(tailleAnimee * 0.35, 0.0, distGueule) * phaseCharge;

    // Éclairage de bord (rim-light) orangé sur tout le corps pendant le jet de flammes
    float phaseSouffle = smoothstep(0.08, 0.25, progression) * smoothstep(0.55, 0.32, progression);
    float proximiteFeu = smoothstep(tailleAnimee * 0.9, 0.05, distGueule);
    vec3 eclairageFeu = vec3(1.0, 0.38, 0.06) * (lueurGueule * 1.1 + proximiteFeu * phaseSouffle * 0.75);

    vec3 couleurSprite = tex.rgb * (0.92 + 0.12 * contreJour) + eclairageFeu * alphaSprite;
    vec3 scene = mix(couleurFond, couleurSprite, alphaSprite);

    // D. Flamme de la queue animée en continu (position (0.87, 0.42) haut-gauche => (0.87, 0.44) UV WebGL, corrigé)
    vec2 posQueue = centreAnime + (vec2(0.87, 0.44) - 0.5) * tailleAnimee;
    vec2 deltaQueue = (posEcran - posQueue) / tailleAnimee;
    // Étirement vertical de la flammèche
    vec2 uvFlammeQueue = vec2(deltaQueue.x * 1.6, (deltaQueue.y - 0.02) * 0.85);
    float turbQueue = fbm(posEcran * 14.0 - vec2(0.0, temps * 5.5), 3);
    float dQueue = length(uvFlammeQueue) + (turbQueue - 0.5) * 0.075;
    float intensiteQueue = smoothstep(0.11, 0.015, dQueue) * (0.85 + 0.35 * sin(temps * 9.0));
    vec3 flammeQueue = paletteFeu(intensiteQueue * 1.1) * intensiteQueue * 1.55;
    // Halo autour de la queue
    float haloQueue = smoothstep(0.26, 0.0, length(deltaQueue)) * 0.32;
    scene += flammeQueue + vec3(1.0, 0.35, 0.05) * haloQueue;

    // E. Particules d'ambiance permanentes (braises lentes en arrière-plan)
    float ambianceBraises = particulesAscendantes(posEcran + vec2(0.0, -temps * 0.14), temps * 0.7, 9.0, 0.055);
    scene += vec3(1.0, 0.42, 0.08) * ambianceBraises * 0.65;

    return scene;
}

// ============================================================================
// 3. PROGRAMME PRINCIPAL
// ============================================================================

void main() {
    int octaves = (uQualite < 0.75) ? 3 : 5;

    // Coordonnées normalisées par la hauteur de l'écran (0,0 au centre)
    vec2 posEcran = (vUv - 0.5) * vec2(uProportions, 1.0);
    // Gueule de Dracaufeu : (0.40, 0.19) depuis haut-gauche => (0.40, 0.81) en UV WebGL
    vec2 posGueule = uCentre + (vec2(0.40, 0.81) - 0.5) * uTaille;

    // Secousse de caméra concentrée sur le jet de flammes (0.10 -> 0.42)
    float envSecousse = sin(clamp((uProgression - 0.10) / 0.34, 0.0, 1.0) * 3.14159265);
    envSecousse *= envSecousse;
    vec2 secousse = vec2(
        bruit(vec2(uTemps * 32.0, 1.7)) - 0.5,
        bruit(vec2(2.3, uTemps * 32.0)) - 0.5
    ) * uIntensiteSecousse * envSecousse * step(0.001, uProgression);

    vec2 pos = posEcran + secousse;
    float distGueule = length(pos - posGueule);
    float rayonMaxEcran = length(vec2(uProportions * 0.5, 0.5) + abs(posGueule)) + 0.35;

    // ------------------------------------------------------------------------
    // ÉTAPE A : DÉSINTÉGRATION EN PLAQUES CARBONISÉES QUI CHUTENT (0.36 -> 0.92)
    // ------------------------------------------------------------------------
    // Déformation organique de la grille de fissures
    vec2 warp = vec2(
        fbm(pos * 4.5 + vec2(0.0, -uTemps * 0.15), 3),
        fbm(pos * 4.5 + vec2(5.2, -uTemps * 0.15), 3)
    ) - 0.5;

    // Grille de plaques Voronoi (plus serrée sur mobile pour rester lisible)
    float echellePlaques = (uProportions < 0.75) ? 5.2 : 6.4;
    vec3 vor = voronoiPlaques(pos * echellePlaques + warp * 0.42);
    float distFissure = vor.x;
    float idPlaque = vor.y;
    float aleaChute = vor.z;

    // Onde d'avancement de la désintégration depuis la gueule vers les bords
    float progDesintegration = smoothstep(0.36, 0.91, uProgression);
    // Chaque plaque a un léger retard aléatoire pour tomber une à une
    float retardPlaque = idPlaque * 0.36 + warp.x * 0.14;
    float seuilOnde = progDesintegration * (rayonMaxEcran * 1.25 + 0.38) - 0.15;
    float etatPlaque = seuilOnde - (distGueule + retardPlaque);
    // etatPlaque < 0 : intact | 0..0.18 : fissure & carbonise | > 0.18 : détachée et chute

    // Gravité : une fois détachée (etatPlaque > 0.16), la plaque glisse vers le bas
    float facteurChute = max(0.0, etatPlaque - 0.16);
    float chuteY = facteurChute * facteurChute * (1.35 + aleaChute * 0.85);
    float deriveX = sin(idPlaque * 18.0 + facteurChute * 5.0) * facteurChute * 0.08;
    vec2 posPlaque = pos + vec2(deriveX, chuteY);

    // Calcul du rendu de la scène (échantillonné avec le décalage de chute de la plaque !)
    vec3 couleurScene = rendreSceneBase(posPlaque, posGueule, uTemps, uProgression, octaves);

    // Fissures incandescentes qui s'ouvrent AVANT que la plaque ne tombe
    float ouvertureFissure = smoothstep(-0.08, 0.18, etatPlaque);
    float largeurFissure = mix(0.0, 0.13, ouvertureFissure);
    float masqueFissure = smoothstep(largeurFissure, 0.0, distFissure) * smoothstep(-0.10, 0.02, etatPlaque);

    // Effritement des bords de la plaque en cendres pendant la chute
    float bruitEffritement = fbm(posPlaque * 18.0 + vec2(0.0, -uTemps * 0.8), 3);
    float bordConsumable = distFissure - facteurChute * 0.55 - (bruitEffritement - 0.5) * 0.18;

    // Masque de visibilité de la plaque (1 = visible, 0 = désintégrée -> page HTML visible derrière)
    float masquePlaque = smoothstep(0.01, 0.045, bordConsumable);
    // Avant le début de la désintégration, tout l'écran est 100% opaque
    masquePlaque = mix(1.0, masquePlaque, smoothstep(0.34, 0.38, uProgression));
    masquePlaque = mix(1.0, masquePlaque, step(0.0001, uProgression));

    // Carbonisation progressive de la plaque (noircissement comme du papier/écorce brûlée)
    float tauxCharbon = smoothstep(-0.04, 0.22, etatPlaque);
    vec3 couleurCharbon = vec3(0.045, 0.038, 0.035);
    couleurScene = mix(couleurScene, couleurCharbon, tauxCharbon * 0.92);

    // Liseré incandescent très lisible sur la tranche de chaque plaque qui s'effrite
    float liseretPlaque = smoothstep(0.055, 0.0, abs(bordConsumable - 0.025))
                        * smoothstep(0.35, 0.42, uProgression)
                        * smoothstep(0.98, 0.88, uProgression);
    float scintillementBord = 0.65 + 0.55 * bruit(posPlaque * 36.0 + uTemps * 5.0);
    vec3 lumiereFissures = paletteFeu(clamp(masqueFissure * 0.85 + liseretPlaque * scintillementBord, 0.0, 1.0))
                         * (masqueFissure * 1.55 + liseretPlaque * 2.1);

    // ------------------------------------------------------------------------
    // ÉTAPE B : SOUFFLE DE FLAMMES (0.08 -> 0.46) — RETOMBE AVANT LA CHUTE !
    // ------------------------------------------------------------------------
    // Le jet monte vite (0.08 -> 0.24) et retombe complètement avant 0.46 pour laisser voir la désintégration
    float phaseJet = smoothstep(0.07, 0.22, uProgression) * smoothstep(0.47, 0.31, uProgression);
    vec2 cibleJet = mix(posGueule, vec2(-0.05, -0.02), smoothstep(0.08, 0.36, uProgression));
    float rayonJet = mix(0.02, max(uProportions, 1.0) * 0.72, pow(smoothstep(0.07, 0.35, uProgression), 1.25));

    vec2 uvJet = (pos - cibleJet) / max(rayonJet, 0.001);
    float distJet = length(uvJet);

    vec2 pTurb = pos * 4.6 - vec2(0.0, uTemps * 3.8);
    float turb1 = fbm(pTurb, octaves);
    float turb2 = fbm(pTurb * 2.1 + turb1 * 1.5 - vec2(0.0, uTemps * 2.2), octaves);

    float formeFlamme = (1.0 - distJet) + (turb2 - 0.50) * 0.68;
    float intensiteFlamme = smoothstep(0.08, 0.88, formeFlamme) * phaseJet;
    // Courbe tonale douce : pas de saturation blanche aveuglante
    vec3 couleurFlamme = paletteFeu(intensiteFlamme * 0.92) * intensiteFlamme * 1.45;

    // ------------------------------------------------------------------------
    // ÉTAPE C : FUMÉE LÉGÈRE ET NUÉE DE BRAISES / CENDRES MONTANTES
    // ------------------------------------------------------------------------
    float phaseFumee = smoothstep(0.24, 0.45, uProgression) * smoothstep(0.95, 0.70, uProgression);
    float bruitFumee = fbm(pos * 3.4 - vec2(0.0, uTemps * 1.2), octaves);
    float masqueFumee = smoothstep(0.48, 0.90, bruitFumee) * phaseFumee;
    vec3 couleurFumee = mix(vec3(0.11, 0.10, 0.10), vec3(0.38, 0.14, 0.03), intensiteFlamme + liseretPlaque * 0.5);
    float alphaFumee = masqueFumee * 0.36;

    // Nuée de braises et cendres incandescentes qui s'envolent pendant la désintégration
    float phaseBraises = smoothstep(0.28, 0.46, uProgression) * smoothstep(1.0, 0.84, uProgression);
    float braises = particulesAscendantes(pos + vec2(0.0, -uTemps * 0.48), uTemps, 15.0, 0.085);
    if (uQualite >= 0.75) {
        braises += particulesAscendantes(pos * 1.35 + vec2(3.1, -uTemps * 0.72), uTemps * 1.25, 24.0, 0.065) * 0.75;
    }
    vec3 couleurBraises = vec3(1.0, 0.48, 0.09) * braises * phaseBraises * 2.1;

    // ------------------------------------------------------------------------
    // ÉTAPE D : COMPOSITION FINALE EN ALPHA PRÉMULTIPLIÉ
    // ------------------------------------------------------------------------
    // 1. Plaques de la scène (opaques tant que masquePlaque = 1, transparentes une fois tombées)
    vec3 rgbFinal = couleurScene * masquePlaque;
    float alphaFinal = masquePlaque;

    // 2. Fumée semi-transparente
    rgbFinal = rgbFinal * (1.0 - alphaFumee) + couleurFumee * alphaFumee;
    alphaFinal = alphaFinal + alphaFumee * (1.0 - alphaFinal);

    // 3. Lumières additives (flammes, fissures incandescentes, braises)
    // En alpha prémultiplié sur fond sombre, on ajoute le RGB et une contribution alpha légère
    // pour que les braises restent visibles même au-dessus des trous transparents
    vec3 emissif = couleurFlamme + lumiereFissures + couleurBraises;
    float alphaEmissif = clamp(max(emissif.r, max(emissif.g, emissif.b)) * 0.48, 0.0, 1.0);

    rgbFinal += emissif;
    alphaFinal = clamp(alphaFinal + alphaEmissif * (1.0 - alphaFinal), 0.0, 1.0);

    // Extinction garantie à vec4(0.0) en fin de course
    float fin = 1.0 - smoothstep(0.95, 1.0, uProgression);
    gl_FragColor = vec4(rgbFinal * fin, alphaFinal * fin);
}
`;
