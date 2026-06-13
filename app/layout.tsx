import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import WhatsAppFAB from "@/components/WhatsAppFAB";
import SplashScreen from "@/components/SplashScreen";

const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "iSabi — Nigeria's Home Repair Marketplace",
  description:
    "Find verified, trusted artisans for any home repair in Nigeria. Secure escrow payments, AI-powered job matching, and real reviews.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={font.variable}>
      <body className="font-sans antialiased bg-white" suppressHydrationWarning>
        <SplashScreen />
        <Navbar />
        <div className="pb-16 md:pb-0">{children}</div>
        <WhatsAppFAB />
      </body>
    </html>
  );
}
