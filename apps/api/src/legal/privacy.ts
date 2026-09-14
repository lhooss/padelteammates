// Politique de confidentialite, exigee par Google Play avant toute soumission.
// Servie par l'API pour disposer d'une URL publique stable sous le domaine du projet.
// A jour du 14 septembre 2026.

const CONTACT_EMAIL = 'contact@padelteammates.com';

export const PRIVACY_HTML = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Padelteammates — Politique de confidentialité</title>
<style>
  :root { color-scheme: light; }
  body {
    margin: 0 auto; padding: 32px 20px 64px; max-width: 44rem;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    line-height: 1.6; color: #0D1A33; background: #EDF2F8;
  }
  h1 { font-size: 1.9rem; margin: 0 0 4px; }
  h2 { font-size: 1.15rem; margin: 32px 0 8px; }
  .maj { color: #5A6A86; font-size: .9rem; margin-bottom: 28px; }
  ul { padding-left: 20px; }
  li { margin: 6px 0; }
  a { color: #1F4FA0; }
  table { border-collapse: collapse; width: 100%; margin-top: 8px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #D5DEEA; vertical-align: top; }
  th { font-size: .85rem; text-transform: uppercase; letter-spacing: .04em; color: #5A6A86; }
</style>
</head>
<body>
  <h1>Politique de confidentialité</h1>
  <p class="maj">Padelteammates — dernière mise à jour : 14 septembre 2026</p>

  <p>
    Padelteammates est une application qui permet aux joueurs de padel de Kénitra d'organiser
    leurs matchs, d'inviter leurs partenaires et de suivre leurs résultats. Cette page explique
    quelles données sont collectées, pourquoi, et ce que vous pouvez en faire.
  </p>

  <h2>Données collectées</h2>
  <table>
    <tr><th>Donnée</th><th>Pourquoi</th><th>Obligatoire</th></tr>
    <tr><td>Nom et adresse e-mail</td><td>Créer votre compte et vous connecter</td><td>Oui</td></tr>
    <tr><td>Mot de passe</td><td>Protéger votre compte. Il est conservé sous forme chiffrée et n'est jamais lisible.</td><td>Oui</td></tr>
    <tr><td>Numéro de téléphone</td><td>Permettre à vos amis de vous joindre. Visible de vos amis uniquement.</td><td>Non</td></tr>
    <tr><td>Profil padel (niveau, côté, main, club habituel)</td><td>Aider les joueurs à composer des équipes</td><td>Non</td></tr>
    <tr><td>Matchs, scores et statistiques</td><td>Organiser les rencontres et afficher vos résultats</td><td>Oui</td></tr>
    <tr><td>Identifiant de notification de l'appareil</td><td>Vous prévenir d'une invitation ou d'un score à valider</td><td>Non</td></tr>
    <tr><td>Classement national FRMT</td><td>Afficher votre classement officiel, si vous demandez à l'associer</td><td>Non</td></tr>
  </table>

  <p>
    L'application ne collecte <strong>pas</strong> votre position, n'accède pas à vos contacts,
    ne lit pas vos photos et n'affiche aucune publicité.
  </p>

  <h2>Qui voit quoi</h2>
  <ul>
    <li>Vos statistiques sont visibles de tous si vous activez le profil public, sinon de vos amis seulement.</li>
    <li>Votre numéro de téléphone n'est visible que de vos amis.</li>
    <li>Un match est visible selon le choix de son organisateur : toute la communauté, ses amis, ou les seuls joueurs du match.</li>
  </ul>

  <h2>Partage avec des tiers</h2>
  <p>Vos données ne sont ni vendues ni cédées. Elles transitent uniquement par les prestataires nécessaires au fonctionnement :</p>
  <ul>
    <li><strong>Railway</strong> — hébergement de l'application et de la base de données.</li>
    <li><strong>Expo et Google Firebase</strong> — acheminement des notifications vers votre téléphone. Seuls le texte de la notification et l'identifiant de votre appareil leur sont transmis.</li>
  </ul>

  <h2>Conservation</h2>
  <p>
    Vos données sont conservées tant que votre compte existe. À sa suppression, votre compte,
    vos participations et vos appareils enregistrés sont effacés. Les matchs auxquels vous avez
    participé peuvent subsister sans votre nom, pour ne pas altérer les résultats des autres joueurs.
  </p>

  <h2>Vos droits</h2>
  <p>
    Vous pouvez consulter et modifier vos informations depuis l'onglet Profil de l'application,
    et demander la suppression de votre compte ou une copie de vos données en écrivant à
    <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>. Toute demande reçoit une réponse sous 30 jours.
  </p>

  <h2>Enfants</h2>
  <p>L'application n'est pas destinée aux personnes de moins de 13 ans.</p>

  <h2>Modifications</h2>
  <p>
    Cette politique peut évoluer. La date de dernière mise à jour figure en haut de cette page,
    et tout changement notable sera signalé dans l'application.
  </p>

  <h2>Contact</h2>
  <p><a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
</body>
</html>
`;
