import type { Metadata, Viewport } from "next";
import { Inter, Crimson_Pro, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { CelestialDots } from "@/components/shared/celestial-dots";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const crimsonPro = Crimson_Pro({
  variable: "--font-crimson",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Archon AI - Your Personal Astrology Guide",
  description: "Discover your cosmic path with AI-powered astrological insights. Get personalized readings, natal chart analysis, and daily horoscopes.",
  keywords: ["astrology", "horoscope", "natal chart", "AI", "zodiac", "birth chart"],
  authors: [{ name: "Archon AI" }],
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Archon AI",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${crimsonPro.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <Providers>
          <CelestialDots />
          {children}
          <Toaster richColors position="top-center" />
        </Providers>
      </body>
    </html>
  );
}
