import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { NavGate } from "@/components/layout/NavGate";
import "./globals.css";
import { Nav } from "@/components/layout/Nav";

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
