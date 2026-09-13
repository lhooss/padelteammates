# Padelteammates — v0

[![CI](https://github.com/lhooss/padelteammates/actions/workflows/ci.yml/badge.svg)](https://github.com/lhooss/padelteammates/actions/workflows/ci.yml)

Monorepo de l'app de padel de Kénitra : organisation de matchs entre amis, invitations, saisie et **validation communautaire** des scores, statistiques de joueurs.

| Workspace | Rôle |
|-----------|------|
| `apps/api` (`@padelteammates/api`) | API backend Express + TypeScript |
| `apps/mobile` (`@padelteammates/mobile`) | App mobile React Native / Expo SDK 57 (expo-router, Redux Toolkit + RTK Query) |
| `packages/shared` (`@padelteammates/shared`) | Schémas Zod et types partagés entre l'API et l'app mobile |

## Stack (API)

- **Node.js + TypeScript** (ESM) — API Express
- **PostgreSQL + Prisma** — persistance relationnelle
- **Zod** — validation stricte des entrées (scores, conflits de créneaux), schémas dans `packages/shared`
- **Redis (ioredis)** — sessions de match actives + verrou anti-course sur la saisie/validation des scores
- **JWT** — authentification stateless

## Démarrage

```bash
docker compose up -d                        # Postgres (hôte :5433) + Redis (:6379)
cp apps/api/.env.example apps/api/.env      # renseigner DATABASE_URL, REDIS_URL, JWT_SECRET
npm install                                 # installe tous les workspaces
npm run prisma:generate
npm run prisma:migrate                      # applique les migrations
npm run seed                                # cree l'admin + les clubs de Kenitra
npm run dev                                 # API sur http://localhost:3001 (PORT dans apps/api/.env)
```

Toutes les commandes se lancent **depuis la racine** : elles délèguent au bon workspace.

Prérequis : Docker (ou une instance PostgreSQL + Redis accessibles, voir `apps/api/.env`).
Le `docker-compose.yml` fourni expose **Postgres sur le port hôte `5433`** (pour éviter un conflit avec un Postgres local sur 5432) et Redis sur `6379`.

> ⚠️ Arrêter `npm run dev` avant toute commande Prisma (`migrate`, `generate`, `reset`) : sous Windows, le serveur verrouille le moteur Prisma et le client ne peut pas être régénéré.

## App mobile (`apps/mobile`)

```bash
npm run dev       # l'API doit tourner
npm run mobile    # serveur Expo : scanner le QR code avec Expo Go (SDK 57)
```

- Le téléphone et le PC doivent être sur le **même Wi-Fi**. L'app joint l'API automatiquement sur l'IP du PC qui lance Expo, port `3001` ; pour viser une autre API, définir `EXPO_PUBLIC_API_URL` dans `apps/mobile/.env` (voir `.env.example`).
- Sous Windows, autoriser Node.js dans le pare-feu pour les ports d'Expo (`8081` par défaut, `--port` sinon) et `3001` (API).
- Écrans :
  - **Notifications** (cloche 🔔 avec le nombre de non-lues, en haut du calendrier, de mes matchs et des amis) : invitations, demandes d'ami, demandes pour rejoindre, scores à valider, classement FRMT ; toucher une notification la marque comme lue et ouvre l'écran concerné. Sans push pour l'instant : vérification chaque minute et au retour dans l'app.
  - **Calendrier** de la semaine de la communauté, filtrable par club ; mes matchs sont mis en avant ; « Rejoindre l'équipe A / B » sur les matchs qui ont des places libres.
  - **Mes matchs** : invitations à accepter ou refuser, scores à saisir ou valider et demandes pour rejoindre à traiter (badge sur l'onglet), mes demandes envoyées, à venir, terminés avec leur score.
  - **Annuler ou quitter un match** : l'organisateur annule le sien tant qu'aucun score n'est saisi (le match disparaît pour tout le monde, joueurs et demandeurs prévenus) ; les autres joueurs le quittent tant que le créneau n'est pas passé, leur place redevient libre.
  - **Joueurs du match** (organisateur, bouton « Inviter des joueurs » / « Gérer les joueurs ») : retirer un joueur, ou compléter les places libres avec des amis.
  - **Gérer les clubs** (admin, depuis le Profil) : ajouter, renommer, **désactiver** ou réactiver un club. Un club désactivé n'est plus proposé (calendrier, planification, club habituel) mais garde ses matchs ; la suppression n'est acceptée que pour un club sans aucun match (409 sinon).
  - **Score du match** (à l'issue du créneau) : composition finale 2 contre 2, sets de chaque partie, résultat calculé en direct (même calcul que l'API, `computeResult` de `packages/shared`) ; l'équipe adverse valide ou corrige.
  - **Amis** : recherche de joueurs par nom, demandes reçues / envoyées (badge), liste d'amis.
  - **Profil d'un joueur** (en touchant son nom) : relation d'amitié, stats si visibles.
  - **Planifier un match** : club, jour, créneau d'1h30, invitation d'amis (1 partenaire, 2 adversaires).
  - **Profil** : mes stats, profil padel (niveau, côté, main, club habituel, téléphone visible par mes amis), profil public ; **Modifier le profil** et **Email et mot de passe** (mot de passe actuel requis) ; déconnexion. Connexion / inscription.
  - Le **profil d'un joueur** affiche son profil padel, et pour ses amis son téléphone avec un bouton WhatsApp.
- **Design « Court bleu »** (`src/constants/theme.ts`) : bleu gazon `#1F4FA0`, jaune balle `#DAF03C` pour l'action principale et « vous », encre `#0D1A33`, vitre `#EDF2F8` ; mode sombre « nuit » (`#081226`). Titres et chiffres en **Big Shoulders Display**, texte en **Instrument Sans** (`@expo-google-fonts`, une `fontFamily` par graisse car Android ignore `fontWeight` sur une police personnalisée). Chaque match est dessiné comme un **terrain vu du dessus** (`components/court.tsx` : équipes A / B, places libres en pointillés, « Vous » en jaune balle), le score comme un tableau de retransmission et le classement FRMT sur une carte gazon. Icône et splash assortis dans `assets/images/`.
- Navigation `expo-router` (`src/app/`), état Redux Toolkit + RTK Query (`src/store/`), jeton JWT dans le trousseau du téléphone (`expo-secure-store`).
- Documentation Expo de la version utilisée : https://docs.expo.dev/versions/v57.0.0/

## Code partagé (`packages/shared`)

Les schémas Zod (auth, clubs, matchs, scores, recherche de joueurs) vivent dans `@padelteammates/shared` et sont importés tels quels par l'API **et** l'app : un formulaire est validé dans l'app avec exactement les mêmes règles (et les mêmes messages) que sur le serveur.

- **En dev, en test et au typecheck**, le package est résolu sur ses **sources TS** grâce à la condition d'export `@padelteammates/source` (tsx, Vitest, Metro via `apps/mobile/metro.config.js`, `customConditions` des tsconfig) : aucune étape de build.
- **En production**, `npm run build` compile d'abord `shared` puis l'API (`apps/api/tsconfig.build.json`), et Node résout le package sur `packages/shared/dist`.

## Classement national FRMT

Le profil d'un joueur licencié peut afficher son **classement national padel de la FRMT** (rang, points, évolution).

- **Import** : la FRMT publie ce classement sur une [page publique](https://info2.frmt.ma/FRMT_CLASSEMENT_WB27?Type=P), sans API. L'API rejoue les requêtes de cette page comme un navigateur (`apps/api/src/services/frmt.client.ts`) et importe Messieurs + Dames (≈ 1 500 joueurs, une vingtaine de secondes, requêtes espacées). L'import est **automatique une fois par 24 h** (`FRMT_IMPORT_ENABLED=false` pour le couper), **manuel** via `npm run frmt:import`, ou depuis l'écran d'administration de l'app. Chaque tentative est tracée (`FrmtImport`) ; si la page de la FRMT change, l'import échoue proprement et le classement en place est conservé.
- **Lien avec le profil** : la FRMT ne publie ni numéro de licence ni identifiant stable. Le joueur se retrouve dans le classement importé (nom + année de naissance) et demande le lien ; **l'administrateur le valide** avant qu'il soit visible des autres joueurs.
- Ces données appartiennent à la FRMT : prévenir la fédération (voire lui demander un export officiel) avant une mise en production.

## Mise en ligne (production)

L'API se déploie en conteneur : le `Dockerfile` à la racine compile `shared` puis l'API, n'installe que ces deux workspaces (l'app mobile et Expo n'ont rien à faire dans une image serveur) et applique les migrations en attente au démarrage (`prisma migrate deploy`) avant d'accepter du trafic.

Variables d'environnement à définir chez l'hébergeur :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Postgres managé |
| `REDIS_URL` | Redis managé (verrous de saisie de score) |
| `JWT_SECRET` | **long et aléatoire**, jamais celui du dépôt |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | compte admin créé par `npm run seed` |
| `CORS_ORIGIN` | facultatif ; vide = toutes origines, ce qui convient à une app mobile |
| `PORT` | fourni par l'hébergeur |

Protections actives en production :

- **Limitation de débit** : 10 tentatives de connexion ou d'inscription par quart d'heure et par IP, 120 requêtes par minute pour le reste. **Active en production uniquement** : en développement, le téléphone et le PC sortent par la même IP, la limite bloquerait les essais sans rien protéger.
- **`trust proxy`** : sans lui, la limitation verrait l'IP du proxy de l'hébergeur et punirait tous les joueurs pour un seul.
- **Session longue** : le jeton d'accès dure 15 minutes et l'app le renouvelle en silence avec un jeton de session (60 jours par défaut, `REFRESH_TOKEN_DAYS`). Seule l'empreinte du jeton de session est stockée, et chaque renouvellement le remplace : un jeton ne sert qu'une fois. `POST /api/auth/logout` révoque la session de l'appareil.
  - Limite connue : changer son mot de passe ne révoque pas les sessions déjà ouvertes.

### Déployer l'API sur Railway

1. Créer un projet, y ajouter **PostgreSQL** et **Redis** (Railway renseigne `DATABASE_URL` et `REDIS_URL`).
2. Ajouter un service depuis le dépôt GitHub : le `Dockerfile` de la racine est détecté automatiquement.
3. Renseigner les variables du tableau ci-dessus. Générer le secret avec `openssl rand -hex 48`, et choisir un vrai mot de passe admin.
4. Déployer, puis vérifier `https://<domaine>/health`.
5. Créer l'admin et les clubs, une seule fois : `railway run npm run seed`.

### Construire l'APK (EAS)

Le profil `preview` d'`apps/mobile/eas.json` produit un APK installable directement.

1. Remplacer `EXPO_PUBLIC_API_URL` par l'URL Railway dans `eas.json` — sans quoi l'app cherchera une API sur le réseau local.
2. `npx eas login` puis `npx eas init` (crée l'identifiant de projet Expo).
3. `npx eas build --platform android --profile preview` : EAS renvoie un lien de téléchargement à partager.
4. Les joueurs doivent autoriser l'installation depuis une source inconnue. Pour les mises à jour suivantes sans réinstallation, voir `expo-updates`.

## Tests

Suite d'intégration **Vitest + Supertest** contre une vraie base Postgres/Redis (base `padel_teamates_test`, DB Redis 1) :

```bash
docker compose up -d          # infra requise
npm test                      # 61 tests: auth, profil, clubs, amis, matchs, demandes pour rejoindre, scores/validation/stats, classement FRMT, notifications, creneaux
```

Le `apps/api/test/global-setup.ts` synchronise le schéma (`prisma db push`) et chaque test repart d'une base vide. Un fichier **`apps/api/requests.http`** (REST Client) déroule le parcours complet à la main.

La CI (GitHub Actions) rejoue à chaque push : typecheck de tous les workspaces, tests, build de l'API et bundle Android de l'app.

## Modèle de données

| Entité      | Rôle |
|-------------|------|
| `User`      | Joueur/Admin. `profilePublic` conditionne l'accès aux stats. `wins`/`losses`. |
| `Friendship` | Amitié entre deux joueurs : demande (`PENDING`) puis acceptation (`ACCEPTED`). |
| `Club`      | Club (ville par défaut : Kénitra). Écriture réservée à l'admin. |
| `Match`     | Date + créneau + club. Statut `PLANNED` → `PENDING` → `COMPLETED`. |
| `Participant` | Lien User↔Match, équipe A/B, présence `INVITED`/`CONFIRMED`. |
| `Score`     | Composition finale, détail des sets, `validators[]`. |
| `Notification` | Notifications in-app (invitations, scores, demandes d'ami). |

## Règles métier appliquées

- **Admin uniquement** pour créer/modifier les clubs (`requireAdmin`).
- **Amis** : une demande d'ami est acceptée ou refusée par le destinataire ; deux demandes croisées valent acceptation. On peut annuler sa demande ou retirer un ami.
- **Planification** : un joueur crée un match (club + créneau) et **n'invite que ses amis** ; les invités confirment ou déclinent. L'organisateur peut ensuite **compléter les places libres** (2 joueurs max par équipe) tant que le match est planifié et que son créneau n'est pas passé.
- **Demander à rejoindre** : depuis le calendrier, n'importe quel joueur peut demander une place libre dans l'équipe de son choix ; l'organisateur accepte (le joueur rejoint le match, déjà confirmé) ou refuse, et le joueur peut annuler sa demande. Mêmes conditions que les invitations : match planifié, créneau pas passé, pas de conflit de créneau.
- **Visibilité d'un match** (choix de l'organisateur, modifiable tant que le match est planifié) : **Tout le monde**, **Mes amis** (les amis de l'organisateur) ou **Privé** (ses seuls joueurs). Les joueurs du match le voient toujours. Un match qu'on ne voit pas est **introuvable** (404, y compris par lien direct) et ne peut pas être rejoint. À la planification, le défaut suit l'intention : match avec des places libres → Tout le monde, match déjà complet → Mes amis.
- **Conflit de créneau** : un club ayant **plusieurs terrains**, plusieurs matchs peuvent partager le même créneau dans le même club. La seule règle est côté joueurs : personne ne peut être pris deux fois sur le même créneau.
- **Réservation du terrain** : elle se fait auprès du club, hors de l'app. **N'importe quel joueur du match** confirme ici que c'est fait (ou retire la confirmation si le terrain est perdu) ; les autres sont prévenus. Un match affiche « Terrain réservé » ou « Terrain à réserver » tant qu'il est planifié.
- **Calendrier hebdomadaire** global (lundi→dimanche) consultable par tous, filtrable par club.
- **Saisie du résultat** par n'importe quel participant **confirmé**, uniquement **à l'issue du créneau** (heure de Kénitra, `Africa/Casablanca`). Composition finale **2 contre 2** reprenant les 4 joueurs confirmés, games et sets — validée par Zod.
- **Verrouillage** : le match passe `COMPLETED` dès qu'**au moins un joueur de chaque équipe** a validé la saisie (donc ≥ 2 des 4 participants — une équipe seule ne peut pas verrouiller son propre résultat). Une re-saisie remet les validations à zéro.
- **Anti-course** : saisies et validations d'un même match sont sérialisées par un verrou Redis, et le passage `PENDING → COMPLETED` est gardé en base (les stats ne peuvent pas être comptées deux fois).
- **Stats** mises à jour automatiquement à la validation ; **visibles si le profil est public, ou par les amis du joueur**. Le classement ne liste que les profils publics.

## Endpoints principaux

| Méthode | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Inscription (retourne un JWT) |
| POST | `/api/auth/login` | Connexion |
| GET/PATCH | `/api/auth/me` | Profil courant ; modification : nom, `profilePublic`, profil padel (côté, niveau, main), club habituel, téléphone |
| PATCH | `/api/auth/me/email` | Changer d'email (mot de passe actuel requis) |
| PATCH | `/api/auth/me/password` | Changer de mot de passe (mot de passe actuel requis) |
| GET | `/api/clubs` | Liste des clubs |
| POST/PATCH/DELETE | `/api/clubs...` | Gestion des clubs (**admin**) |
| POST | `/api/matches` | Créer un match + inviter des amis |
| POST | `/api/matches/:id/respond` | Accepter/décliner une invitation |
| POST | `/api/matches/:id/invites` | Inviter des amis dans les places libres (organisateur) |
| POST | `/api/matches/:id/join-requests` | Demander à rejoindre un match (`{ team }`, place libre) |
| POST | `/api/matches/:id/join-requests/:userId/accept` | Accepter une demande (organisateur) : le joueur rejoint le match, confirmé |
| DELETE | `/api/matches/:id/join-requests/:userId` | Refuser (organisateur) ou annuler sa demande (joueur) |
| GET | `/api/matches/calendar/weekly` | Calendrier hebdomadaire (`?from=&clubId=`) |
| GET | `/api/matches/mine` | Mes matchs |
| POST | `/api/matches/:id/score` | Saisir le résultat (= validation de son équipe) |
| POST | `/api/matches/:id/score/validate` | Valider le résultat (`awaitingTeams` si une équipe manque) |
| GET | `/api/users/search?q=` | Rechercher des joueurs par nom (avec la relation d'amitié) |
| GET | `/api/users/:id` | Profil d'un joueur : relation d'amitié, stats si visibles |
| GET | `/api/users/:id/stats` | Stats d'un joueur (403 si profil privé et pas ami) |
| GET | `/api/users/leaderboard` | Classement (profils publics) |
| GET | `/api/friends` | Mes amis |
| GET | `/api/friends/requests` | Demandes d'ami reçues et envoyées |
| POST | `/api/friends/:userId` | Envoyer une demande d'ami |
| POST | `/api/friends/:userId/accept` | Accepter une demande d'ami |
| DELETE | `/api/friends/:userId` | Refuser, annuler une demande ou retirer un ami |
| GET | `/api/frmt/status` | Dernier import du classement FRMT (date, volumes, erreur) |
| GET | `/api/frmt/ranking?q=&category=` | Rechercher un joueur dans le classement FRMT importé |
| PUT/DELETE | `/api/frmt/link` | Demander (ou retirer) le lien entre son profil et sa ligne du classement |
| GET | `/api/frmt/links` | Demandes de lien à valider (**admin**) |
| POST/DELETE | `/api/frmt/links/:id[/verify]` | Valider / refuser une demande de lien (**admin**) |
| POST | `/api/frmt/import` | Importer le classement immédiatement (**admin**) |
| GET | `/api/notifications` | Notifications in-app |

Toutes les routes (hors `register`/`login`/`health`) exigent l'en-tête `Authorization: Bearer <token>`.

## Structure

```
apps/api/
  src/
    config/       env (Zod), prisma, redis
    middleware/   auth (JWT + admin), validate (Zod), error
    services/     logique metier (auth, club, friendship, match, score, stats, user, notifications, activeMatch/redis)
    routes/       routeurs Express
    utils/        erreurs, JWT, mots de passe, creneaux (fuseau de Kenitra)
    app.ts        assemblage
    server.ts     bootstrap + arret propre
  prisma/         schema.prisma, migrations, seed.ts
  test/           tests d'integration Vitest + Supertest
apps/mobile/
  src/
    app/          routes expo-router : (auth), (tabs) calendrier/matchs/amis/profil, players/[id], match/new
    store/        Redux : session (auth-slice), API (RTK Query)
    components/   UI (ecran, boutons, champs, pastilles, carte de match, joueurs, onglets)
    lib/          dates, erreurs API, stockage du jeton
    config/       URL de l'API
  metro.config.js resolution de @padelteammates/shared sur ses sources
packages/shared/
  src/            schemas Zod (auth, club, match, score, user) + index
docker-compose.yml  infra locale (Postgres + Redis)
tsconfig.base.json  options TypeScript communes (API + shared)
```
