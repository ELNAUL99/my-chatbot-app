import { NextRequest } from "next/server";
import { google } from "googleapis";
import { z } from "zod";

// --- CORS CONFIG ---
const getAllowedOrigins = (): string[] => {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(",").map(o => o.trim()).filter(Boolean);
  }
  return ["https://my-chatbot-app-chi.vercel.app"];
};

const ALLOWED_ORIGINS = getAllowedOrigins();
const calendarRequestSchema = z.object({
  restaurant: z.string().trim().min(1),
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  people: z.coerce.number().int().min(1).max(50),
});

function isOriginAllowed(origin: string | null): boolean {
  return !origin || ALLOWED_ORIGINS.includes(origin);
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  // Check if the origin is allowed
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  
  // only return the allowed origin if it matches
  // Otherwise return the first allowed origin (prevents information leakage)
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin! : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

// Map restaurant → calendar ID
const CALENDARS: Record<string, string | undefined> = {
  pizza: process.env.CALENDAR_PIZZA,
};

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!isOriginAllowed(origin)) {
    return new Response(null, { status: 403, headers: getCorsHeaders(origin) });
  }
  return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (!isOriginAllowed(origin)) {
    return new Response(
      JSON.stringify({ error: "Origin not allowed." }),
      { status: 403, headers: corsHeaders }
    );
  }

  try {
    const parsed = calendarRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request payload" }),
        { status: 400, headers: corsHeaders }
      );
    }
    const { restaurant, name, email, date, time, people } = parsed.data;

    const calendarId = CALENDARS[restaurant];
    if (!calendarId) {
      return new Response(
        JSON.stringify({ error: "Unknown restaurant" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Parse date and time
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);

    // Validate date components
    if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return new Response(
        JSON.stringify({ error: "Invalid date or time values" }),
        { status: 400, headers: corsHeaders }
      );
    }

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

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (error) {
    // Log error internally (don't expose details to client)
    console.error("Calendar API error:", error);
    
    return new Response(JSON.stringify({ error: "Failed to add event" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}
