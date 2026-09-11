# Padelteammates — v0

[![CI](https://github.com/lhooss/padelteammates/actions/workflows/ci.yml/badge.svg)](https://github.com/lhooss/padelteammates/actions/workflows/ci.yml)

Monorepo de l'app de padel de Kénitra : organisation de matchs, invitations, saisie et **validation communautaire** des scores, statistiques de joueurs.

| Workspace | Rôle |
|-----------|------|
| `apps/api` (`@padelteammates/api`) | API backend Express + TypeScript |
| `packages/shared` (`@padelteammates/shared`) | Schémas Zod et types partagés entre l'API et l'app mobile |
| `apps/mobile` | App mobile React Native / Expo — *à venir* |

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
npm run dev                                 # http://localhost:3001 (PORT dans apps/api/.env)
```

Toutes les commandes se lancent **depuis la racine** : elles délèguent au workspace `@padelteammates/api`.

Prérequis : Docker (ou une instance PostgreSQL + Redis accessibles, voir `apps/api/.env`).
Le `docker-compose.yml` fourni expose **Postgres sur le port hôte `5433`** (pour éviter un conflit avec un Postgres local sur 5432) et Redis sur `6379`.

> ⚠️ Arrêter `npm run dev` avant toute commande Prisma (`migrate`, `generate`, `reset`) : sous Windows, le serveur verrouille le moteur Prisma et le client ne peut pas être régénéré.

## Code partagé (`packages/shared`)

Les schémas Zod (auth, clubs, matchs, scores) vivent dans `@padelteammates/shared` et sont importés tels quels par l'API ; l'app mobile validera les saisies avec exactement les mêmes règles.

- **En dev, en test et au typecheck**, le package est résolu sur ses **sources TS** grâce à la condition d'export `@padelteammates/source` (tsx, Vitest, `apps/api/tsconfig.json`) : aucune étape de build.
- **En production**, `npm run build` compile d'abord `shared` puis l'API (`apps/api/tsconfig.build.json`), et Node résout le package sur `packages/shared/dist`.

## Tests

Suite d'intégration **Vitest + Supertest** contre une vraie base Postgres/Redis (base `padel_teamates_test`, DB Redis 1) :

```bash
docker compose up -d          # infra requise
npm test                      # 29 tests: auth, clubs (admin), matchs, scores/validation/stats, creneaux
```

Le `apps/api/test/global-setup.ts` synchronise le schéma (`prisma db push`) et chaque test repart d'une base vide. Un fichier **`apps/api/requests.http`** (REST Client) déroule le parcours complet à la main.

## Modèle de données

| Entité      | Rôle |
|-------------|------|
| `User`      | Joueur/Admin. `profilePublic` conditionne l'accès aux stats. `wins`/`losses`. |
| `Club`      | Club (ville par défaut : Kénitra). Écriture réservée à l'admin. |
| `Match`     | Date + créneau + club. Statut `PLANNED` → `PENDING` → `COMPLETED`. |
| `Participant` | Lien User↔Match, équipe A/B, présence `INVITED`/`CONFIRMED`. |
| `Score`     | Composition finale, détail des sets, `validators[]`. |
| `Notification` | Notifications in-app. |

## Règles métier appliquées

- **Admin uniquement** pour créer/modifier les clubs (`requireAdmin`).
- **Planification** : un joueur crée un match (club + créneau) et invite des joueurs inscrits qui confirment.
- **Anti-conflit de créneau** : contrainte `@@unique([clubId, date, slot])` + vérification qu'aucun joueur n'est déjà pris sur ce créneau.
- **Calendrier hebdomadaire** global (lundi→dimanche) consultable par tous.
- **Saisie du résultat** par n'importe quel participant **confirmé**, uniquement **à l'issue du créneau** (heure de Kénitra, `Africa/Casablanca`). Composition finale **2 contre 2** reprenant les 4 joueurs confirmés, games et sets — validée par Zod.
- **Verrouillage** : le match passe `COMPLETED` dès qu'**au moins un joueur de chaque équipe** a validé la saisie (donc ≥ 2 des 4 participants — une équipe seule ne peut pas verrouiller son propre résultat). Une re-saisie remet les validations à zéro.
- **Anti-course** : saisies et validations d'un même match sont sérialisées par un verrou Redis, et le passage `PENDING → COMPLETED` est gardé en base (les stats ne peuvent pas être comptées deux fois).
- **Stats** mises à jour automatiquement à la validation ; **consultables seulement si `profilePublic = true`**.

## Endpoints principaux

| Méthode | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Inscription (retourne un JWT) |
| POST | `/api/auth/login` | Connexion |
| GET/PATCH | `/api/auth/me` | Profil courant (dont `profilePublic`) |
| GET | `/api/clubs` | Liste des clubs |
| POST/PATCH/DELETE | `/api/clubs...` | Gestion des clubs (**admin**) |
| POST | `/api/matches` | Créer un match + inviter |
| POST | `/api/matches/:id/respond` | Accepter/décliner une invitation |
| GET | `/api/matches/calendar/weekly` | Calendrier hebdomadaire (`?from=&clubId=`) |
| GET | `/api/matches/mine` | Mes matchs |
| POST | `/api/matches/:id/score` | Saisir le résultat (= validation de son équipe) |
| POST | `/api/matches/:id/score/validate` | Valider le résultat (`awaitingTeams` si une équipe manque) |
| GET | `/api/users/:id/stats` | Stats publiques d'un joueur |
| GET | `/api/users/leaderboard` | Classement (profils publics) |
| GET | `/api/notifications` | Notifications in-app |

Toutes les routes (hors `register`/`login`/`health`) exigent l'en-tête `Authorization: Bearer <token>`.

## Structure

```
apps/api/
  src/
    config/       env (Zod), prisma, redis
    middleware/   auth (JWT + admin), validate (Zod), error
    services/     logique metier (auth, club, match, score, stats, user, notifications, activeMatch/redis)
    routes/       routeurs Express
    utils/        erreurs, JWT, mots de passe, creneaux (fuseau de Kenitra)
    app.ts        assemblage
    server.ts     bootstrap + arret propre
  prisma/         schema.prisma, migrations, seed.ts
  test/           tests d'integration Vitest + Supertest
packages/shared/
  src/            schemas Zod (auth, club, match, score) + index
docker-compose.yml  infra locale (Postgres + Redis)
tsconfig.base.json  options TypeScript communes
```
