import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const res = await fetch(
      `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.BING_API_KEY!,
        },
      }
    );

    const data = await res.json();

    return NextResponse.json({
      answerBox: data.answerBox || null,
      webPages: data.webPages?.value || [],
      places: data.places?.value || [],
    });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
