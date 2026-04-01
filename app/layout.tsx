import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lavelec Ops",
  description: "Branded operating app for Lavelec electrical and fire systems teams.",
  icons: {
    icon: "/branding/lavelec-orb.png",
    apple: "/branding/lavelec-orb.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
