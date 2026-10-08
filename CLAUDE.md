# FCSM Collection — contexte du projet

App mobile (PWA) pour gérer une collection de ~100 écharpes du FC Sochaux-Montbéliard.
Le propriétaire parle français, est dans l'informatique, et teste surtout sur iPhone.
**Réponds toujours en français.**

## Stack

| Rôle | Techno |
|---|---|
| Front | React 18 + Vite + Tailwind + Framer Motion |
| Base de données | Supabase (table `"Scarves"`, extension pgvector) |
| Photos | Cloudinary (cloud `dxwjoflqn`, preset `fcsm_unsigned`) |
| Détourage | remove.bg (3 clés en rotation, 50 appels gratuits chacune) |
| Détection de doublons | Voyage AI `voyage-multimodal-3` → embeddings 1024 dimensions |
| Proxy API | Cloudflare Worker `fcsm-ai-proxy` |
| Déploiement | Vercel, automatique à chaque push sur GitHub |

Repo : `echarpefcsmrohn-create/fcsm-collection`

## Workflow

- **Un push sur `main` redéploie l'app en production.** Travaille sur une branche et laisse le propriétaire fusionner.
- Lance `npm run build` avant de rendre le travail.
- La version est dans `vite.config.js` (`__APP_VERSION__`). Incrémente-la à chaque livraison.
- Après une modification, résume en 2-3 lignes ce qui change pour l'utilisateur.

## Hors du repo (ne pas modifier sans demander)

- **SQL Supabase** : colonnes, index, fonction RPC `match_scarves`. Si une modif de schéma est nécessaire, écris le SQL dans un fichier et demande au propriétaire de l'exécuter.
- **Worker Cloudflare** : route `/` → API Anthropic, route `/embed` → Voyage. Secrets : `VOYAGE_API_KEY`, `SUPABASE_KEY`.
- Ne jamais écrire de clé API dans un fichier ou un message.
- Les clés remove.bg sont en dur dans `src/lib/cloudinary.js` : ne pas les copier ailleurs ni les afficher.

## Règles à ne jamais casser

### 1. La numérotation des écharpes
Le numéro affiché (`#042`) = position de l'écharpe triée par `added_at` **croissant**, index + 1, sur 3 chiffres.
Fonctions : `getScarfNumber` et `getNumberMap` dans `src/lib/eras.js`.
**Cette logique ne doit jamais changer.** Le résultat est mis en cache par référence de tableau `collection` : ne pas recalculer le tri par carte.
Partout où un numéro est affiché (grille, détail, roue, vérification), utiliser ces fonctions et jamais l'index dans le tableau.

### 2. Les embeddings
- Colonne `embedding vector(1024)` sur `"Scarves"`. Elle est **exclue** du chargement (`SCARF_COLUMNS` dans `src/lib/supabase.js`) car elle pèse ~1,9 Mo.
- Toute nouvelle colonne à afficher doit être ajoutée à `SCARF_COLUMNS`, sinon elle n'apparaît pas dans l'app.
- Seuil de similarité : **0.72**, identique partout (VerifyPage et AddModal). Paliers d'affichage : ≥ 85 % probable doublon, 75-84 % proche, < 75 % faible.
- Les photos sont compressées à 900 px (`compressForEmbed` dans `src/lib/embeddings.js`) avant envoi à Voyage. Changer cette résolution oblige à **recalculer les embeddings de toute la collection**.
- Le calcul se fait dans AddModal à l'ajout, puis l'embedding est sauvegardé avec l'écharpe.
- La comparaison se fait côté Supabase via la fonction RPC `match_scarves(query_embedding, match_threshold, match_count)`.

### 3. Performance de la page Collection
Ces points ont été corrigés après de gros ralentissements (100+ écharpes). Ne pas les réintroduire :
- Pas de `layout` Framer Motion sur la grille ni sur les cartes.
- Le délai d'apparition des cartes est plafonné : `Math.min(i, 8) * 0.02`. L'ancien `i * 0.04` faisait attendre 4 s la dernière carte.
- `ScarfCard` est dans un `memo`. Si un nouveau champ doit déclencher un re-rendu, l'ajouter dans la comparaison.
- La valeur du contexte est mémoïsée (`useMemo` + `useCallback`).
- Le filtrage et le tri sont dans un `useMemo`, la recherche utilise `useDeferredValue`.

### 4. Images Cloudinary
- Utiliser `cldUrl(url, largeur)` de `src/lib/cloudinary.js` pour **afficher** une photo (vignette 400, détail 1000, plein écran 1200).
- Pour toute **opération** sur l'image (rotation, retraitement, détourage, calcul d'embedding), utiliser l'URL d'origine, jamais la version redimensionnée.

## Modèle de données — table `"Scarves"`

Les noms de colonnes ont une casse précise : `"Scarves"` et `Name` commencent par une majuscule. `id` est un **uuid**.

| Colonne | Contenu |
|---|---|
| `id` | uuid |
| `Name` | nom de l'écharpe |
| `era` | identifiant d'ère, ou `null` |
| `price` | prix payé (optionnel) |
| `photo_url` | URL Cloudinary |
| `added_at` | date d'ajout (sert à la numérotation) |
| `embedding` | vector(1024) |
| `is_match` | booléen, écharpe de match |
| `opponent`, `competition`, `match_date` | infos du match |
| `score_fcsm`, `score_opponent` | score, **toujours du point de vue FCSM** |
| `is_home` | FCSM à domicile ou non |

