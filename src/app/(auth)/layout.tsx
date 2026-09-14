import { ClerkProvider } from "@clerk/nextjs";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey || publishableKey === "pk_test_dummy") {
    return children;
  }

  return <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>;
}
