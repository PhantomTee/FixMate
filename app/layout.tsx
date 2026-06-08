import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import DemoModeBanner from "@/components/DemoModeBanner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "FixMate — AI-Powered Repair & Escrow Platform",
  description:
    "FixMate uses Google Gemini AI to diagnose household faults and OPay Escrow to secure payments for Nigeria's informal artisan economy.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-white" suppressHydrationWarning>
        <DemoModeBanner />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
