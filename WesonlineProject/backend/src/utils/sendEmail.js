export const sendEmail = async ({ email, subject, message }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL;
  const senderName = process.env.SENDER_NAME || 'Group Portal Support';

  if (!apiKey || !senderEmail) {
    throw new Error(
      'Brevo API key or sender email is missing from environment variables.'
    );
  }

  try {
    const response = await fetch(
      'https://api.brevo.com/v3/smtp/email',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: senderName,
            email: senderEmail,
          },
          to: [{ email }],
          subject,
          textContent: message,
        }),
      }
    );

    const responseText = await response.text();
    let data = {};

    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { message: responseText };
      }
    }

    if (!response.ok) {
      console.error('Brevo API error:', response.status, data);

      throw new Error(
        data.message || `Brevo failed with status ${response.status}.`
      );
    }

    return data;
  } catch (error) {
    console.error('Email dispatch failed:', error.message);
    throw error;
  }
};