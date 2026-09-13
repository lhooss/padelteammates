# Image de production de l'API (monorepo npm workspaces).
# On installe a la racine mais on ne cible que shared + api : l'app mobile et ses
# dependances Expo n'ont rien a faire dans une image serveur.

FROM node:22-alpine AS build
WORKDIR /app

# Sans openssl, Prisma ne detecte pas la version presente, se rabat sur OpenSSL 1.1
# et genere un moteur que l'image (OpenSSL 3) ne peut pas charger.
RUN apk add --no-cache openssl

# Les manifestes d'abord : le cache Docker n'est invalide que si les dependances changent.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
# Present dans le lockfile : npm doit le voir, meme si on n'installe pas ses dependances.
COPY apps/mobile/package.json apps/mobile/
RUN npm ci -w @padelteammates/shared -w @padelteammates/api --include-workspace-root

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api

RUN npx prisma generate --schema apps/api/prisma/schema.prisma
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Necessaire aussi ici : c'est le moteur Prisma copie plus bas qui s'y lie.
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/mobile/package.json apps/mobile/
RUN npm ci -w @padelteammates/shared -w @padelteammates/api --include-workspace-root --omit=dev \
  && npm cache clean --force

# Code compile + client Prisma genere a l'etape de build.
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/node_modules/.prisma node_modules/.prisma
# Les migrations : appliquees au demarrage, elles doivent etre dans l'image.
COPY apps/api/prisma apps/api/prisma

EXPOSE 3000

# L'API est la seule porte d'entree de la base : elle applique les migrations en attente
# avant d'accepter du trafic. `migrate deploy` ne fait que rejouer l'existant, jamais de
# modification interactive du schema.
CMD ["sh", "-c", "npx prisma migrate deploy --schema apps/api/prisma/schema.prisma && node apps/api/dist/server.js"]
