import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { NavGate } from "@/components/layout/NavGate";
import "./globals.css";

export const metadata: Metadata = {
  title: "FGC Stream",
  description: "Universal Esports Competition Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <NavGate />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
