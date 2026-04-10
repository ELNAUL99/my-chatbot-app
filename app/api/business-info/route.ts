import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- CORS CONFIG ---
// Configure allowed origins via environment variable
// Format: comma-separated list of URLs
const getAllowedOrigins = (): string[] => {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(",").map(o => o.trim()).filter(Boolean);
  }
  return ["https://my-chatbot-app-chi.vercel.app"];
};

const ALLOWED_ORIGINS = getAllowedOrigins();
const businessInfoRequestSchema = z.object({
  businessId: z.string().uuid(),
});

function isOriginAllowed(origin: string | null): boolean {
  return !origin || ALLOWED_ORIGINS.includes(origin);
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  // Check if the origin is allowed
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  
  // Only return the allowed origin if it matches
  // Otherwise return the first allowed origin (prevents information leakage)
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin! : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

// --- Preflight ---
export function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!isOriginAllowed(origin)) {
    return NextResponse.json(
      { error: "Origin not allowed." },
      { status: 403, headers: getCorsHeaders(origin) }
    );
  }
  return NextResponse.json({}, { status: 200, headers: getCorsHeaders(origin) });
}

// --- Main Handler ---
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (!isOriginAllowed(origin)) {
    return NextResponse.json(
      { error: "Origin not allowed." },
      { status: 403, headers: corsHeaders }
    );
  }

  try {
    const parsed = businessInfoRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload." },
        { status: 400, headers: corsHeaders }
      );
    }
    const { businessId } = parsed.data;

    const { data, error } = await supabase
      .from("businesses")
      .select(`
        title,
        welcome_message,
        bubble_icon,
        bubble_color,
        bubble_text_color,
        header_color,
        header_text_color,
        theme_primary,
        theme_secondary
      `)
      .eq("id", businessId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Business not found." },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        title: data.title || "Chat Assistant",
        welcome_message: data.welcome_message || null,

        bubble_icon: data.bubble_icon || "💬",
        bubble_color: data.bubble_color || "#1C64F2",
        bubble_text_color: data.bubble_text_color || "#FFFFFF",

        header_color: data.header_color || "#1C64F2",
        header_text_color: data.header_text_color || "#FFFFFF",

        theme_primary: data.theme_primary || "#1C64F2",
        theme_secondary: data.theme_secondary || "#0F3BB2",
      },
      { status: 200, headers: corsHeaders }
    );
  } catch {
    return NextResponse.json(
      { error: "Server error." },
      { status: 500, headers: corsHeaders }
    );
  }
}
