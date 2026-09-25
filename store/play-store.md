# Fiche Google Play — Padelteammates

Tout ce que la Play Console demande, prêt à copier. Les ressources graphiques sont
dans `store/assets/` (produites par le script du scratchpad, voir en bas).

---

## Identité

| Champ | Valeur |
|---|---|
| Nom de l'application (30 car. max) | `Padelteammates` |
| Catégorie | Sport |
| Type | Application (gratuite) |
| Adresse e-mail du développeur | `contact@padelteammates.com` |
| Site web | `https://padelteammates.com` |
| Politique de confidentialité | `https://padelteammates.com/confidentialite.html` |
| Suppression de compte | `https://padelteammates.com/suppression-compte.html` |

---

## Description courte (80 caractères max)

```
Organisez vos matchs de padel à Kénitra : partenaires, terrain, scores.
```
*70 caractères.*

---

## Description longue (4000 caractères max)

```
Padelteammates réunit les joueurs de padel de Kénitra autour de ce qui compte
vraiment : jouer.

TROUVER UN QUATRIÈME
Un message dans un groupe, trois réponses, personne ne sait si le terrain est
réservé, et le score de la semaine dernière s'est perdu. Padelteammates remplace
tout ça.

PLANIFIER UN MATCH
Choisissez le club, le jour et le créneau — jusqu'à 23:00, parce qu'on joue tard.
Invitez vos partenaires parmi vos amis, ou laissez des places libres : la
communauté peut alors demander à vous rejoindre.

VOIR LE TERRAIN, PAS UNE LISTE
Chaque match est dessiné comme un terrain vu du dessus : votre équipe, vos
adversaires, et les places encore disponibles. On comprend la situation d'un
coup d'œil.

LE TERRAIN EST-IL RÉSERVÉ ?
N'importe quel joueur du match confirme la réservation auprès du club. Les autres
le voient immédiatement : plus personne ne se demande, plus personne n'appelle
pour rien.

GARDER LE SCORE
À l'issue du match, saisissez le résultat set par set. L'équipe adverse valide ou
corrige : les statistiques ne sont mises à jour que lorsque les deux équipes sont
d'accord.

VOTRE CLASSEMENT OFFICIEL
Si vous êtes licencié, reliez votre profil au classement national de la
Fédération Royale Marocaine de Tennis : votre rang et vos points s'affichent sur
votre profil.

CHOISIR QUI VOIT QUOI
Chaque match est public, réservé à vos amis, ou strictement privé. Vos
statistiques suivent la même logique. Votre numéro de téléphone n'est visible que
de vos amis.

NOTIFICATIONS
Invitation à un match, demande pour vous rejoindre, score à valider : vous êtes
prévenu sans avoir à ouvrir l'application.

LES CLUBS DE KÉNITRA
Lyautey Social Club, CMK — Centre Multisport Kénitra, Elite Padel Club Kenitra.

Gratuit, sans publicité.
```

---

## Ressources graphiques

| Élément | Format exigé | Fichier |
|---|---|---|
| Icône | 512×512 PNG 32 bits | `store/assets/icon-512.png` |
| Bannière | 1024×500 PNG ou JPEG | `store/assets/feature-graphic.png` |
| Captures d'écran téléphone | 2 minimum, 320–3840 px | **à prendre depuis le téléphone** |

Les captures doivent venir d'un vrai appareil : elles seront plus fidèles que
n'importe quel rendu. Les plus parlantes, dans l'ordre :

1. **Calendrier** — plusieurs matchs, dont un avec une place libre.
2. **Un match ouvert** — le terrain vu du dessus, avec « Vous » et une place libre.
3. **Planifier un match** — club, jour, créneau.
4. **Profil** — statistiques et classement FRMT.

---

## Formulaire « Sécurité des données »

Google interroge sur chaque type de donnée. Réponses conformes à ce que fait
réellement l'application.

### Général

| Question | Réponse |
|---|---|
| Les données sont-elles chiffrées en transit ? | **Oui** (HTTPS) |
| L'utilisateur peut-il demander la suppression de ses données ? | **Oui** |
| Collecte-t-on des données auprès d'enfants ? | **Non** (13 ans minimum) |

### Données collectées

| Type | Collectée | Partagée | Obligatoire | Finalité |
|---|---|---|---|---|
| Adresse e-mail | Oui | Non | Oui | Gestion du compte, authentification |
| Nom | Oui | Non | Oui | Gestion du compte, fonctionnalité |
| Numéro de téléphone | Oui | Non | **Non** | Fonctionnalité (visible des amis) |
| Autres actions dans l'app (matchs, scores) | Oui | Non | Oui | Fonctionnalité |
| Identifiants de l'appareil | Oui | Non | **Non** | Notifications push |

### À déclarer comme NON collecté

Position, contacts, photos et vidéos, fichiers, messages, données de santé,
informations financières, historique de navigation, données de performance.

### Précisions utiles

- **Aucune donnée n'est partagée avec des tiers.** Railway (hébergement), Expo et
  Firebase (acheminement des notifications) sont des sous-traitants techniques,
  pas des destinataires.
- **Aucune publicité, aucun traceur.**
- Le mot de passe n'est pas listé : Google considère qu'il relève des
  identifiants de compte, et il n'est stocké que sous forme chiffrée.

---

## Diffusion

Compte développeur **personnel** → **12 testeurs pendant 14 jours consécutifs**
avant toute publication publique.

1. Créer un **test fermé**, y inscrire au moins 12 adresses Google.
2. Téléverser l'App Bundle (`.aab`) produit par `eas build --profile production`.
3. Les testeurs installent depuis le lien d'invitation et **gardent l'app
   installée** : Google vérifie l'activité sur les 14 jours.
4. Au terme, demander le passage en production.

Pendant ces deux semaines, les corrections JavaScript se publient par
`eas update` sans nouveau téléversement.

---

## Produire les ressources graphiques

```bash
# depuis le scratchpad de la session
node gen-store-assets.mjs
```

Le script produit `store/assets/icon-512.png` et
`store/assets/feature-graphic.png` à partir de `store/feature-graphic.html` et de
l'icône de l'application.
