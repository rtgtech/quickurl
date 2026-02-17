import type { Metadata } from "next";
import { Playfair_Display, Space_Mono } from "next/font/google";
import "@/app/globals.css";
import { AuthProvider } from "@/components/home/auth-provider";

const display = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
});

const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "QuickURL",
  description: "Turn long links into short, sharp codes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${mono.variable} ${mono.className}`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
