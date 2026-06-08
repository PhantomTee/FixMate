import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "FixMate — Nigeria's Home Repair Marketplace",
  description:
    "Find verified, trusted artisans for any home repair in Nigeria. Secure escrow payments, AI-powered job matching, and real reviews.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-white" suppressHydrationWarning>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
