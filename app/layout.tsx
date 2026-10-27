import type { Metadata } from "next";
import { Amiri, Cormorant_Garamond, Marcellus, Montserrat, Noto_Nastaliq_Urdu, Playfair_Display } from "next/font/google";
import "./globals.css";
import { NativeBridge } from "@/components/native-bridge";

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-cormorant" });
// Qubool's own brand (the brand kit): Playfair Display for headlines and the logo, Montserrat for everything else.
const montserrat = Montserrat({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-montserrat" });
const amiri = Amiri({ subsets: ["arabic"], weight: ["400", "700"], variable: "--font-amiri" });
const nastaliq = Noto_Nastaliq_Urdu({ subsets: ["arabic"], weight: ["400", "600"], variable: "--font-nastaliq" });
const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-playfair-v" });
const marcellus = Marcellus({ subsets: ["latin"], weight: "400", variable: "--font-marcellus-v" });

export const metadata: Metadata = {
  title: { default: "Qubool · One Wedding. Every Celebration.", template: "%s · Qubool" },
  description: "Plan every event, invite every guest and share one beautiful wedding website. Personal invitations, RSVPs, budgets and more, in one calm place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={[cormorant.variable, montserrat.variable, amiri.variable, nastaliq.variable, playfair.variable, marcellus.variable].join(" ")}>
      <body>{children}<NativeBridge /></body>
    </html>
  );
}
