import nodemailer from "nodemailer";

export async function sendResetEmail(
  email: string,
  token: string,
  baseUrl: string
) {
  const resetLink = `${baseUrl}/reset-password?token=${token}`;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: "nextrack.contact@gmail.com",
      pass: "iexv qhaw jtkq cduy",
    },
  });

  await transporter.sendMail({
    from: '"NexTrack Support" <nextrack.contact@gmail.com>',
    to: email,
    subject: "Définissez votre mot de passe NexTrack",
    html: `
      <p>Bonjour,</p>
      <p>Votre compte a été créé sur NexTrack.</p>
      <p>Veuillez définir votre mot de passe en cliquant ici :</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>Ce lien expirera dans 1 heure.</p>
    `,
  });
}
