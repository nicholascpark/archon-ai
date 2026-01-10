"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { api } from "@/lib/api";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get("token");
      const error = searchParams.get("error");

      if (error) {
        setStatus("error");
        setErrorMessage("Authentication failed. Please try again.");
        setTimeout(() => router.push("/login"), 2000);
        return;
      }

      if (!token) {
        setStatus("error");
        setErrorMessage("No authentication token received.");
        setTimeout(() => router.push("/login"), 2000);
        return;
      }

      try {
        // Fetch user profile with token
        const userData = await api.getMe(token);

        // Update auth store
        useAuthStore.setState({
          token,
          user: userData as any,
          isLoading: false,
          error: null,
        });

        setStatus("success");

        // Redirect to main app (sphere)
        setTimeout(() => router.push("/"), 500);
      } catch (err) {
        console.error("OAuth callback error:", err);
        setStatus("error");
        setErrorMessage("Failed to complete authentication.");
        setTimeout(() => router.push("/login"), 2000);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="text-center">
      {status === "loading" && (
        <>
          <span className="sigil text-3xl block mb-6 animate-pulse-soft">&#9737;</span>
          <p className="font-serif text-sepia/60">completing your passage...</p>
        </>
      )}

      {status === "success" && (
        <>
          <span className="sigil text-3xl block mb-6">&#9737;</span>
          <p className="font-serif text-gold">welcome, seeker</p>
        </>
      )}

      {status === "error" && (
        <>
          <span className="sigil text-3xl block mb-6 opacity-50">&#9737;</span>
          <p className="font-serif text-destructive/70">{errorMessage}</p>
          <p className="font-serif text-muted-foreground/40 text-sm mt-2">returning...</p>
        </>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="text-center">
      <span className="sigil text-3xl block mb-6 animate-pulse-soft">&#9737;</span>
      <p className="font-serif text-sepia/60">preparing...</p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 parchment-texture">
      <Suspense fallback={<LoadingFallback />}>
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
