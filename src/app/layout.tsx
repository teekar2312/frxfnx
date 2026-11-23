import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FINEX Forex Trading Platform — MT5 · AI · Tiingo",
  description: "Full-stack trading forex untuk broker FINEX Indonesia. Manual & automatic trading, MT5 auto-launch, AI lokal + Groq, kalender berita Tiingo, manajemen risiko scalping berita.",
  keywords: ["FINEX Indonesia", "forex", "MT5", "trading", "scalping", "Groq", "Tiingo", "AI"],
  authors: [{ name: "FINEX Forex" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Toaster />
        <SonnerToaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
