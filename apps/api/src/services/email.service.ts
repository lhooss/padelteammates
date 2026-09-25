import { env } from '../config/env.js';

// Envoi transactionnel via Resend. Une simple requete HTTP suffit : pas de
// dependance supplementaire, comme pour les notifications push.
const RESEND_URL = 'https://api.resend.com/emails';

interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Envoie un email. Volontairement silencieux : l'appelant ne doit jamais reveler
// si l'adresse existe, et une panne du service d'envoi ne doit pas faire echouer
// la requete du joueur. Les echecs sont journalises.
export async function sendEmail(email: Email): Promise<boolean> {
  if (env.NODE_ENV === 'test') return true;

  // Sans cle configuree, l'API reste utilisable : le contenu part dans les
  // journaux, ce qui depanne en developpement sans compte Resend.
  if (!env.RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY absente — email non envoye a ${email.to}\n${email.text}`);
    return false;
  }

  try {
    const response = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });

    if (!response.ok) {
      console.error(`[email] refus de Resend (HTTP ${response.status}) pour ${email.to}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] envoi impossible:', err instanceof Error ? err.message : err);
    return false;
  }
}

// Email de reinitialisation. Le texte simple compte autant que la version HTML :
// certains clients de messagerie n'affichent que lui.
export function passwordResetEmail(code: string, minutes: number): Omit<Email, 'to'> {
  const text = [
    'Vous avez demandé à réinitialiser votre mot de passe Padelteammates.',
    '',
    `Votre code : ${code}`,
    '',
    `Il est valable ${minutes} minutes et ne sert qu'une fois.`,
    "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.",
  ].join('\n');

  const html = `<!doctype html>
<html lang="fr"><body style="margin:0;padding:24px;background:#EDF2F8;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#0D1A33;line-height:1.6">
  <div style="max-width:32rem;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden">
    <div style="background:#1F4FA0;padding:22px 24px">
      <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:.5px;text-transform:uppercase">Padelteammates</div>
    </div>
    <div style="padding:24px">
      <p style="margin:0 0 16px">Vous avez demandé à réinitialiser votre mot de passe.</p>
      <p style="margin:0 0 6px;font-size:13px;color:#5A6A86;text-transform:uppercase;letter-spacing:1.2px">Votre code</p>
      <p style="margin:0 0 18px;font-size:36px;font-weight:800;letter-spacing:8px;color:#0D1A33">${code}</p>
      <p style="margin:0 0 16px">Il est valable <strong>${minutes} minutes</strong> et ne sert qu'une fois.</p>
      <p style="margin:0;color:#5A6A86;font-size:14px">
        Si vous n'êtes pas à l'origine de cette demande, ignorez ce message :
        votre mot de passe reste inchangé.
      </p>
    </div>
  </div>
</body></html>`;

  return { subject: `Code de réinitialisation : ${code}`, html, text };
}
