import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Chatbot SaaS",
  description: "Multi-tenant AI chatbot for businesses",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
