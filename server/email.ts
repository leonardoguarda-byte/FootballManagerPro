import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email};
}

async function getUncachableResendClient() {
  const credentials = await getCredentials();
  return {
    client: new Resend(credentials.apiKey),
    fromEmail: credentials.fromEmail
  };
}

export async function sendPasswordEmail(
  recipientEmail: string,
  recipientName: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();

    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: [recipientEmail],
      subject: 'Suas Credenciais de Acesso - Natus Vincere Academy',
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Credenciais de Acesso</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
            <h1 style="color: #2c3e50; margin-bottom: 20px;">Bem-vindo à Natus Vincere Academy</h1>
            
            <p>Olá <strong>${recipientName}</strong>,</p>
            
            <p>Sua conta foi criada com sucesso! Abaixo estão suas credenciais de acesso:</p>
            
            <div style="background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3498db;">
              <p style="margin: 5px 0;"><strong>E-mail:</strong> ${recipientEmail}</p>
              <p style="margin: 5px 0;"><strong>Senha:</strong> ${password}</p>
            </div>
            
            <p style="color: #e74c3c; font-weight: bold;">⚠️ Por favor, altere sua senha no primeiro acesso por questões de segurança.</p>
            
            <p>Você pode acessar o sistema através do link fornecido pelo administrador.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="font-size: 12px; color: #777;">
                Se você não solicitou esta conta, por favor entre em contato com o administrador do sistema.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Erro ao enviar e-mail:', error);
      return { success: false, error: error.message };
    }

    console.log('E-mail enviado com sucesso:', data);
    return { success: true };
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido ao enviar e-mail' 
    };
  }
}
