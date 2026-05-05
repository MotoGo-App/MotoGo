export async function sendForgotPasswordEmail(email: string, htmlBody: string) {
  const response = await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deployment_token: process.env.ABACUSAI_API_KEY,
      app_id: process.env.WEB_APP_ID,
      notification_id: process.env.NOTIF_ID_RECUPERACIN_DE_CONTRASEA,
      subject: 'Restablecer contraseña - MotoGo',
      body: htmlBody,
      is_html: true,
      recipient_email: email,
      sender_email: `noreply@motogo.lat`,
      sender_alias: 'MotoGo',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Fallo al contactar con el proveedor de email');
  }

  return true;
}
