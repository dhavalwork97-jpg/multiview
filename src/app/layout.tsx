import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Barlow_Condensed, Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { NavGate } from "@/components/layout/NavGate";
import "./globals.css";
import "./fgc-v32.css";
import "./fgc-v33-viewer.css";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";

const displayFont = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display-local",
  display: "swap",
});

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body-local",
  display: "swap",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-mono-local",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FGC Stream",
  description: "Universal Esports Competition Platform",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const clerkConfigured = Boolean(clerkPublishableKey && clerkPublishableKey !== "pk_test_dummy");
  const demoMode = (await cookies()).get("fgc-demo")?.value === "1";

  const content = (
    <>
      <NavGate>
        <Nav />
      </NavGate>
      {children}
      <Footer />
    </>
  );

  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
      <body>
        {clerkConfigured && !demoMode ? (
          <ClerkProvider publishableKey={clerkPublishableKey}>{content}</ClerkProvider>
        ) : (
          content
        )}
      </body>
    </html>
  );
}
