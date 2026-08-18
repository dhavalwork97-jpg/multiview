import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Nav } from "@/components/layout/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "FGC Stream — every station, live",
  description: "Watch any fighting-game tournament match, on any station, the instant it starts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const content = (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-arena-950 text-ink">
        <Nav />
        {children}
      </body>
    </html>
  );

  // Clerk requires a publishable key at render time. Keeping the provider
  // out when the key is absent lets local production builds succeed without
  // fake credentials. Production deployments should always configure the
  // real NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return publishableKey ? (
    <ClerkProvider publishableKey={publishableKey}>{content}</ClerkProvider>
  ) : (
    content
  );
}
