# Padelteammates — API v0

API backend pour organiser des matchs de padel à Kénitra : planification, invitations, saisie et **validation communautaire** des scores, statistiques de joueurs.

## Stack

- **Node.js + TypeScript** (ESM) — API Express
- **PostgreSQL + Prisma** — persistance relationnelle
- **Zod** — validation stricte des entrées (scores, conflits de créneaux)
- **Redis (ioredis)** — sessions de match actives + verrou anti-course sur la validation
- **JWT** — authentification stateless

## Démarrage

```bash
docker compose up -d          # Postgres (hôte :5433) + Redis (:6379)
cp .env.example .env          # renseigner DATABASE_URL, REDIS_URL, JWT_SECRET
npm install
npm run prisma:generate
npm run prisma:migrate        # cree le schema en base
npm run seed                  # cree l'admin + les clubs de Kenitra
npm run dev                   # http://localhost:3001 (PORT dans .env)
```

Prérequis : Docker (ou une instance PostgreSQL + Redis accessibles, voir `.env`).
Le `docker-compose.yml` fourni expose **Postgres sur le port hôte `5433`** (pour éviter un conflit avec un Postgres local sur 5432) et Redis sur `6379`.

## Tests

Suite d'intégration **Vitest + Supertest** contre une vraie base Postgres/Redis (base `padel_teamates_test`, DB Redis 1) :

```bash
docker compose up -d          # infra requise
npm test                      # 29 tests: auth, clubs (admin), matchs, scores/validation/stats, creneaux
```

Le `test/global-setup.ts` synchronise le schéma (`prisma db push`) et chaque test repart d'une base vide. Un fichier **`requests.http`** (REST Client) déroule le parcours complet à la main.

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
| POST | `/api/matches/:id/score` | Saisir le résultat (= 1re validation) |
| POST | `/api/matches/:id/score/validate` | Valider le résultat |
| GET | `/api/users/:id/stats` | Stats publiques d'un joueur |
| GET | `/api/users/leaderboard` | Classement (profils publics) |
| GET | `/api/notifications` | Notifications in-app |

Toutes les routes (hors `register`/`login`/`health`) exigent l'en-tête `Authorization: Bearer <token>`.

## Structure

```
src/
  config/       env (Zod), prisma, redis
  middleware/   auth (JWT + admin), validate (Zod), error
  schemas/      schemas Zod (auth, club, match, score)
  services/     logique metier (auth, club, match, score, stats, user, notifications, activeMatch/redis)
  routes/       routeurs Express
  app.ts        assemblage
  server.ts     bootstrap + arret propre
prisma/
  schema.prisma
  seed.ts
```
