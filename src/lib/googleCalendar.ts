import { handleInvalidAuthToken } from './googleAuth';

// Google Calendar API Integration Helper

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string; // ISO string e.g. 2026-08-20T09:00:00+07:00
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  htmlLink?: string;
}

export const createCalendarEvent = async (
  accessToken: string,
  event: CalendarEvent
): Promise<CalendarEvent> => {
  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: event.start,
        end: event.end,
      }),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      await handleInvalidAuthToken();
      throw new Error('GOOGLE_AUTH_EXPIRED: เซสชัน Google Calendar หมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || 'Failed to create event in Google Calendar'
    );
  }

  return await response.json();
};

export const listUpcomingCalendarEvents = async (
  accessToken: string
): Promise<CalendarEvent[]> => {
  const now = new Date().toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    now
  )}&maxResults=10&orderBy=startTime&singleEvents=true`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      await handleInvalidAuthToken();
      throw new Error('GOOGLE_AUTH_EXPIRED: เซสชัน Google Calendar หมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || 'Failed to fetch Google Calendar events'
    );
  }

  const data = await response.json();
  return data.items || [];
};

