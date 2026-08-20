import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Nav } from "@/components/layout/Nav";
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
          <Nav />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