### Écharpes de match (`src/lib/match.js`)
- Le score se saisit côté FCSM, mais `formatScore` inverse l'affichage à l'extérieur (`3-1` pour un PSG-FCSM).
- Le résultat (victoire, nul, défaite) donne la couleur du badge : vert, gris, rouge.
- Décocher « écharpe de match » remet tous les champs de match à `null`.
- `getMatchStats` alimente le bilan de l'onglet Stats.

### Ères (`src/lib/eras.js`)
- La liste `ERAS` se termine par `inconnue` (« Indéterminée »).
- `normalizeEra(era)` rattache les écharpes sans ère (`null`) à `inconnue`. L'utiliser pour tout filtre, tri ou comptage par ère.

## Pages et composants principaux

- `HomePage`, `CollectionPage`, `VerifyPage`, `StatsPage`, `DailyPage` : navigation par `BottomNav`, pas de routeur.
- `AddModal` : ajout d'une écharpe (photo → détourage remove.bg → comparaison visuelle → suggestion nom/ère par l'IA → sauvegarde).
- `ScarfDetail` : consultation et édition, rotation, retraitement de la photo.
- `VerifyPage` : mode « par ère » et mode « par image » avec recadrage libre (`FreeCropper`).
- `DailyPage` : roue de fortune 2D dessinée en canvas. Les numéros sur la roue sont ceux de `getNumberMap`. La collection est lue depuis le contexte, donc une nouvelle écharpe ajoute un segment automatiquement.
- Cache local : clé `fcsm_collection_cache_v2` (localStorage).

## Direction artistique : rétro 80-90 (v1.150 à v1.158)

- Palette (tokens Tailwind, noms conservés) : `noir` = bleu nuit #0B1B5A (fond), `surface` = #06103A, `jaune` = #FFC800, `creme` = #F4EFE0, `victoire` #2E9E57, `defaite` #D6362B. Ne pas réintroduire les anciens bleus/jaunes (#001f5c, #F5C400, #080C1A).
- Polices : Big Shoulders Display (classe `font-bebas`, nom conservé pour ne rien casser), Space Mono pour les petits labels, Outfit pour le texte courant.
- Classes utilitaires dans `src/index.css` : `bande-retro` (bande diagonale), `titre-retro` (titre incliné), `label-retro` (étiquette mono), `ombre-dure`, `match-bloc` (texte blanc forcé sur fond de résultat).
- Style : coins carrés (pas de `rounded-2xl`), bordures épaisses `border-[3px] border-creme`, ombres dures, badges de numéro jaunes. `rounded-full` seulement pour spinners, puces et jauges.
- Thème clair = papier crème. Le jaune devient ocre (#7A5800) pour rester lisible : les surcharges sont dans `src/index.css` (`html.light ...`). Vérifier tout nouvel écran dans les deux thèmes.
- Badges de match : utiliser `RETRO_BADGE` (fonds pleins, texte blanc) de `src/lib/match.js`. `RESULTS` reste pour l'ancien format.
- Transitions de page courtes (0,12 s, sans attente de sortie). Ne pas remettre `AnimatePresence mode="wait"`.
- Écran « Écharpe du jour » : machine à sous à trois rouleaux (photo, numéro, ère) dans `DailyPage.jsx`. L'écharpe gagnante est choisie AVANT l'animation et c'est toujours le dernier élément des rouleaux. Numéros via `getNumberMap(collection).get(String(id))`.

## Ères et logos

- Les identifiants d'ères sont enregistrés en base : **ne jamais les renommer** sans migration SQL. `1994-1997` s'affiche « 1994–1998 » et `1997-2000` s'affiche « 1998–2000 » (seul le libellé a changé).
- Logos : `public/eras/<id-de-l-ère>.png`, affichés par `EraLogo` (rien ne s'affiche si le fichier manque). Présents : 1930-1940, 1940-1980, 1990-1994, 1994-1997, 1997-2000, 2000-2004, 2004-2010, 2010-2015, 2015-auj. L'ère « inconnue » n'a pas de logo.
- La recherche de la Collection accepte un numéro (`42`, `042`, `#42`) en plus du nom.

## Décisions déjà prises (ne pas remettre en cause sans demander)

- Le recadrage a été supprimé de l'ajout. Il existe seulement dans VerifyPage, en mode libre (sans ratio imposé).
- La détection de doublons se fait par l'image (embeddings), plus par comparaison de texte.
- Les embeddings visuels confondent facilement deux écharpes proches (même style bleu et jaune, texte brodé fin). Une écharpe pliée ou froissée peut ne pas être retrouvée. C'est une limite de la méthode, pas un bug.
- La roue de fortune remplace l'ancien bandeau défilant, qui désynchronisait la flèche et le gagnant.

## Style de code

- Composants fonctionnels React, Tailwind pour le style, Framer Motion pour les animations.
- Interface en français. Police titres : Bebas Neue (`font-bebas`). Couleur principale : jaune (`jaune`).
- Commentaires en français, concis, qui expliquent le pourquoi.
- Ne pas ajouter de dépendance sans demander.
