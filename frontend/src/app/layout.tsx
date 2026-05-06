import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import LayoutShell from "@/components/LayoutShell";
import Script from "next/script";

export const metadata: Metadata = {
  title: "ShiftSync - Employee Shift Scheduling",
  description: "Efficiently manage weekly work schedules for your team",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`try{const t=localStorage.getItem('theme');if(t){document.documentElement.setAttribute('data-theme',t);}}catch(e){}`}
        </Script>
      </head>
      <body>
        <Navbar />
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
