"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("invalid email"),
  password: z.string().min(1, "required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    clearError();
    setLocalError(null);

    try {
      await login(data.email, data.password);
      router.push("/chat");
    } catch {
      setLocalError("invalid credentials");
    }
  };

  const handleSocialLogin = (provider: "google" | "meta") => {
    // Redirect to OAuth endpoint
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    window.location.href = `${apiUrl}/auth/${provider}/authorize`;
  };

  return (
    <div className="space-y-8">
      {/* Social login buttons */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => handleSocialLogin("google")}
          className={cn(
            "w-full py-3 px-4 rounded",
            "border border-border/30 hover:border-gold/30",
            "text-cream/70 hover:text-cream",
            "font-serif text-sm",
            "transition-colors duration-300",
            "flex items-center justify-center gap-3"
          )}
        >
          <GoogleIcon className="w-4 h-4" />
          continue with google
        </button>
        <button
          type="button"
          onClick={() => handleSocialLogin("meta")}
          className={cn(
            "w-full py-3 px-4 rounded",
            "border border-border/30 hover:border-gold/30",
            "text-cream/70 hover:text-cream",
            "font-serif text-sm",
            "transition-colors duration-300",
            "flex items-center justify-center gap-3"
          )}
        >
          <MetaIcon className="w-4 h-4" />
          continue with meta
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-border/20" />
        <span className="text-muted-foreground/40 text-xs">or</span>
        <div className="flex-1 h-px bg-border/20" />
      </div>

      {/* Email/password form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-1">
          <input
            type="email"
            placeholder="email"
            {...register("email")}
            className={cn(
              "w-full bg-transparent",
              "border-b border-border/30 focus:border-gold/30",
              "py-3 px-0 outline-none",
              "text-cream placeholder:text-muted-foreground/40",
              "font-serif text-sm",
              "transition-colors duration-300"
            )}
          />
          {errors.email && (
            <p className="text-xs text-destructive/70">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <input
            type="password"
            placeholder="password"
            {...register("password")}
            className={cn(
              "w-full bg-transparent",
              "border-b border-border/30 focus:border-gold/30",
              "py-3 px-0 outline-none",
              "text-cream placeholder:text-muted-foreground/40",
              "font-serif text-sm",
              "transition-colors duration-300"
            )}
          />
          {errors.password && (
            <p className="text-xs text-destructive/70">{errors.password.message}</p>
          )}
        </div>

        {(error || localError) && (
          <p className="text-xs text-destructive/70 text-center">{error || localError}</p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            "w-full py-3 rounded",
            "bg-gold/10 hover:bg-gold/20 border border-gold/30",
            "text-gold hover:text-gold",
            "font-serif text-sm",
            "transition-all duration-300",
            "disabled:opacity-50"
          )}
        >
          {isLoading ? "..." : "enter"}
        </button>

        <p className="text-center text-xs text-muted-foreground/50">
          new here?{" "}
          <Link href="/register" className="text-sepia hover:text-cream transition-colors">
            begin anew
          </Link>
        </p>
      </form>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function MetaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}
