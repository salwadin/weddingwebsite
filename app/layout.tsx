import type { Metadata } from "next";
import { Amiri, Cormorant_Garamond, Inter, Marcellus, Noto_Nastaliq_Urdu, Playfair_Display } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-cormorant" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const amiri = Amiri({ subsets: ["arabic"], weight: ["400", "700"], variable: "--font-amiri" });
const nastaliq = Noto_Nastaliq_Urdu({ subsets: ["arabic"], weight: ["400", "600"], variable: "--font-nastaliq" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair-v" });
const marcellus = Marcellus({ subsets: ["latin"], weight: "400", variable: "--font-marcellus-v" });

export const metadata: Metadata = {
  title: { default: "Qubool · One Wedding. Every Celebration.", template: "%s · Qubool" },
  description: "The all-in-one planning platform for multicultural, multi-day and multi-event weddings: personalized invitations, family collaboration, budgets, design and vendors.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={[cormorant.variable, inter.variable, amiri.variable, nastaliq.variable, playfair.variable, marcellus.variable].join(" ")}>
      <body>{children}</body>
    </html>
  );
}
