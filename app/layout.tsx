import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner"
import { Providers } from "./providers"
import { ThemeProvider } from "@/components/theme-provider"
import { getSettings } from "@/lib/settings";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Docker App Store",
  description: "A store for docker apps",
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = getSettings();
  
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased theme-${settings.themeColor}`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </ThemeProvider>
        {process.env.UMAMI_WEBSITE_ID && process.env.UMAMI_SCRIPT_URL && (
          <Script
            defer
            src={process.env.UMAMI_SCRIPT_URL}
            data-website-id={process.env.UMAMI_WEBSITE_ID}
          />
        )}
      </body>
    </html>
  );
}