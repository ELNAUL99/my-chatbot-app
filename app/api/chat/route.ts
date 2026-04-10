import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { runGroqWithWebSearch } from "@/lib/groq-agent";
import { isWebSearchConfigured } from "@/lib/web-search";

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
const chatRequestSchema = z.object({
  message: z.string().trim().min(1),
  businessId: z.string().uuid(),
  sessionId: z.string().trim().min(1).max(200),
  stream: z.boolean().optional().default(false),
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
    "X-Accel-Buffering": "no",
  };
}

// CORS preflight
export function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!isOriginAllowed(origin)) {
    return new Response(null, {
      status: 403,
      headers: getCorsHeaders(origin),
    });
  }

  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

const CHAT_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const MAX_TOKENS = 300;
const MAX_TOKENS_WITH_SEARCH = 768;

function ndjsonTextStreamResponse(
  fullReply: string,
  corsHeaders: Record<string, string>,
  persistAssistant: () => Promise<void>
): Response {
  const encoder = new TextEncoder();
  const chunkSize = 32;
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const t = fullReply.trim();
        if (!t) {
          controller.enqueue(
            encoder.encode(JSON.stringify({ type: "done", reply: null }) + "\n")
          );
          return;
        }
        for (let i = 0; i < t.length; i += chunkSize) {
          const part = t.slice(i, i + chunkSize);
          controller.enqueue(
            encoder.encode(JSON.stringify({ type: "token", v: part }) + "\n")
          );
        }
        await persistAssistant();
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: "done", reply: t }) + "\n")
        );
      } catch {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "error",
              message:
                "Something went wrong while loading the reply. Tap Retry to try again.",
            }) + "\n"
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (!isOriginAllowed(origin)) {
    return NextResponse.json(
      { reply: "Origin not allowed." },
      { status: 403, headers: corsHeaders }
    );
  }

  try {
    const parsed = chatRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { reply: "Invalid request payload." },
        { status: 400, headers: corsHeaders }
      );
    }
    const { message, businessId, sessionId, stream } = parsed.data;

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
      .eq("business_id", businessId)
      .order("created_at", { ascending: true });

    const conversation = [
      { role: "system", content: business.system_prompt },
      ...(history || []),
      { role: "user", content: message },
    ];

    const groqKey = process.env.GROQ_API_KEY;
    const useWebSearch = isWebSearchConfigured() && Boolean(groqKey);

    const groqBodyBase = {
      model: CHAT_MODEL,
      messages: conversation,
      max_tokens: MAX_TOKENS,
      temperature: 0.7,
      top_p: 1,
    };

    if (stream) {
      const { error: userMsgError } = await supabase.from("messages").insert([
        {
          session_id: sessionId,
          business_id: businessId,
          role: "user",
          content: message,
        },
      ]);

      if (userMsgError) {
        return NextResponse.json(
          { reply: "Failed to save message." },
          { status: 500, headers: corsHeaders }
        );
      }

      if (useWebSearch) {
        try {
          const agentReply = await runGroqWithWebSearch(conversation, {
            model: CHAT_MODEL,
            apiKey: groqKey!,
            maxTokens: MAX_TOKENS_WITH_SEARCH,
          });

          if (agentReply) {
            return ndjsonTextStreamResponse(agentReply, corsHeaders, async () => {
              await supabase.from("messages").insert([
                {
                  session_id: sessionId,
                  business_id: businessId,
                  role: "assistant",
                  content: agentReply.trim(),
                },
              ]);
            });
          }
        } catch (error) {
          console.error("Web search failed:", error);
        }
      }

      const groqRes = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({ ...groqBodyBase, stream: true }),
        }
      );

      if (!groqRes.ok || !groqRes.body) {
        return NextResponse.json(
          {
            reply:
              "We could not reach the assistant right now. Please try again in a moment.",
          },
          { status: 502, headers: corsHeaders }
        );
      }

      const encoder = new TextEncoder();
      const ndjsonStream = new ReadableStream({
        async start(controller) {
          let fullReply = "";
          try {
            const reader = groqRes.body!.getReader();
            const dec = new TextDecoder();
            let carry = "";
            const processLine = (line: string) => {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) return;
              const payload = trimmed.slice(5).trim();
              if (payload === "[DONE]") return;
              try {
                const j = JSON.parse(payload) as {
                  choices?: Array<{ delta?: { content?: string } }>;
                };
                const piece = j.choices?.[0]?.delta?.content ?? "";
                if (piece) {
                  fullReply += piece;
                  controller.enqueue(
                    encoder.encode(
                      JSON.stringify({ type: "token", v: piece }) + "\n"
                    )
                  );
                }
              } catch {
                // ignore malformed SSE JSON
              }
            };

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              carry += dec.decode(value, { stream: true });
              const parts = carry.split("\n");
              carry = parts.pop() ?? "";
              for (const line of parts) {
                processLine(line);
              }
            }
            if (carry.trim()) {
              processLine(carry);
            }

            const replyTrimmed = fullReply.trim();
            if (replyTrimmed.length > 0) {
              await supabase.from("messages").insert([
                {
                  session_id: sessionId,
                  business_id: businessId,
                  role: "assistant",
                  content: replyTrimmed,
                },
              ]);
            }

            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "done",
                  reply: replyTrimmed || null,
                }) + "\n"
              )
            );
          } catch {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "error",
                  message:
                    "Something went wrong while loading the reply. Tap Retry to try again.",
                }) + "\n"
              )
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(ndjsonStream, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    if (useWebSearch) {
      const agentReply = await runGroqWithWebSearch(conversation, {
        model: CHAT_MODEL,
        apiKey: groqKey!,
        maxTokens: MAX_TOKENS_WITH_SEARCH,
      });

      if (agentReply) {
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
            content: agentReply.trim(),
          },
        ]);

        return NextResponse.json(
          { reply: agentReply.trim() },
          { status: 200, headers: corsHeaders }
        );
      }
    }

    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({ ...groqBodyBase, stream: false }),
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
  } catch {
    return NextResponse.json(
      { reply: "Server error." },
      { status: 500, headers: corsHeaders }
    );
  }
}
