import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

// viewportFit: 'cover' is required for env(safe-area-inset-*) to be non-zero
// on iOS, so fixed elements can clear the home indicator / bottom toolbar
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
