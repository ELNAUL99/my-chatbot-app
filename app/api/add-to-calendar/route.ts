import { NextRequest } from "next/server";
import { google } from "googleapis";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, date, time, people } = body;

    const startDateTime = new Date(`${date}T${time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 90 * 60000);

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    const calendar = google.calendar({ version: "v3", auth });

    const event = {
      summary: `Reservation – ${name} (${people} people)`,
      description: `Customer email: ${email}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: "Europe/Helsinki",
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: "Europe/Helsinki",
      },
    };

    await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID!,
      requestBody: event,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("Calendar error:", error);
    return new Response(JSON.stringify({ error: "Failed to add event" }), { status: 500 });
  }
}
