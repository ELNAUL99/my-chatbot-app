import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

// CORS preflight
export function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const { message, businessId, sessionId } = await req.json();

    if (!message || !businessId || !sessionId) {
      return NextResponse.json(
        { reply: "Missing message, businessId, or sessionId." },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("system_prompt, is_active, welcome_message")
      .eq("id", businessId)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { reply: "This business does not exist or has no system prompt." },
        { status: 404, headers: corsHeaders }
      );
    }

    if (!business.is_active) {
      return NextResponse.json(
        { reply: "This chatbot is currently inactive." },
        { status: 403, headers: corsHeaders }
      );
    }

    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    const conversation = [
      { role: "system", content: business.system_prompt },
      ...(history || []),
      { role: "user", content: message },
    ];

    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: conversation,
          max_tokens: 300,
          temperature: 0.7,
          top_p: 1,
          stream: false,
        }),
      }
    );

    const groqData = await groqRes.json();
    const reply = groqData?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return NextResponse.json(
        { reply: "The AI returned no response." },
        { status: 500, headers: corsHeaders }
      );
    }

    await supabase.from("messages").insert([
      {
        session_id: sessionId,
        business_id: businessId,
        role: "user",
        content: message,
      },
      {
        session_id: sessionId,
        business_id: businessId,
        role: "assistant",
        content: reply,
      },
    ]);

    return NextResponse.json(
      { reply },
      { status: 200, headers: corsHeaders }
    );
  } catch (_error) {
    return NextResponse.json(
      { reply: "Server error." },
      { status: 500, headers: corsHeaders }
    );
  }
}
