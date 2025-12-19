import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import ActiveWarBanner from "@/components/layout/ActiveWarBanner";
import Providers from "./providers";
import Background from "@/components/Background";
import Footer from "@/components/layout/Footer";
import StickyTimezoneSelector from "@/components/layout/StickyTimezoneSelector";
import { TimezoneProvider } from "@/contexts/TimezoneContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "Low West Crew - GTA World",
  description: "Official faction hub for Low West Crew - GTA World RP Server",
  keywords: "low west, gta rp, los angeles rp, gang rp, faction hub, vespucci beach, venice beach",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.variable} style={{ minHeight: '100vh' }}>
        <Background />
        <Providers>
          <TimezoneProvider>
            <Navbar />
            <ActiveWarBanner />
            <div className="flex flex-col min-h-screen">
              <main className="flex-grow">
                {children}
                <StickyTimezoneSelector />
              </main>
              <Footer />
            </div>
          </TimezoneProvider>
        </Providers>
      </body>
    </html>
  );
}
