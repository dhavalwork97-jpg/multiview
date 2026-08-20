import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Nav } from "@/components/layout/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "FGC Stream — Competition & Live Broadcast Platform",
  description:
    "Run tournaments, leagues and competitions for esports, sports and custom formats with live scoring, brackets and broadcast control.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className="min-h-screen bg-arena-950 text-ink">
          <Nav />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
