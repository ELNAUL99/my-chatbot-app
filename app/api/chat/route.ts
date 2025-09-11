import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json() as { message: string };

    // For now, just echo the message back
    return NextResponse.json({ reply: `You said: ${message}` });
  } catch (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
