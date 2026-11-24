@AGENTS.md

# Pokédex — projet de fin de cours (Next.js)

Projet noté sur 20, suivi d'une évaluation sans le cours : l'étudiant doit comprendre tout le code.
Code simple, lisible, commenté en français quand une notion du cours est appliquée.

## Façon de travailler
- Travail phase par phase (0 à 11). À la fin de chaque phase : `npm run lint` et `npm run build` sans erreur,
  explication en 5 à 8 lignes en français (ce qui a été fait + QUELLE NOTION du cours), liste de ce qu'il faut
  tester dans le navigateur, commit Git clair, puis ARRÊT jusqu'à « Phase suivante ».
- Git : `main` est protégée. Tout développement se fait sur une branche dédiée ; aucun commit, push ni merge
  sur `main` sans accord explicite de l'utilisateur (un push sur `main` redéploie le site Vercel).
- Décision de design ouverte : proposer 2 options courtes et attendre le choix.
- Code et noms en français, comme dans le cours (CartePokemon, recupererPokemon, useSacoche…).
- Le dossier s'appelle « Pokédex » (accent + majuscule) : le nom npm du paquet est `pokedex`.

## Stack (imposée par le cours, ne pas changer)
- Next.js 16, App Router, TypeScript, sans dossier src/, alias @/*.
- next.config.ts : `cacheComponents: true` et `partialPrefetching: true` (ne JAMAIS les retirer),
  `raw.githubusercontent.com` autorisé dans images.remotePatterns.
- Tailwind CSS 4 : configuration dans app/globals.css avec @theme (pas de tailwind.config.js).
- Zustand pour les favoris et la sacoche : persist + skipHydration: true, réhydratés dans un composant client
  HydratationStores (useEffect → useFavoris.persist.rehydrate() et useSacoche.persist.rehydrate()), monté dans le layout.
- Données : PokéAPI https://pokeapi.co/api/v2 (lecture seule, sans clé).
- Ajout autorisé pour l'UX : la bibliothèque motion (import depuis "motion/react"), seulement dans des composants client.
- Tests : vitest, uniquement pour les fonctions pures de lib/combat.ts.
- Thème : SOMBRE UNIQUEMENT (choix de l'utilisateur, novembre 2026) — next-themes avec forcedTheme="dark", plus de
  bouton de thème. Les jetons clairs de globals.css ne servent plus. ThemeProvider dans un
  petit composant client Fournisseurs monté dans le layout, avec suppressHydrationWarning sur <html>. Tailwind 4 :
  `@custom-variant dark (&:where(.dark, .dark *));` dans globals.css.

## Conventions
```
app/
  layout.tsx (lang="fr", next/font, EnTete, PiedDePage, HydratationStores, contenu dans mx-auto max-w-7xl px-4 py-6 : 1280 px au plus, élargi
  depuis max-w-6xl à la demande de l'utilisateur ; grille en 2 / md:4 / xl:5 colonnes, 20 Pokémon par page pour que la
  dernière rangée soit toujours complète ; ne pas utiliser de seuil en pixels du type min-[1480px]: avec sm/md/lg,
  Tailwind le range avant eux et il est écrasé)
  page.tsx (liste) · loading.tsx · error.tsx (client, bouton Réessayer) · not-found.tsx
  pokemon/[nom]/page.tsx (fiche) · favoris/ · sacoche/ · combat/ · a-propos/
  api/aleatoire/route.ts (await connection(), Pokémon au hasard)
components/ CartePokemon, BadgeType, BarreRecherche, FiltreTypes, Pagination, SqueletteGrille, BarreStat,
            ChaineEvolution, BoutonFavori, BoutonSacoche, IndicateurSacoche, SpriteAnime, ListeAttaques,
            SocleEquipe, ArenaCombat, EffetAttaque…
lib/  types.ts (table TYPES : 18 types, clé anglaise, libellé FR, classes Tailwind complètes)
      conversion.ts (réponse brute → nos types, unités : taille en m, poids en kg)
      pokeapi.ts (fonctions serveur avec "use cache" + cacheLife("days") : recupererPokemon(nom) → Pokemon | null,
                  recupererListe, recupererTousLesNoms, recupererEspece, recupererEvolutions, recupererAttaque, recupererTypes)
      pokeapi-client.ts (version navigateur pour la page Favoris)
      combat.ts (fonctions pures : efficacité, dégâts, ordre des tours)
stores/ favoris.ts · sacoche.ts
hooks/  usePokemons · useRappelTemporise · useRaccourci · useTypesCouverts · useCri
```
Règles :
- Composants serveur par défaut. "use client" seulement pour de petites feuilles interactives, le plus bas possible.
- Les données restent en anglais (fire) et ne sont traduites qu'à l'affichage via TYPES.
- Jamais de classe Tailwind dynamique (`bg-type-${t}`) : table de correspondance, ou variable CSS --teinte.
- Toute donnée non mise en cache, ainsi que params et searchParams, est lue dans un composant sous <Suspense>.
  Idem pour usePathname dans le layout (routes dynamiques) : le composant Navigation est sous <Suspense>.
- null → notFound() ; une panne de l'API → une erreur levée, captée par error.tsx.
- Recherche, type et page vivent dans l'adresse (?q=&type=&page=), validés côté serveur.
- Les sélecteurs Zustand renvoient une seule valeur, jamais un objet créé à la volée.
- Bouton favori sorti du <Link> de la carte (positionné en absolute).
- Couleurs : toujours les jetons sémantiques de @theme (bg-fond, bg-surface, border-bordure, text-texte,
  text-texte-doux, bg-piste, accent…), jamais de couleur en dur dans les composants.

## Direction artistique (phase 6 — direction B « Verre holographique » choisie et appliquée)
- Jetons dans app/globals.css (@theme static + bloc .dark) : fond, surface (verre translucide), bordure, bordure-verre,
  texte, texte-doux, piste, accent (bleu-violet), accent-bis, sur-accent, danger, shadow-carte, shadow-lueur.
- Fond du site : UNI (choix de l'utilisateur) — pas de grille ni de lueurs derrière le contenu.
- Utilitaires maison (@utility) à réutiliser partout : `verre` (panneau : bordure, fond, ombre, arrondi 1.5rem),
  `etiquette` (petites capitales espacées pour les libellés secondaires : N°, TAILLE, VITESSE…),
  `bouton` + `bouton-principal` / `bouton-secondaire` (gélules de 44 px).
- Arrondis : panneaux = `verre` (rounded-3xl), contrôles = rounded-full. Tailles de texte : 3xl (h1), xl (h2), sm (texte), etiquette.
- `styleTeinte(type)` (lib/teinte.ts) pose --teinte ; cartes : dégradé, halo diffus, halo net au sol, lueur de survol.
- Cartes de même hauteur : `auto-rows-fr`, nom en `truncate`, badges `petit` sur une seule ligne.
- En-tête de page : `<header>` avec une `etiquette` au-dessus du h1.
- Un seul thème, le sombre : nuit bleu très sombre, verre fumé, lueurs de la teinte du type.
- Inspiration écran de Pokédex rétro-futuriste, sans logo officiel.
- Polices next/font : Chakra Petch pour les titres, Inter pour le texte.
- Une variable --teinte par carte (couleur du type principal) pour le dégradé, le halo derrière l'artwork et la lueur
  au survol. Numéro en filigrane géant.
- Espacements 2/4/6/8, deux ou trois tailles de texte, mêmes arrondis et mêmes ombres partout.
- Badges de type contrastés (texte foncé sur les types clairs, blanc sur poison, spectre et dragon).

## Animations
- Animer uniquement transform et opacity.
- Interface : moins de 400 ms, ressorts doux. Effets d'attaque : 0,8 à 1,5 s, uniquement dans l'arène.
- prefers-reduced-motion respecté partout (motion-reduce: en Tailwind, useReducedMotion() avec motion) :
  pas de lévitation, de particules ni de tremblement, juste des fondus.
- Aucun son automatique.

## Définition de « terminé » (à vérifier à chaque phase)
- npm run lint et npm run build passent, sans erreur d'hydratation dans la console.
- Rendu correct à 375 px (contraste du texte au moins 4,5:1) et avec les animations réduites.
- Tout fonctionne au clavier avec un focus visible ; alt sur chaque image ; un seul h1 par page ; les actions sont
  des <button>, les navigations des liens.

## Avancement des phases
0 Création · 1 Coque + thème · 2 Données + grille · 3 Fiche · 4 Recherche/filtre/pagination · 5 Favoris + sacoche
(puis déploiement Vercel) · 6 Direction artistique · 7 Animations · 8 Vue Équipe · 9 Attaques · 10 Combat · 11 Finitions.
Voir `git log` pour savoir quelle phase est terminée. Les 11 phases sont faites ; la suite = retouches à la demande.

## Ajouts après les phases (retouches)
- Fiche : `VitrineFiche` remplace l'illustration par `Carte3D` (three.js, importé dans un useEffect, démarré une fois
  la page chargée et le navigateur inoccupé). L'illustration reste l'affichage d'attente et le repli sans WebGL.
  `lib/carte3d.ts` dessine les deux faces dans des canvas 2D. `PanneauCarte3D` (carte au clic) est conservé, inutilisé.
- Carte 3D : effet holographique PAR TYPE (`lib/effets-types/` : `commun.ts` = outils GLSL, `types/` = une fonction
  `effetType` par type, `index.ts` = table, zones calmes, assemblage). C'est une couche additive À PART, entre la face
  et le reflet : le reflet d'origine de `Carte3D` ne doit pas être modifié (à `uForce` = 0, carte d'origine).
  Shaders fournis par l'utilisateur (générés avec Gemini), corrigés ici : eau (voile uniforme), acier (moiré, `fwidth`).
  Filtres de l'accueil : le mode « éclat » des mêmes fonctions joue le FOND de l'effet (`lib/effets-types/eclat.ts` :
  un seul canvas WebGL plein écran réutilisé, shader préparé au survol/focus de la tuile par `preparerEclat`).
  `EffetType` garde les symboles CSS par-dessus (choix de l'utilisateur : shader + symboles) ; son voile, ses fonds et
  ses ondes CSS restent le repli (moteur pas prêt, pas de WebGL) et le voile seul en animations réduites.
- Accueil : introduction `IntroPokedex` (client, `components/`) autour de toute la page. Un Pokédex géant EN 3D
  (three.js, chargé à la demande : `lib/labo/pokedex3d.ts` = modèle repris d'un fichier fourni, `@ts-nocheck`, exclu
  d'ESLint ; `lib/labo/scene-pokedex.ts` = lumières et reflets validés par l'utilisateur) s'ouvre au défilement, puis
  on plonge dans son écran, où s'affiche LA VRAIE PAGE, réduite et découpée au format de l'écran. Pas de boucle
  d'animation : une image est dessinée à chaque changement de défilement, et l'écran est retrouvé en projetant ses
  coins par la caméra (`calerPage`). Pas d'image d'attente : scène vide sous le projecteur, puis fondu. En-tête masqué au début (`data-intro-debut` + `body:has()` dans globals.css), lumière de scène (`halo-scene`, dégradés radiaux seulement : un cône laissait des bandes).
  Pendant l'introduction la page est en `position: fixed` (elle ne défile pas : sa place ne vient que des
  transformations, sinon elle tremblait dans le cadre) ; la plongée se termine quand elle atteint sa taille normale.
  Jouée une fois par visite (sessionStorage `pokedex-intro-vue`), jamais en animations réduites.
  Deux composants : `IntroPokedex` (décide, porte la page) et `ScenePokedex` (l'appareil, présent seulement pendant
  l'introduction). Fin de plongée → la scène est RETIRÉE et le défilement compensé : le haut de la page redevient le
  haut du site (sinon pagination, logo et « Tous » ramenaient au Pokédex fermé). Pour la revoir à l'envers, insister à
  la molette tout en haut (`EFFORT_POUR_ROUVRIR`). Animations réduites lues par `useSyncExternalStore` (pas
  `useReducedMotion`, qui provoquait une erreur d'hydratation ici).
  Exception assumée à « transform et opacity seulement » : `clip-path` pendant la plongée.
  Version précédente en photos et variante Pokéball : dossier local `effets/` (hors dépôt) ; essais dans `/labo/intro`
  et `/labo/pokedex-3d`.
- Accueil : `FiltreTypes` (client) = tuiles avec symbole (`lib/glyphes.ts`), type actif optimiste (`useOptimistic` +
  `useTransition`), `<Link prefetch>` seulement au survol/focus, clics en rafale regroupés. `EffetType` joue la
  recette du type (mouvement, fond, anneaux) en CSS seul ; classes `effet-*` dans globals.css, toujours via une table
  de correspondance (jamais `effet-${x}`).
- Recherche : français ou anglais, sans accents (`normaliser` / `filtrerNoms` dans lib/recherche.ts). Les noms
  français viennent du CSV du dépôt PokeAPI/pokeapi (`recupererNomsFrancais`), repli sur l'anglais s'il est indisponible.
- lib/pokeapi.ts : `lire` retente 3 fois les échecs passagers (pas de file d'attente partagée). `"use cache: remote"`
  sur recupererPokemon, recupererTousLesNoms, recupererNomsDuType, recupererNomsFrancais ; recupererListe reste en
  `"use cache"` pour être préchargeable.
- Combat : effets d'attaque sur canvas (`lib/labo/moteur2d.ts`, recettes dans `lib/labo/effets2d.ts`, testées).
- Combat : animations d'attaques de Pokémon Showdown (`lib/showdown/`). `animations-attaques.ts`, `animations-communes.ts`
  et `effets.ts` sont REPRIS TELS QUELS (CC0, `@ts-nocheck`, exclus d'ESLint) : ne pas les réécrire. Le code du projet
  est `scene.ts` (adaptateur : refait `showEffect`, `backgroundEffect` et le déplacement des Pokémon avec
  `element.animate`) et `index.ts` (`jouerAnimation`, `aUneAnimation`). Chargé par `import()` au démarrage d'un combat.
  L'effet par type sur canvas reste le repli (attaque inconnue, animations réduites). Images dans `public/showdown/fx`
  (licences dans `public/showdown/LISEZMOI.txt`) ; crédits sur la page À propos.
- Grille : cascade d'apparition plafonnée aux 6 premières cartes. Images : `minimumCacheTTL` de 31 jours.
- Mesurer la vitesse : toujours `npm run build` + `npm start` (le mode dev est 5 à 10 fois plus lent).

## Vérifier le rendu sans navigateur interactif
- Captures : Chrome sans fenêtre sur le site Vercel
  (`chrome.exe --headless=new --window-size=1280,800 --screenshot=... URL`).
- Audit : `npx lighthouse URL --output=json --chrome-flags="--headless=new"` (émulation mobile, capture finale incluse).
- Le README n'a plus de captures (choix de l'utilisateur).
