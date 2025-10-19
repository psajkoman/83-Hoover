import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Providers from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "83 Hoover Criminals | Los Angeles RP",
  description: "Official faction hub for 83 Hoover Criminals - GTA San Andreas RP Server",
  keywords: "83 hoover, gta rp, los angeles rp, gang rp, faction hub",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <Providers>
          <Navbar />
          <main className="min-h-screen">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
