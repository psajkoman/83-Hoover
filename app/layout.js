import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import ActiveWarBanner from "@/components/layout/ActiveWarBanner";
import Providers from "./providers";

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
      <body className={inter.variable} style={{
        backgroundColor: "black",
        backgroundImage: "url('/wp9075005.webp')",
        backgroundSize: "contain",
        backgroundPosition: "top",
        backgroundRepeat: "repeat",
        backdropFilter: "blur(45px) brightness(0.5)",
      }}>
        <Providers>
          <Navbar />
          <ActiveWarBanner />
          <main className="min-h-screen">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
