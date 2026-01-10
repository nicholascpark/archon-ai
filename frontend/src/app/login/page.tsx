import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 parchment-texture">
      {/* Back to home */}
      <Link
        href="/"
        className="absolute top-6 left-6 sigil text-xl hover:animate-pulse-soft"
      >
        &#9737;
      </Link>

      {/* Login form */}
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-2xl text-cream text-center mb-8">
          return
        </h1>
        <LoginForm />
      </div>
    </div>
  );
}
