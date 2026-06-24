import type { Metadata, Viewport } from "next";
import "./globals.css";

// 這裡設定 PWA 在 iPhone 上的完美適配
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#F9F7F7",
};

export const metadata: Metadata = {
  title: "Record",
  description: "Collection-Bot",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WannaBuy-bot",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className="antialiased bg-[#F9F7F7] text-[#585C64] overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}