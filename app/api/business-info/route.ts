import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- CORS CONFIG ---
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// --- Preflight ---
export function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

// --- Main Handler ---
export async function POST(req: NextRequest) {
  try {
    const { businessId } = await req.json();

    if (!businessId) {
      return NextResponse.json(
        { error: "Missing businessId." },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data, error } = await supabase
      .from("businesses")
      .select(`
        title,
        welcome_message,
        system_prompt,
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
        system_prompt: data.system_prompt || "",

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
  } catch (err) {
    return NextResponse.json(
      { error: "Server error." },
      { status: 500, headers: corsHeaders }
    );
  }
}
