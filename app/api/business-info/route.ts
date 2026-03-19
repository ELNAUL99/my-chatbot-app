import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// CORS preflight
export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await req.json();

    if (!businessId) {
      return NextResponse.json(
        { error: "Missing businessId." },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const { data, error } = await supabase
      .from("businesses")
      .select("title, welcome_message")
      .eq("id", businessId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Business not found." },
        { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    return NextResponse.json(
      {
        title: data.title || "Chat Assistant",
        welcome_message: data.welcome_message || "Hi! How can I help you today?",
      },
      { status: 200, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Server error." },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
