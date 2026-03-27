import { NextRequest } from "next/server";
import { google } from "googleapis";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Map restaurant → calendar ID
const CALENDARS: Record<string, string | undefined> = {
  pizza: process.env.CALENDAR_PIZZA,
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    console.log("📩 Calendar API hit");

    const body = await req.json();
    console.log("Received body:", body);

    const { restaurant, name, email, date, time, people } = body;

    const calendarId = CALENDARS[restaurant];
    if (!calendarId) {
      console.error("Unknown restaurant:", restaurant);
      return new Response(
        JSON.stringify({ error: "Unknown restaurant" }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log("Using calendar:", calendarId);

    console.log("ENV CHECK:", {
      serviceEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      keyLoaded: !!process.env.GOOGLE_PRIVATE_KEY,
    });

    // -------------------------------
    // ⭐ FIXED TIME HANDLING (LOCAL TIME)
    // -------------------------------
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);

    const startDateTime = new Date(year, month - 1, day, hour, minute);
    const endDateTime = new Date(startDateTime.getTime() + 90 * 60000);

    console.log("Start:", startDateTime.toISOString());
    console.log("End:", endDateTime.toISOString());

    // Google Auth
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
      description: `Customer email: ${email}\nRestaurant: ${restaurant}`,
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
      calendarId,
      requestBody: event,
    });

    console.log("✅ Event inserted successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (error) {
    console.error("❌ Calendar error:", error);
    return new Response(JSON.stringify({ error: "Failed to add event" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}
