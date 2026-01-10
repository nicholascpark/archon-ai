import { RegisterForm } from "@/components/auth/register-form";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 parchment-texture">
      {/* Back to home */}
      <Link
        href="/"
        className="absolute top-6 left-6 sigil text-xl hover:animate-pulse-soft"
      >
        &#9737;
      </Link>

      {/* Register form */}
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-2xl text-cream text-center mb-8">
          begin
        </h1>
        <RegisterForm />
      </div>
    </div>
  );
}
