import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-arena-950">
      <SignIn
        routing="path"
        path="/sign-in"
        fallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/dashboard"
      />
    </main>
  );
}
