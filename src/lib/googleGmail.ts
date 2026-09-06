import { handleInvalidAuthToken } from './googleAuth';

// Gmail API Integration Helper

export interface SendEmailPayload {
  to: string;
  subject: string;
  bodyText: string;
}

export const sendGmailMessage = async (
  accessToken: string,
  payload: SendEmailPayload
): Promise<any> => {
  // Construct raw MIME email
  const utf8Subject = `=?utf-8?B?${btoa(
    unescape(encodeURIComponent(payload.subject))
  )}?=`;
  const messageParts = [
    `To: ${payload.to}`,
    `Subject: ${utf8Subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    '',
    payload.bodyText,
  ];
  const message = messageParts.join('\r\n');

  // Base64URL encode the raw email string
  const encodedMessage = btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedMessage,
      }),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      await handleInvalidAuthToken();
      throw new Error('GOOGLE_AUTH_EXPIRED: เซสชัน Gmail หมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || 'Failed to send email via Gmail API'
    );
  }

  return await response.json();
};

