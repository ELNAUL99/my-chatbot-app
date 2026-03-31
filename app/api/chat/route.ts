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
    const { message, businessId, sessionId } = await req.json();

    if (!message || !businessId || !sessionId) {
      return NextResponse.json(
        { reply: "Missing message, businessId, or sessionId." },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // 1. Load business settings
    const { data: business } = await supabase
      .from("businesses")
      .select("system_prompt, is_active, welcome_message")
      .eq("id", businessId)
      .single();

    if (!business) {
      return NextResponse.json(
        { reply: "This business does not exist or has no system prompt." },
        { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    if (!business.is_active) {
      return NextResponse.json(
        { reply: "This chatbot is currently inactive." },
        { status: 403, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // 2. Load chat history
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

    // 3. First model call — let Groq decide if it wants to use search
    const firstRes = await fetch(
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
          tools: [
            {
              type: "function",
              function: {
                name: "searchWeb",
                description: "Search the web for real-time information",
                parameters: {
                  type: "object",
                  properties: {
                    query: { type: "string" },
                  },
                  required: ["query"],
                },
              },
            },
          ],
          tool_choice: "auto",
          max_tokens: 300,
          temperature: 0.7,
        }),
      }
    );

    const firstData = await firstRes.json();
    const firstChoice = firstData?.choices?.[0];
    const toolCalls = firstChoice?.message?.tool_calls;

    // 4. If no tool call → normal reply
    if (!toolCalls || toolCalls.length === 0) {
      const reply = firstChoice?.message?.content?.trim() || "No response.";

      await supabase.from("messages").insert([
        { session_id: sessionId, business_id: businessId, role: "user", content: message },
        { session_id: sessionId, business_id: businessId, role: "assistant", content: reply },
      ]);

      return NextResponse.json(
        { reply },
        { status: 200, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // 5. Tool call detected → perform web search
    const toolCall = toolCalls[0];
    const args = JSON.parse(toolCall.function.arguments);
    const query = args.query;

    const searchRes = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const searchData = await searchRes.json();

    // Log search into messages table
    await supabase.from("messages").insert({
      session_id: sessionId,
      business_id: businessId,
      role: "assistant",
      content: "(search executed)",
      search_query: query,
      search_result: searchData,
    });

    // 6. Second model call — give search results back to Groq
    const secondRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            ...conversation,
            firstChoice.message,
            {
              role: "tool",
              name: "searchWeb",
              content: JSON.stringify(searchData),
            },
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      }
    );

    const secondData = await secondRes.json();
    const finalReply = secondData?.choices?.[0]?.message?.content?.trim() || "No response.";

    // 7. Save final assistant reply
    await supabase.from("messages").insert({
      session_id: sessionId,
      business_id: businessId,
      role: "assistant",
      content: finalReply,
    });

    return NextResponse.json(
      { reply: finalReply },
      { status: 200, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json(
      { reply: "Server error." },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
