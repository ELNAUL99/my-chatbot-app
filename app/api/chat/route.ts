import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create Supabase client (server-side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { message, businessId } = await req.json();

    if (!message || !businessId) {
      return NextResponse.json(
        { reply: "⚠️ Missing message or business ID." },
        { status: 400 }
      );
    }

    // 1️⃣ Fetch the system prompt for this business
    const { data: business, error } = await supabase
      .from("businesses")
      .select("system_prompt, is_active")
      .eq("id", businessId)
      .single();

    if (error || !business) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { reply: "⚠️ No system prompt found for this business." },
        { status: 404 }
      );
    }

    if (!business.is_active) {
      return NextResponse.json(
        { reply: "⚠️ This chatbot is currently inactive." },
        { status: 403 }
      );
    }

    // 2️⃣ Call Groq API with the dynamic system prompt
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          { role: "system", content: business.system_prompt },
          { role: "user", content: message },
        ],
        max_tokens: 300,
        temperature: 0.7,
        top_p: 1,
        stream: false,
      }),
    });

    const data = await res.json();
    console.log("Groq raw response:", JSON.stringify(data, null, 2));

    // 3️⃣ Extract the reply
    const reply = data?.choices?.[0]?.message?.content?.trim();

    return NextResponse.json({
      reply: reply || "⚠️ Model returned no text.",
    });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { reply: "⚠️ Error contacting AI service." },
      { status: 500 }
    );
  }
}
