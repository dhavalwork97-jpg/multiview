import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Nav } from "@/components/layout/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "FGC Stream — every station, live",
  description: "Watch any fighting-game tournament match, on any station, the instant it starts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
