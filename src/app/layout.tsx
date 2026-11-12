import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ToastProvider } from "@/components/toast";
import { ServiceWorkerRegistrar } from "@/components/pwa";

export const metadata: Metadata = {
  title: {
    default: "العربي للخدمات الجمركية واللوجستية",
    template: "%s | العربي للخدمات الجمركية",
  },
  description:
    "منصة متكاملة لإدارة ملفات التخليص الجمركي، الشحنات، المستندات، الفواتير، والربط مع شركات الطيران والخطوط الملاحية ومنصة نافذة.",
  applicationName: "العربي جمرك",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "العربي جمرك",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/icons/icon-192.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a2239" },
    { media: "(prefers-color-scheme: dark)", color: "#0a2239" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased">
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
