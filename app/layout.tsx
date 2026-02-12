import type { Metadata } from "next";
import { Playfair_Display, Lato } from "next/font/google";
import { SessionSync } from "@/components/auth/SessionSync";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const lato = Lato({
  variable: "--font-lato",
  weight: ["300", "400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wanderlust - Luxury Travel Planner",
  description: "Plan your next luxury trip.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${playfair.variable} ${lato.variable} antialiased bg-background text-text font-body h-screen flex flex-col overflow-hidden`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
          storageKey="travel-planner-theme"
        >
          <SessionSync />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
