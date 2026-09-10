import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { NavGate } from "@/components/layout/NavGate";
import "./globals.css";
import "./fgc-v32.css";
import "./fgc-v33-viewer.css";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "FGC Stream",
  description: "Universal Esports Competition Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const clerkConfigured = Boolean(clerkPublishableKey && clerkPublishableKey !== "pk_test_dummy");

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
    <html lang="en">
      <body>
        {clerkConfigured ? (
          <ClerkProvider publishableKey={clerkPublishableKey}>{content}</ClerkProvider>
        ) : (
          content
        )}
      </body>
    </html>
  );
}
