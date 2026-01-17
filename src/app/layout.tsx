import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pareez Billing",
  description: "Professional billing system for Pareez Unisex Salon",
  openGraph: {
    title: "Pareez Billing",
    description: "Professional billing system for Pareez Unisex Salon",
    url: "https://pareez-billing.vercel.app",
    siteName: "Pareez Billing",
    images: [
      {
        url: "https://pareez-billing.vercel.app/logo.jpg",
        width: 1200,
        height: 630,
        alt: "Pareez Billing System",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pareez Billing",
    description: "Professional billing system for Pareez Unisex Salon",
    images: ["https://pareez-billing.vercel.app/logo.jpg"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
