import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import LayoutShell from "@/components/LayoutShell";

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
    <html lang="en">
      <body>
        <Navbar />
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
