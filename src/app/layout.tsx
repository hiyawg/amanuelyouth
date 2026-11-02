import type { Metadata, Viewport } from "next";
import { Baloo_2, Figtree } from "next/font/google";
import "./globals.css";

const baloo = Baloo_2({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-baloo" });
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-figtree" });

export const metadata: Metadata = {
  title: "Shepherd Check-In",
  description: "Check-in and discipleship lessons for kids and youth, elementary through high school.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${baloo.variable} ${figtree.variable}`}>
      <body>{children}</body>
    </html>
  );
}
