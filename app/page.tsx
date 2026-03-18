"use client";

import ChatPreview from "@/components/ChatPreview";

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">Widget Preview</h2>
        <ChatPreview />
      </section>
    </main>
  );
}
