import { webSearchForModel } from "./web-search";

const WEB_SEARCH_TOOL = {
  type: "function" as const,
  function: {
    name: "web_search",
    description:
      "Search the public web for up-to-date facts: news, prices, hours, weather, sports, product info, or anything after your knowledge cutoff. Use short, focused queries.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "What to look up (e.g. 'Helsinki weather today')",
        },
      },
      required: ["query"],
    },
  },
};

type ToolCall = {
  id: string;
  type: string;
  function?: { name: string; arguments: string };
};

/** OpenAI-compatible chat message shapes for Groq */
export type GroqAgentMessage = Record<string, unknown>;

/**
 * Runs Groq with web_search tool until the model returns a normal assistant message (no tool calls).
 */
export async function runGroqWithWebSearch(
  messages: GroqAgentMessage[],
  options: {
    model: string;
    apiKey: string;
    maxTokens: number;
    temperature?: number;
    topP?: number;
  }
): Promise<string | null> {
  const {
    model,
    apiKey,
    maxTokens,
    temperature = 0.7,
    topP = 1,
  } = options;

  const msgs: GroqAgentMessage[] = [...messages];
  const maxRounds = 6;

  for (let round = 0; round < maxRounds; round += 1) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: msgs,
        max_tokens: maxTokens,
        temperature,
        top_p: topP,
        tools: [WEB_SEARCH_TOOL],
        tool_choice: "auto",
        stream: false,
      }),
    });

    const data = (await res.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
          tool_calls?: ToolCall[];
        };
      }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      console.error("Groq agent error:", data?.error ?? res.status);
      return null;
    }

    const choice = data?.choices?.[0]?.message;
    if (!choice) return null;

    msgs.push(choice as GroqAgentMessage);

    const toolCalls = choice.tool_calls;
    if (!toolCalls?.length) {
      const text = (choice.content ?? "").trim();
      return text.length > 0 ? text : null;
    }

    for (const tc of toolCalls) {
      if (tc.type !== "function" || tc.function?.name !== "web_search") {
        msgs.push({
          role: "tool",
          tool_call_id: tc.id,
          content: "That tool is not available. Continue without it.",
        });
        continue;
      }

      let query = "";
      try {
        const args = JSON.parse(tc.function.arguments || "{}") as {
          query?: string;
        };
        query = String(args.query ?? "").trim();
      } catch {
        query = "";
      }

      const searchText = await webSearchForModel(query);
      msgs.push({
        role: "tool",
        tool_call_id: tc.id,
        content: searchText,
      });
    }
  }

  return null;
}
