/**
 * Tavily search formatted for LLM context.
 * Set TAVILY_API_KEY in the environment (https://tavily.com).
 */
export async function webSearchForModel(query: string): Promise<string> {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key) {
    return "Web search is not configured on the server.";
  }

  const q = query.trim() || "general information";

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query: q,
        search_depth: "basic",
        max_results: 5,
        include_answer: false,
      }),
    });

    if (!res.ok) {
      return `Search could not be completed (${res.status}). Answer from general knowledge if appropriate.`;
    }

    const data = (await res.json()) as {
      results?: Array<{ title?: string; url?: string; content?: string }>;
    };

    const results = data.results ?? [];
    if (results.length === 0) {
      return "No matching web results. Answer from general knowledge if you can.";
    }

    return results
      .map(
        (r) =>
          `### ${r.title ?? "Result"}\nURL: ${r.url ?? ""}\n${r.content ?? ""}`
      )
      .join("\n\n---\n\n");
  } catch {
    return "Search failed due to a network error. Answer without web data if possible.";
  }
}

export function isWebSearchConfigured(): boolean {
  return Boolean(process.env.TAVILY_API_KEY?.trim());
}
