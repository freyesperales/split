import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SwRegister } from "@/components/SwRegister";
import { IosInstallHint } from "@/components/IosInstallHint";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "split — share the bill",
  description: "Splitwise alternative with no signup. Room codes, instant share, PWA.",
  applicationName: "split",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "split",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#ea580c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
        <SwRegister />
        <IosInstallHint />
      </body>
    </html>
  );
}
