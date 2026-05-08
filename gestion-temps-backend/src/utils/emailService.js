const { spawn } = require("node:child_process");

const APP_LOGIN_URL = "https://feuilledetemp.netlify.app/#/login";

const escapeHeaderValue = (value) => String(value || "").replace(/[\r\n]+/g, " ").trim();

const getInvitationText = ({ firstName, email, plainPassword }) => {
  const greeting = firstName?.trim() ? `Bonjour ${firstName.trim()},` : "Bonjour,";
  return [
    greeting,
    "",
    "Votre compte a ete cree sur l'application Feuille de Temps Etika.",
    "",
    `Lien de connexion: ${APP_LOGIN_URL}`,
    `Email: ${email}`,
    `Mot de passe temporaire: ${plainPassword}`,
    "",
    "Vous pouvez modifier votre mot de passe apres votre premiere connexion.",
    "",
    "Cordialement,",
    "Equipe Etika",
  ].join("\n");
};

const sendViaResendApi = async ({ to, firstName, email, plainPassword }) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const from = process.env.MAIL_FROM || "onboarding@resend.dev";
  const bodyText = getInvitationText({ firstName, email, plainPassword });
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Invitation - Feuille de Temps Etika",
      text: bodyText,
    }),
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend API error ${response.status}: ${details}`);
  }
  return true;
};

const sendUserInvitationEmail = async ({ to, firstName, email, plainPassword }) => {
  const sentByResend = await sendViaResendApi({ to, firstName, email, plainPassword });
  if (sentByResend) return;

  const safeTo = escapeHeaderValue(to);
  const safeSubject = escapeHeaderValue("Invitation - Feuille de Temps Etika");
  const safeFrom = escapeHeaderValue(process.env.MAIL_FROM || "no-reply@feuilledetemp.local");
  const body = getInvitationText({ firstName, email, plainPassword });

  const rawMessage =
    `From: ${safeFrom}\n` +
    `To: ${safeTo}\n` +
    `Subject: ${safeSubject}\n` +
    "Content-Type: text/plain; charset=UTF-8\n" +
    "\n" +
    body +
    "\n";

  await new Promise((resolve, reject) => {
    const proc = spawn("/usr/sbin/sendmail", ["-t", "-oi"]);
    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) return resolve();
      reject(new Error(stderr || `sendmail exited with code ${code}`));
    });
    proc.stdin.write(rawMessage);
    proc.stdin.end();
  });
};

module.exports = {
  sendUserInvitationEmail,
  APP_LOGIN_URL,
};
