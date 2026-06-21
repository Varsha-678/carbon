import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CarbonCompass — Track & Reduce Your Carbon Footprint",
  description: "Understand, track, and reduce your carbon footprint with CarbonCompass. Log daily eco-friendly actions, set monthly reduction goals, and unlock rewards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-slate-950 text-slate-100">
      <body className={`${inter.className} min-h-full flex flex-col antialiased bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/20`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

