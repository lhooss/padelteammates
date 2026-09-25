-- Identifiant public unique.
-- La colonne est d'abord nullable : les comptes existants recoivent un
-- identifiant tire de leur nom, et la contrainte n'est posee qu'ensuite.
-- Ajouter directement une colonne NOT NULL UNIQUE echouerait des qu'il existe
-- plus d'un compte.
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- Reprise des comptes existants : "Jean-Luc Menard" -> "jean-luc-menard".
-- Les homonymes sont departages par un suffixe, le plus ancien gardant
-- l'identifiant nu.
WITH base AS (
  SELECT
    "id",
    "createdAt",
    COALESCE(
      NULLIF(
        trim(BOTH '-' FROM left(
          regexp_replace(
            translate(
              lower("name"),
              'àáâãäåçèéêëìíîïñòóôõöùúûüýÿ',
              'aaaaaaceeeeiiiinooooouuuuyy'
            ),
            '[^a-z0-9]+', '-', 'g'
          ),
          20
        )),
        ''
      ),
      'joueur'
    ) AS slug
  FROM "User"
),
numbered AS (
  SELECT
    "id",
    slug,
    row_number() OVER (PARTITION BY slug ORDER BY "createdAt", "id") AS rang
  FROM base
)
UPDATE "User" u
SET "username" = CASE
  WHEN n.rang = 1 THEN n.slug
  ELSE trim(BOTH '-' FROM left(n.slug, 20 - length(n.rang::text))) || n.rang::text
END
FROM numbered n
WHERE u."id" = n."id";

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
