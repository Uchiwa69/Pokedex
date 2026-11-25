// Variante « ultra-légère » : aucun bruit en boucle, seulement des sinus ; un anneau de feu ouvre l'écran.
// Shader fourni par l'utilisateur (généré avec Gemini), repris tel quel : seule la ligne « precision » a été
// retirée, three.js l'ajoute déjà. Sortie en alpha prémultiplié : (0,0,0,0) = on voit la vraie page derrière.

export const SHADER_LEGER = /* glsl */ `
// Uniforms imposés
uniform float uProgression;   // 0 -> 1, piloté par le défilement
uniform float uTemps;         // secondes, animation continue
uniform float uProportions;   // largeur / hauteur de l'écran
uniform sampler2D uImage;     // Dracaufeu, alpha droit (non prémultiplié)
uniform vec2 uCentre;         // centre de l'illustration
uniform float uTaille;        // côté de l'illustration
uniform vec3 uFond;           // couleur de fond de la page

// Uniforms ajoutés
uniform float uQualite;       // 0.5 sur mobile, 1.0 sur ordinateur

varying vec2 vUv;

// Turbulence analytique ultra-rapide (sans boucle ni interpolation de grille)
float turbulenceRapide(vec2 p, float temps) {
    float n1 = sin(p.x * 4.5 + temps * 3.2) * cos(p.y * 4.5 - temps * 2.7);
    float n2 = sin((p.x * 9.2 - p.y * 7.8) - temps * 4.5) * 0.5;
    float n3 = (uQualite >= 0.75) ? cos((p.x * 16.0 + p.y * 14.0) + temps * 6.0) * 0.25 : 0.0;
    return (n1 + n2 + n3) * 0.57;
}

void main() {
    vec2 posEcran = (vUv - 0.5) * vec2(uProportions, 1.0);
    vec2 posGueule = uCentre + (vec2(0.40, 0.81) - 0.5) * uTaille;

    vec2 delta = posEcran - posGueule;
    float dist = length(delta);
    float angle = atan(delta.y, delta.x);

    // 1. Légère réfraction radiale pendant le souffle
    float turb = turbulenceRapide(posEcran * 1.4, uTemps);
    float phaseSouffle = smoothstep(0.0, 0.35, uProgression) * smoothstep(0.85, 0.35, uProgression);
    vec2 posDeformee = posEcran + normalize(delta + vec2(0.0001)) * turb * 0.018 * phaseSouffle;

    // 2. Rendu du fond et de Dracaufeu
    vec2 uvImage = (posDeformee - uCentre) / uTaille + 0.5;
    float dansCadre = step(0.0, uvImage.x) * step(uvImage.x, 1.0)
                    * step(0.0, uvImage.y) * step(uvImage.y, 1.0);
    vec4 tex = texture2D(uImage, clamp(uvImage, 0.0, 1.0));
    float alphaSprite = tex.a * dansCadre;

    // Halo chaud sur Dracaufeu
    float halo = smoothstep(uTaille * 0.8, 0.0, dist) * phaseSouffle * 0.5;
    vec3 colSprite = tex.rgb + vec3(1.0, 0.45, 0.1) * halo;
    vec3 colBase = mix(uFond, colSprite, alphaSprite);

    // 3. Front de combustion ondulant
    float rayonMax = length(vec2(uProportions * 0.5, 0.5) + abs(posGueule)) + 0.25;
    float progOuverture = smoothstep(0.25, 0.96, uProgression);

    // Ondulation angulaire + turbulence rapide pour découper le bord
    float ondulation = sin(angle * 5.0 + uTemps * 2.5) * 0.04 + turb * 0.14;
    float rayonFront = progOuverture * rayonMax * 1.15 - 0.08;
    float distanceFront = (dist + ondulation) - rayonFront;

    // 1.0 = écran intact, 0.0 = trou transparent
    float masque = smoothstep(-0.012, 0.012, distanceFront);
    masque = mix(1.0, masque, step(0.0001, uProgression));

    // Bord noirci fin
    float suie = smoothstep(0.055, 0.0, distanceFront) * masque;
    colBase = mix(colBase, vec3(0.06, 0.05, 0.05), suie * 0.85);

    // 4. Boule de feu + anneau incandescent
    float rayonBoule = mix(0.02, rayonMax * 0.75, pow(smoothstep(0.02, 0.55, uProgression), 1.3));
    float bouleFeu = smoothstep(rayonBoule, 0.0, dist + turb * 0.18) * phaseSouffle;

    float anneauBord = smoothstep(0.045, 0.0, abs(distanceFront)) * smoothstep(0.0, 0.06, progOuverture);
    float intensiteFeu = clamp(bouleFeu + anneauBord * 1.2, 0.0, 1.5);

    vec3 colFeu = mix(vec3(1.0, 0.25, 0.02), vec3(1.0, 0.9, 0.45), clamp(intensiteFeu, 0.0, 1.0)) * intensiteFeu * 1.6;

    // 5. Sortie en alpha prémultiplié
    vec3 rgbFinal = colBase * masque + colFeu;
    float alphaEmissif = clamp(max(colFeu.r, max(colFeu.g, colFeu.b)) * 0.5, 0.0, 1.0);
    float alphaFinal = clamp(masque + alphaEmissif * (1.0 - masque), 0.0, 1.0);

    float fin = 1.0 - smoothstep(0.96, 1.0, uProgression);
    gl_FragColor = vec4(rgbFinal * fin, alphaFinal * fin);
}
`;
