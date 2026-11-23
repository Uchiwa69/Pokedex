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
- Thème clair/sombre : next-themes (attribute="class", defaultTheme="system", enableSystem), ThemeProvider dans un
  petit composant client Fournisseurs monté dans le layout, avec suppressHydrationWarning sur <html>. Tailwind 4 :
  `@custom-variant dark (&:where(.dark, .dark *));` dans globals.css.

## Conventions
```
app/
  layout.tsx (lang="fr", next/font, EnTete, PiedDePage, HydratationStores, contenu dans mx-auto max-w-6xl px-4 py-6)
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
  texte, texte-doux, piste, accent (bleu-violet), accent-bis, sur-accent, danger, grille, lueur-1/2, shadow-carte, shadow-lueur.
- Utilitaires maison (@utility) à réutiliser partout : `verre` (panneau : bordure, fond, ombre, arrondi 1.5rem),
  `etiquette` (petites capitales espacées pour les libellés secondaires : N°, TAILLE, VITESSE…),
  `bouton` + `bouton-principal` / `bouton-secondaire` (gélules de 44 px).
- Arrondis : panneaux = `verre` (rounded-3xl), contrôles = rounded-full. Tailles de texte : 3xl (h1), xl (h2), sm (texte), etiquette.
- `styleTeinte(type)` (lib/teinte.ts) pose --teinte ; cartes : dégradé, halo diffus, halo net au sol, lueur de survol.
- Cartes de même hauteur : `auto-rows-fr`, nom en `truncate`, badges `petit` sur une seule ligne.
- En-tête de page : `<header>` avec une `etiquette` au-dessus du h1.
- Changement de thème : View Transitions (fondu) dans BoutonTheme.
- Les DEUX thèmes aussi soignés l'un que l'autre :
  sombre = nuit bleu très sombre, grille fine, verre fumé, lueurs ;
  clair = fond gris-bleu très pâle (#EEF2F8), surfaces blanches translucides, ombres douces bleutées, mêmes teintes de type.
- Le thème suit le système par défaut et le choix est mémorisé. Transition douce des couleurs au changement de thème.
- Inspiration écran de Pokédex rétro-futuriste, sans logo officiel.
- Polices next/font : Chakra Petch pour les titres, Inter pour le texte.
- Une variable --teinte par carte (couleur du type principal) pour le dégradé, le halo derrière l'artwork et la lueur
  au survol. Numéro en filigrane géant.
- Espacements 2/4/6/8, deux ou trois tailles de texte, mêmes arrondis et mêmes ombres partout.
- Badges de type contrastés (texte foncé sur les types clairs, blanc sur poison, spectre et dragon).

## Retouches demandées, à faire plus tard
- Le décor de FOND du site (lueurs + grille « verre ») ne plaît pas à l'utilisateur ; les CARTES en verre, si.
  À retravailler quand il le demandera (app/globals.css, bloc body::before et jetons --color-lueur-*, --color-grille).

## Animations
- Animer uniquement transform et opacity.
- Interface : moins de 400 ms, ressorts doux. Effets d'attaque : 0,8 à 1,5 s, uniquement dans l'arène.
- prefers-reduced-motion respecté partout (motion-reduce: en Tailwind, useReducedMotion() avec motion) :
  pas de lévitation, de particules ni de tremblement, juste des fondus.
- Aucun son automatique.

## Définition de « terminé » (à vérifier à chaque phase)
- npm run lint et npm run build passent, sans erreur d'hydratation dans la console.
- Rendu correct à 375 px, en thème clair ET en thème sombre (contraste du texte au moins 4,5:1 dans les deux), et avec
  les animations réduites. Aucun flash de mauvais thème au chargement.
- Tout fonctionne au clavier avec un focus visible ; alt sur chaque image ; un seul h1 par page ; les actions sont
  des <button>, les navigations des liens.

## Avancement des phases
0 Création · 1 Coque + thème · 2 Données + grille · 3 Fiche · 4 Recherche/filtre/pagination · 5 Favoris + sacoche
(puis déploiement Vercel) · 6 Direction artistique · 7 Animations · 8 Vue Équipe · 9 Attaques · 10 Combat · 11 Finitions.
Voir `git log` pour savoir quelle phase est terminée. Les 11 phases sont faites ; la suite = retouches à la demande.

## Vérifier le rendu sans navigateur interactif
- Captures : Chrome sans fenêtre sur le site Vercel
  (`chrome.exe --headless=new --window-size=1280,800 --screenshot=... URL` ; thème clair : `--blink-settings=preferredColorScheme=1`).
- Audit : `npx lighthouse URL --output=json --chrome-flags="--headless=new"` (émulation mobile, capture finale incluse).
- Les captures du README sont dans docs/captures/.
