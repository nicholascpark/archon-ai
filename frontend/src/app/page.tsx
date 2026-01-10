"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/useAuthStore";

export default function LandingPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  // Redirect authenticated users to the app
  useEffect(() => {
    if (token) {
      router.replace("/app");
    }
  }, [token, router]);

  // Show loading if we have a token (redirect in progress)
  if (token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="sigil text-4xl animate-float">&#9737;</span>
          <p className="text-muted-foreground text-sm font-serif">entering...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 parchment-texture">
      {/* Centered minimal content - shifted up to avoid Archon star */}
      <div className="text-center max-w-md -mt-32">
        {/* Sigil */}
        <span className="sigil text-4xl block mb-8 animate-float">&#9737;</span>

        {/* Title */}
        <h1 className="font-serif text-3xl text-cream mb-3">Archon</h1>

        {/* Tagline */}
        <p className="font-serif text-sepia/60 text-lg mb-12">
          your celestial counsel
        </p>

        {/* Entry links */}
        <div className="space-y-4">
          <Link
            href="/login"
            className="block w-full py-3 px-6 border border-border/30 rounded text-cream/80 hover:border-gold/30 hover:text-cream transition-colors duration-300 font-serif"
          >
            enter
          </Link>
          <Link
            href="/register"
            className="block text-muted-foreground/50 hover:text-sepia transition-colors text-sm"
          >
            begin anew
          </Link>
        </div>
      </div>

      {/* Subtle footer */}
      <footer className="absolute bottom-6 text-muted-foreground/30 text-xs">
        as above, so below
      </footer>
    </div>
  );
}
