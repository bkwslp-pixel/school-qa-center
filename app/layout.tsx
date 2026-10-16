import type { Metadata, Viewport } from "next";
import "./globals.css";
import { NotificationProvider } from "@/components/ui/NotificationProvider";

export const viewport: Viewport = {
  themeColor: "#102b50",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "School QA Bkms1 - โรงเรียนเทศบาล ๑ บ้านกลาง",
  description: "ระบบบริหารจัดการข้อมูลประกันคุณภาพสถานศึกษา โรงเรียนเทศบาล ๑ บ้านกลาง สังกัดเทศบาลตำบลบ้านกลาง จ.ลำพูน",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "QA Bkms1",
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="QA Bkms1" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#102b50" />
      </head>
      <body>
        <NotificationProvider>{children}</NotificationProvider>
      </body>
    </html>
  );
}
