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
    // ⭐ FIXED TIME HANDLING (NO UTC CONVERSION)
    // -------------------------------
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);

    // Start time (local)
    const startDate = new Date(year, month - 1, day, hour, minute);

    // End time (local) — +90 minutes
    const endDate = new Date(startDate.getTime() + 90 * 60000);

    // Format as RFC3339 WITHOUT converting to UTC
    const startDateTimeString =
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T` +
      `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;

    const endDateTimeString =
      `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}T` +
      `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}:00`;

    console.log("Start (local):", startDateTimeString);
    console.log("End (local):", endDateTimeString);

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
        dateTime: startDateTimeString,
        timeZone: "Europe/Helsinki",
      },
      end: {
        dateTime: endDateTimeString,
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
