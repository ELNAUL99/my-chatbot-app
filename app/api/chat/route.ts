import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
    const { message, businessId, sessionId } = await req.json();

    if (!message || !businessId || !sessionId) {
      return NextResponse.json(
        { reply: "Missing message, businessId, or sessionId." },
        { status: 400 }
      );
    }

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("system_prompt, is_active")
      .eq("id", businessId)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { reply: "This business does not exist or has no system prompt." },
        { status: 404 }
      );
    }

    if (!business.is_active) {
      return NextResponse.json(
        { reply: "This chatbot is currently inactive." },
        { status: 403 }
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
        { status: 500 }
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
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
